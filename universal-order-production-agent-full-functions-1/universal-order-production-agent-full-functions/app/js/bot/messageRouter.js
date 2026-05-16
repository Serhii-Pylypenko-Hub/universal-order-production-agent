import { handleManagerCommand } from "../manager/managerService.js";
import { createOrder } from "../orders/orderService.js";
import { parseOrderMessage } from "./aiService.js";
import { requestHandoff } from "../orders/handoffService.js";
import { sendTelegramMessage, sendManagerAlert } from "../tasks/notificationService.js";
import { saveFailedOperation } from "../utils/retryService.js";
import { createUserFacingError } from "../errors/userErrorService.js";
import { getRows } from "../data/rowRepository.js";
import { getActiveDiscountRules } from "../pricing/discountService.js";

const MANAGER_CHAT_ID = () => process.env.MANAGER_CHAT_ID;
const MAX_CLIENT_ASSISTANT_REPLIES = 10;

// In-memory conversation history per chat (cleared after order completion)
const conversationHistory = new Map();

export async function routeMessage(message) {
  const chatId = String(message.chat?.id);
  const text = message.text || "";
  const isManager = chatId === MANAGER_CHAT_ID();

  if (isManager) {
    return handleManagerMessage(chatId, text, message);
  }
  return handleClientMessage(chatId, text, message);
}

export async function routeCallbackQuery(callbackQuery) {
  const chatId = String(callbackQuery.message?.chat?.id);
  const data = callbackQuery.data || "";
  const isManager = chatId === MANAGER_CHAT_ID();

  if (isManager) {
    return handleManagerCallback(chatId, callbackQuery);
  }
  return handleClientMenuCallback(chatId, callbackQuery);
}

// --- Manager ---

async function handleManagerMessage(chatId, text, message) {
  const [command, ...args] = text.trim().split(/\s+/);

  try {
    const result = await handleManagerCommand(command, args);
    if (result?.text) {
      await sendTelegramMessage(chatId, result.text, { parseMode: "HTML", keyboard: result.keyboard });
      return;
    }
    const formatted = formatManagerResult(command, result);
    await sendTelegramMessage(chatId, formatted, { parseMode: "HTML" });
  } catch (err) {
    await sendTelegramMessage(chatId, `❌ Помилка: ${err.message}`);
  }
}

async function handleManagerCallback(chatId, callbackQuery) {
  const [action, ...params] = (callbackQuery.data || "").split(":");
  const result = await handleManagerCommand(`/${action}`, params);
  if (result?.text) {
    await sendTelegramMessage(chatId, result.text, { parseMode: "HTML", keyboard: result.keyboard });
  }
}

function formatManagerResult(command, result) {
  if (!result) return "Немає даних.";
  if (Array.isArray(result)) {
    if (result.length === 0) return "Список порожній.";
    return result.map(r => formatRow(r)).join("\n---\n");
  }
  if (typeof result === "object") return formatRow(result);
  return String(result);
}

function formatRow(row) {
  return Object.entries(row)
    .filter(([, v]) => v !== "" && v !== null && v !== undefined)
    .map(([k, v]) => `<b>${k}</b>: ${v}`)
    .join("\n");
}

// --- Client ---

async function handleClientMessage(chatId, text, message) {
  const history = conversationHistory.get(chatId) || [];
  const normalized = text.trim().toLowerCase();

  if (["/start", "/menu", "меню"].includes(normalized)) {
    await sendTelegramMessage(chatId, buildClientWelcome(), { parseMode: "HTML", keyboard: clientMenuKeyboard() });
    return;
  }

  if (["/products", "продукти", "товари"].includes(normalized)) {
    await sendTelegramMessage(chatId, formatClientProducts(), { parseMode: "HTML", keyboard: clientMenuKeyboard() });
    return;
  }

  if (["/stock", "залишки", "склад"].includes(normalized)) {
    await sendTelegramMessage(chatId, formatClientStock(), { parseMode: "HTML", keyboard: clientMenuKeyboard() });
    return;
  }

  if (["/help", "приклад", "допомога"].includes(normalized)) {
    await sendTelegramMessage(chatId, buildOrderExamples(), { parseMode: "HTML", keyboard: clientMenuKeyboard() });
    return;
  }

  if (/(зворотн|передзвон|зв.?яж|менеджер|call back|callback)/i.test(text)) {
    requestHandoff(null, { reason: "Client requested callback", clientMessage: text, source: "telegram", chatId });
    conversationHistory.delete(chatId);
    await sendTelegramMessage(chatId, "Звісно. Передам менеджеру запит на зворотний зв'язок. Напишіть, будь ласка, зручний час або номер телефону.", { parseMode: "HTML", keyboard: clientMenuKeyboard() });
    await sendManagerAlert(`Запит на зворотний зв'язок від клієнта ${message.from?.first_name || chatId}:\n${text}`);
    return;
  }

  const assistantReplies = history.filter(item => item.role === "assistant").length;
  if (assistantReplies >= MAX_CLIENT_ASSISTANT_REPLIES) {
    conversationHistory.delete(chatId);
    await sendTelegramMessage(chatId, [
      "Дякую за розмову. Поки не вдалося сформувати повне замовлення.",
      "Щоб почати заново, напишіть /start або одразу надішліть коротко: який торт, вага/кількість і дата."
    ].join("\n"), { parseMode: "HTML", keyboard: clientMenuKeyboard() });
    return;
  }

  // Check for urgent keywords
  const isUrgent = /терміново|срочно|urgent/i.test(text);
  if (isUrgent) {
    const handoff = requestHandoff(null, { reason: "Urgent request from client", clientMessage: text, source: "telegram" });
    conversationHistory.delete(chatId);
    await sendTelegramMessage(chatId, "Ваш запит позначено як терміновий. Менеджер зв'яжеться з вами найближчим часом.");
    await sendManagerAlert(`🚨 Терміновий запит від ${message.from?.first_name || chatId}:\n${text}`);
    return;
  }

  try {
    const parsed = await parseOrderMessage(text, history);

    if (parsed.needs_clarification && parsed.clarification_text) {
      // AI needs more info — ask clarification
      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: parsed.clarification_text });
      conversationHistory.set(chatId, history.slice(-20)); // keep up to 10 user/assistant turns
      await sendTelegramMessage(chatId, parsed.clarification_text, { parseMode: "HTML", keyboard: clientMenuKeyboard() });
      return;
    }

    if (parsed.handoff_required) {
      const handoff = requestHandoff(null, { reason: parsed.handoff_reason || "AI handoff", clientMessage: text, source: "telegram" });
      conversationHistory.delete(chatId);
      await sendTelegramMessage(chatId, parsed.user_message || "Ваш запит передано менеджеру для уточнення.");
      return;
    }

    const missingFields = [];
    if (!parsed.product_name) missingFields.push("який торт");
    if (!parsed.quantity) missingFields.push("вага або кількість");
    if (!parsed.desired_date) missingFields.push("дата");
    if (!parsed.delivery_method) missingFields.push("спосіб отримання: самовивіз, кур'єр або Нова Пошта");
    if (parsed.delivery_method === "nova_poshta" && !parsed.delivery_details) {
      missingFields.push("дані Нової Пошти: місто, відділення/поштомат, ПІБ та телефон отримувача");
    }
    if (!parsed.payment_method) missingFields.push("спосіб оплати: передоплата, повна оплата або готівка при отриманні");
    if (missingFields.length) {
      const clarification = `Уточніть, будь ласка: ${missingFields.join(", ")}.`;
      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: clarification });
      conversationHistory.set(chatId, history.slice(-20));
      await sendTelegramMessage(chatId, clarification, { parseMode: "HTML", keyboard: clientMenuKeyboard() });
      return;
    }

    // Attach Telegram chat ID as event identifier for idempotency
    const orderInput = {
      ...parsed,
      event_id: `tg_${message.message_id}`,
      source: "telegram",
      client_contact: chatId
    };

    const orderResult = createOrder(orderInput);
    conversationHistory.delete(chatId);

    if (orderResult.status === "DUPLICATE_EVENT") {
      await sendTelegramMessage(chatId, "Ваше замовлення вже зареєстровано.");
      return;
    }

    if (orderResult.status === "HANDOFF_REQUIRED") {
      await sendTelegramMessage(chatId, "Ваш запит передано менеджеру. Очікуйте на зворотній зв'язок.");
      return;
    }

    const confirmText = buildOrderConfirmation(orderResult);
    await sendTelegramMessage(chatId, confirmText, { parseMode: "HTML" });
    await sendManagerAlert(buildManagerNewOrderAlert(orderResult, message)).catch(err => {
      saveFailedOperation("telegram.sendNewOrderManagerAlert", { orderId: orderResult.order_id, error: err.message }, err.message);
    });

  } catch (err) {
    saveFailedOperation("telegram.handleClientMessage", { chatId, text, error: err.message }, err.message);
    const userError = createUserFacingError({
      operationId: "telegram.handleClientMessage",
      code: "ORDER_PROCESSING_FAILED",
      details: { chatId, message: err.message, stack: err.stack },
      severity: "CRITICAL"
    });
    await sendTelegramMessage(chatId, userError.user_message);
  }
}

async function handleClientCallback(chatId, callbackQuery) {
  await sendTelegramMessage(chatId, "Дякуємо за відгук!");
}

async function handleClientMenuCallback(chatId, callbackQuery) {
  const data = callbackQuery.data || "";
  if (data === "client_products") {
    await sendTelegramMessage(chatId, formatClientProducts(), { parseMode: "HTML", keyboard: clientMenuKeyboard() });
    return;
  }
  if (data === "client_stock") {
    await sendTelegramMessage(chatId, formatClientStock(), { parseMode: "HTML", keyboard: clientMenuKeyboard() });
    return;
  }
  if (data === "client_examples") {
    await sendTelegramMessage(chatId, buildOrderExamples(), { parseMode: "HTML", keyboard: clientMenuKeyboard() });
    return;
  }
  await sendTelegramMessage(chatId, buildClientWelcome(), { parseMode: "HTML", keyboard: clientMenuKeyboard() });
}

function clientMenuKeyboard() {
  return {
    inline_keyboard: [[
      { text: "Продукти", callback_data: "client_products" },
      { text: "Тестові залишки", callback_data: "client_stock" }
    ], [
      { text: "Приклад замовлення", callback_data: "client_examples" }
    ]]
  };
}

function buildClientWelcome() {
  const discountOffer = formatActiveDiscountOffer();
  return [
    "<b>Вітаю! Це demo-бот для замовлень тортів.</b>",
    "",
    "Можна подивитися demo-продукти або одразу написати замовлення текстом.",
    discountOffer,
    "",
    "<b>Приклад:</b>",
    "Хочу шоколадний торт 2 кг на завтра, без горіхів"
  ].filter(Boolean).join("\n");
}

function formatActiveDiscountOffer() {
  const activeRules = getActiveDiscountRules();
  if (!activeRules.length) return "";
  const offers = activeRules.slice(0, 2).map(rule => {
    const value = rule.type === "percent" ? `${rule.value}%` : `${rule.value} UAH`;
    if (String(rule.applies_to || "").startsWith("amount_over:")) {
      return `- ${value} знижка для замовлень від ${String(rule.applies_to).split(":")[1]} грн`;
    }
    if (rule.every_n_order) {
      return `- ${value} знижка на кожне ${rule.every_n_order}-те замовлення`;
    }
    return `- ${value} знижка`;
  });
  return ["", "<b>Активна пропозиція:</b>", ...offers].join("\n");
}

function buildOrderExamples() {
  return [
    "<b>Приклади повідомлень для замовлення:</b>",
    "",
    "Хочу шоколадний торт 2 кг на завтра, без горіхів",
    "Потрібен медовик 1.5 кг на п'ятницю",
    "Хочу Napoleon Cake 2 кг на суботу з написом Happy Birthday",
    "Berry Cheesecake 1 кг на 20 число, більше ягід"
  ].join("\n");
}

function formatClientProducts() {
  const products = getRows("Products").filter(product => product.is_active !== false);
  if (!products.length) {
    return "Demo-продукти ще не завантажені. У веб-кабінеті натисніть <b>Запустити демо</b>.";
  }
  return [
    "<b>Demo-продукти:</b>",
    "",
    ...products.map(product => `• ${product.name}: ${product.base_price || "?"} UAH / ${product.unit || "unit"}`),
    "",
    "<b>Доступні зміни для Chocolate Cake:</b>",
    "• Add raspberry",
    "• Extra chocolate",
    "• Add nuts",
    "• Remove nuts",
    "• Add inscription"
  ].join("\n");
}

function formatClientStock() {
  const stock = getRows("Stock");
  const components = new Map(getRows("Components").map(component => [component.component_id, component]));
  if (!stock.length) {
    return "Тестові залишки ще не завантажені. У веб-кабінеті натисніть <b>Запустити демо</b>.";
  }
  return [
    "<b>Тестові залишки:</b>",
    "",
    ...stock.map(row => {
      const component = components.get(row.component_id);
      const name = component?.name || row.component_id;
      const available = Number(row.current_qty || 0) - Number(row.reserved_qty || 0);
      return `• ${name}: ${available} ${row.unit || component?.unit || ""}`;
    })
  ].join("\n");
}

function buildOrderConfirmation(order) {
  if (!order?.order_id) return "Замовлення прийнято.";
  const lines = [
    `✅ <b>Замовлення прийнято</b>`,
    `🆔 ${order.order_id}`,
    `📦 Статус: ${order.status}`,
    order.proposed_price ? `💰 Ціна: ${order.proposed_price} грн` : null,
    order.delivery_method ? `🚚 Отримання: ${order.delivery_method}${order.delivery_details ? `; ${order.delivery_details}` : ""}` : null,
    order.payment_method ? `💳 Оплата: ${order.payment_method}` : null,
    order.ready_date ? `📅 Готовність: ${order.ready_date}` : null
  ].filter(Boolean);
  return lines.join("\n");
}

function buildManagerNewOrderAlert(order, message) {
  const orderItems = getRows("OrderItems").filter(item => item.order_id === order.order_id);
  const products = new Map(getRows("Products").map(product => [product.product_id, product]));
  const client = getRows("Clients").find(row => row.client_id === order.client_id);
  const itemLines = orderItems.map(item => {
    const product = products.get(item.product_id);
    const customization = item.customization_summary ? `; ${item.customization_summary}` : "";
    return `• ${product?.name || item.product_id}: ${item.quantity} ${item.unit || product?.unit || ""}${customization}`;
  });

  return [
    "<b>Нове замовлення</b>",
    `Номер: ${order.order_id}`,
    `Клієнт: ${client?.name || message.from?.first_name || order.client_id || "Telegram Client"}`,
    `Контакт: ${client?.contact || message.chat?.id || ""}`,
    `Дата: ${order.desired_date || "не вказано"}`,
    `Отримання: ${order.delivery_method || "не вказано"}${order.delivery_details ? `; ${order.delivery_details}` : ""}`,
    `Оплата: ${order.payment_method || order.payment_status || "не вказано"}`,
    `Статус: ${order.status || "New"}`,
    `Сума: ${order.final_price || order.proposed_price || "?"} грн`,
    order.discount_amount ? `Знижка: ${order.discount_amount} грн` : "",
    "",
    ...itemLines,
    "",
    `Команди: /order ${order.order_id} або /orders`
  ].filter(Boolean).join("\n");
}
