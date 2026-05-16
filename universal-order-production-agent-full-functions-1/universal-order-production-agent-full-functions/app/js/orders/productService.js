import { findOne, findRows } from "../data/rowRepository.js";

const PRODUCT_ALIASES = new Map([
  ["chocolate cake", "Шоколадний торт"],
  ["chocolate", "Шоколадний торт"],
  ["шоколадний", "Шоколадний торт"],
  ["шоколадний торт", "Шоколадний торт"],
  ["honey cake", "Медовик"],
  ["honey", "Медовик"],
  ["медовий торт", "Медовик"],
  ["медовик", "Медовик"],
  ["berry cheesecake", "Ягідний чизкейк"],
  ["cheesecake", "Ягідний чизкейк"],
  ["ягідний чізкейк", "Ягідний чизкейк"],
  ["ягідний чизкейк", "Ягідний чизкейк"],
  ["чізкейк", "Ягідний чизкейк"],
  ["чизкейк", "Ягідний чизкейк"],
  ["napoleon cake", "Наполеон"],
  ["napoleon", "Наполеон"],
  ["наполеон", "Наполеон"],
  ["carrot cake", "Морквяний торт"],
  ["морквяний", "Морквяний торт"],
  ["морквяний торт", "Морквяний торт"],
  ["cupcake box", "Набір капкейків"],
  ["cupcakes", "Набір капкейків"],
  ["капкейки", "Набір капкейків"],
  ["набір капкейків", "Набір капкейків"]
]);

export function normalizeProductName(productName) {
  const raw = String(productName || "").trim();
  return PRODUCT_ALIASES.get(raw.toLowerCase()) || raw;
}

export function getProductByName(productName) {
  const normalized = normalizeProductName(productName);
  return findOne("Products", r => r.name.toLowerCase() === normalized.toLowerCase() && String(r.is_active) !== "false");
}

export function getProductBOM(productId) {
  return findRows("ProductComponents", r => r.product_id === productId);
}

export function getComponent(componentId) {
  return findOne("Components", r => r.component_id === componentId);
}

export function calculateRequiredComponents(productId, quantity) {
  const bom = getProductBOM(productId);
  return bom.map(item => ({
    component_id: item.component_id,
    required_qty: Number(item.qty_per_unit) * Number(quantity),
    unit: item.unit
  }));
}

export function calculateEstimatedCost(productId, quantity) {
  const required = calculateRequiredComponents(productId, quantity);
  let total = 0;
  const breakdown = [];
  for (const item of required) {
    const component = getComponent(item.component_id);
    const cost = Number(item.required_qty) * Number(component.unit_cost);
    total += cost;
    breakdown.push({ ...item, component_name: component.name, unit_cost: component.unit_cost, cost });
  }
  return { total_cost: total, breakdown };
}
