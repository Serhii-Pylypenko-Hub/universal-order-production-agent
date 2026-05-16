import { getRows } from "../data/rowRepository.js";
import { healthCheckWorkspace } from "../setup/healthCheck.js";
import { getProcurementPlan } from "./inventoryService.js";

const CLOSED_ORDER_STATUSES = new Set(["Cancelled", "Delivered", "PickedUp", "Closed"]);

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dateValue(value) {
  const parsed = Date.parse(value || "");
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function buildOrderCalendar(orders, clients, calendarEvents) {
  const clientById = new Map(clients.map(client => [client.client_id, client]));
  const eventsByOrderId = new Map();

  for (const event of calendarEvents) {
    if (!event.order_id) continue;
    if (!eventsByOrderId.has(event.order_id)) eventsByOrderId.set(event.order_id, []);
    eventsByOrderId.get(event.order_id).push(event);
  }

  return orders
    .filter(order => !CLOSED_ORDER_STATUSES.has(order.status))
    .map(order => {
      const events = (eventsByOrderId.get(order.order_id) || [])
        .filter(event => event.status !== "Cancelled")
        .sort((a, b) => dateValue(a.start_at) - dateValue(b.start_at));
      const productionEvent = events.find(event => event.type === "production") || events[0] || null;
      const client = clientById.get(order.client_id) || {};
      const calendarDate = productionEvent?.start_at || order.ready_date || order.desired_date || order.created_at;

      return {
        order_id: order.order_id,
        client_name: client.name || order.client_name || order.client_id || "",
        status: order.status || "New",
        payment_status: order.payment_status || "",
        delivery_method: order.delivery_method || "",
        desired_date: order.desired_date || "",
        ready_date: order.ready_date || "",
        shipping_date: order.shipping_date || "",
        production_start_at: productionEvent?.start_at || "",
        production_end_at: productionEvent?.end_at || "",
        calendar_date: calendarDate || "",
        final_price: order.final_price || 0,
        event_type: productionEvent?.type || "",
        event_status: productionEvent?.status || "",
        blocked: productionEvent?.status === "Blocked" || productionEvent?.type === "blocked"
      };
    })
    .sort((a, b) => dateValue(a.calendar_date) - dateValue(b.calendar_date))
    .slice(0, 20);
}

function workSetting(settings, key, fallback) {
  const row = settings.find(item => item.key === key);
  return row?.value || fallback;
}

function timeHours(value) {
  const [hours = 0, minutes = 0] = String(value || "").slice(0, 5).split(":").map(Number);
  return Number(hours || 0) + Number(minutes || 0) / 60;
}

function overrideBlockedHours(row, startHour, endHour) {
  if (row.blocked_hours !== undefined && row.blocked_hours !== "") return Math.max(0, asNumber(row.blocked_hours));
  const start = row.start_time ? timeHours(row.start_time) : startHour;
  const end = row.end_time ? timeHours(row.end_time) : endHour;
  return Math.max(0, Math.min(end, endHour) - Math.max(start, startHour));
}

function buildCalendarWorkDays(calendarRows, settings, calendarOverrides = []) {
  const startHour = Number(workSetting(settings, "work_day_start_hour", 9));
  const endHour = Number(workSetting(settings, "work_day_end_hour", 18));
  const capacity = Number(workSetting(settings, "daily_capacity_hours", 8));
  const today = new Date();

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() + index);
    const date = day.toISOString().slice(0, 10);
    const orders = calendarRows.filter(row => String(row.calendar_date || row.production_start_at || "").slice(0, 10) === date);
    const blocked = calendarOverrides.filter(row => {
      const type = String(row.type || "").toLowerCase();
      return String(row.date || "").slice(0, 10) === date && (type === "blocked" || type === "block");
    });
    const blockedHours = blocked.reduce((sum, row) => sum + overrideBlockedHours(row, startHour, endHour), 0);
    const usedHours = orders.reduce((sum, row) => {
      const start = Date.parse(row.production_start_at || "");
      const end = Date.parse(row.production_end_at || row.ready_date || "");
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return sum;
      return sum + ((end - start) / 36e5);
    }, 0);

    return {
      date,
      label: day.toLocaleDateString("uk-UA", { weekday: "short", day: "2-digit", month: "2-digit" }),
      work_start: `${String(startHour).padStart(2, "0")}:00`,
      work_end: `${String(endHour).padStart(2, "0")}:00`,
      capacity_hours: capacity,
      used_hours: Number(usedHours.toFixed(2)),
      blocked_hours: Number(blockedHours.toFixed(2)),
      free_hours: Number(Math.max(0, capacity - usedHours - blockedHours).toFixed(2)),
      blocked,
      orders
    };
  });
}

function buildStatusBoard(calendarRows) {
  const groups = [
    ["new", "Нові", ["new", "proposal", "draft"]],
    ["scheduled", "Заплановано", ["scheduled", "confirmed"]],
    ["work", "В роботі", ["production", "inproduction", "in_progress", "work"]],
    ["ready", "Готові", ["ready", "completed"]],
    ["issue", "Проблемні", ["cancel", "hold", "blocked", "problem"]]
  ];

  return groups.map(([key, title, needles]) => ({
    key,
    title,
    orders: calendarRows.filter(row => {
      const normalized = String(row.status || "").toLowerCase().replace(/[^a-zа-яіїєґ0-9]/g, "");
      return needles.some(needle => normalized.includes(needle));
    })
  }));
}

export async function getDashboardSummary() {
  const orders = getRows("Orders");
  const products = getRows("Products");
  const components = getRows("Components");
  const stock = getRows("Stock");
  const purchases = getRows("PurchaseRequests");
  const tasks = getRows("Tasks");
  const clients = getRows("Clients");
  const calendarEvents = getRows("CalendarLog");
  const calendarOverrides = getRows("CalendarOverrides");
  const settings = getRows("Settings");
  const procurementPlan = getProcurementPlan();
  const health = await healthCheckWorkspace();

  const activeOrders = orders.filter(order => !CLOSED_ORDER_STATUSES.has(order.status));
  const revenue = orders.reduce((sum, order) => sum + asNumber(order.final_price), 0);
  const lowStock = stock.filter(row => {
    const available = row.available_qty !== undefined && row.available_qty !== ""
      ? asNumber(row.available_qty)
      : asNumber(row.current_qty) - asNumber(row.reserved_qty);
    return available <= asNumber(row.min_qty);
  });
  const openTasks = tasks.filter(task => !["Done", "Closed", "Cancelled"].includes(task.status));
  const openPurchases = purchases.filter(request => !["Received", "Cancelled", "Closed"].includes(request.status));
  const componentById = new Map(components.map(component => [component.component_id, component]));

  const orderCalendar = buildOrderCalendar(orders, clients, calendarEvents);

  return {
    health,
    metrics: {
      orders_total: orders.length,
      active_orders: activeOrders.length,
      clients_total: clients.length,
      revenue_total: revenue,
      low_stock: lowStock.length,
      open_purchases: openPurchases.length,
      open_tasks: openTasks.length
    },
    products: products.slice(0, 12),
    stock: stock.slice(0, 12).map(row => ({
      ...row,
      component_name: componentById.get(row.component_id)?.name || row.component_id
    })),
    recent_orders: orders.slice(-8).reverse(),
    order_calendar: orderCalendar,
    calendar_work_days: buildCalendarWorkDays(orderCalendar, settings, calendarOverrides),
    order_status_board: buildStatusBoard(orderCalendar),
    procurement_summary: procurementPlan.summary,
    procurement_preview: procurementPlan.rows
      .filter(row => asNumber(row.recommended_purchase_qty) > 0)
      .slice(0, 8),
    low_stock: lowStock.slice(0, 8),
    open_tasks: openTasks.slice(0, 8)
  };
}
