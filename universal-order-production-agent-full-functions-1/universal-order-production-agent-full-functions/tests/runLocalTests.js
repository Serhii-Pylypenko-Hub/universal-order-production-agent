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
import { createInventoryMaterial, getInventoryWorkspace, getProcurementPlan, receiveInventoryLot, saveProcurementSettings } from "../app/js/web/inventoryService.js";
import { createCatalogProduct, addTechCardItem, getCatalogWorkspace } from "../app/js/web/catalogWorkspaceService.js";
import { createPurchaseRequest, addPurchaseRequestItem, createPurchaseRequestFromProcurementPlan, receivePurchaseRequest, getPurchaseWorkspace } from "../app/js/web/purchaseWorkspaceService.js";
import { completeOrderProduction, getProductionOrderDetails, startOrderProduction } from "../app/js/production/productionService.js";
import { runAssistantCommand } from "../app/js/ai/assistantActionService.js";
import { setAiMode, setBotAssistantMode } from "../app/js/ai/subscriptionService.js";
import { getInventoryBalanceOnDate, getMonthlyInventoryDifferences } from "../app/js/reports/inventoryReportService.js";

if (fs.existsSync("./data/local_workspace.json")) fs.unlinkSync("./data/local_workspace.json");

initializeWorkspace("cakes");
const requiredSheets = [
  "StockLots",
  "ReservationLots",
  "OrderMaterialRequirements",
  "ProductionRuns",
  "PurchaseRequests",
  "PurchaseRequestItems",
  "BotSettings",
  "BotAccounts",
  "BotAssistantSettings",
  "BotFlowSchemas",
  "BotStepOptions",
  "BotMediaAssets",
  "Promotions",
  "BotTemplates",
  "BotOrderFlowSteps",
  "ValidationRules",
  "TableUiSettings",
  "SubscriptionPlans",
  "SubscriptionStatus",
  "AiAssistantPermissions",
  "AiAssistantActions",
  "VoiceCommandLogs",
  "DeveloperAlerts"
];
for (const sheet of requiredSheets) {
  if (!getRows(sheet)) throw new Error(`Missing sheet ${sheet}`);
}
if (getRows("ValidationRules").length === 0) throw new Error("Validation rules were not seeded");
if (getRows("TableUiSettings").length === 0) throw new Error("Table UI settings were not seeded");
if (getRows("BotOrderFlowSteps").length === 0) throw new Error("Bot flow steps were not seeded");
if (getRows("BotAccounts").length === 0) throw new Error("Bot accounts were not seeded");
if (getRows("BotAssistantSettings").length === 0) throw new Error("Bot assistant settings were not seeded");
if (getRows("BotFlowSchemas").length === 0) throw new Error("Bot flow schemas were not seeded");
if (getRows("BotStepOptions").length === 0) throw new Error("Bot step options were not seeded");
if (getRows("Promotions").length === 0) throw new Error("Promotions were not seeded");
if (getRows("SubscriptionPlans").length < 2) throw new Error("AI subscription plans were not seeded");

const health = await healthCheckWorkspace();
if (!health.ready_for_orders) throw new Error("Workspace is not ready for orders");
const chocolate = getProductByName("Chocolate Cake");
if (!chocolate) throw new Error("Demo product not seeded");
if (getProductOptions(chocolate.product_id).length === 0) throw new Error("Product options were not seeded");
if (getRows("StockLots").length === 0) throw new Error("Demo stock lots were not seeded");

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
if (getRows("OrderMaterialRequirements").filter(r => r.order_id === firstOrder.order_id).length === 0) {
  throw new Error("Order material requirements were not saved");
}
if (getRows("ReservationLots").filter(r => r.order_id === firstOrder.order_id).length === 0) {
  throw new Error("FIFO reservation lots were not saved");
}
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

const production = startOrderProduction(firstOrder.order_id, "test");
if (!production.production_run?.production_run_id) throw new Error("Production run was not created");
const productionDetails = getProductionOrderDetails(firstOrder.order_id);
if (!productionDetails?.materials?.length) throw new Error("Production details do not show materials");
const completed = completeOrderProduction(firstOrder.order_id, "test");
if (!completed.consumed) throw new Error("Production completion did not consume reservations");
if (getRows("InventoryTransactions").filter(r => r.order_id === firstOrder.order_id && r.type === "OUT").length === 0) {
  throw new Error("Production completion did not create OUT transactions");
}

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

const inventory = getInventoryWorkspace();
if (!inventory.materials.length || !inventory.lots.length) throw new Error("Inventory workspace is incomplete");
if (!inventory.procurement_plan?.settings) throw new Error("Procurement plan was not included in inventory workspace");
const procurementMaterial = createInventoryMaterial({
  name: "Procurement Test Material",
  unit: "kg",
  unit_cost: 12,
  min_qty: 3
});
if (Number(procurementMaterial.material.min_qty) !== 3) throw new Error("Material min_qty was not saved");
saveProcurementSettings({ enabled: true, horizon_days: 7 });
const procurementPlan = getProcurementPlan();
if (!procurementPlan.rows.find(row => row.component_id === procurementMaterial.material.component_id && row.severity === "absent")) {
  throw new Error("Procurement plan did not detect absent material below minimum");
}
const procurementRequest = createPurchaseRequestFromProcurementPlan(procurementPlan.rows, { manager_note: "auto procurement test" });
if (!procurementRequest.items.length) throw new Error("Procurement purchase request was not created from plan");

const productResult = createCatalogProduct({
  name: "Test Product",
  unit: "pcs",
  base_price: 100,
  margin_percent: 30
});
if (!productResult.product?.product_id) throw new Error("Catalog product was not created");
const flour = getRows("Components").find(c => c.name === "Flour");
addTechCardItem({
  product_id: productResult.product.product_id,
  component_id: flour.component_id,
  qty_per_unit: 0.1,
  unit: "kg"
});
if (getCatalogWorkspace().products.find(p => p.product_id === productResult.product.product_id).tech_card_items.length === 0) {
  throw new Error("Tech card item was not visible in catalog workspace");
}

const request = createPurchaseRequest({ manager_note: "test purchase" });
addPurchaseRequestItem({
  purchase_request_id: request.purchase_request_id,
  component_id: flour.component_id,
  required_qty: 1,
  unit: "kg",
  expected_unit_cost: 40
});
if (getPurchaseWorkspace().requests.find(r => r.purchase_request_id === request.purchase_request_id).items_count === 0) {
  throw new Error("Purchase request item was not visible");
}
const received = receivePurchaseRequest(request.purchase_request_id, "test");
if (!received.lots.length) throw new Error("Purchase receipt did not create stock lots");

receiveInventoryLot({
  component_id: flour.component_id,
  qty: 500,
  unit: "g",
  unit_cost: 50,
  reason: "test grams conversion"
});

const balanceReport = getInventoryBalanceOnDate(new Date().toISOString().slice(0, 10));
if (!balanceReport.rows.length) throw new Error("Inventory balance report is empty");
const monthlyReport = getMonthlyInventoryDifferences(6);
if (!monthlyReport.summary.length) throw new Error("Monthly inventory report is empty");

const aiRead = await runAssistantCommand({ text: "покажи дефіцит", source: "test" });
if (!aiRead.ok) throw new Error("AI economy read command failed");
const aiBalance = await runAssistantCommand({ text: `покажи баланс на дату ${new Date().toISOString().slice(0, 10)}`, source: "test" });
if (!aiBalance.ok || !aiBalance.message.includes("Баланс складу")) throw new Error("AI did not read inventory balance report");
const aiMonthly = await runAssistantCommand({ text: "проаналізуй помісячні різниці складу", source: "test" });
if (!aiMonthly.ok || !aiMonthly.message.includes("Помісячні різниці")) throw new Error("AI did not analyze monthly inventory differences");
const aiRecipe = await runAssistantCommand({ text: "прочитай рецепт", source: "test" });
if (!aiRecipe.ok || !aiRecipe.message.includes("Інгредієнти")) throw new Error("AI did not read recipe");
const aiForbidden = await runAssistantCommand({ text: "зміни код і онови схему", source: "test" });
if (!aiForbidden.forbidden) throw new Error("AI did not block code/schema change request");
const aiBlocked = await runAssistantCommand({ text: `візьми ${secondOrder.order_id} в роботу`, source: "test" });
if (!aiBlocked.requires_upgrade) throw new Error("AI economy mode allowed mutating action");
setAiMode("full_assistant");
setBotAssistantMode("BOT-DEFAULT", "full_assistant");
const aiNeedsConfirmation = await runAssistantCommand({ text: `візьми ${secondOrder.order_id} в роботу`, source: "test" });
if (!aiNeedsConfirmation.requires_confirmation) throw new Error("Full AI mutation did not require confirmation");
const aiStatusConfirmation = await runAssistantCommand({ text: `зміни статус ${secondOrder.order_id} на Ready`, source: "test" });
if (!aiStatusConfirmation.requires_confirmation) throw new Error("Full AI status change did not require confirmation");

console.log("All local MVP foundation tests passed.");
