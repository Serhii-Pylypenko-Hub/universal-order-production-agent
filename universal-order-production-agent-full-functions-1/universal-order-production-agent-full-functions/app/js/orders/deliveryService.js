import { findOne, updateRow } from "../data/rowRepository.js";
import { nowIso } from "../utils/time.js";
import { logActivity } from "../audit/auditService.js";
import { updateOrderStatus } from "./orderService.js";
import { consumeReservedStock } from "../stock/stockService.js";

export function markReadyForPickup(orderId) {
  const order = findOne("Orders", r => r.order_id === orderId);
  if (!order) return null;

  const updated = updateOrderStatus(orderId, "Ready");
  logActivity({ entityType: "Order", entityId: orderId, action: "markReady", newValue: "Ready", source: "manager" });
  return updated;
}

export function confirmPickup(orderId) {
  const order = findOne("Orders", r => r.order_id === orderId);
  if (!order) return null;

  consumeReservedStock(orderId);
  const updated = updateRow("Orders", "order_id", orderId, {
    status: "PickedUp",
    actual_delivery_at: nowIso(),
    updated_at: nowIso()
  });

  logActivity({ entityType: "Order", entityId: orderId, action: "confirmPickup", newValue: "PickedUp", source: "manager" });
  return updated;
}

export function markShipped(orderId, { trackingNumber = "", carrier = "", estimatedArrival = "" } = {}) {
  const order = findOne("Orders", r => r.order_id === orderId);
  if (!order) return null;

  const updated = updateRow("Orders", "order_id", orderId, {
    status: "Sent",
    tracking_number: trackingNumber,
    carrier,
    estimated_arrival: estimatedArrival,
    shipped_at: nowIso(),
    updated_at: nowIso()
  });

  logActivity({ entityType: "Order", entityId: orderId, action: "markShipped", newValue: "Sent", source: "manager" });
  return updated;
}

export function confirmDelivered(orderId) {
  const order = findOne("Orders", r => r.order_id === orderId);
  if (!order) return null;

  const updated = updateRow("Orders", "order_id", orderId, {
    status: "Delivered",
    actual_delivery_at: nowIso(),
    updated_at: nowIso()
  });

  logActivity({ entityType: "Order", entityId: orderId, action: "confirmDelivered", newValue: "Delivered", source: "manager" });
  return updated;
}

export function getDeliverySummary(orderId) {
  const order = findOne("Orders", r => r.order_id === orderId);
  if (!order) return null;
  return {
    order_id: orderId,
    status: order.status,
    delivery_method: order.delivery_method,
    ready_date: order.ready_date,
    shipping_date: order.shipping_date,
    tracking_number: order.tracking_number || null,
    carrier: order.carrier || null,
    actual_delivery_at: order.actual_delivery_at || null
  };
}
