import { initializeWorkspace } from "../app/js/setup/workspaceManager.js";
import { createDiscountRule, calculateFinalPrice } from "../app/js/pricing/discountService.js";

initializeWorkspace("cakes");
createDiscountRule({ name: "Every 3rd order", type: "percent", value: 10, everyNOrder: 3 });

console.log(calculateFinalPrice({
  basePrice: 1000,
  cost: 800,
  marginPercent: 30,
  discountRules: [{ discount_rule_id: "D1", type: "percent", value: 10, every_n_order: 3, is_active: true }],
  orderIndex: 3
}));

console.log(calculateFinalPrice({
  basePrice: 1000,
  cost: 1100,
  marginPercent: 30,
  clientPersonalPrice: { custom_price: 900 },
  discountRules: [],
  orderIndex: 1
}));
