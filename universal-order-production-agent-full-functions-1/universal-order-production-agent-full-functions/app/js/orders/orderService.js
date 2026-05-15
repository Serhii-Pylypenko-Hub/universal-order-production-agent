import { appendRow, updateRow, findOne, findRows } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { getProductByName, calculateEstimatedCost, calculateRequiredComponents } from "./productService.js";
import { calculateFinalRequiredComponents, calculateCustomizationTotals, saveOrderItemCustomizations, summarizeCustomizations } from "../customizations/customizationService.js";
import { saveOrderPreferences } from "../clients/clientPreferenceService.js";
import { reserveStock, consumeReservedStock, releaseReservation } from "../stock/stockService.js";
import { createOrMergePurchaseRequest } from "../purchases/purchaseService.js";
import { scheduleOrder } from "../calendar/calendarService.js";
import { createTask } from "../tasks/taskService.js";
import { logActivity } from "../audit/auditService.js";
import { getActiveDiscountRules, getClientPersonalPrice, calculateFinalPrice } from "../pricing/discountService.js";
import { getClientOrderIndex } from "./orderCounterService.js";
import { validateOrderTransition, ORDER_STATUSES } from "./stateGuardService.js";
import { withIdempotency } from "../data/idempotencyService.js";

export function createClientIfNeeded({ name, contact = "", preferences = "", restrictions_or_allergies = "" }) {
  let client = findOne("Clients", r => r.contact && r.contact === contact);
  if (!client) {
    client = appendRow("Clients", {
      client_id: id("CLI"),
      name,
      contact,
      preferences,
      restrictions_or_allergies,
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }
  return client;
}

export function createOrder(orderInput) {
  return withIdempotency({ eventId: orderInput.event_id, source: orderInput.source || "manual", onDuplicate: () => ({ status: "DUPLICATE_EVENT", event_id: orderInput.event_id }) }, () => createOrderInternal(orderInput));
}

function createOrderInternal(orderInput) {
  if (orderInput.urgent) {
    const task = createTask({
      type: "Handoff",
      title: `Urgent order request from ${orderInput.client_name || "client"}`,
      priority: "WARNING"
    });
    return { status: "HANDOFF_REQUIRED", task };
  }

  const product = getProductByName(orderInput.product_name);
  if (!product) {
    const task = createTask({
      type: "Handoff",
      title: `Unknown product: ${orderInput.product_name}`,
      priority: "WARNING"
    });
    return { status: "UNKNOWN_PRODUCT", task };
  }

  const client = createClientIfNeeded({
    name: orderInput.client_name || "Unknown client",
    contact: orderInput.client_contact || "",
    restrictions_or_allergies: orderInput.restrictions_or_allergies || ""
  });

  const baseCost = calculateEstimatedCost(product.product_id, orderInput.quantity);
  const customizationTotals = calculateCustomizationTotals(product.product_id, orderInput.customizations || []);
  const totalCost = Number((Number(baseCost.total_cost) + Number(customizationTotals.cost_delta || 0)).toFixed(2));
  const basePrice = Number((totalCost * (1 + Number(product.margin_percent) / 100) + Number(customizationTotals.price_delta || 0)).toFixed(2));
  const personalPrice = null; // client exists after createClientIfNeeded; final price is recalculated below

  const orderIndexForClient = getClientOrderIndex(client.client_id);
  const pricing = calculateFinalPrice({
    basePrice,
    cost: totalCost,
    marginPercent: product.margin_percent,
    clientPersonalPrice: getClientPersonalPrice(client.client_id, product.product_id),
    discountRules: getActiveDiscountRules(),
    orderIndex: orderIndexForClient
  });

  const proposedPrice = pricing.finalPrice;

  const order = appendRow("Orders", {
    order_id: id("ORD"),
    client_id: client.client_id,
    status: "New",
    payment_status: "AwaitingPayment",
    delivery_method: orderInput.delivery_method || "pickup",
    desired_date: orderInput.desired_date || "",
    ready_date: "",
    shipping_date: "",
    estimated_cost_snapshot: totalCost,
    actual_cost: "",
    proposed_price: proposedPrice,
    discount_amount: pricing.discountAmount,
    discount_rule_id: pricing.discountRuleId,
    final_price: pricing.finalPrice,
    price_warning: pricing.priceWarning,
    order_index_for_client: orderIndexForClient,
    pricing_source: pricing.source,
    event_id: orderInput.event_id || "",
    recommended_new_price: "",
    price_review_status: "NotRequired",
    manager_decision: "",
    created_at: nowIso(),
    updated_at: nowIso()
  });

  const customizationSummary = summarizeCustomizations(product.product_id, orderInput.customizations || []);
  const orderItem = appendRow("OrderItems", {
    order_item_id: id("OI"),
    order_id: order.order_id,
    product_id: product.product_id,
    quantity: orderInput.quantity,
    unit: product.unit,
    customization_summary: customizationSummary,
    base_cost: baseCost.total_cost,
    customization_cost_delta: customizationTotals.cost_delta,
    customization_price_delta: customizationTotals.price_delta,
    customization_work_hours_delta: customizationTotals.work_hours_delta
  });

  saveOrderItemCustomizations(orderItem.order_item_id, product.product_id, orderInput.customizations || []);
  saveOrderPreferences({
    clientId: client.client_id,
    orderId: order.order_id,
    productId: product.product_id,
    preferences: orderInput.preferences || "",
    restrictions: orderInput.restrictions_or_allergies || "",
    customizationSummary
  });

  const finalRequirements = calculateFinalRequiredComponents(product.product_id, orderInput.quantity, orderInput.customizations || []);
  const required = finalRequirements.required_components;
  const reservationResult = reserveStock(order.order_id, required);
  const missing = reservationResult.filter(x => x.missing > 0);

  if (missing.length > 0) {
    createOrMergePurchaseRequest(missing);
    updateOrderStatus(order.order_id, "WaitingPurchase");
    createTask({ orderId: order.order_id, type: "Purchase", title: "Потрібна дозакупка матеріалів", priority: "WARNING" });
  } else {
    updateOrderStatus(order.order_id, "ProposalSent");
    const scheduled = scheduleOrder(order.order_id, product, orderInput.desired_date, customizationTotals.work_hours_delta);
    if (scheduled) {
      updateRow("Orders", "order_id", order.order_id, {
        ready_date: scheduled.ready_date,
        shipping_date: scheduled.shipping_date,
        status: "Scheduled",
        updated_at: nowIso()
      });
      createTask({ orderId: order.order_id, type: "Production", title: "Почати виробництво", priority: "INFO", dueAt: scheduled.event.start_at });
    }
  }

  logActivity({ entityType: "Order", entityId: order.order_id, action: "createOrder", newValue: { orderInput, cost: totalCost, customizationTotals, proposedPrice } });
  return getOrder(order.order_id);
}

export function getOrder(orderId) {
  return findOne("Orders", r => r.order_id === orderId);
}

export function getActiveOrders() {
  return findRows("Orders", r => !["Closed", "Cancelled", "Delivered", "PickedUp"].includes(r.status));
}

export function canTransitionOrder(order, nextStatus) {
  return validateOrderTransition(order, nextStatus).ok;
}

export function updateOrderStatus(orderId, nextStatus) {
  const order = getOrder(orderId);
  if (!order) return null;
  const guard = validateOrderTransition(order, nextStatus);
  if (!guard.ok) {
    createTask({ orderId, type: "StatusGuard", title: `Неможливий перехід статусу ${order.status} → ${nextStatus}: ${guard.reason}`, priority: "WARNING" });
    return order;
  }
  const updated = updateRow("Orders", "order_id", orderId, { status: nextStatus, updated_at: nowIso() });
  logActivity({ entityType: "Order", entityId: orderId, action: "updateOrderStatus", oldValue: order.status, newValue: nextStatus });
  return updated;
}

export function cancelOrder(orderId) {
  releaseReservation(orderId);
  return updateOrderStatus(orderId, "Cancelled");
}

export function startProduction(orderId) {
  const order = updateOrderStatus(orderId, "InProduction");
  consumeReservedStock(orderId);
  return order;
}
