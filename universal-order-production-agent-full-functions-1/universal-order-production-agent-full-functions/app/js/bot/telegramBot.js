import https from "https";
import { fileURLToPath } from "url";
import { initStore } from "../data/store.js";
import { createWebhookServer, registerWebhook } from "./webhookHandler.js";
import { routeMessage, routeCallbackQuery } from "./messageRouter.js";
import { runDeadlineCheck } from "../tasks/deadlineMonitorService.js";
import { sendManagerAlert } from "../tasks/notificationService.js";

// --- Telegram long-polling (development mode) ---

let pollingOffset = 0;
let pollingActive = false;

async function getUpdates() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const body = JSON.stringify({ offset: pollingOffset, timeout: 30, limit: 100 });

  return new Promise((resolve) => {
    const opts = {
      hostname: "api.telegram.org",
      path: `/bot${token}/getUpdates`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) }
    };
    const req = https.request(opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve({ ok: false, result: [] }); }
      });
    });
    req.on("error", () => resolve({ ok: false, result: [] }));
    req.write(body);
    req.end();
  });
}

async function pollLoop() {
  while (pollingActive) {
    try {
      const data = await getUpdates();
      if (data.ok && data.result?.length) {
        for (const update of data.result) {
          pollingOffset = update.update_id + 1;
          if (update.message) await routeMessage(update.message).catch(console.error);
          if (update.callback_query) await routeCallbackQuery(update.callback_query).catch(console.error);
        }
      }
    } catch (err) {
      console.error("[telegramBot] Polling error:", err.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// --- Bot startup ---

export async function startBot(options = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not configured.");

  // Initialize store (supports both LocalJson and GoogleSheets)
  await initStore();
  console.log("[telegramBot] Store initialized.");

  const mode = options.mode || process.env.BOT_MODE || "polling";
  const port = options.port || Number(process.env.PORT) || 3000;
  const webhookUrl = options.webhookUrl || process.env.WEBHOOK_URL;

  if (mode === "webhook") {
    if (!webhookUrl) throw new Error("WEBHOOK_URL is required in webhook mode.");
    createWebhookServer(port);
    const result = await registerWebhook(webhookUrl);
    console.log("[telegramBot] Webhook registered:", result.description);
  } else {
    // Polling mode (development)
    pollingActive = true;
    console.log("[telegramBot] Starting long-polling...");
    pollLoop();
  }

  // Run deadline check once per hour
  runDeadlineCheck();
  setInterval(() => {
    runDeadlineCheck();
  }, 3_600_000);

  await sendManagerAlert("🤖 Бот запущено. Система готова до роботи.");
  console.log("[telegramBot] Bot started successfully.");
}

export function stopBot() {
  pollingActive = false;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startBot().catch(err => {
    console.error("[telegramBot] Startup failed:", err.message);
    process.exit(1);
  });
}
