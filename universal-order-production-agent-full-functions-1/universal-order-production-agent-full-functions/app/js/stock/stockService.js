import { appendRow, findOne, findRows, updateRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { logActivity } from "../audit/auditService.js";
import { assertValid } from "../errors/validationService.js";
import { reserveLotsFifo, releaseReservationLots, consumeReservationLots, refreshStockBalance } from "./stockLotService.js";

export function getStock(componentId) {
  return findOne("Stock", r => r.component_id === componentId);
}

export function getAvailableStock(componentId) {
  const stock = getStock(componentId);
  if (!stock) return 0;
  if (stock.available_qty !== undefined && stock.available_qty !== "") return Number(stock.available_qty);
  return Number(stock.current_qty) - Number(stock.reserved_qty || 0);
}

export function reserveStock(orderId, requiredComponents) {
  const results = [];
  for (const item of requiredComponents) {
    const stock = getStock(item.component_id);
    if (!stock) {
      results.push({ ...item, available: 0, reserved: 0, missing: Number(item.required_qty) });
      continue;
    }
    const available = getAvailableStock(item.component_id);
    const required = Number(item.required_qty);
    let reserved = Math.min(available, required);
    let missing = Math.max(required - available, 0);

    if (reserved > 0) {
      const plannedReserved = reserved;
      const reservation = appendRow("Reservations", {
        reservation_id: id("RES"),
        order_id: orderId,
        component_id: item.component_id,
        reserved_qty: reserved,
        unit: item.unit,
        reservation_mode: "AUTO_FIFO",
        estimated_unit_cost: stock.unit_cost || 0,
        estimated_total_cost: Number((reserved * Number(stock.unit_cost || 0)).toFixed(2)),
        status: "Reserved",
        created_at: nowIso(),
        updated_at: nowIso()
      });
      const lotResult = reserveLotsFifo({
        orderId,
        componentId: item.component_id,
        requiredQty: reserved,
        unit: item.unit,
        warehouseId: stock.warehouse_id || "",
        reservationId: reservation.reservation_id
      });

      if (!lotResult.reservation_lots.length) {
        reserved = plannedReserved;
        missing = Number((required - reserved).toFixed(6));
        updateRow("Stock", "stock_id", stock.stock_id, {
          reserved_qty: Number(stock.reserved_qty || 0) + reserved,
          available_qty: Number(stock.current_qty || 0) - Number(stock.reserved_qty || 0) - reserved,
          updated_at: nowIso()
        });
        appendRow("InventoryTransactions", {
          transaction_id: id("INV"),
          component_id: item.component_id,
          lot_id: "",
          warehouse_id: stock.warehouse_id || "",
          type: "RESERVE",
          qty: reserved,
          unit: item.unit,
          unit_cost: stock.unit_cost || 0,
          total_cost: Number((reserved * Number(stock.unit_cost || 0)).toFixed(2)),
          order_id: orderId,
          reservation_id: reservation.reservation_id,
          purchase_request_id: "",
          reason: "order reservation",
          created_at: nowIso(),
          created_by: "system"
        });
      } else {
        reserved = lotResult.reserved_qty;
        missing = Number((required - reserved).toFixed(6));
      }
    }

    results.push({ ...item, available, reserved, missing });
  }
  logActivity({ entityType: "Order", entityId: orderId, action: "reserveStock", newValue: results });
  return results;
}

export function releaseReservation(orderId) {
  const reservations = findRows("Reservations", r => r.order_id === orderId && r.status === "Reserved");
  for (const res of reservations) {
    const stock = getStock(res.component_id);
    const lotCount = releaseReservationLots(res.reservation_id);
    if (lotCount > 0) {
      updateRow("Reservations", "reservation_id", res.reservation_id, { status: "Released", updated_at: nowIso() });
      continue;
    }
    if (!stock) continue;
    updateRow("Stock", "stock_id", stock.stock_id, {
      reserved_qty: Math.max(0, Number(stock.reserved_qty || 0) - Number(res.reserved_qty)),
      available_qty: Number(stock.current_qty || 0) - Math.max(0, Number(stock.reserved_qty || 0) - Number(res.reserved_qty)),
      updated_at: nowIso()
    });
    updateRow("Reservations", "reservation_id", res.reservation_id, { status: "Released", updated_at: nowIso() });
    appendRow("InventoryTransactions", {
      transaction_id: id("INV"),
      component_id: res.component_id,
      lot_id: "",
      warehouse_id: stock.warehouse_id || "",
      type: "RELEASE",
      qty: res.reserved_qty,
      unit: res.unit,
      unit_cost: stock.unit_cost || 0,
      total_cost: Number(res.reserved_qty || 0) * Number(stock.unit_cost || 0),
      order_id: orderId,
      reservation_id: res.reservation_id,
      purchase_request_id: "",
      reason: "reservation released",
      created_at: nowIso(),
      created_by: "system"
    });
  }
  logActivity({ entityType: "Order", entityId: orderId, action: "releaseReservation" });
  return reservations.length;
}

export function consumeReservedStock(orderId) {
  const reservations = findRows("Reservations", r => r.order_id === orderId && r.status === "Reserved");
  for (const res of reservations) {
    const stock = getStock(res.component_id);
    const lotCount = consumeReservationLots(res.reservation_id);
    if (lotCount > 0) {
      updateRow("Reservations", "reservation_id", res.reservation_id, { status: "Used", updated_at: nowIso() });
      continue;
    }
    if (!stock) continue;
    updateRow("Stock", "stock_id", stock.stock_id, {
      current_qty: Number(stock.current_qty) - Number(res.reserved_qty),
      reserved_qty: Math.max(0, Number(stock.reserved_qty || 0) - Number(res.reserved_qty)),
      available_qty: Number(stock.current_qty) - Number(res.reserved_qty) - Math.max(0, Number(stock.reserved_qty || 0) - Number(res.reserved_qty)),
      updated_at: nowIso()
    });
    updateRow("Reservations", "reservation_id", res.reservation_id, { status: "Used", updated_at: nowIso() });
    appendRow("InventoryTransactions", {
      transaction_id: id("INV"),
      component_id: res.component_id,
      lot_id: "",
      warehouse_id: stock.warehouse_id || "",
      type: "OUT",
      qty: res.reserved_qty,
      unit: res.unit,
      unit_cost: stock.unit_cost || 0,
      total_cost: Number(res.reserved_qty || 0) * Number(stock.unit_cost || 0),
      order_id: orderId,
      reservation_id: res.reservation_id,
      purchase_request_id: "",
      reason: "production consumption",
      created_at: nowIso(),
      created_by: "system"
    });
  }
  return reservations.length;
}

export function addStock(componentId, qty, reason = "manual add") {
  assertValid("Поповнення залишку", { componentId, qty }, {
    required: [
      { name: "componentId", label: "Матеріал" },
      { name: "qty", label: "Кількість" }
    ],
    numbers: [{ name: "qty", label: "Кількість", positive: true }]
  });
  const stock = getStock(componentId);
  if (!stock) throw new Error(`Material stock not found: ${componentId}`);
  updateRow("Stock", "stock_id", stock.stock_id, {
    current_qty: Number(stock.current_qty) + Number(qty),
    available_qty: Number(stock.current_qty) + Number(qty) - Number(stock.reserved_qty || 0),
    updated_at: nowIso()
  });
  appendRow("InventoryTransactions", {
    transaction_id: id("INV"),
    component_id: componentId,
    lot_id: "",
    warehouse_id: stock.warehouse_id || "",
    type: "IN",
    qty,
    unit: stock.unit,
    unit_cost: stock.unit_cost || 0,
    total_cost: Number(qty) * Number(stock.unit_cost || 0),
    order_id: "",
    reservation_id: "",
    purchase_request_id: "",
    reason,
    created_at: nowIso(),
    created_by: "system"
  });
  refreshStockBalance(componentId, stock.warehouse_id || "");
  return getStock(componentId);
}
