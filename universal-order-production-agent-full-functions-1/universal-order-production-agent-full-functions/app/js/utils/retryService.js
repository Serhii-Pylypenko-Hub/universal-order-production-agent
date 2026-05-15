import { findRows, updateRow, appendRow } from "../data/rowRepository.js";
import { nowIso } from "../utils/time.js";
import { id } from "../utils/ids.js";

// Backoff delays in ms: retry 1=1min, 2=5min, 3=15min
const BACKOFF = [60_000, 300_000, 900_000];

export function saveFailedOperation(operation, payload, errorMessage) {
  return appendRow("FailedOperations", {
    failed_op_id: id("FOP"),
    operation,
    entity_type: payload?.entity_type || "",
    entity_id: payload?.entity_id || "",
    payload: JSON.stringify(payload),
    error_message: String(errorMessage),
    retry_count: 0,
    max_retries: 3,
    status: "Pending",
    failed_at: nowIso(),
    next_retry_at: new Date(Date.now() + BACKOFF[0]).toISOString()
  });
}

export async function retryPendingOperations(handlerMap) {
  const now = new Date();
  const pending = findRows("FailedOperations", r =>
    r.status === "Pending" && Number(r.retry_count) < Number(r.max_retries) &&
    new Date(r.next_retry_at) <= now
  );

  for (const op of pending) {
    const handler = handlerMap[op.operation];
    if (!handler) continue;

    try {
      const payload = JSON.parse(op.payload);
      await handler(payload);
      updateRow("FailedOperations", "failed_op_id", op.failed_op_id, {
        status: "Resolved",
        resolved_at: nowIso()
      });
    } catch (err) {
      const retryCount = Number(op.retry_count) + 1;
      const isExhausted = retryCount >= Number(op.max_retries);
      const nextDelay = BACKOFF[retryCount] || BACKOFF[BACKOFF.length - 1];
      updateRow("FailedOperations", "failed_op_id", op.failed_op_id, {
        retry_count: retryCount,
        status: isExhausted ? "Failed" : "Pending",
        last_error: String(err.message),
        next_retry_at: isExhausted ? "" : new Date(Date.now() + nextDelay).toISOString()
      });
    }
  }
}

export function getFailedOperationsSummary() {
  const all = findRows("FailedOperations", () => true);
  return {
    pending: all.filter(r => r.status === "Pending").length,
    failed: all.filter(r => r.status === "Failed").length,
    resolved: all.filter(r => r.status === "Resolved").length,
    total: all.length
  };
}
