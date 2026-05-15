import { appendRow, findOne, findRows } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";

export function createDiscountRule({ name, type = "percent", value, appliesTo = "all", everyNOrder = "", isActive = true }) {
  return appendRow("DiscountRules", {
    discount_rule_id: id("DISC"),
    name,
    type,
    value,
    applies_to: appliesTo,
    every_n_order: everyNOrder,
    is_active: isActive,
    created_at: nowIso(),
    updated_at: nowIso()
  });
}

export function setClientPersonalPrice({ clientId, productId, customPrice, reason = "manual manager price" }) {
  return appendRow("ClientPrices", {
    client_price_id: id("CPRICE"),
    client_id: clientId,
    product_id: productId,
    custom_price: customPrice,
    is_active: true,
    reason,
    created_at: nowIso(),
    updated_at: nowIso()
  });
}

export function getClientPersonalPrice(clientId, productId) {
  return findOne("ClientPrices", r => r.client_id === clientId && r.product_id === productId && String(r.is_active) !== "false");
}

export function calculateDiscount({ basePrice, orderIndex = 1, rules = [], productId = "", clientId = "" }) {
  let discountAmount = 0;
  let appliedRule = null;

  for (const rule of rules.filter(r => String(r.is_active) !== "false")) {
    if (String(rule.applies_to || "").startsWith("amount_over:")) {
      const minAmount = Number(String(rule.applies_to).split(":")[1]);
      if (Number(basePrice) < minAmount) continue;
    } else if (rule.applies_to && rule.applies_to !== "all" && rule.applies_to !== productId && rule.applies_to !== clientId) {
      continue;
    }
    if (rule.every_n_order && Number(rule.every_n_order) > 0) {
      if (Number(orderIndex) % Number(rule.every_n_order) !== 0) continue;
    }
    const value = Number(rule.value);
    const amount = rule.type === "percent" ? Number(basePrice) * value / 100 : value;
    if (amount > discountAmount) {
      discountAmount = amount;
      appliedRule = rule.discount_rule_id;
    }
  }
  return { discountAmount: Number(discountAmount.toFixed(2)), appliedRule };
}

export function calculateFinalPrice({ basePrice, cost, marginPercent, clientPersonalPrice = null, discountRules = [], orderIndex = 1 }) {
  let price = Number(basePrice);
  let discountAmount = 0;
  let discountRuleId = "";
  let source = "base";

  if (clientPersonalPrice) {
    price = Number(clientPersonalPrice.custom_price);
    source = "personal_price";
  } else {
    const discount = calculateDiscount({ basePrice: price, orderIndex, rules: discountRules });
    discountAmount = discount.discountAmount;
    discountRuleId = discount.appliedRule || "";
    price = Math.max(0, price - discountAmount);
    source = discountRuleId ? "discount" : "base";
  }

  const priceWarning = price < Number(cost)
    ? "PRICE_BELOW_COST_REQUIRES_MANAGER_CONFIRMATION"
    : "";

  return {
    finalPrice: Number(price.toFixed(2)),
    discountAmount,
    discountRuleId,
    source,
    priceWarning
  };
}

export function getActiveDiscountRules() {
  return findRows("DiscountRules", r => String(r.is_active) !== "false");
}
