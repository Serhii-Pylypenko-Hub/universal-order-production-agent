import { getActiveOrders, getOrder, updateOrderStatus, cancelOrder, startProduction } from "../orders/orderService.js";
import { getRows, findRows, updateRow, appendRow } from "../data/rowRepository.js";
import { getActivePurchaseRequests } from "../purchases/purchaseService.js";
import { getOpenTasks, updateTaskStatus } from "../tasks/taskService.js";
import { addStock, getAvailableStock } from "../stock/stockService.js";
import { id } from "../utils/ids.js";
import { confirmPayment } from "../orders/paymentService.js";
import { confirmPickup, markShipped, markReadyForPickup } from "../orders/deliveryService.js";
import { getPendingHandoffs, resolveHandoff } from "../orders/handoffService.js";
import { getSetting, setSetting, getAllSettings } from "./settingsService.js";
import { getFailedOperationsSummary } from "../utils/retryService.js";
import { runDeadlineCheck } from "../tasks/deadlineMonitorService.js";
import { healthCheckWorkspace } from "../setup/healthCheck.js";
import { nowIso } from "../utils/time.js";

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
      markReadyForPickup(args[0]);
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
      for (const item of items) {
        if (item.component_id && item.quantity) {
          addStock(item.component_id, Number(item.quantity), `purchase_received:${prId}`);
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
      return `• ${r.component_id}: ${avail} ${r.unit || "pcs"} (рез: ${r.reserved_qty || 0})`;
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
