import { findOne, appendRow, updateRow, getRows } from "../data/rowRepository.js";
import { nowIso } from "../utils/time.js";

const DEFAULTS = {
  cost_change_threshold_percent: "3",
  critical_cost_change_percent: "10",
  auto_recalculate_price: "true",
  price_buffer_percent: "5",
  require_manager_approval: "true",
  daily_capacity_hours: "8",
  safety_stock_days: "7",
  max_purchase_request_age_days: "14",
  deadline_check_interval_hours: "24",
  timezone: "Europe/Kyiv"
};

export function getSetting(key) {
  const row = findOne("Settings", r => r.key === key);
  if (row) return row.value;
  return DEFAULTS[key] ?? null;
}

export function setSetting(key, value) {
  const existing = findOne("Settings", r => r.key === key);
  if (existing) {
    return updateRow("Settings", "key", key, { value: String(value), updated_at: nowIso() });
  }
  return appendRow("Settings", { key, value: String(value), created_at: nowIso(), updated_at: nowIso() });
}

export function getThresholds() {
  return {
    costChangeThreshold: Number(getSetting("cost_change_threshold_percent")),
    criticalCostChange: Number(getSetting("critical_cost_change_percent")),
    autoRecalculatePrice: getSetting("auto_recalculate_price") === "true",
    priceBuffer: Number(getSetting("price_buffer_percent")),
    requireManagerApproval: getSetting("require_manager_approval") === "true",
    dailyCapacityHours: Number(getSetting("daily_capacity_hours")),
    safetyStockDays: Number(getSetting("safety_stock_days")),
    maxPurchaseAgeDays: Number(getSetting("max_purchase_request_age_days")),
    timezone: getSetting("timezone")
  };
}

export function getAllSettings() {
  const rows = getRows("Settings");
  const result = { ...DEFAULTS };
  for (const row of rows) {
    result[row.key] = row.value;
  }
  return result;
}

export function initDefaultSettings() {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    const existing = findOne("Settings", r => r.key === key);
    if (!existing) {
      appendRow("Settings", { key, value, created_at: nowIso(), updated_at: nowIso() });
    }
  }
}
