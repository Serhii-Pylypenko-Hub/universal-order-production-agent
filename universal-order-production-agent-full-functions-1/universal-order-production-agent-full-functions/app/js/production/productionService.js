import { appendRow, findOne, findRows, getRows, updateRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { logActivity } from "../audit/auditService.js";
import { assertValid } from "../errors/validationService.js";
import { getComponent } from "../orders/productService.js";
import { consumeReservedStock, releaseReservation, reserveStock } from "../stock/stockService.js";
import { getOrder, startProduction, updateOrderStatus } from "../orders/orderService.js";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function orderRequirements(orderId) {
  return findRows("OrderMaterialRequirements", row =>
    row.order_id === orderId && !["Cancelled", "Used", "Released"].includes(row.status)
  );
}

function requiredPayload(orderId) {
  return orderRequirements(orderId).map(row => ({
    component_id: row.component_id,
    required_qty: row.required_qty,
    unit: row.unit,
    requirement_id: row.requirement_id
  }));
}

export function getProductionOrderDetails(orderId) {
  const order = getOrder(orderId);
  if (!order) return null;

  const components = new Map(getRows("Components").map(component => [component.component_id, component]));
  const stock = new Map(getRows("Stock").map(row => [row.component_id, row]));
  const reservations = findRows("Reservations", row => row.order_id === orderId);
  const reservationLots = getRows("ReservationLots").filter(row => reservations.some(res => res.reservation_id === row.reservation_id));
  const lots = new Map(getRows("StockLots").map(row => [row.lot_id, row]));

  const materials = findRows("OrderMaterialRequirements", row => row.order_id === orderId).map(req => {
    const component = components.get(req.component_id);
    const balance = stock.get(req.component_id) || {};
    const reserved = reservations
      .filter(res => res.component_id === req.component_id && res.status === "Reserved")
      .reduce((sum, res) => sum + asNumber(res.reserved_qty), 0);
    const selectedLots = reservationLots
      .filter(row => row.component_id === req.component_id)
      .map(row => ({
        ...row,
        expires_at: lots.get(row.lot_id)?.expires_at || "",
        received_at: lots.get(row.lot_id)?.received_at || ""
      }));
    return {
      ...req,
      component_name: component?.name || req.component_id,
      component_unit: component?.unit || req.unit,
      available_qty: asNumber(balance.available_qty),
      reserved_qty: reserved,
      missing_qty: Math.max(0, asNumber(req.required_qty) - reserved),
      lots: selectedLots
    };
  });

  const productionRun = findRows("ProductionRuns", row => row.order_id === orderId).slice(-1)[0] || null;
  return { order, materials, reservations, reservation_lots: reservationLots, production_run: productionRun };
}

export function startOrderProduction(orderId, managerId = "manager") {
  assertValid("Взяти замовлення в роботу", { orderId }, {
    required: [{ name: "orderId", label: "Замовлення" }]
  });

  const order = getOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} not found.`);

  let run = findOne("ProductionRuns", row => row.order_id === orderId && !["Completed", "Cancelled"].includes(row.status));
  if (!run) {
    run = appendRow("ProductionRuns", {
      production_run_id: id("RUN"),
      order_id: orderId,
      status: "InProduction",
      reservation_mode: "AUTO_FIFO",
      started_at: nowIso(),
      completed_at: "",
      manager_id: managerId,
      notes: "",
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }

  const updatedOrder = order.status === "InProduction" ? order : startProduction(orderId);
  logActivity({ entityType: "Order", entityId: orderId, action: "startOrderProduction", newValue: run, source: managerId });
  return { order: updatedOrder, production_run: run, details: getProductionOrderDetails(orderId) };
}

export function completeOrderProduction(orderId, managerId = "manager") {
  assertValid("Завершити виробництво", { orderId }, {
    required: [{ name: "orderId", label: "Замовлення" }]
  });

  const order = getOrder(orderId);
  if (!order) throw new Error(`Order ${orderId} not found.`);
  if (order.status !== "InProduction" && order.status !== "Ready") {
    startOrderProduction(orderId, managerId);
  }

  const consumed = consumeReservedStock(orderId);
  for (const req of findRows("OrderMaterialRequirements", row => row.order_id === orderId)) {
    updateRow("OrderMaterialRequirements", "requirement_id", req.requirement_id, {
      status: "Used",
      updated_at: nowIso()
    });
  }

  const run = findRows("ProductionRuns", row => row.order_id === orderId && !["Completed", "Cancelled"].includes(row.status)).slice(-1)[0];
  if (run) {
    updateRow("ProductionRuns", "production_run_id", run.production_run_id, {
      status: "Completed",
      completed_at: nowIso(),
      updated_at: nowIso()
    });
  }

  const updatedOrder = order.status === "Ready" ? order : updateOrderStatus(orderId, "Ready");
  logActivity({ entityType: "Order", entityId: orderId, action: "completeOrderProduction", newValue: { consumed }, source: managerId });
  return { order: updatedOrder, consumed, details: getProductionOrderDetails(orderId) };
}

export function releaseOrderProductionReservation(orderId, managerId = "manager") {
  const released = releaseReservation(orderId);
  for (const req of findRows("OrderMaterialRequirements", row => row.order_id === orderId && row.status !== "Used")) {
    updateRow("OrderMaterialRequirements", "requirement_id", req.requirement_id, {
      status: "Released",
      updated_at: nowIso()
    });
  }
  logActivity({ entityType: "Order", entityId: orderId, action: "releaseOrderProductionReservation", newValue: { released }, source: managerId });
  return { released, details: getProductionOrderDetails(orderId) };
}

export function updateOrderMaterialRequirement(input, managerId = "manager") {
  assertValid("Змінити матеріал замовлення", input, {
    required: [
      { name: "requirement_id", label: "Рядок матеріалу" },
      { name: "component_id", label: "Матеріал" },
      { name: "required_qty", label: "Кількість" },
      { name: "unit", label: "Одиниця" },
      { name: "override_reason", label: "Причина зміни", instruction_uk: "Вкажіть причину ручної зміни, наприклад заміна матеріалу або уточнення рецептури." }
    ],
    numbers: [{ name: "required_qty", label: "Кількість", positive: true }]
  });

  const existing = findOne("OrderMaterialRequirements", row => row.requirement_id === input.requirement_id);
  if (!existing) throw new Error(`Requirement ${input.requirement_id} not found.`);
  const component = getComponent(input.component_id);
  if (!component) throw new Error(`Material ${input.component_id} not found.`);

  const unitCost = asNumber(component.unit_cost);
  const updated = updateRow("OrderMaterialRequirements", "requirement_id", input.requirement_id, {
    component_id: input.component_id,
    required_qty: Number(input.required_qty),
    unit: input.unit,
    estimated_unit_cost: unitCost,
    estimated_total_cost: Number((Number(input.required_qty) * unitCost).toFixed(2)),
    manager_override: true,
    override_reason: input.override_reason,
    source: "MANUAL_OVERRIDE",
    status: "Changed",
    updated_at: nowIso()
  });

  releaseReservation(existing.order_id);
  const reservationResult = reserveStock(existing.order_id, requiredPayload(existing.order_id));
  logActivity({ entityType: "Order", entityId: existing.order_id, action: "updateOrderMaterialRequirement", newValue: { updated, reservationResult }, source: managerId });
  return { requirement: updated, reservation_result: reservationResult, details: getProductionOrderDetails(existing.order_id) };
}

export function addManualOrderMaterial(input, managerId = "manager") {
  assertValid("Додати матеріал у замовлення", input, {
    required: [
      { name: "order_id", label: "Замовлення" },
      { name: "component_id", label: "Матеріал" },
      { name: "required_qty", label: "Кількість" },
      { name: "unit", label: "Одиниця" },
      { name: "override_reason", label: "Причина додавання" }
    ],
    numbers: [{ name: "required_qty", label: "Кількість", positive: true }]
  });

  const order = getOrder(input.order_id);
  if (!order) throw new Error(`Order ${input.order_id} not found.`);
  const component = getComponent(input.component_id);
  if (!component) throw new Error(`Material ${input.component_id} not found.`);
  const unitCost = asNumber(component.unit_cost);
  const requirement = appendRow("OrderMaterialRequirements", {
    requirement_id: id("REQ"),
    order_id: input.order_id,
    order_item_id: input.order_item_id || "",
    product_id: input.product_id || "",
    component_id: input.component_id,
    source: "MANUAL_OVERRIDE",
    required_qty: Number(input.required_qty),
    unit: input.unit,
    estimated_unit_cost: unitCost,
    estimated_total_cost: Number((Number(input.required_qty) * unitCost).toFixed(2)),
    manager_override: true,
    override_reason: input.override_reason,
    status: "Changed",
    created_at: nowIso(),
    updated_at: nowIso()
  });

  releaseReservation(input.order_id);
  const reservationResult = reserveStock(input.order_id, requiredPayload(input.order_id));
  logActivity({ entityType: "Order", entityId: input.order_id, action: "addManualOrderMaterial", newValue: { requirement, reservationResult }, source: managerId });
  return { requirement, reservation_result: reservationResult, details: getProductionOrderDetails(input.order_id) };
}
