import https from "https";
import { createTask } from "./taskService.js";
import { findOne } from "../data/rowRepository.js";

// --- Telegram API helper ---

function telegramRequest(method, body) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return Promise.resolve(null);

  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: "api.telegram.org",
      path: `/bot${token}/${method}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
    };
    const req = https.request(opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => { try { resolve(JSON.parse(raw)); } catch { resolve(raw); } });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

// --- Public API ---

export async function sendTelegramMessage(chatId, text, options = {}) {
  return telegramRequest("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: options.parseMode || "HTML",
    reply_markup: options.keyboard || undefined
  });
}

export async function sendManagerAlert(text, options = {}) {
  const chatId = process.env.MANAGER_CHAT_ID;
  if (!chatId) {
    return createTask({ type: "Notification", title: text, priority: "INFO" });
  }
  return sendTelegramMessage(chatId, text, options);
}

export async function sendClientMessage(clientId, text, options = {}) {
  const client = findOne("Clients", r => r.client_id === clientId);
  if (!client?.telegram_chat_id) {
    return createTask({
      type: "Notification",
      title: `Client ${clientId}: ${text.substring(0, 80)}`,
      priority: "INFO"
    });
  }
  return sendTelegramMessage(client.telegram_chat_id, text, options);
}

export async function sendAnswerCallbackQuery(callbackQueryId, text = "") {
  return telegramRequest("answerCallbackQuery", { callback_query_id: callbackQueryId, text });
}

export async function editMessageText(chatId, messageId, text, options = {}) {
  return telegramRequest("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: options.parseMode || "HTML",
    reply_markup: options.keyboard || undefined
  });
}

// --- Legacy compatibility (used by existing code) ---

export function notifyManager({ orderId = "", title, priority = "INFO", type = "Notification" }) {
  sendManagerAlert(`[${priority}] ${title}${orderId ? ` (${orderId})` : ""}`).catch(() => {});
  return createTask({ orderId, type, title, priority });
}

export function notifyDebugFailure({ title, details }) {
  sendManagerAlert(`⚠️ DEBUG FAILURE: ${title}\n${JSON.stringify(details, null, 2)}`).catch(() => {});
  return createTask({ type: "Debug", title: `${title}: ${JSON.stringify(details)}`, priority: "CRITICAL" });
}
