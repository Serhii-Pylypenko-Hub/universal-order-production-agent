import { appendRow, findRows, updateRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";

export function saveClientPreference({ clientId, orderId = "", productId = "", preferenceType, preferenceValue, source = "order" }) {
  if (!clientId || !preferenceType || !preferenceValue) return null;
  return appendRow("ClientPreferencesHistory", {
    preference_id: id("PREF"),
    client_id: clientId,
    order_id: orderId,
    product_id: productId,
    preference_type: preferenceType,
    preference_value: preferenceValue,
    source,
    created_at: nowIso()
  });
}

export function saveOrderPreferences({ clientId, orderId, productId, preferences = "", restrictions = "", customizationSummary = "" }) {
  if (preferences) saveClientPreference({ clientId, orderId, productId, preferenceType: "preferences", preferenceValue: preferences });
  if (restrictions) saveClientPreference({ clientId, orderId, productId, preferenceType: "restriction_or_allergy", preferenceValue: restrictions });
  if (customizationSummary) saveClientPreference({ clientId, orderId, productId, preferenceType: "customization", preferenceValue: customizationSummary });
  updateClientHistorySummary(clientId);
}

export function getClientPreferenceHistory(clientId) {
  return findRows("ClientPreferencesHistory", r => r.client_id === clientId);
}

export function updateClientHistorySummary(clientId) {
  const history = getClientPreferenceHistory(clientId).slice(-10);
  const summary = history.map(h => `${h.preference_type}: ${h.preference_value}`).join(" | ");
  updateRow("Clients", "client_id", clientId, { order_history_summary: summary, updated_at: nowIso() });
  return summary;
}
