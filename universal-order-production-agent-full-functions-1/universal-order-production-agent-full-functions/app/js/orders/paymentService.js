import { findOne, updateRow, appendRow } from "../data/rowRepository.js";
import { nowIso } from "../utils/time.js";
import { logActivity } from "../audit/auditService.js";
import { updateOrderStatus } from "./orderService.js";

export function confirmPayment(orderId, { amount, method = "cash", note = "" }) {
  const order = findOne("Orders", r => r.order_id === orderId);
  if (!order) return null;

  const paid = Number(amount);
  const total = Number(order.final_price || order.proposed_price || 0);
  const paymentStatus = paid >= total ? "Paid" : "PartiallyPaid";

  const updated = updateRow("Orders", "order_id", orderId, {
    payment_status: paymentStatus,
    payment_method: method,
    payment_amount: paid,
    payment_note: note,
    updated_at: nowIso()
  });

  if (paymentStatus === "Paid") {
    updateOrderStatus(orderId, "Paid");
  }

  logActivity({
    entityType: "Order",
    entityId: orderId,
    action: "confirmPayment",
    oldValue: order.payment_status,
    newValue: paymentStatus,
    source: "manager"
  });

  return updated;
}

export function addPartialPayment(orderId, { amount, method = "transfer", note = "" }) {
  const order = findOne("Orders", r => r.order_id === orderId);
  if (!order) return null;

  const prev = Number(order.payment_amount || 0);
  const added = Number(amount);
  const total = Number(order.final_price || order.proposed_price || 0);
  const newTotal = prev + added;
  const paymentStatus = newTotal >= total ? "Paid" : "PartiallyPaid";

  const updated = updateRow("Orders", "order_id", orderId, {
    payment_status: paymentStatus,
    payment_method: method,
    payment_amount: newTotal,
    payment_note: note,
    updated_at: nowIso()
  });

  appendRow("ActivityLog", {
    log_id: `LOG-${Date.now()}`,
    timestamp: nowIso(),
    entity_type: "Order",
    entity_id: orderId,
    action: "partialPayment",
    old_value: String(prev),
    new_value: String(newTotal),
    source: "manager"
  });

  if (paymentStatus === "Paid") {
    updateOrderStatus(orderId, "Paid");
  }

  return updated;
}

export function getPaymentSummary(orderId) {
  const order = findOne("Orders", r => r.order_id === orderId);
  if (!order) return null;

  const total = Number(order.final_price || order.proposed_price || 0);
  const paid = Number(order.payment_amount || 0);

  return {
    order_id: orderId,
    payment_status: order.payment_status,
    payment_method: order.payment_method,
    total_price: total,
    amount_paid: paid,
    balance_due: Number((total - paid).toFixed(2)),
    is_fully_paid: paid >= total
  };
}
