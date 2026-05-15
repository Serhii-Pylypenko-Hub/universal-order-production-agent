import { appendRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";

export function logActivity({ entityType, entityId, action, oldValue = null, newValue = null, source = "system" }) {
  return appendRow("ActivityLog", {
    log_id: id("LOG"),
    timestamp: nowIso(),
    entity_type: entityType,
    entity_id: entityId,
    action,
    old_value: oldValue ? JSON.stringify(oldValue) : "",
    new_value: newValue ? JSON.stringify(newValue) : "",
    source
  });
}
