import { getActiveOrders, getOrder, updateOrderStatus, cancelOrder, startProduction } from "../orders/orderService.js";
import { getRows, findRows, updateRow, appendRow } from "../data/rowRepository.js";
import { getActivePurchaseRequests } from "../purchases/purchaseService.js";
import { getOpenTasks, updateTaskStatus } from "../tasks/taskService.js";
import { addStock, getAvailableStock } from "../stock/stockService.js";
import { receiveStockLot } from "../stock/stockLotService.js";
import { id } from "../utils/ids.js";
import { confirmPayment } from "../orders/paymentService.js";
import { confirmPickup, markShipped } from "../orders/deliveryService.js";
import { getPendingHandoffs, resolveHandoff } from "../orders/handoffService.js";
import { getSetting, setSetting, getAllSettings } from "./settingsService.js";
import { getFailedOperationsSummary } from "../utils/retryService.js";
import { runDeadlineCheck } from "../tasks/deadlineMonitorService.js";
import { healthCheckWorkspace } from "../setup/healthCheck.js";
import { nowIso } from "../utils/time.js";
import { createDiscountRule } from "../pricing/discountService.js";
import { completeOrderProduction } from "../production/productionService.js";
import { unitLabel } from "../utils/unitLabels.js";

// Inline keyboards for Telegram
function ordersKeyboard() {
  return {
    inline_keyboard: [[
      { text: "📦 Замовлення", callback_data: "orders" },
      { text: "🧾 Закупки", callback_data: "purchases" }
    ], [
      { text: "📊 Залишки", callback_data: "stock" },
      { text: "✅ Задачі", callback_data: "tasks" }
    ], [
      { text: "📅 Календар", callback_data: "calendar" },
      { text: "⚠️ Проблеми", callback_data: "low_stock" }
    ], [
      { text: "💰 Ціни", callback_data: "price_review" },
      { text: "⚙️ Налаштування", callback_data: "settings" }
    ]]
  };
}

function statusKeyboard(orderId, availableStatuses) {
  return {
    inline_keyboard: availableStatuses.map(s => ([
      { text: s, callback_data: `change_status:${orderId}:${s}` }
    ]))
  };
}

export async function handleManagerCommand(command, args = []) {
  switch (command) {
    case "/start":
    case "/menu":
      return { text: "👋 Головне меню:", keyboard: ordersKeyboard() };

    case "/orders":
      return formatOrdersList(getActiveOrders());

    case "/products":
      return formatProducts(getRows("Products"));

    case "/components":
      return formatComponents(getRows("Components"));

    case "/recipe":
    case "/bom": {
      const query = args.join(" ");
      if (!query) return { text: "Використання: /recipe <назва продукту або product_id>" };
      return formatRecipe(query);
    }

    case "/order": {
      const order = getOrder(args[0]);
      if (!order) return { text: `Замовлення ${args[0]} не знайдено.` };
      return { text: formatOrderDetails(order), keyboard: statusKeyboard(order.order_id, getAvailableStatuses(order.status)) };
    }

    case "/change_status": {
      const [orderId, status] = args;
      const result = updateOrderStatus(orderId, status);
      return { text: result ? `✅ Статус ${orderId} змінено на ${status}` : `❌ Неможливо змінити статус.` };
    }

    case "/cancel": {
      cancelOrder(args[0]);
      return { text: `🚫 Замовлення ${args[0]} скасовано.` };
    }

    case "/start_production": {
      startProduction(args[0]);
      return { text: `🏭 Виробництво ${args[0]} розпочато.` };
    }

    case "/ready": {
      completeOrderProduction(args[0], "manager_bot");
      return { text: `✅ Замовлення ${args[0]} готове.` };
    }

    case "/pickup": {
      confirmPickup(args[0]);
      return { text: `✅ Замовлення ${args[0]} видано клієнту.` };
    }

    case "/ship": {
      const [orderId, tracking = "", carrier = ""] = args;
      markShipped(orderId, { trackingNumber: tracking, carrier });
      return { text: `📦 Замовлення ${orderId} відправлено. Трек: ${tracking || "—"}` };
    }

    case "/stock":
      return formatStock(getRows("Stock"));

    case "/add_stock": {
      const [componentId, qty] = args;
      if (!componentId || !qty) return { text: "Використання: /add_stock <component_id> <qty>" };
      addStock(componentId, Number(qty), "manager_manual_add");
      return { text: `✅ Додано ${qty} для ${componentId}.` };
    }

    case "/low_stock": {
      const low = findRows("Stock", r => {
        const avail = Number(r.current_qty || 0) - Number(r.reserved_qty || 0);
        const safety = Number(r.safety_stock_qty || 0);
        return safety > 0 && avail <= safety;
      });
      if (!low.length) return { text: "✅ Критично низьких залишків немає." };
      return { text: "⚠️ Критично низькі залишки:\n" + low.map(r => `• ${r.component_id}: ${r.current_qty} (резерв: ${r.reserved_qty})`).join("\n") };
    }

    case "/purchases":
      return formatPurchases(getActivePurchaseRequests());

    case "/receive_purchase": {
      const [prId] = args;
      const items = findRows("PurchaseRequestItems", r => r.purchase_request_id === prId);
      const components = new Map(getRows("Components").map(component => [component.component_id, component]));
      for (const item of items) {
        if (item.component_id && item.total_qty) {
          const component = components.get(item.component_id);
          receiveStockLot({
            component_id: item.component_id,
            qty: Number(item.total_qty),
            unit: item.unit || component?.unit,
            unit_cost: Number(item.expected_unit_cost || component?.unit_cost || 0),
            purchase_request_id: prId,
            reason: `purchase_received:${prId}`,
            created_by: "manager"
          });
          updateRow("PurchaseRequestItems", "purchase_request_item_id", item.purchase_request_item_id, { status: "Received" });
        }
      }
      updateRow("PurchaseRequests", "purchase_request_id", prId, { status: "Received", received_at: nowIso() });
      return { text: `✅ Закупка ${prId} прийнята, залишки оновлено.` };
    }

    case "/tasks":
      return formatTasks(getOpenTasks());

    case "/close_task": {
      updateTaskStatus(args[0], "Done");
      return { text: `✅ Задача ${args[0]} закрита.` };
    }

    case "/calendar": {
      const upcoming = findRows("CalendarLog", r => {
        const start = new Date(r.start_at);
        const now = new Date();
        return start >= now && start <= new Date(now.getTime() + 14 * 86_400_000) && r.status !== "Cancelled";
      }).sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
      if (!upcoming.length) return { text: "Немає запланованих виробництв на найближчі 14 днів." };
      return { text: upcoming.map(e => `📅 ${e.start_at?.substring(0, 10)} — ${e.order_id} (${e.duration_hours}год)`).join("\n") };
    }

    case "/block_time": {
      const [date, hours = "8", ...reasonParts] = args;
      if (!date) return { text: "Використання: /block_time <дата YYYY-MM-DD> [год] [причина]" };
      const reason = reasonParts.join(" ") || "Blocked";
      appendRow("CalendarOverrides", {
        override_id: id("OVR"),
        date,
        type: "Block",
        blocked_hours: Number(hours),
        reason,
        created_at: nowIso()
      });
      return { text: `🚫 ${date} заблоковано (${hours} год): ${reason}` };
    }

    case "/confirm_payment": {
      const [orderId, amount, method = "cash"] = args;
      if (!orderId || !amount) return { text: "Використання: /confirm_payment <order_id> <сума> [метод]" };
      confirmPayment(orderId, { amount: Number(amount), method });
      return { text: `💰 Оплата ${orderId} підтверджена: ${amount} грн (${method})` };
    }

    case "/price_review": {
      const needsReview = findRows("Orders", r =>
        ["ReviewRequired", "CriticalRecalculated"].includes(r.price_review_status)
      );
      if (!needsReview.length) return { text: "✅ Немає замовлень для перегляду цін." };
      return { text: needsReview.map(o => `🔍 ${o.order_id}: рек. ціна ${o.recommended_new_price || "?"} (поточна: ${o.proposed_price})`).join("\n") };
    }

    case "/discounts":
      return formatDiscountRules(getRows("DiscountRules"));

    case "/discount_every_n": {
      const [n, percent] = args;
      if (!n || !percent) return { text: "Використання: /discount_every_n <кожне_N_замовлення> <відсоток>" };
      const rule = createDiscountRule({
        name: `Every ${n} order ${percent}%`,
        type: "percent",
        value: Number(percent),
        everyNOrder: Number(n),
        appliesTo: "all",
        isActive: true
      });
      return { text: `✅ Знижку створено: кожне ${n}-те замовлення, ${percent}% (${rule.discount_rule_id})` };
    }

    case "/discount_over_amount": {
      const [amount, percent] = args;
      if (!amount || !percent) return { text: "Використання: /discount_over_amount <сума> <відсоток>" };
      const rule = createDiscountRule({
        name: `Over ${amount} UAH ${percent}%`,
        type: "percent",
        value: Number(percent),
        appliesTo: `amount_over:${Number(amount)}`,
        isActive: true
      });
      return { text: `✅ Знижку створено: від ${amount} грн, ${percent}% (${rule.discount_rule_id})` };
    }

    case "/discount_disable": {
      const [ruleId] = args;
      if (!ruleId) return { text: "Використання: /discount_disable <discount_rule_id>" };
      const updated = updateRow("DiscountRules", "discount_rule_id", ruleId, { is_active: false, updated_at: nowIso() });
      if (!updated) return { text: `Знижку ${ruleId} не знайдено.` };
      return { text: `✅ Знижку вимкнено: ${ruleId}` };
    }

    case "/set_order_price": {
      const [orderId, price, ...reasonParts] = args;
      if (!orderId || !price) return { text: "Використання: /set_order_price <order_id> <ціна> [причина]" };
      const order = getOrder(orderId);
      if (!order) return { text: `Замовлення ${orderId} не знайдено.` };
      const reason = reasonParts.join(" ") || "manual manager price";
      updateRow("Orders", "order_id", orderId, {
        proposed_price: Number(price),
        final_price: Number(price),
        pricing_source: "manager_manual",
        manager_decision: reason,
        price_review_status: "ManagerSetPrice",
        updated_at: nowIso()
      });
      return { text: `✅ Власну ціну для ${orderId} встановлено: ${price} грн. Причина: ${reason}` };
    }

    case "/approve_price": {
      const [orderId] = args;
      updateRow("Orders", "order_id", orderId, { price_review_status: "ApprovedUseNewPrice", manager_decision: "approved", updated_at: nowIso() });
      return { text: `✅ Нова ціна для ${orderId} підтверджена.` };
    }

    case "/keep_price": {
      const [orderId] = args;
      updateRow("Orders", "order_id", orderId, { price_review_status: "ApprovedKeepOldPrice", manager_decision: "keep_old", updated_at: nowIso() });
      return { text: `✅ Стара ціна для ${orderId} збережена.` };
    }

    case "/client": {
      const query = args.join(" ").toLowerCase();
      if (!query) return { text: "Використання: /client <ім'я або контакт>" };
      const clients = findRows("Clients", r =>
        r.name?.toLowerCase().includes(query) || r.contact?.toLowerCase().includes(query)
      );
      if (!clients.length) return { text: "Клієнтів не знайдено." };
      return { text: clients.map(c => `👤 ${c.name} | ${c.contact} | замовлень: ${c.order_index_for_client || 0}`).join("\n") };
    }

    case "/handoff":
    case "/handoffs": {
      const pending = getPendingHandoffs();
      if (!pending.length) return { text: "✅ Немає активних handoff-запитів." };
      return { text: pending.map(h => `🔄 ${h.handoff_id}: ${h.reason} (${h.status})`).join("\n") };
    }

    case "/resolve_handoff": {
      const [handoffId, ...resolutionParts] = args;
      resolveHandoff(handoffId, { resolution: resolutionParts.join(" ") || "Resolved by manager" });
      return { text: `✅ Handoff ${handoffId} вирішено.` };
    }

    case "/setup_check":
      return await healthCheckWorkspace();

    case "/deadline_check":
      return runDeadlineCheck();

    case "/failed_ops":
      return getFailedOperationsSummary();

    case "/settings":
      return getAllSettings();

    case "/set": {
      const [key, ...valueParts] = args;
      if (!key) return { text: "Використання: /set <key> <value>" };
      setSetting(key, valueParts.join(" "));
      return { text: `✅ ${key} = ${valueParts.join(" ")}` };
    }

    default:
      return { text: `Невідома команда: ${command}. Натисніть /menu для меню.` };
  }
}

// --- Formatters ---

function formatOrdersList(orders) {
  if (!orders.length) return { text: "Активних замовлень немає." };
  const lines = orders.map(o =>
    `📦 ${o.order_id} | ${o.status} | ${o.proposed_price || "?"}грн`
  );
  return { text: `<b>Активні замовлення (${orders.length}):</b>\n${lines.join("\n")}` };
}

function formatProducts(products) {
  if (!products.length) return { text: "Продуктів немає. Запустіть demo workspace або додайте продукти." };
  return {
    text: "<b>Продукти:</b>\n" + products
      .filter(p => p.is_active !== false)
      .map(p => `• ${p.product_id} | ${p.name} | ${p.base_price || "?"} грн / ${unitLabel(p.unit) || "од."}`)
      .join("\n")
  };
}

function formatComponents(components) {
  if (!components.length) return { text: "Компонентів немає. Запустіть demo workspace або додайте матеріали." };
  return {
    text: "<b>Матеріали:</b>\n" + components
      .filter(c => c.is_active !== false)
      .map(c => `• ${c.component_id} | ${c.name} | ${c.unit_cost || "?"} грн / ${unitLabel(c.unit) || "од."}`)
      .join("\n")
  };
}

function formatRecipe(query) {
  const products = getRows("Products");
  const product = products.find(p =>
    p.product_id === query ||
    p.name?.toLowerCase() === query.toLowerCase()
  );
  if (!product) return { text: `Продукт не знайдено: ${query}. Спробуйте /products.` };

  const components = new Map(getRows("Components").map(c => [c.component_id, c]));
  const stock = new Map(getRows("Stock").map(s => [s.component_id, s]));
  const rows = findRows("ProductComponents", r => r.product_id === product.product_id);
  if (!rows.length) return { text: `Для ${product.name} рецепт/BOM ще не заповнений.` };

  const lines = rows.map(row => {
    const component = components.get(row.component_id);
    const stockRow = stock.get(row.component_id);
    const available = stockRow
      ? Number(stockRow.current_qty || 0) - Number(stockRow.reserved_qty || 0)
      : 0;
    return `• ${component?.name || row.component_id}: ${row.qty_per_unit} ${unitLabel(row.unit || component?.unit)} на ${unitLabel(product.unit)}; залишок ${available} ${unitLabel(stockRow?.unit || component?.unit)}`;
  });

  return {
    text: [
      `<b>Рецепт: ${product.name}</b>`,
      `Ціна: ${product.base_price || "?"} грн / ${unitLabel(product.unit) || "од."}`,
      "",
      ...lines
    ].join("\n")
  };
}

function formatDiscountRules(rules) {
  if (!rules.length) return { text: "Знижок ще немає. Створіть /discount_over_amount або /discount_every_n." };
  return {
    text: "<b>Знижки:</b>\n" + rules.map(rule => {
      const status = String(rule.is_active) === "false" ? "вимкнена" : "активна";
      const scope = String(rule.applies_to || "").startsWith("amount_over:")
        ? `від ${String(rule.applies_to).split(":")[1]} грн`
        : rule.every_n_order
          ? `кожне ${rule.every_n_order}-те замовлення`
          : rule.applies_to || "all";
      const value = rule.type === "percent" ? `${rule.value}%` : `${rule.value} грн`;
      return `• ${rule.discount_rule_id} | ${status} | ${value} | ${scope}`;
    }).join("\n")
  };
}

function formatOrderDetails(order) {
  return [
    `<b>Замовлення ${order.order_id}</b>`,
    `Статус: ${order.status}`,
    `Оплата: ${order.payment_status} (${order.payment_amount || 0}/${order.final_price || order.proposed_price || 0} грн)`,
    `Дедлайн: ${order.ready_date || "не встановлено"}`,
    `Клієнт: ${order.client_id}`,
    order.price_warning ? `⚠️ ${order.price_warning}` : null
  ].filter(Boolean).join("\n");
}

function formatStock(rows) {
  if (!rows.length) return { text: "Склад порожній." };
  return {
    text: "<b>Залишки:</b>\n" + rows.map(r => {
      const avail = Number(r.current_qty || 0) - Number(r.reserved_qty || 0);
      return `• ${r.component_id}: ${avail} ${unitLabel(r.unit || "pcs")} (рез: ${r.reserved_qty || 0})`;
    }).join("\n")
  };
}

function formatPurchases(prs) {
  if (!prs.length) return { text: "Активних закупок немає." };
  return { text: "<b>Закупки:</b>\n" + prs.map(p => `🧾 ${p.purchase_request_id} | ${p.status}`).join("\n") };
}

function formatTasks(tasks) {
  if (!tasks.length) return { text: "Відкритих задач немає." };
  const sorted = [...tasks].sort((a, b) => {
    const p = { CRITICAL: 0, WARNING: 1, INFO: 2 };
    return (p[a.priority] ?? 3) - (p[b.priority] ?? 3);
  });
  return { text: "<b>Задачі:</b>\n" + sorted.map(t => `${t.priority === "CRITICAL" ? "🔴" : t.priority === "WARNING" ? "🟡" : "🟢"} ${t.task_id}: ${t.title}`).join("\n") };
}

function getAvailableStatuses(currentStatus) {
  const transitions = {
    "New": ["CollectingInfo", "ProposalSent", "Cancelled"],
    "CollectingInfo": ["ProposalSent", "Cancelled"],
    "ProposalSent": ["AwaitingPayment", "Cancelled"],
    "WaitingPurchase": ["ProposalSent", "Cancelled"],
    "AwaitingPayment": ["PartiallyPaid", "Paid", "Cancelled"],
    "PartiallyPaid": ["Paid", "Cancelled"],
    "Paid": ["Scheduled", "Cancelled"],
    "Scheduled": ["InProduction", "Cancelled"],
    "InProduction": ["Ready"],
    "Ready": ["Sent", "Delivered", "PickedUp"],
    "Sent": ["Delivered"]
  };
  return transitions[currentStatus] || [];
}
