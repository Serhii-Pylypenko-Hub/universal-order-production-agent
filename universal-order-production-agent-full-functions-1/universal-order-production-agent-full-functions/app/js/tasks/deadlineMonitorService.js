import { findRows } from "../data/rowRepository.js";
import { nowIso } from "../utils/time.js";
import { createTask } from "./taskService.js";
import { logActivity } from "../audit/auditService.js";
import { getSetting } from "../manager/settingsService.js";

const TERMINAL_STATUSES = new Set(["Closed", "Cancelled", "Delivered", "PickedUp"]);

export function checkOverdueOrders() {
  const today = new Date();
  const orders = findRows("Orders", r =>
    !TERMINAL_STATUSES.has(r.status) && r.ready_date && new Date(r.ready_date) < today
  );

  const tasks = [];
  for (const order of orders) {
    const daysLate = Math.floor((today - new Date(order.ready_date)) / 86_400_000);
    const task = createTask({
      orderId: order.order_id,
      type: "DeadlineWarning",
      title: `Замовлення ${order.order_id} прострочено на ${daysLate} дн. (статус: ${order.status})`,
      priority: daysLate >= 3 ? "CRITICAL" : "WARNING"
    });
    tasks.push(task);
    logActivity({
      entityType: "Order",
      entityId: order.order_id,
      action: "deadlineOverdue",
      newValue: { daysLate },
      source: "system"
    });
  }
  return tasks;
}

export function checkSlowPurchases() {
  const maxAgeDays = Number(getSetting("max_purchase_request_age_days") || 14);
  const cutoff = new Date(Date.now() - maxAgeDays * 86_400_000);
  const stale = findRows("PurchaseRequests", r =>
    ["Draft", "Pending"].includes(r.status) && new Date(r.created_at) < cutoff
  );

  const tasks = [];
  for (const pr of stale) {
    const task = createTask({
      type: "PurchaseDelay",
      title: `Заявка на закупку ${pr.purchase_request_id} без руху більше ${maxAgeDays} днів`,
      priority: "WARNING"
    });
    tasks.push(task);
  }
  return tasks;
}

export function checkCalendarOverload() {
  const dailyCap = Number(getSetting("daily_capacity_hours") || 8);
  const today = new Date();
  const upcoming = findRows("CalendarLog", r => {
    if (r.status === "Cancelled") return false;
    const start = new Date(r.start_at);
    return start >= today && start <= new Date(today.getTime() + 14 * 86_400_000);
  });

  // Group by date
  const byDay = {};
  for (const slot of upcoming) {
    const day = slot.start_at?.substring(0, 10);
    if (!day) continue;
    byDay[day] = (byDay[day] || 0) + Number(slot.duration_hours || 0);
  }

  const tasks = [];
  for (const [day, hours] of Object.entries(byDay)) {
    if (hours > dailyCap) {
      const task = createTask({
        type: "CapacityOverload",
        title: `Перевантаження виробництва ${day}: ${hours}/${dailyCap} год`,
        priority: hours > dailyCap * 1.5 ? "CRITICAL" : "WARNING"
      });
      tasks.push(task);
    }
  }
  return tasks;
}

export function runDeadlineCheck() {
  const overdueOrders = checkOverdueOrders();
  const slowPurchases = checkSlowPurchases();
  const overloadDays = checkCalendarOverload();

  logActivity({
    entityType: "System",
    entityId: "DeadlineMonitor",
    action: "deadlineCheckRun",
    newValue: {
      overdueOrders: overdueOrders.length,
      slowPurchases: slowPurchases.length,
      overloadDays: overloadDays.length
    },
    source: "system"
  });

  return {
    timestamp: nowIso(),
    overdueOrders,
    slowPurchases,
    overloadDays
  };
}
