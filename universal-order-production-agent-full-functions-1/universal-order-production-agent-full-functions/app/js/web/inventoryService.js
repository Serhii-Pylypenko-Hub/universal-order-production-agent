import { appendRow, findOne, getRows, updateRow } from "../data/rowRepository.js";
import { createMaterial, findSimilarMaterials } from "../stock/materialService.js";
import { receiveStockLot, refreshStockBalance } from "../stock/stockLotService.js";
import { assertValid } from "../errors/validationService.js";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function byId(rows, field) {
  return new Map(rows.map(row => [row[field], row]));
}

function clampHorizonDays(value) {
  const days = Number(value);
  if (!Number.isFinite(days)) return 7;
  return Math.min(31, Math.max(1, Math.round(days)));
}

function parseBooleanSetting(value, fallback = true) {
  if (value === undefined || value === null || value === "") return fallback;
  return !["false", "0", "off", "no"].includes(String(value).toLowerCase());
}

function getSettingValue(key, fallback) {
  return findOne("Settings", row => row.key === key)?.value ?? fallback;
}

export function getProcurementSettings(overrides = {}) {
  return {
    enabled: overrides.enabled === undefined
      ? parseBooleanSetting(getSettingValue("procurement_control_enabled", "true"), true)
      : parseBooleanSetting(overrides.enabled, true),
    horizon_days: clampHorizonDays(overrides.horizon_days ?? getSettingValue("procurement_planning_horizon_days", "7"))
  };
}

export function saveProcurementSettings(input = {}) {
  const settings = getProcurementSettings(input);
  const rows = [
    ["procurement_control_enabled", String(settings.enabled), "boolean", "Stock procurement control switch"],
    ["procurement_planning_horizon_days", String(settings.horizon_days), "number", "Days ahead for order material demand planning"]
  ];
  for (const [key, value, type, description] of rows) {
    const existing = findOne("Settings", row => row.key === key);
    if (existing) updateRow("Settings", "key", key, { value, type, description });
    else appendRow("Settings", { key, value, type, description });
  }
  return settings;
}

function isActiveOrder(order) {
  return !["Closed", "Cancelled", "Delivered", "PickedUp"].includes(order.status);
}

function isOrderInsideHorizon(order, cutoffTime) {
  if (!order.desired_date) return false;
  const time = new Date(order.desired_date).getTime();
  return Number.isFinite(time) && time <= cutoffTime;
}

export function getProcurementPlan(options = {}) {
  const settings = getProcurementSettings(options);
  if (!settings.enabled) {
    return { settings, rows: [], summary: { alerts: 0, absent: 0, missing: 0, below_min: 0, recommended_items: 0 } };
  }

  const components = getRows("Components").filter(row => String(row.is_active) !== "false");
  const stockByComponent = byId(getRows("Stock"), "component_id");
  const orders = getRows("Orders").filter(order => isActiveOrder(order));
  const cutoffTime = Date.now() + settings.horizon_days * 86_400_000;
  const plannedOrderIds = new Set(orders.filter(order => isOrderInsideHorizon(order, cutoffTime)).map(order => order.order_id));
  const requirements = getRows("OrderMaterialRequirements").filter(row => plannedOrderIds.has(row.order_id));
  const reservations = getRows("Reservations").filter(row => plannedOrderIds.has(row.order_id) && row.status !== "Released");

  const requiredByComponent = new Map();
  const reservedByComponent = new Map();
  for (const row of requirements) {
    requiredByComponent.set(row.component_id, asNumber(requiredByComponent.get(row.component_id)) + asNumber(row.required_qty));
  }
  for (const row of reservations) {
    reservedByComponent.set(row.component_id, asNumber(reservedByComponent.get(row.component_id)) + asNumber(row.reserved_qty));
  }

  const rows = components.map(component => {
    const stock = stockByComponent.get(component.component_id) || {};
    const currentQty = asNumber(stock.current_qty);
    const reservedQty = asNumber(stock.reserved_qty);
    const availableQty = stock.available_qty !== undefined && stock.available_qty !== ""
      ? asNumber(stock.available_qty)
      : currentQty - reservedQty;
    const minQty = asNumber(stock.min_qty || component.min_qty);
    const requiredQty = asNumber(requiredByComponent.get(component.component_id));
    const reservedForOrdersQty = asNumber(reservedByComponent.get(component.component_id));
    const reservationGapQty = Math.max(0, requiredQty - reservedForOrdersQty);
    const missingForOrdersQty = Math.max(0, reservationGapQty - availableQty);
    const belowMinQty = Math.max(0, minQty - availableQty);
    const absent = availableQty <= 0 && (minQty > 0 || reservationGapQty > 0);
    const recommendedPurchaseQty = Math.max(missingForOrdersQty, belowMinQty);
    const status = absent
      ? "Немає на складі"
      : missingForOrdersQty > 0
        ? "Не вистачає на замовлення"
        : reservationGapQty > 0
          ? "Потрібно зарезервувати"
          : belowMinQty > 0
            ? "Нижче мінімуму"
            : "Достатньо";
    return {
      component_id: component.component_id,
      material_name: component.name,
      unit: component.unit,
      current_qty: Number(currentQty.toFixed(6)),
      reserved_qty: Number(reservedQty.toFixed(6)),
      available_qty: Number(availableQty.toFixed(6)),
      min_qty: Number(minQty.toFixed(6)),
      required_qty: Number(requiredQty.toFixed(6)),
      reserved_for_orders_qty: Number(reservedForOrdersQty.toFixed(6)),
      reservation_gap_qty: Number(reservationGapQty.toFixed(6)),
      missing_for_orders_qty: Number(missingForOrdersQty.toFixed(6)),
      below_min_qty: Number(belowMinQty.toFixed(6)),
      recommended_purchase_qty: Number(recommendedPurchaseQty.toFixed(6)),
      expected_unit_cost: asNumber(stock.weighted_avg_unit_cost || stock.unit_cost || component.unit_cost),
      status,
      severity: absent ? "absent" : missingForOrdersQty > 0 ? "missing" : reservationGapQty > 0 ? "reserve_gap" : belowMinQty > 0 ? "below_min" : "ok"
    };
  }).filter(row => row.severity !== "ok");

  const summary = rows.reduce((acc, row) => {
    acc.alerts += 1;
    if (row.severity === "absent") acc.absent += 1;
    if (row.severity === "missing") acc.missing += 1;
    if (row.severity === "below_min") acc.below_min += 1;
    if (row.recommended_purchase_qty > 0) acc.recommended_items += 1;
    return acc;
  }, { alerts: 0, absent: 0, missing: 0, below_min: 0, recommended_items: 0 });

  return { settings, rows, summary };
}

export function getInventoryWorkspace() {
  const components = getRows("Components");
  const stock = getRows("Stock");
  const lots = getRows("StockLots");
  const warehouses = getRows("Warehouses");
  const suppliers = getRows("Suppliers");
  const categories = getRows("MaterialCategories");
  const tableSettings = getRows("TableUiSettings");
  const validationRules = getRows("ValidationRules").filter(row => String(row.is_active) !== "false");
  const orders = getRows("Orders");
  const requirements = getRows("OrderMaterialRequirements");
  const reservations = getRows("Reservations");
  const reservationLots = getRows("ReservationLots");
  const stockByComponent = byId(stock, "component_id");
  const warehouseById = byId(warehouses, "warehouse_id");
  const supplierById = byId(suppliers, "supplier_id");
  const categoryById = byId(categories, "category_id");

  const materials = components.map(component => {
    const balance = stockByComponent.get(component.component_id) || {};
    const available = balance.available_qty !== undefined && balance.available_qty !== ""
      ? asNumber(balance.available_qty)
      : asNumber(balance.current_qty) - asNumber(balance.reserved_qty);
    return {
      ...component,
      category_name: categoryById.get(component.category_id)?.name || "",
      current_qty: asNumber(balance.current_qty),
      reserved_qty: asNumber(balance.reserved_qty),
      available_qty: available,
      min_qty: asNumber(balance.min_qty || component.min_qty),
      availability_status: balance.availability_status || (available <= asNumber(balance.min_qty || component.min_qty) ? "Низький залишок" : "Достатньо"),
      weighted_avg_unit_cost: asNumber(balance.weighted_avg_unit_cost || balance.unit_cost || component.unit_cost)
    };
  });

  const lotRows = lots
    .slice()
    .sort((a, b) => String(b.received_at || b.created_at || "").localeCompare(String(a.received_at || a.created_at || "")))
    .map(lot => {
      const component = components.find(row => row.component_id === lot.component_id);
      return {
        ...lot,
        component_name: component?.name || lot.component_id,
        warehouse_name: warehouseById.get(lot.warehouse_id)?.name || lot.warehouse_id || "",
        supplier_name: supplierById.get(lot.supplier_id)?.name || lot.supplier_id || "",
        available_qty: asNumber(lot.remaining_qty) - asNumber(lot.reserved_qty)
      };
    });

  const activeOrders = orders
    .filter(order => !["Closed", "Cancelled", "Delivered", "PickedUp"].includes(order.status))
    .slice(-12)
    .reverse()
    .map(order => {
      const orderRequirements = requirements.filter(row => row.order_id === order.order_id);
      const orderReservations = reservations.filter(row => row.order_id === order.order_id);
      const orderReservationIds = new Set(orderReservations.map(row => row.reservation_id));
      const orderLots = reservationLots.filter(row => orderReservationIds.has(row.reservation_id));
      const missingCount = orderRequirements.filter(row => {
        const reserved = orderReservations
          .filter(res => res.component_id === row.component_id)
          .reduce((sum, res) => sum + asNumber(res.reserved_qty), 0);
        return reserved < asNumber(row.required_qty);
      }).length;
      return {
        order_id: order.order_id,
        status: order.status,
        desired_date: order.desired_date,
        requirements_count: orderRequirements.length,
        reservations_count: orderReservations.length,
        reservation_lots_count: orderLots.length,
        missing_count: missingCount,
        estimated_material_cost: orderRequirements.reduce((sum, row) => sum + asNumber(row.estimated_total_cost), 0)
      };
    });

  return {
    materials,
    lots: lotRows,
    warehouses,
    suppliers,
    categories,
    active_orders: activeOrders,
    procurement_plan: getProcurementPlan(),
    table_settings: tableSettings,
    validation_rules: validationRules,
    units: [
      { value: "kg", label: "кг" },
      { value: "g", label: "г" },
      { value: "l", label: "л" },
      { value: "ml", label: "мл" },
      { value: "pcs", label: "шт" },
      { value: "pack", label: "уп." },
      { value: "box", label: "кор." }
    ]
  };
}

export function createInventoryMaterial(input) {
  assertValid("Створення матеріалу", input, {
    required: [
      { name: "name", label: "Назва матеріалу", instruction_uk: "Вкажіть назву матеріалу, наприклад Цукор білий." },
      { name: "unit", label: "Одиниця виміру", instruction_uk: "Оберіть базову одиницю: кг, г, л, мл, шт, уп. або кор." }
    ]
  });

  const result = createMaterial({
    ...input,
    unit_cost: input.unit_cost || 0,
    min_qty: input.min_qty || 0,
    allow_standalone_sale: input.allow_standalone_sale === true || input.allow_standalone_sale === "true",
    force: input.force === true || input.force === "true"
  });

  return result;
}

export function getMaterialSuggestions(name) {
  return findSimilarMaterials(name).slice(0, 8);
}

export function receiveInventoryLot(input) {
  const lot = receiveStockLot(input);
  refreshStockBalance(lot.component_id, lot.warehouse_id);
  return lot;
}
