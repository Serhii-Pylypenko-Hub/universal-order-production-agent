import { appendRow, findOne, findRows, updateRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { logActivity } from "../audit/auditService.js";

export function getStock(componentId) {
  return findOne("Stock", r => r.component_id === componentId);
}

export function getAvailableStock(componentId) {
  const stock = getStock(componentId);
  if (!stock) return 0;
  return Number(stock.current_qty) - Number(stock.reserved_qty || 0);
}

export function reserveStock(orderId, requiredComponents) {
  const results = [];
  for (const item of requiredComponents) {
    const stock = getStock(item.component_id);
    const available = getAvailableStock(item.component_id);
    const required = Number(item.required_qty);
    const reserved = Math.min(available, required);
    const missing = Math.max(required - available, 0);

    if (reserved > 0) {
      updateRow("Stock", "stock_id", stock.stock_id, {
        reserved_qty: Number(stock.reserved_qty || 0) + reserved
      });
      appendRow("Reservations", {
        reservation_id: id("RES"),
        order_id: orderId,
        component_id: item.component_id,
        reserved_qty: reserved,
        unit: item.unit,
        status: "Reserved",
        created_at: nowIso(),
        updated_at: nowIso()
      });
      appendRow("InventoryTransactions", {
        transaction_id: id("INV"),
        component_id: item.component_id,
        type: "RESERVE",
        qty: reserved,
        unit: item.unit,
        order_id: orderId,
        reason: "order reservation",
        created_at: nowIso()
      });
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
    updateRow("Stock", "stock_id", stock.stock_id, {
      reserved_qty: Math.max(0, Number(stock.reserved_qty || 0) - Number(res.reserved_qty))
    });
    updateRow("Reservations", "reservation_id", res.reservation_id, { status: "Released", updated_at: nowIso() });
    appendRow("InventoryTransactions", {
      transaction_id: id("INV"),
      component_id: res.component_id,
      type: "RELEASE",
      qty: res.reserved_qty,
      unit: res.unit,
      order_id: orderId,
      reason: "reservation released",
      created_at: nowIso()
    });
  }
  logActivity({ entityType: "Order", entityId: orderId, action: "releaseReservation" });
  return reservations.length;
}

export function consumeReservedStock(orderId) {
  const reservations = findRows("Reservations", r => r.order_id === orderId && r.status === "Reserved");
  for (const res of reservations) {
    const stock = getStock(res.component_id);
    updateRow("Stock", "stock_id", stock.stock_id, {
      current_qty: Number(stock.current_qty) - Number(res.reserved_qty),
      reserved_qty: Math.max(0, Number(stock.reserved_qty || 0) - Number(res.reserved_qty))
    });
    updateRow("Reservations", "reservation_id", res.reservation_id, { status: "Used", updated_at: nowIso() });
    appendRow("InventoryTransactions", {
      transaction_id: id("INV"),
      component_id: res.component_id,
      type: "OUT",
      qty: res.reserved_qty,
      unit: res.unit,
      order_id: orderId,
      reason: "production consumption",
      created_at: nowIso()
    });
  }
  return reservations.length;
}

export function addStock(componentId, qty, reason = "manual add") {
  const stock = getStock(componentId);
  updateRow("Stock", "stock_id", stock.stock_id, {
    current_qty: Number(stock.current_qty) + Number(qty)
  });
  appendRow("InventoryTransactions", {
    transaction_id: id("INV"),
    component_id: componentId,
    type: "IN",
    qty,
    unit: stock.unit,
    order_id: "",
    reason,
    created_at: nowIso()
  });
  return getStock(componentId);
}
