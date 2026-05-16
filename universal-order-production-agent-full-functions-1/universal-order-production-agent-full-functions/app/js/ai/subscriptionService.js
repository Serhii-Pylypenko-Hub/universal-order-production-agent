import { appendRow, findOne, getRows, updateRow } from "../data/rowRepository.js";
import { nowIso } from "../utils/time.js";

export const AI_MODES = {
  ECONOMY: "economy",
  FULL: "full_assistant"
};

function bool(value) {
  return value === true || value === "true";
}

export function getBotAssistantSettings(botId = "BOT-DEFAULT") {
  return findOne("BotAssistantSettings", row => row.bot_id === botId && row.is_active !== false && row.is_active !== "false")
    || findOne("BotAssistantSettings", row => row.bot_id === "BOT-DEFAULT")
    || null;
}

export function getActiveAiMode(botId = "BOT-DEFAULT") {
  const status = getRows("SubscriptionStatus")
    .filter(row => row.status === "active")
    .slice(-1)[0];
  const botSettings = getBotAssistantSettings(botId);
  if (status?.mode === AI_MODES.FULL && bool(botSettings?.full_assistant_enabled)) return AI_MODES.FULL;
  const setting = findOne("Settings", row => row.key === "ai_mode");
  return setting?.value === AI_MODES.FULL && status?.status === "active" && bool(botSettings?.full_assistant_enabled)
    ? AI_MODES.FULL
    : AI_MODES.ECONOMY;
}

export function isFullAssistantActive(botId = "BOT-DEFAULT") {
  return getActiveAiMode(botId) === AI_MODES.FULL;
}

export function seedAiSubscriptionDefaults() {
  if (!findOne("SubscriptionPlans", row => row.plan_id === "PLAN-ECONOMY")) {
    appendRow("SubscriptionPlans", {
      plan_id: "PLAN-ECONOMY",
      name: "Економний",
      mode: AI_MODES.ECONOMY,
      price: 0,
      currency: "UAH",
      features: "order_parse,simple_read",
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }
  if (!findOne("SubscriptionPlans", row => row.plan_id === "PLAN-FULL-AI")) {
    appendRow("SubscriptionPlans", {
      plan_id: "PLAN-FULL-AI",
      name: "Повний AI-асистент",
      mode: AI_MODES.FULL,
      price: "",
      currency: "UAH",
      features: "text_control,voice_control,module_navigation,analysis,confirmed_actions",
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }
  if (!findOne("SubscriptionStatus", row => row.subscription_id === "SUB-DEFAULT")) {
    appendRow("SubscriptionStatus", {
      subscription_id: "SUB-DEFAULT",
      plan_id: "PLAN-ECONOMY",
      mode: AI_MODES.ECONOMY,
      status: "active",
      started_at: nowIso(),
      expires_at: "",
      payment_provider: "manual",
      external_subscription_id: "",
      updated_at: nowIso()
    });
  }

  if (!findOne("BotAccounts", row => row.bot_id === "BOT-DEFAULT")) {
    appendRow("BotAccounts", {
      bot_id: "BOT-DEFAULT",
      name: "Основний Telegram бот",
      channel: "telegram",
      bot_mode: "polling",
      token_status: "configured_in_env",
      manager_chat_id: "",
      webhook_url: "",
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }

  if (!findOne("BotAssistantSettings", row => row.bot_assistant_setting_id === "BOTAI-DEFAULT")) {
    appendRow("BotAssistantSettings", {
      bot_assistant_setting_id: "BOTAI-DEFAULT",
      bot_id: "BOT-DEFAULT",
      assistant_mode: AI_MODES.ECONOMY,
      full_assistant_enabled: false,
      allow_text_control: true,
      allow_voice_control: false,
      allow_send_messages: false,
      allow_order_status_change: false,
      allow_read_recipes: true,
      allow_read_instructions: true,
      requires_confirmation_for_changes: true,
      allowed_order_statuses: "New,ProposalSent,Scheduled,InProduction,Ready,Delivered,Cancelled",
      is_active: true,
      updated_at: nowIso()
    });
  }

  const permissions = [
    ["PERM-ECO-READ", AI_MODES.ECONOMY, "simple_read", true, false, "Simple read-only answers."],
    ["PERM-ECO-ORDER", AI_MODES.ECONOMY, "order_parse", true, false, "Parse order intake messages."],
    ["PERM-ECO-MUTATE", AI_MODES.ECONOMY, "mutate", false, true, "Economy mode cannot change business data."],
    ["PERM-FULL-READ", AI_MODES.FULL, "module_read", true, false, "Read and summarize modules."],
    ["PERM-FULL-ANALYZE", AI_MODES.FULL, "module_analysis", true, false, "Analyze shortages, orders, purchases, tasks."],
    ["PERM-FULL-ACTION", AI_MODES.FULL, "confirmed_action", true, true, "Prepare and execute actions after confirmation."],
    ["PERM-FULL-VOICE", AI_MODES.FULL, "voice_control", true, true, "Voice command control with logging."],
    ["PERM-FULL-SEND", AI_MODES.FULL, "send_message", true, true, "Send user messages through connected bot channels after confirmation."],
    ["PERM-FULL-STATUS", AI_MODES.FULL, "order_status_change", true, true, "Change order statuses after confirmation and state validation."],
    ["PERM-FULL-RECIPE", AI_MODES.FULL, "read_recipe_instruction", true, false, "Read ingredients, recipes, and internal instructions."],
    ["PERM-FORBID-CODE", AI_MODES.FULL, "code_or_system_changes", false, true, "AI assistant must never edit code, files, schema, env, dependencies, or deployment settings."]
  ];
  for (const [permission_id, mode, capability, is_allowed, requires_confirmation, description] of permissions) {
    if (!findOne("AiAssistantPermissions", row => row.permission_id === permission_id)) {
      appendRow("AiAssistantPermissions", {
        permission_id,
        mode,
        capability,
        is_allowed,
        requires_confirmation,
        description,
        updated_at: nowIso()
      });
    }
  }
}

export function setAiMode(mode, { status = "active", paymentProvider = "manual", externalSubscriptionId = "" } = {}) {
  const planId = mode === AI_MODES.FULL ? "PLAN-FULL-AI" : "PLAN-ECONOMY";
  const existing = getRows("SubscriptionStatus").slice(-1)[0];
  const payload = {
    plan_id: planId,
    mode,
    status,
    started_at: nowIso(),
    expires_at: "",
    payment_provider: paymentProvider,
    external_subscription_id: externalSubscriptionId,
    updated_at: nowIso()
  };
  if (existing) {
    return updateRow("SubscriptionStatus", "subscription_id", existing.subscription_id, payload);
  }
  return appendRow("SubscriptionStatus", {
    subscription_id: "SUB-DEFAULT",
    ...payload
  });
}

export function setBotAssistantMode(botId = "BOT-DEFAULT", mode = AI_MODES.ECONOMY) {
  const existing = getBotAssistantSettings(botId);
  const full = mode === AI_MODES.FULL;
  const patch = {
    assistant_mode: full ? AI_MODES.FULL : AI_MODES.ECONOMY,
    full_assistant_enabled: full,
    allow_text_control: true,
    allow_voice_control: full,
    allow_send_messages: full,
    allow_order_status_change: full,
    allow_read_recipes: true,
    allow_read_instructions: true,
    requires_confirmation_for_changes: true,
    updated_at: nowIso()
  };
  return existing
    ? updateRow("BotAssistantSettings", "bot_assistant_setting_id", existing.bot_assistant_setting_id, patch)
    : appendRow("BotAssistantSettings", {
      bot_assistant_setting_id: `BOTAI-${botId}`,
      bot_id: botId,
      allowed_order_statuses: "New,ProposalSent,Scheduled,InProduction,Ready,Delivered,Cancelled",
      is_active: true,
      ...patch
    });
}
