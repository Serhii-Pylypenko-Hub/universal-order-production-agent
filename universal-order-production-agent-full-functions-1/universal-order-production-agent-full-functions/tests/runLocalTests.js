import fs from "fs";
import { initializeWorkspace } from "../app/js/setup/workspaceManager.js";
import { healthCheckWorkspace } from "../app/js/setup/healthCheck.js";
import { createOrder, updateOrderStatus } from "../app/js/orders/orderService.js";
import { getRows, appendRow } from "../app/js/data/rowRepository.js";
import { getProductByName } from "../app/js/orders/productService.js";
import { getProductOptions } from "../app/js/customizations/customizationService.js";
import { getClientPreferenceHistory } from "../app/js/clients/clientPreferenceService.js";
import { calculateFinalPrice, createDiscountRule } from "../app/js/pricing/discountService.js";
import { safeExecute } from "../app/js/errors/userErrorService.js";

if (fs.existsSync("./data/local_workspace.json")) fs.unlinkSync("./data/local_workspace.json");

initializeWorkspace("cakes");
const health = await healthCheckWorkspace();
if (!health.ready_for_orders) throw new Error("Workspace is not ready for orders");
const chocolate = getProductByName("Chocolate Cake");
if (!chocolate) throw new Error("Demo product not seeded");
if (getProductOptions(chocolate.product_id).length === 0) throw new Error("Product options were not seeded");

createDiscountRule({ name: "Every second order", type: "percent", value: 10, everyNOrder: 2 });

const firstOrder = createOrder({
  event_id: "evt-1",
  source: "test",
  client_name: "Test Client",
  client_contact: "+380111111111",
  product_name: "Chocolate Cake",
  quantity: 1,
  desired_date: new Date().toISOString(),
  preferences: "більше ягід",
  restrictions_or_allergies: "без горіхів",
  customizations: [{ name: "Add raspberry" }, { name: "Remove nuts" }, { name: "Add inscription", custom_value: "Happy birthday" }],
  urgent: false
});
if (!firstOrder || !firstOrder.order_id) throw new Error("First order was not created");
if (getRows("OrderItemCustomizations").length < 3) throw new Error("Order item customizations were not saved");
if (getRows("ClientPreferencesHistory").length === 0) throw new Error("Client preferences history was not saved");
if (Number(firstOrder.order_index_for_client) !== 1) throw new Error("First order index is wrong");

const duplicate = createOrder({
  event_id: "evt-1",
  source: "test",
  client_name: "Test Client",
  client_contact: "+380111111111",
  product_name: "Chocolate Cake",
  quantity: 1,
  urgent: false
});
if (duplicate.status !== "DUPLICATE_EVENT") throw new Error("Idempotency failed");

const secondOrder = createOrder({
  event_id: "evt-2",
  source: "test",
  client_name: "Test Client",
  client_contact: "+380111111111",
  product_name: "Chocolate Cake",
  quantity: 1,
  desired_date: new Date().toISOString(),
  urgent: false
});
if (Number(secondOrder.order_index_for_client) !== 2) throw new Error("Second order index is wrong");
if (Number(secondOrder.discount_amount) <= 0) throw new Error("Every-N discount was not applied");

const guarded = updateOrderStatus(firstOrder.order_id, "Ready");
if (guarded.status === "Ready") throw new Error("State guard allowed invalid transition");

if (getRows("ActivityLog").length === 0) throw new Error("ActivityLog is empty");

const belowCost = calculateFinalPrice({
  basePrice: 1000,
  cost: 1200,
  marginPercent: 30,
  clientPersonalPrice: { custom_price: 900 },
  discountRules: [],
  orderIndex: 1
});
if (!belowCost.priceWarning) throw new Error("Below-cost warning was not generated");

const err = safeExecute("test-error", () => { throw new Error("test"); });
if (err.ok) throw new Error("safeExecute did not catch error");
if (getRows("UserFacingErrors").length === 0) throw new Error("UserFacingErrors is empty");
if (getRows("CodeRequirements").length === 0) throw new Error("Code requirements were not seeded");
if (getRows("ProcessedEvents").length < 2) throw new Error("ProcessedEvents not saved");

console.log("All local MVP foundation tests passed.");
