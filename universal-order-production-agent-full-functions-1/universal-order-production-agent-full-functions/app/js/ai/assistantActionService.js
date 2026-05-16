import { appendRow, getRows } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { getInventoryWorkspace } from "../web/inventoryService.js";
import { getCatalogWorkspace } from "../web/catalogWorkspaceService.js";
import { getPurchaseWorkspace } from "../web/purchaseWorkspaceService.js";
import { getProductionOrderDetails, startOrderProduction } from "../production/productionService.js";
import { updateOrderStatus } from "../orders/orderService.js";
import { getInventoryBalanceOnDate, getMonthlyInventoryDifferences } from "../reports/inventoryReportService.js";
import { sendTelegramMessage } from "../tasks/notificationService.js";
import { AI_MODES, getActiveAiMode, getBotAssistantSettings, isFullAssistantActive } from "./subscriptionService.js";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function bool(value) {
  return value === true || value === "true";
}

function logAction({ source = "web", botId = "BOT-DEFAULT", mode, userInput, intent, targetModule, actionName, payload = {}, status, requiresConfirmation = false, resultSummary = "", errorMessage = "" }) {
  return appendRow("AiAssistantActions", {
    action_id: id("AIA"),
    source,
    bot_id: botId,
    mode,
    user_input: userInput,
    intent,
    target_module: targetModule,
    action_name: actionName,
    payload: JSON.stringify(payload),
    status,
    requires_confirmation: requiresConfirmation,
    result_summary: resultSummary,
    error_message: errorMessage,
    created_at: nowIso(),
    completed_at: ["Completed", "Blocked", "Failed", "NeedsConfirmation"].includes(status) ? nowIso() : ""
  });
}

function detectIntent(text) {
  const normalized = String(text || "").toLowerCase();
  if (/(код|файл|schema|схем|\.env|env|залежн|dependency|package|npm|deploy|деплой|сервер|prompt|промпт|репозитор|git|github|install|встанови пакет|зміни файл|редагуй файл|онови схему)/.test(normalized)) {
    return { intent: "forbidden_code_or_system_change", module: "system", action: "forbidden" };
  }
  if (/дефіцит|не вистач|низьк|закінч/.test(normalized)) return { intent: "show_shortages", module: "inventory", action: "read" };
  if (/баланс.*дат|залишк.*дат|balance.*date/.test(normalized)) return { intent: "inventory_balance_on_date", module: "reports", action: "read" };
  if (/помісяч|місячн|monthly|різниц/.test(normalized)) return { intent: "monthly_inventory_differences", module: "reports", action: "analyze" };
  if (/склад|залишк|матеріал/.test(normalized)) return { intent: "show_inventory", module: "inventory", action: "read" };
  if (/закуп/.test(normalized)) return { intent: "analyze_purchases", module: "purchases", action: "analyze" };
  if (/візьми.*роботу|взяти.*роботу|start.*production/.test(normalized)) return { intent: "start_production", module: "production", action: "mutate" };
  if (/зміни.*статус|постав.*статус|status/.test(normalized)) return { intent: "change_order_status", module: "production", action: "mutate" };
  if (/відправ.*повідом|надішли.*повідом|send.*message/.test(normalized)) return { intent: "send_message", module: "bot", action: "mutate" };
  if (/інгредієнт|рецепт|склад продукту|техкарт/.test(normalized)) return { intent: "read_recipe", module: "catalog", action: "read" };
  if (/інструкц|як користув|що ти вмієш|допомог/.test(normalized)) return { intent: "read_instruction", module: "assistant", action: "read" };
  if (/техкарт|рецепт|продукт/.test(normalized)) return { intent: "show_catalog", module: "catalog", action: "read" };
  if (/замовлен|order|ord-/.test(normalized)) return { intent: "show_orders", module: "production", action: "read" };
  if (/сьогодні|що треба|план|аналіз/.test(normalized)) return { intent: "daily_summary", module: "workspace", action: "analyze" };
  return { intent: "help", module: "assistant", action: "read" };
}

function extractOrderId(text) {
  return String(text || "").match(/ORD-[A-Z0-9]+/i)?.[0]?.toUpperCase() || "";
}

function extractStatus(text) {
  const normalized = String(text || "").toLowerCase();
  const pairs = [
    ["new", "New"],
    ["нов", "New"],
    ["proposal", "ProposalSent"],
    ["пропоз", "ProposalSent"],
    ["scheduled", "Scheduled"],
    ["заплан", "Scheduled"],
    ["inproduction", "InProduction"],
    ["виробниц", "InProduction"],
    ["робот", "InProduction"],
    ["ready", "Ready"],
    ["готов", "Ready"],
    ["delivered", "Delivered"],
    ["достав", "Delivered"],
    ["cancel", "Cancelled"],
    ["скас", "Cancelled"]
  ];
  return pairs.find(([key]) => normalized.includes(key))?.[1] || "";
}

function extractMessageTarget(text) {
  const chatId = String(text || "").match(/chat[:=\s]+([-\d]+)/i)?.[1] || "";
  const message = String(text || "")
    .replace(/^(відправ|надішли|send).*?(повідомлення|message)?/i, "")
    .replace(/chat[:=\s]+[-\d]+/i, "")
    .trim();
  return { chatId, message };
}

function formatShortages() {
  const inventory = getInventoryWorkspace();
  const rows = inventory.materials.filter(row => asNumber(row.available_qty) <= asNumber(row.min_qty));
  if (!rows.length) return "Критичних дефіцитів зараз немає.";
  return rows.map(row => `${row.name}: доступно ${row.available_qty} ${row.unit}, мінімум ${row.min_qty}`).join("\n");
}

function formatInventory() {
  const inventory = getInventoryWorkspace();
  return inventory.materials.slice(0, 20).map(row =>
    `${row.name}: доступно ${row.available_qty} ${row.unit}, резерв ${row.reserved_qty}, статус ${row.availability_status}`
  ).join("\n") || "Склад порожній.";
}

function formatPurchases() {
  const purchases = getPurchaseWorkspace();
  const active = purchases.requests.filter(row => !["Received", "Cancelled", "Closed"].includes(row.status));
  if (!active.length) return "Активних закупок немає.";
  return active.map(row => `${row.purchase_request_id}: ${row.status}, позицій ${row.items_count}, очікувана сума ${row.total_expected_cost}`).join("\n");
}

function formatCatalog() {
  const catalog = getCatalogWorkspace();
  return catalog.products.slice(0, 20).map(product =>
    `${product.name}: ${product.base_price} / ${product.unit}, техкарта ${product.tech_card_items.length} рядків`
  ).join("\n") || "Каталог продуктів порожній.";
}

function formatOrders() {
  const orders = getRows("Orders").filter(order => !["Closed", "Cancelled", "Delivered", "PickedUp"].includes(order.status));
  if (!orders.length) return "Активних замовлень немає.";
  return orders.slice(-20).reverse().map(order => `${order.order_id}: ${order.status}, дата ${String(order.desired_date || "").slice(0, 10)}, сума ${order.final_price || order.proposed_price || "?"}`).join("\n");
}

function formatDailySummary() {
  return [
    "Короткий підсумок:",
    "",
    "Дефіцити:",
    formatShortages(),
    "",
    "Активні закупки:",
    formatPurchases(),
    "",
    "Активні замовлення:",
    formatOrders()
  ].join("\n");
}

function extractDate(text) {
  return String(text || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || new Date().toISOString().slice(0, 10);
}

function extractMonths(text) {
  const matched = String(text || "").match(/(\d{1,2})\s*(міс|month)/i)?.[1];
  return Math.min(24, Math.max(1, Number(matched) || 6));
}

function formatInventoryBalanceOnDate(text) {
  const report = getInventoryBalanceOnDate(extractDate(text));
  const rows = report.rows.slice(0, 20).map(row =>
    `${row.material_name}: ${row.qty} ${row.unit}, вартість ${row.value}`
  ).join("\n") || "Рухів складу до цієї дати немає.";
  return [`Баланс складу на ${report.date}`, `Позицій: ${report.totals.qty_positions}`, `Вартість: ${report.totals.value}`, "", rows].join("\n");
}

function formatMonthlyInventoryDifferences(text) {
  const report = getMonthlyInventoryDifferences(extractMonths(text));
  const summary = report.summary.map(row =>
    `${row.month}: прихід ${row.in_qty}, списання ${row.out_qty}, різниця вартості ${row.net_value}`
  ).join("\n") || "Поки немає рухів складу для помісячного звіту.";
  return [`Помісячні різниці складу за ${report.months} міс.`, "", summary].join("\n");
}

function formatRecipe(text) {
  const catalog = getCatalogWorkspace();
  const normalized = String(text || "").toLowerCase();
  const product = catalog.products.find(row => normalized.includes(String(row.name || "").toLowerCase()))
    || catalog.products[0];
  if (!product) return "Каталог продуктів порожній. Спочатку створіть продукт і техкарту.";
  const items = product.tech_card_items?.length
    ? product.tech_card_items.map(item => `- ${item.component_name}: ${item.qty_per_unit} ${item.unit}`).join("\n")
    : "Техкарта ще не заповнена.";
  return [`${product.name}`, "Інгредієнти / техкарта:", items].join("\n");
}

function formatInstruction() {
  return [
    "Full Assistant може керувати системою текстом або голосом у межах прав користувача.",
    "",
    "Можна:",
    "- показати склад, дефіцити, закупки, замовлення",
    "- прочитати рецепт або інгредієнти продукту",
    "- взяти замовлення в роботу",
    "- змінити статус замовлення",
    "- підготувати або відправити повідомлення через підключений бот",
    "",
    "Зміни даних виконуються тільки після підтвердження. Код, файли, схему, .env, залежності та деплой AI змінювати не може."
  ].join("\n");
}

function assertBotPermission(settings, permission, label) {
  if (!bool(settings?.[permission])) {
    return {
      ok: false,
      message: `${label} вимкнено в налаштуваннях цього бота. Увімкніть дозвіл у блоці керування ботом.`
    };
  }
  return { ok: true };
}

export async function runAssistantCommand({ text, source = "web", confirmed = false, botId = "BOT-DEFAULT" }) {
  const mode = getActiveAiMode(botId);
  const botSettings = getBotAssistantSettings(botId);
  const detected = detectIntent(text);
  const base = { source, botId, mode, userInput: text, intent: detected.intent, targetModule: detected.module, actionName: detected.action };

  try {
    if (source === "voice" && !isFullAssistantActive(botId)) {
      logAction({ ...base, status: "Blocked", errorMessage: "Voice control requires full assistant mode." });
      return {
        ok: false,
        mode,
        requires_upgrade: true,
        message: "Голосове керування доступне тільки в режимі Full Assistant для цього бота."
      };
    }

    if (detected.action === "forbidden") {
      const message = "Я не маю права змінювати код, файли проєкту, схему, .env, залежності або деплой. Я можу виконувати тільки бізнес-дії, доступні користувачу через інтерфейс: показати дані, проаналізувати, створити замовлення/закупку або виконати виробничу дію з підтвердженням.";
      logAction({ ...base, status: "Blocked", errorMessage: "Code/system change request is forbidden." });
      return { ok: false, mode, forbidden: true, message };
    }

    if (detected.action === "mutate") {
      if (!isFullAssistantActive(botId)) {
        logAction({ ...base, status: "Blocked", errorMessage: "Full assistant subscription required." });
        return {
          ok: false,
          mode,
          requires_upgrade: true,
          message: "Ця дія доступна в режимі повного AI-асистента. Економний режим може показувати дані, але не змінює систему."
        };
      }
      if (source === "voice" && !bool(botSettings?.allow_voice_control)) {
        logAction({ ...base, status: "Blocked", errorMessage: "Voice control disabled for bot." });
        return { ok: false, mode, message: "Голосове керування вимкнено для цього бота." };
      }
      if (!confirmed) {
        logAction({ ...base, status: "NeedsConfirmation", requiresConfirmation: true });
        return {
          ok: true,
          mode,
          requires_confirmation: true,
          message: "Потрібне підтвердження перед зміною даних. Підтвердіть дію, і я виконаю її."
        };
      }
      if (detected.intent === "start_production") {
        const allowed = assertBotPermission(botSettings, "allow_order_status_change", "Зміна статусу замовлення");
        if (!allowed.ok) return { ok: false, mode, message: allowed.message };
        const orderId = extractOrderId(text);
        if (!orderId) throw new Error("Не знайшов номер замовлення. Напишіть, наприклад: візьми ORD-123 в роботу.");
        const result = startOrderProduction(orderId, "ai_assistant");
        logAction({ ...base, payload: { orderId }, status: "Completed", resultSummary: `Замовлення ${orderId} взято в роботу.` });
        return { ok: true, mode, message: `Замовлення ${orderId} взято в роботу.`, result };
      }
      if (detected.intent === "change_order_status") {
        const allowed = assertBotPermission(botSettings, "allow_order_status_change", "Зміна статусу замовлення");
        if (!allowed.ok) return { ok: false, mode, message: allowed.message };
        const orderId = extractOrderId(text);
        const nextStatus = extractStatus(text);
        if (!orderId) throw new Error("Не знайшов номер замовлення. Напишіть, наприклад: зміни статус ORD-123 на Ready.");
        if (!nextStatus) throw new Error("Не зрозумів новий статус. Приклади: Scheduled, InProduction, Ready, Delivered, Cancelled.");
        const allowedStatuses = String(botSettings?.allowed_order_statuses || "").split(",").map(s => s.trim()).filter(Boolean);
        if (allowedStatuses.length && !allowedStatuses.includes(nextStatus)) {
          throw new Error(`Статус ${nextStatus} не дозволений для цього бота. Дозволено: ${allowedStatuses.join(", ")}.`);
        }
        const result = updateOrderStatus(orderId, nextStatus);
        logAction({ ...base, payload: { orderId, nextStatus }, status: "Completed", resultSummary: `Статус ${orderId} змінено на ${result?.status || nextStatus}.` });
        return { ok: true, mode, message: `Статус ${orderId}: ${result?.status || nextStatus}.`, result };
      }
      if (detected.intent === "send_message") {
        const allowed = assertBotPermission(botSettings, "allow_send_messages", "Відправлення повідомлень");
        if (!allowed.ok) return { ok: false, mode, message: allowed.message };
        const target = extractMessageTarget(text);
        if (!target.message) throw new Error("Не бачу текст повідомлення. Напишіть, наприклад: відправ повідомлення chat 12345 Ваше замовлення готове.");
        let result = { prepared: true };
        if (target.chatId) {
          result = await sendTelegramMessage(target.chatId, target.message);
        }
        const summary = target.chatId ? `Повідомлення відправлено в chat ${target.chatId}.` : "Повідомлення підготовлено. Додайте chat_id для фактичної відправки.";
        logAction({ ...base, payload: target, status: "Completed", resultSummary: summary });
        return { ok: true, mode, message: summary, result };
      }
    }

    let message = "";
    if (detected.intent === "show_shortages") message = formatShortages();
    else if (detected.intent === "inventory_balance_on_date") message = formatInventoryBalanceOnDate(text);
    else if (detected.intent === "monthly_inventory_differences") message = formatMonthlyInventoryDifferences(text);
    else if (detected.intent === "show_inventory") message = formatInventory();
    else if (detected.intent === "analyze_purchases") message = formatPurchases();
    else if (detected.intent === "show_catalog") message = formatCatalog();
    else if (detected.intent === "read_recipe") {
      const allowed = assertBotPermission(botSettings, "allow_read_recipes", "Читання рецептів");
      message = allowed.ok ? formatRecipe(text) : allowed.message;
    }
    else if (detected.intent === "read_instruction") {
      const allowed = assertBotPermission(botSettings, "allow_read_instructions", "Читання інструкцій");
      message = allowed.ok ? formatInstruction() : allowed.message;
    }
    else if (detected.intent === "show_orders") {
      const orderId = extractOrderId(text);
      if (orderId) {
        const details = getProductionOrderDetails(orderId);
        message = details
          ? `${orderId}: ${details.order.status}\nМатеріали:\n${details.materials.map(row => `${row.component_name}: потрібно ${row.required_qty} ${row.unit}, резерв ${row.reserved_qty}, дефіцит ${row.missing_qty}`).join("\n")}`
          : `Замовлення ${orderId} не знайдено.`;
      } else {
        message = formatOrders();
      }
    } else if (detected.intent === "daily_summary") message = formatDailySummary();
    else {
      message = [
        "Я можу допомогти командами:",
        "- покажи дефіцит",
        "- покажи склад",
        "- проаналізуй закупки",
        "- покажи активні замовлення",
        "- покажи замовлення ORD-...",
        "- візьми ORD-... в роботу (повний AI-режим, з підтвердженням)"
      ].join("\n");
    }

    logAction({ ...base, status: "Completed", resultSummary: message });
    return { ok: true, mode, message };
  } catch (error) {
    logAction({ ...base, status: "Failed", errorMessage: error.message });
    return { ok: false, mode, message: error.message };
  }
}

export function logVoiceCommand({ source = "web", botId = "BOT-DEFAULT", audioRef = "", transcript, language = "uk", status = "Transcribed" }) {
  return appendRow("VoiceCommandLogs", {
    voice_command_id: id("VOICE"),
    bot_id: botId,
    source,
    audio_ref: audioRef,
    transcript,
    language,
    status,
    created_at: nowIso()
  });
}
