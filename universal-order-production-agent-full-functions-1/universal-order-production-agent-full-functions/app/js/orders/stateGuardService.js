import { findRows } from "../data/rowRepository.js";

export const ORDER_STATUSES = [
  "New", "CollectingInfo", "ProposalSent", "AwaitingPayment", "PartiallyPaid", "Paid",
  "WaitingPurchase", "Scheduled", "InProduction", "Ready", "Sent", "Delivered", "PickedUp", "Closed", "Cancelled"
];

const ALLOWED_TRANSITIONS = {
  New: ["CollectingInfo", "ProposalSent", "WaitingPurchase", "Scheduled", "Cancelled"],
  CollectingInfo: ["ProposalSent", "WaitingPurchase", "Cancelled"],
  ProposalSent: ["AwaitingPayment", "PartiallyPaid", "Paid", "Scheduled", "Cancelled"],
  AwaitingPayment: ["PartiallyPaid", "Paid", "Cancelled"],
  PartiallyPaid: ["Paid", "Scheduled", "Cancelled"],
  Paid: ["Scheduled", "Cancelled"],
  WaitingPurchase: ["ProposalSent", "Scheduled", "Cancelled"],
  Scheduled: ["InProduction", "Cancelled"],
  InProduction: ["Ready"],
  Ready: ["Sent", "Delivered", "PickedUp"],
  Sent: ["Delivered"],
  Delivered: ["Closed"],
  PickedUp: ["Closed"],
  Closed: [],
  Cancelled: []
};

function hasReservations(orderId) {
  return findRows("Reservations", r => r.order_id === orderId && ["Reserved", "Used"].includes(r.status)).length > 0;
}

function hasCalendarSlot(orderId) {
  return findRows("CalendarLog", r => r.order_id === orderId && r.status !== "Cancelled").length > 0;
}

export function validateOrderTransition(order, nextStatus) {
  if (!order) return { ok: false, reason: "ORDER_NOT_FOUND" };
  if (!ORDER_STATUSES.includes(nextStatus)) return { ok: false, reason: "UNKNOWN_STATUS" };

  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowed.includes(nextStatus)) {
    return { ok: false, reason: `TRANSITION_NOT_ALLOWED:${order.status}->${nextStatus}` };
  }

  if (nextStatus === "InProduction" && !hasReservations(order.order_id)) {
    return { ok: false, reason: "NO_RESERVATIONS_FOR_PRODUCTION" };
  }

  if (nextStatus === "InProduction" && !hasCalendarSlot(order.order_id)) {
    return { ok: false, reason: "NO_CALENDAR_SLOT_FOR_PRODUCTION" };
  }

  if (["Sent", "Delivered", "PickedUp"].includes(nextStatus) && order.status !== "Ready") {
    return { ok: false, reason: "ORDER_NOT_READY" };
  }

  return { ok: true, reason: "OK" };
}
