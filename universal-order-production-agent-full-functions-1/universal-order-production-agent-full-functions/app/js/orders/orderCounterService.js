import { findRows } from "../data/rowRepository.js";

const CLOSED_STATUSES = new Set(["Cancelled"]);

export function getClientOrderIndex(clientId) {
  const orders = findRows("Orders", r => r.client_id === clientId && !CLOSED_STATUSES.has(r.status));
  return orders.length + 1;
}
