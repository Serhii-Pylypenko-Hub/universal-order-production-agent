import https from "https";
import { getRows } from "../data/rowRepository.js";

function checkTelegram() {
  return new Promise(resolve => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) return resolve({ connected: false, reason: "TELEGRAM_BOT_TOKEN not set" });

    const opts = {
      hostname: "api.telegram.org",
      path: `/bot${token}/getMe`,
      method: "GET"
    };
    const req = https.request(opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try {
          const data = JSON.parse(raw);
          resolve({ connected: data.ok === true, botName: data.result?.username });
        } catch {
          resolve({ connected: false, reason: "Invalid response" });
        }
      });
    });
    req.on("error", () => resolve({ connected: false, reason: "Network error" }));
    req.setTimeout(5000, () => { req.destroy(); resolve({ connected: false, reason: "Timeout" }); });
    req.end();
  });
}

function checkOpenRouter() {
  return new Promise(resolve => {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) return resolve({ connected: false, reason: "OPENROUTER_API_KEY not set" });
    // Just verify key is present — avoid unnecessary API call cost
    resolve({ connected: true, model: process.env.AI_MODEL || "openai/gpt-4o-mini" });
  });
}

function checkGoogleSheets() {
  const sheetId = process.env.GOOGLE_SHEETS_ID;
  if (!sheetId) return Promise.resolve({ connected: false, reason: "GOOGLE_SHEETS_ID not set (using LocalJsonStore)" });
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE || process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyFile) return Promise.resolve({ connected: false, reason: "Google credentials not configured" });
  return Promise.resolve({ connected: true, sheetId });
}

function checkGoogleCalendar() {
  const calId = process.env.GOOGLE_CALENDAR_ID;
  if (!calId) return Promise.resolve({ connected: false, reason: "GOOGLE_CALENDAR_ID not set (using local calendar)" });
  return Promise.resolve({ connected: true, calendarId: calId });
}

export async function healthCheckWorkspace() {
  const [telegram, ai, sheets, calendar] = await Promise.all([
    checkTelegram(),
    checkOpenRouter(),
    checkGoogleSheets(),
    checkGoogleCalendar()
  ]);

  const dataChecks = {
    products_filled: getRows("Products").length > 0,
    components_filled: getRows("Components").length > 0,
    bom_complete: getRows("ProductComponents").length > 0,
    stock_filled: getRows("Stock").length > 0,
    message_templates_ready: getRows("MessageTemplates").length > 0
  };

  const dataReady = Object.values(dataChecks).every(Boolean);

  // In local dev mode (no BOT token + no Google Sheets), data readiness is sufficient.
  const isProductionMode = !!(process.env.TELEGRAM_BOT_TOKEN || process.env.GOOGLE_SHEETS_ID);
  const ready_for_orders = isProductionMode
    ? telegram.connected && ai.connected && dataReady
    : dataReady;

  return {
    ...dataChecks,
    telegram,
    ai,
    google_sheets: sheets,
    google_calendar: calendar,
    ready_for_orders,
    mode: isProductionMode ? "production" : "local",
    checked_at: new Date().toISOString()
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  healthCheckWorkspace().then(r => console.log(JSON.stringify(r, null, 2)));
}
