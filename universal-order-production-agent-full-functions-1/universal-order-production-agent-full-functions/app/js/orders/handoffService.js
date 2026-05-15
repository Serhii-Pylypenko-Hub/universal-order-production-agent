import { findOne, updateRow, appendRow, findRows } from "../data/rowRepository.js";
import { nowIso } from "../utils/time.js";
import { id } from "../utils/ids.js";
import { logActivity } from "../audit/auditService.js";
import { createTask } from "../tasks/taskService.js";

export const HANDOFF_STATUSES = {
  REQUIRED: "AI_HANDOFF_REQUIRED",
  WAITING: "WAITING_MANAGER",
  ACTIVE: "MANAGER_ACTIVE",
  RESOLVED: "HANDOFF_RESOLVED"
};

export function requestHandoff(orderId, { reason = "", clientMessage = "", source = "ai" } = {}) {
  const existing = findOne("Orders", r => r.order_id === orderId);

  // Store handoff request
  const handoff = appendRow("Handoffs", {
    handoff_id: id("HO"),
    order_id: orderId || "",
    status: HANDOFF_STATUSES.REQUIRED,
    reason,
    client_message: clientMessage,
    source,
    created_at: nowIso(),
    updated_at: nowIso(),
    resolved_at: "",
    resolution: ""
  });

  if (existing) {
    updateRow("Orders", "order_id", orderId, {
      handoff_status: HANDOFF_STATUSES.REQUIRED,
      updated_at: nowIso()
    });
  }

  createTask({
    orderId: orderId || "",
    type: "Handoff",
    title: `AI handoff required: ${reason || "Needs manager attention"}`,
    priority: "WARNING"
  });

  logActivity({
    entityType: "Handoff",
    entityId: handoff.handoff_id,
    action: "requestHandoff",
    newValue: { reason, source },
    source
  });

  return handoff;
}

export function managerPickup(handoffId) {
  const handoff = findOne("Handoffs", r => r.handoff_id === handoffId);
  if (!handoff) return null;

  const updated = updateRow("Handoffs", "handoff_id", handoffId, {
    status: HANDOFF_STATUSES.ACTIVE,
    updated_at: nowIso()
  });

  if (handoff.order_id) {
    updateRow("Orders", "order_id", handoff.order_id, {
      handoff_status: HANDOFF_STATUSES.ACTIVE,
      updated_at: nowIso()
    });
  }

  logActivity({ entityType: "Handoff", entityId: handoffId, action: "managerPickup", source: "manager" });
  return updated;
}

export function resolveHandoff(handoffId, { resolution = "" } = {}) {
  const handoff = findOne("Handoffs", r => r.handoff_id === handoffId);
  if (!handoff) return null;

  const updated = updateRow("Handoffs", "handoff_id", handoffId, {
    status: HANDOFF_STATUSES.RESOLVED,
    resolution,
    resolved_at: nowIso(),
    updated_at: nowIso()
  });

  if (handoff.order_id) {
    updateRow("Orders", "order_id", handoff.order_id, {
      handoff_status: HANDOFF_STATUSES.RESOLVED,
      updated_at: nowIso()
    });
  }

  logActivity({ entityType: "Handoff", entityId: handoffId, action: "resolveHandoff", newValue: resolution, source: "manager" });
  return updated;
}

export function getPendingHandoffs() {
  return findRows("Handoffs", r =>
    [HANDOFF_STATUSES.REQUIRED, HANDOFF_STATUSES.WAITING, HANDOFF_STATUSES.ACTIVE].includes(r.status)
  );
}
