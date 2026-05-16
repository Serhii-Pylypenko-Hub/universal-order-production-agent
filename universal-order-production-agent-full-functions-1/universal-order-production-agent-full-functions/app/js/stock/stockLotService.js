import { appendRow, findOne, findRows, updateRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { convert, validateUnit, canConvert } from "../utils/unitConverter.js";
import { logActivity } from "../audit/auditService.js";
import { assertValid } from "../errors/validationService.js";
import { getComponent } from "../orders/productService.js";
import { ensureDefaultWarehouse } from "./materialService.js";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function toBaseUnit(component, qty, unit) {
  if (!validateUnit(unit)) throw new Error(`Invalid unit: ${unit}`);
  if (!component) throw new Error("Material not found.");
  if (!canConvert(unit, component.unit)) {
    throw new Error(`Unit ${unit} cannot be converted to base unit ${component.unit}.`);
  }
  return convert(Number(qty), unit, component.unit);
}

function activeLots(componentId, warehouseId = "") {
  return findRows("StockLots", lot =>
    lot.component_id === componentId &&
    (!warehouseId || lot.warehouse_id === warehouseId) &&
    !["Consumed", "Closed", "Cancelled"].includes(lot.status) &&
    asNumber(lot.remaining_qty) - asNumber(lot.reserved_qty) > 0
  ).sort((a, b) => {
    const aExpire = a.expires_at || "9999-12-31";
    const bExpire = b.expires_at || "9999-12-31";
    if (aExpire !== bExpire) return aExpire.localeCompare(bExpire);
    const aReceived = a.received_at || a.created_at || "";
    const bReceived = b.received_at || b.created_at || "";
    return aReceived.localeCompare(bReceived);
  });
}

export function refreshStockBalance(componentId, warehouseId = "") {
  const component = getComponent(componentId);
  const lots = findRows("StockLots", lot =>
    lot.component_id === componentId &&
    (!warehouseId || lot.warehouse_id === warehouseId) &&
    !["Closed", "Cancelled"].includes(lot.status)
  );
  const currentQty = lots.reduce((sum, lot) => sum + asNumber(lot.remaining_qty), 0);
  const reservedQty = lots.reduce((sum, lot) => sum + asNumber(lot.reserved_qty), 0);
  const availableQty = currentQty - reservedQty;
  const totalCost = lots.reduce((sum, lot) => sum + (asNumber(lot.remaining_qty) * asNumber(lot.unit_cost)), 0);
  const weightedAvg = currentQty > 0 ? Number((totalCost / currentQty).toFixed(4)) : asNumber(component?.unit_cost);

  let status = "Достатньо";
  const stock = findOne("Stock", row => row.component_id === componentId && (!warehouseId || row.warehouse_id === warehouseId));
  const minQty = asNumber(stock?.min_qty || component?.min_qty);
  if (availableQty <= 0) status = "Немає";
  else if (availableQty <= minQty) status = "Низький залишок";

  const patch = {
    current_qty: Number(currentQty.toFixed(6)),
    reserved_qty: Number(reservedQty.toFixed(6)),
    available_qty: Number(availableQty.toFixed(6)),
    unit: component?.unit || stock?.unit || "",
    unit_cost: weightedAvg,
    weighted_avg_unit_cost: weightedAvg,
    availability_status: status,
    updated_at: nowIso()
  };

  if (stock) return updateRow("Stock", "stock_id", stock.stock_id, patch);

  return appendRow("Stock", {
    stock_id: id("STOCK"),
    component_id: componentId,
    warehouse_id: warehouseId,
    min_qty: asNumber(component?.min_qty),
    allow_standalone_sale: component?.allow_standalone_sale || false,
    linked_order_ids: "",
    ...patch
  });
}

export function receiveStockLot(input) {
  assertValid("Приймання партії на склад", input, {
    required: [
      { name: "component_id", label: "Матеріал" },
      { name: "qty", label: "Кількість" },
      { name: "unit", label: "Одиниця виміру" },
      { name: "unit_cost", label: "Ціна за одиницю" }
    ],
    numbers: [
      { name: "qty", label: "Кількість", positive: true },
      { name: "unit_cost", label: "Ціна за одиницю", positive: true }
    ]
  });

  const component = getComponent(input.component_id);
  if (!component) throw new Error(`Material ${input.component_id} not found.`);
  const warehouse = input.warehouse_id ? { warehouse_id: input.warehouse_id } : ensureDefaultWarehouse();
  const qty = toBaseUnit(component, input.qty, input.unit);
  const unitCost = Number(input.unit_cost);
  const lot = appendRow("StockLots", {
    lot_id: id("LOT"),
    component_id: component.component_id,
    warehouse_id: warehouse.warehouse_id,
    supplier_id: input.supplier_id || "",
    purchase_request_id: input.purchase_request_id || "",
    received_at: input.received_at || nowIso(),
    expires_at: input.expires_at || "",
    initial_qty: qty,
    remaining_qty: qty,
    reserved_qty: 0,
    unit: component.unit,
    unit_cost: unitCost,
    total_cost: Number((qty * unitCost).toFixed(2)),
    status: "Active",
    notes: input.notes || "",
    created_at: nowIso(),
    updated_at: nowIso()
  });

  appendRow("InventoryTransactions", {
    transaction_id: id("INV"),
    component_id: component.component_id,
    lot_id: lot.lot_id,
    warehouse_id: warehouse.warehouse_id,
    type: "IN",
    qty,
    unit: component.unit,
    unit_cost: unitCost,
    total_cost: lot.total_cost,
    order_id: "",
    reservation_id: "",
    purchase_request_id: input.purchase_request_id || "",
    reason: input.reason || "stock lot receipt",
    created_at: nowIso(),
    created_by: input.created_by || "system"
  });

  refreshStockBalance(component.component_id, warehouse.warehouse_id);
  logActivity({ entityType: "StockLot", entityId: lot.lot_id, action: "receiveStockLot", newValue: lot });
  return lot;
}

export function reserveLotsFifo({ orderId, componentId, requiredQty, unit, warehouseId = "", reservationId = "", mode = "AUTO_FIFO" }) {
  const component = getComponent(componentId);
  if (!component) throw new Error(`Material ${componentId} not found.`);
  const required = toBaseUnit(component, requiredQty, unit);
  let remaining = required;
  const reservedLots = [];

  for (const lot of activeLots(componentId, warehouseId)) {
    if (remaining <= 0) break;
    const available = asNumber(lot.remaining_qty) - asNumber(lot.reserved_qty);
    const reservedQty = Math.min(available, remaining);
    if (reservedQty <= 0) continue;

    updateRow("StockLots", "lot_id", lot.lot_id, {
      reserved_qty: Number((asNumber(lot.reserved_qty) + reservedQty).toFixed(6)),
      updated_at: nowIso()
    });

    const reservationLot = appendRow("ReservationLots", {
      reservation_lot_id: id("RL"),
      reservation_id: reservationId,
      order_id: orderId,
      lot_id: lot.lot_id,
      component_id: componentId,
      warehouse_id: lot.warehouse_id,
      reserved_qty: Number(reservedQty.toFixed(6)),
      unit: component.unit,
      unit_cost: lot.unit_cost,
      total_cost: Number((reservedQty * asNumber(lot.unit_cost)).toFixed(2)),
      mode,
      status: "Reserved",
      created_at: nowIso(),
      updated_at: nowIso()
    });
    reservedLots.push(reservationLot);
    remaining = Number((remaining - reservedQty).toFixed(6));
  }

  refreshStockBalance(componentId, warehouseId);
  return {
    required_qty: required,
    reserved_qty: Number((required - remaining).toFixed(6)),
    missing_qty: Math.max(remaining, 0),
    unit: component.unit,
    reservation_lots: reservedLots
  };
}

export function releaseReservationLots(reservationId, reason = "reservation released") {
  const rows = findRows("ReservationLots", row => row.reservation_id === reservationId && row.status === "Reserved");
  for (const row of rows) {
    const lot = findOne("StockLots", item => item.lot_id === row.lot_id);
    if (!lot) continue;
    updateRow("StockLots", "lot_id", lot.lot_id, {
      reserved_qty: Math.max(0, asNumber(lot.reserved_qty) - asNumber(row.reserved_qty)),
      updated_at: nowIso()
    });
    updateRow("ReservationLots", "reservation_lot_id", row.reservation_lot_id, {
      status: "Released",
      updated_at: nowIso()
    });
    appendRow("InventoryTransactions", {
      transaction_id: id("INV"),
      component_id: row.component_id,
      lot_id: row.lot_id,
      warehouse_id: row.warehouse_id,
      type: "RELEASE",
      qty: row.reserved_qty,
      unit: row.unit,
      unit_cost: row.unit_cost,
      total_cost: row.total_cost,
      order_id: row.order_id,
      reservation_id: reservationId,
      purchase_request_id: "",
      reason,
      created_at: nowIso(),
      created_by: "system"
    });
    refreshStockBalance(row.component_id, row.warehouse_id);
  }
  return rows.length;
}

export function consumeReservationLots(reservationId, reason = "production consumption") {
  const rows = findRows("ReservationLots", row => row.reservation_id === reservationId && row.status === "Reserved");
  for (const row of rows) {
    const lot = findOne("StockLots", item => item.lot_id === row.lot_id);
    if (!lot) continue;
    const remainingQty = Math.max(0, asNumber(lot.remaining_qty) - asNumber(row.reserved_qty));
    updateRow("StockLots", "lot_id", lot.lot_id, {
      remaining_qty: Number(remainingQty.toFixed(6)),
      reserved_qty: Math.max(0, asNumber(lot.reserved_qty) - asNumber(row.reserved_qty)),
      status: remainingQty <= 0 ? "Consumed" : lot.status,
      updated_at: nowIso()
    });
    updateRow("ReservationLots", "reservation_lot_id", row.reservation_lot_id, {
      status: "Used",
      updated_at: nowIso()
    });
    appendRow("InventoryTransactions", {
      transaction_id: id("INV"),
      component_id: row.component_id,
      lot_id: row.lot_id,
      warehouse_id: row.warehouse_id,
      type: "OUT",
      qty: row.reserved_qty,
      unit: row.unit,
      unit_cost: row.unit_cost,
      total_cost: row.total_cost,
      order_id: row.order_id,
      reservation_id: reservationId,
      purchase_request_id: "",
      reason,
      created_at: nowIso(),
      created_by: "system"
    });
    refreshStockBalance(row.component_id, row.warehouse_id);
  }
  return rows.length;
}
