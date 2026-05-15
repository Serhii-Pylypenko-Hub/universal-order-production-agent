import { appendRow, findOne } from "./rowRepository.js";
import { nowIso } from "../utils/time.js";

export function isEventProcessed(eventId) {
  if (!eventId) return false;
  return Boolean(findOne("ProcessedEvents", r => r.event_id === eventId && r.status === "Processed"));
}

export function markEventProcessed(eventId, source = "unknown") {
  if (!eventId) return null;
  if (isEventProcessed(eventId)) return findOne("ProcessedEvents", r => r.event_id === eventId);
  return appendRow("ProcessedEvents", {
    event_id: eventId,
    source,
    processed_at: nowIso(),
    status: "Processed"
  });
}

export function withIdempotency({ eventId, source = "unknown", onDuplicate = () => ({ duplicated: true }) }, fn) {
  if (isEventProcessed(eventId)) {
    return onDuplicate();
  }
  const result = fn();
  markEventProcessed(eventId, source);
  return result;
}
