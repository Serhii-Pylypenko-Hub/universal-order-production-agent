import { appendRow, findOne, findRows } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { getProductBOM } from "../orders/productService.js";

export function getProductOptions(productId) {
  return findRows("ProductOptions", r => r.product_id === productId && String(r.is_active) !== "false");
}

const CUSTOMIZATION_ALIASES = new Map([
  ["add raspberry", "Додати малину"],
  ["додати малини", "Додати малину"],
  ["більше малини", "Додати малину"],
  ["extra chocolate", "Більше шоколаду"],
  ["більше шоколаду", "Більше шоколаду"],
  ["add nuts", "Додати горіхи"],
  ["додати горіхи", "Додати горіхи"],
  ["з горіхами", "Додати горіхи"],
  ["remove nuts", "Без горіхів"],
  ["no nuts", "Без горіхів"],
  ["без горіхів", "Без горіхів"],
  ["не класти горіхи", "Без горіхів"],
  ["add inscription", "Додати напис"],
  ["inscription", "Додати напис"],
  ["напис", "Додати напис"],
  ["extra berries", "Більше ягід"],
  ["більше ягід", "Більше ягід"]
]);

function normalizeCustomizationName(value) {
  const raw = String(value || "").trim();
  return CUSTOMIZATION_ALIASES.get(raw.toLowerCase()) || raw;
}

export function resolveCustomizationInput(productId, customizations = []) {
  const options = getProductOptions(productId);
  return customizations.map(custom => {
    const normalizedName = normalizeCustomizationName(custom.name || custom.option_name || "");
    const option = custom.option_id
      ? options.find(o => o.option_id === custom.option_id)
      : options.find(o => o.name.toLowerCase() === normalizedName.toLowerCase());

    if (!option) {
      return {
        valid: false,
        type: "note",
        name: normalizedName || "custom note",
        custom_value: custom.custom_value || custom.value || "",
        price_delta: 0,
        cost_delta: 0,
        work_hours_delta: 0,
        component_id: "",
        qty_delta: 0,
        unit: ""
      };
    }

    return {
      valid: true,
      option_id: option.option_id,
      name: option.name,
      type: option.type,
      custom_value: custom.custom_value || custom.value || "",
      component_id: option.component_id || "",
      qty_delta: Number(option.qty_delta || 0),
      unit: option.unit || "",
      price_delta: Number(option.price_delta || 0),
      cost_delta: Number(option.cost_delta || 0),
      work_hours_delta: Number(option.work_hours_delta || 0)
    };
  });
}

export function calculateCustomizationTotals(productId, customizations = []) {
  const resolved = resolveCustomizationInput(productId, customizations);
  return {
    resolved,
    price_delta: resolved.reduce((s, x) => s + Number(x.price_delta || 0), 0),
    cost_delta: resolved.reduce((s, x) => s + Number(x.cost_delta || 0), 0),
    work_hours_delta: resolved.reduce((s, x) => s + Number(x.work_hours_delta || 0), 0)
  };
}

export function calculateFinalRequiredComponents(productId, quantity, customizations = []) {
  const base = getProductBOM(productId).map(item => ({
    component_id: item.component_id,
    required_qty: Number(item.qty_per_unit) * Number(quantity),
    unit: item.unit,
    source: "base_bom"
  }));

  const totals = calculateCustomizationTotals(productId, customizations);
  const merged = [...base];

  for (const custom of totals.resolved) {
    if (!custom.component_id || !custom.qty_delta) continue;
    const deltaQty = Number(custom.qty_delta) * Number(quantity);
    const existing = merged.find(x => x.component_id === custom.component_id && x.unit === custom.unit);
    if (existing) {
      existing.required_qty = Math.max(0, Number(existing.required_qty) + deltaQty);
      existing.source = "base_bom_plus_customization";
    } else if (deltaQty > 0) {
      merged.push({
        component_id: custom.component_id,
        required_qty: deltaQty,
        unit: custom.unit,
        source: "customization"
      });
    }
  }

  return { required_components: merged, customization_totals: totals };
}

export function saveOrderItemCustomizations(orderItemId, productId, customizations = []) {
  const totals = calculateCustomizationTotals(productId, customizations);
  for (const custom of totals.resolved) {
    appendRow("OrderItemCustomizations", {
      customization_id: id("CUST"),
      order_item_id: orderItemId,
      option_id: custom.option_id || "",
      custom_value: custom.custom_value || custom.name || "",
      type: custom.type,
      component_id: custom.component_id || "",
      qty_delta: custom.qty_delta || 0,
      unit: custom.unit || "",
      price_delta: custom.price_delta || 0,
      cost_delta: custom.cost_delta || 0,
      work_hours_delta: custom.work_hours_delta || 0,
      created_at: nowIso()
    });
  }
  return totals;
}

export function summarizeCustomizations(productId, customizations = []) {
  const totals = calculateCustomizationTotals(productId, customizations);
  return totals.resolved.map(x => x.name || x.custom_value).filter(Boolean).join("; ");
}
