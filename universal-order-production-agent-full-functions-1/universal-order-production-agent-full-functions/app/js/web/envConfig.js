import fs from "fs";

const ENV_PATH = ".env";
const SECRET_KEYS = new Set([
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "OPENROUTER_API_KEY",
  "GOOGLE_SERVICE_ACCOUNT_JSON"
]);

const KNOWN_KEYS = [
  "TELEGRAM_BOT_TOKEN",
  "MANAGER_CHAT_ID",
  "TELEGRAM_WEBHOOK_SECRET",
  "BOT_MODE",
  "WEBHOOK_URL",
  "PORT",
  "OPENROUTER_API_KEY",
  "AI_MODEL",
  "GOOGLE_SHEETS_ID",
  "GOOGLE_SERVICE_ACCOUNT_JSON",
  "GOOGLE_SERVICE_ACCOUNT_KEY_FILE",
  "GOOGLE_CALENDAR_ID",
  "LOCAL_DATA_PATH"
];

export function parseEnv(content) {
  const values = {};
  for (const line of String(content || "").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    const commentIndex = rawValue.indexOf(" #");
    const value = commentIndex >= 0 ? rawValue.slice(0, commentIndex).trim() : rawValue;
    values[key] = value;
  }
  return values;
}

export function serializeEnv(values) {
  return `${KNOWN_KEYS.map(key => `${key}=${values[key] || ""}`).join("\n")}\n`;
}

export function loadEnvFile(filePath = ENV_PATH) {
  const values = fs.existsSync(filePath) ? parseEnv(fs.readFileSync(filePath, "utf-8")) : {};
  applyEnv(values);
  return values;
}

export function applyEnv(values) {
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
}

export function saveEnvPatch(patch, filePath = ENV_PATH) {
  const validationErrors = validateConnectionPatch(patch);
  if (validationErrors.length) {
    const error = new Error(validationErrors.join(" "));
    error.code = "VALIDATION_ERROR";
    error.errors = validationErrors;
    throw error;
  }
  const existing = loadEnvFile(filePath);
  const next = { ...existing };
  for (const key of KNOWN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      let value = String(patch[key] || "").trim();
      if (SECRET_KEYS.has(key) && value === "********") continue;
      if (SECRET_KEYS.has(key) && !value && next[key]) continue;
      next[key] = value;
    }
  }
  if (!next.BOT_MODE) next.BOT_MODE = "polling";
  if (!next.PORT) next.PORT = "3000";
  if (!next.AI_MODEL) next.AI_MODEL = "openai/gpt-4o-mini";
  if (!next.LOCAL_DATA_PATH) next.LOCAL_DATA_PATH = "./data/local_workspace.json";
  fs.writeFileSync(filePath, serializeEnv(next));
  applyEnv(next);
  return next;
}

export function validateConnectionPatch(patch) {
  return validateConnectionPatchDetailed(patch).map(error => error.instruction);
}

export function validateConnectionPatchDetailed(patch) {
  const errors = [];
  const token = String(patch.TELEGRAM_BOT_TOKEN || "").trim();
  const managerChatId = String(patch.MANAGER_CHAT_ID || "").trim();
  const webhookSecret = String(patch.TELEGRAM_WEBHOOK_SECRET || "").trim();
  const openRouterKey = String(patch.OPENROUTER_API_KEY || "").trim();
  const botMode = String(patch.BOT_MODE || "").trim();
  const webhookUrl = String(patch.WEBHOOK_URL || "").trim();
  const localDataPath = String(patch.LOCAL_DATA_PATH || "").trim();

  if (token && token !== "********" && !/^\d{6,}:[A-Za-z0-9_-]{20,}$/.test(token)) {
    errors.push({
      field: "TELEGRAM_BOT_TOKEN",
      label: "Telegram bot token",
      type: "invalid",
      category: "invalid_value",
      instruction: "Telegram bot token має формат `123456789:ABCdef...`: до двокрапки тільки цифри, після двокрапки довгий token від BotFather."
    });
  }

  if (managerChatId && !/^-?\d{5,}$/.test(managerChatId)) {
    errors.push({
      field: "MANAGER_CHAT_ID",
      label: "Manager chat ID",
      type: "invalid",
      category: "invalid_value",
      instruction: "Manager chat ID має бути числом мінімум 5 цифр, наприклад `123456789` або `-1001234567890` для групи."
    });
  }

  if (webhookSecret && webhookSecret !== "********" && !/^[A-Za-z0-9_-]{12,128}$/.test(webhookSecret)) {
    errors.push({
      field: "TELEGRAM_WEBHOOK_SECRET",
      label: "Webhook secret",
      type: "invalid",
      category: "invalid_value",
      instruction: "Webhook secret має містити 12-128 символів: латинські літери, цифри, `_` або `-`."
    });
  }

  if (botMode && !["polling", "webhook"].includes(botMode)) {
    errors.push({
      field: "BOT_MODE",
      label: "Bot mode",
      type: "invalid",
      category: "invalid_value",
      instruction: "Bot mode має бути `polling` або `webhook`."
    });
  }

  if (webhookUrl && !/^https:\/\/[^\s/$.?#].[^\s]*$/i.test(webhookUrl)) {
    errors.push({
      field: "WEBHOOK_URL",
      label: "Webhook URL",
      type: "invalid",
      category: "invalid_value",
      instruction: "Webhook URL має починатися з `https://` і бути повною адресою."
    });
  }

  if (openRouterKey && openRouterKey !== "********" && !/^sk-or-[A-Za-z0-9_-]{12,}/.test(openRouterKey)) {
    errors.push({
      field: "OPENROUTER_API_KEY",
      label: "OpenRouter API key",
      type: "invalid",
      category: "invalid_value",
      instruction: "OpenRouter API key має починатися з `sk-or-` і містити повний ключ з кабінету OpenRouter."
    });
  }

  if (localDataPath && !/\.json$/i.test(localDataPath)) {
    errors.push({
      field: "LOCAL_DATA_PATH",
      label: "Local data path",
      type: "invalid",
      category: "invalid_value",
      instruction: "Local data path має вказувати на `.json` файл, наприклад `./data/local_workspace.json`."
    });
  }

  return errors;
}

export function getConnectionConfig(filePath = ENV_PATH) {
  const values = loadEnvFile(filePath);
  return {
    telegram: {
      token_set: Boolean(values.TELEGRAM_BOT_TOKEN),
      token_length: values.TELEGRAM_BOT_TOKEN ? values.TELEGRAM_BOT_TOKEN.length : 0,
      manager_chat_id: values.MANAGER_CHAT_ID || "",
      webhook_secret_set: Boolean(values.TELEGRAM_WEBHOOK_SECRET),
      bot_mode: values.BOT_MODE || "polling",
      webhook_url: values.WEBHOOK_URL || ""
    },
    ai: {
      openrouter_key_set: Boolean(values.OPENROUTER_API_KEY),
      openrouter_key_length: values.OPENROUTER_API_KEY ? values.OPENROUTER_API_KEY.length : 0,
      model: values.AI_MODEL || "openai/gpt-4o-mini"
    },
    google: {
      sheets_id: values.GOOGLE_SHEETS_ID || "",
      service_account_json_set: Boolean(values.GOOGLE_SERVICE_ACCOUNT_JSON),
      service_account_key_file: values.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || "",
      calendar_id: values.GOOGLE_CALENDAR_ID || ""
    },
    local: {
      data_path: values.LOCAL_DATA_PATH || "./data/local_workspace.json"
    }
  };
}

export function buildEnvPatchFromOnboarding(input) {
  const patch = {};
  for (const key of KNOWN_KEYS) {
    if (Object.prototype.hasOwnProperty.call(input, key)) patch[key] = input[key];
  }
  return patch;
}

export function maskSecret(key, value) {
  if (!SECRET_KEYS.has(key) || !value) return value || "";
  return value.length <= 8 ? "********" : `${value.slice(0, 4)}...${value.slice(-4)}`;
}
