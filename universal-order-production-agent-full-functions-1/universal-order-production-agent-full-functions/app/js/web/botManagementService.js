import { appendRow, findOne, getRows, updateRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { assertValid } from "../errors/validationService.js";
import { logActivity } from "../audit/auditService.js";

export function getBotManagementWorkspace() {
  return {
    accounts: getRows("BotAccounts"),
    assistant_settings: getRows("BotAssistantSettings"),
    flow_schemas: getRows("BotFlowSchemas"),
    settings: getRows("BotSettings"),
    templates: getRows("BotTemplates"),
    flow_steps: getRows("BotOrderFlowSteps").slice().sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
    step_options: getRows("BotStepOptions").slice().sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
    media_assets: getRows("BotMediaAssets"),
    promotions: getRows("Promotions"),
    quick_replies: getRows("BotQuickReplies").slice().sort((a, b) => Number(a.sort_order) - Number(b.sort_order)),
    handoff_rules: getRows("BotHandoffRules"),
    conversation_logs: getRows("BotConversationLogs").slice(-40).reverse()
  };
}

export function saveBotAccount(input) {
  assertValid("Бот", input, {
    required: [
      { name: "name", label: "Назва бота" },
      { name: "channel", label: "Канал" }
    ]
  });

  const existing = input.bot_id ? findOne("BotAccounts", row => row.bot_id === input.bot_id) : null;
  const patch = {
    name: input.name,
    channel: input.channel || "telegram",
    bot_mode: input.bot_mode || existing?.bot_mode || "polling",
    token_status: input.token_status || existing?.token_status || "not_configured",
    manager_chat_id: input.manager_chat_id || existing?.manager_chat_id || "",
    webhook_url: input.webhook_url || existing?.webhook_url || "",
    is_active: input.is_active ?? true,
    updated_at: nowIso()
  };
  const account = existing
    ? updateRow("BotAccounts", "bot_id", existing.bot_id, patch)
    : appendRow("BotAccounts", { bot_id: id("BOT"), created_at: nowIso(), ...patch });
  logActivity({ entityType: "BotAccounts", entityId: account.bot_id, action: "saveBotAccount", newValue: account });
  return account;
}

export function saveBotAssistantSettings(input) {
  assertValid("Full Assistant бота", input, {
    required: [{ name: "bot_id", label: "Бот" }]
  });

  const existing = input.bot_assistant_setting_id
    ? findOne("BotAssistantSettings", row => row.bot_assistant_setting_id === input.bot_assistant_setting_id)
    : findOne("BotAssistantSettings", row => row.bot_id === input.bot_id);
  const checked = value => value === true || value === "true" || value === "on";
  const full = input.assistant_mode === "full_assistant" || checked(input.full_assistant_enabled);
  const patch = {
    bot_id: input.bot_id,
    assistant_mode: full ? "full_assistant" : "economy",
    full_assistant_enabled: full,
    allow_text_control: true,
    allow_voice_control: full && checked(input.allow_voice_control),
    allow_send_messages: full && checked(input.allow_send_messages),
    allow_order_status_change: full && checked(input.allow_order_status_change),
    allow_read_recipes: input.allow_read_recipes === undefined ? true : checked(input.allow_read_recipes),
    allow_read_instructions: input.allow_read_instructions === undefined ? true : checked(input.allow_read_instructions),
    requires_confirmation_for_changes: input.requires_confirmation_for_changes !== false && input.requires_confirmation_for_changes !== "false",
    allowed_order_statuses: input.allowed_order_statuses || existing?.allowed_order_statuses || "New,ProposalSent,Scheduled,InProduction,Ready,Delivered,Cancelled",
    is_active: input.is_active ?? true,
    updated_at: nowIso()
  };
  const settings = existing
    ? updateRow("BotAssistantSettings", "bot_assistant_setting_id", existing.bot_assistant_setting_id, patch)
    : appendRow("BotAssistantSettings", { bot_assistant_setting_id: id("BOTAI"), ...patch });
  logActivity({ entityType: "BotAssistantSettings", entityId: settings.bot_assistant_setting_id, action: "saveBotAssistantSettings", newValue: settings });
  return settings;
}

export function saveBotSetting(input) {
  assertValid("Налаштування бота", input, {
    required: [
      { name: "key", label: "Ключ" },
      { name: "value", label: "Значення" }
    ]
  });

  const existing = findOne("BotSettings", row => row.key === input.key);
  const patch = {
    value: String(input.value),
    type: input.type || existing?.type || "string",
    description: input.description || existing?.description || "",
    updated_at: nowIso()
  };
  const setting = existing
    ? updateRow("BotSettings", "setting_id", existing.setting_id, patch)
    : appendRow("BotSettings", { setting_id: id("BOTSET"), key: input.key, ...patch });
  logActivity({ entityType: "BotSettings", entityId: setting.setting_id, action: "saveBotSetting", newValue: setting });
  return setting;
}

export function saveBotTemplate(input) {
  assertValid("Шаблон бота", input, {
    required: [
      { name: "template_key", label: "Ключ шаблону" },
      { name: "template_text", label: "Текст шаблону" }
    ]
  });

  const existing = input.template_id
    ? findOne("BotTemplates", row => row.template_id === input.template_id)
    : findOne("BotTemplates", row => row.template_key === input.template_key && row.language === (input.language || "uk"));
  const patch = {
    template_key: input.template_key,
    template_text: input.template_text,
    language: input.language || "uk",
    channel: input.channel || "telegram",
    is_active: input.is_active ?? true,
    updated_at: nowIso()
  };
  const template = existing
    ? updateRow("BotTemplates", "template_id", existing.template_id, patch)
    : appendRow("BotTemplates", { template_id: id("BT"), ...patch });
  logActivity({ entityType: "BotTemplates", entityId: template.template_id, action: "saveBotTemplate", newValue: template });
  return template;
}

export function saveBotFlowStep(input) {
  assertValid("Крок прийому замовлення", input, {
    required: [
      { name: "step_key", label: "Ключ кроку" },
      { name: "title", label: "Назва кроку" },
      { name: "prompt_text", label: "Питання клієнту" }
    ],
    numbers: [{ name: "sort_order", label: "Порядок" }]
  });

  const existing = input.step_id
    ? findOne("BotOrderFlowSteps", row => row.step_id === input.step_id)
    : findOne("BotOrderFlowSteps", row => row.step_key === input.step_key);
  const patch = {
    step_key: input.step_key,
    title: input.title,
    prompt_text: input.prompt_text,
    sort_order: Number(input.sort_order || 100),
    is_required: input.is_required === true || input.is_required === "true",
    validation_type: input.validation_type || "text",
    handoff_on_fail: input.handoff_on_fail === true || input.handoff_on_fail === "true",
    is_active: input.is_active ?? true,
    updated_at: nowIso()
  };
  const step = existing
    ? updateRow("BotOrderFlowSteps", "step_id", existing.step_id, patch)
    : appendRow("BotOrderFlowSteps", { step_id: id("BSTEP"), ...patch });
  logActivity({ entityType: "BotOrderFlowSteps", entityId: step.step_id, action: "saveBotFlowStep", newValue: step });
  return step;
}
