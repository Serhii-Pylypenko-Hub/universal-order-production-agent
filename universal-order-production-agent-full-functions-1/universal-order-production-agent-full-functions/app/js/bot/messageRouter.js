import { handleManagerCommand } from "../manager/managerService.js";
import { createOrder } from "../orders/orderService.js";
import { parseOrderMessage } from "./aiService.js";
import { requestHandoff } from "../orders/handoffService.js";
import { sendTelegramMessage, sendManagerAlert } from "../tasks/notificationService.js";
import { saveFailedOperation } from "../utils/retryService.js";
import { createUserFacingError } from "../errors/userErrorService.js";

const MANAGER_CHAT_ID = () => process.env.MANAGER_CHAT_ID;

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
  return handleClientCallback(chatId, callbackQuery);
}

// --- Manager ---

async function handleManagerMessage(chatId, text, message) {
  const [command, ...args] = text.trim().split(/\s+/);

  try {
    const result = await handleManagerCommand(command, args);
    const formatted = formatManagerResult(command, result);
    await sendTelegramMessage(chatId, formatted, { parseMode: "HTML" });
  } catch (err) {
    await sendTelegramMessage(chatId, `❌ Помилка: ${err.message}`);
  }
}

async function handleManagerCallback(chatId, callbackQuery) {
  const [action, ...params] = (callbackQuery.data || "").split(":");
  await handleManagerCommand(`/${action}`, params);
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
      conversationHistory.set(chatId, history.slice(-10)); // keep last 10 messages
      await sendTelegramMessage(chatId, parsed.clarification_text);
      return;
    }

    if (parsed.handoff_required) {
      const handoff = requestHandoff(null, { reason: parsed.handoff_reason || "AI handoff", clientMessage: text, source: "telegram" });
      conversationHistory.delete(chatId);
      await sendTelegramMessage(chatId, parsed.user_message || "Ваш запит передано менеджеру для уточнення.");
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

  } catch (err) {
    saveFailedOperation("telegram.handleClientMessage", { chatId, text, error: err.message }, err.message);
    const userError = createUserFacingError("ORDER_PROCESSING_FAILED", { chatId });
    await sendTelegramMessage(chatId, userError.userMessage);
  }
}

async function handleClientCallback(chatId, callbackQuery) {
  await sendTelegramMessage(chatId, "Дякуємо за відгук!");
}

function buildOrderConfirmation(order) {
  if (!order?.order_id) return "Замовлення прийнято.";
  const lines = [
    `✅ <b>Замовлення прийнято</b>`,
    `🆔 ${order.order_id}`,
    `📦 Статус: ${order.status}`,
    order.proposed_price ? `💰 Ціна: ${order.proposed_price} грн` : null,
    order.ready_date ? `📅 Готовність: ${order.ready_date}` : null
  ].filter(Boolean);
  return lines.join("\n");
}
