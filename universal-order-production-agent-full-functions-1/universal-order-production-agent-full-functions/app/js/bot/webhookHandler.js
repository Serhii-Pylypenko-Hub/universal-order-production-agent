import http from "http";
import { routeMessage, routeCallbackQuery } from "./messageRouter.js";
import { sendManagerAlert } from "../tasks/notificationService.js";

// Simple in-memory rate limiter: max 30 messages per minute per chat
const rateLimitMap = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function isRateLimited(chatId) {
  const now = Date.now();
  const entry = rateLimitMap.get(chatId);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    rateLimitMap.set(chatId, { windowStart: now, count: 1 });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Request too large"));
      }
    });
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

export function createWebhookServer(port = 3000) {
  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;

  const server = http.createServer(async (req, res) => {
    // Only accept POST /webhook
    if (req.method !== "POST" || req.url !== "/webhook") {
      res.writeHead(404);
      res.end();
      return;
    }

    // Validate Telegram secret token header
    if (secretToken) {
      const incoming = req.headers["x-telegram-bot-api-secret-token"];
      if (incoming !== secretToken) {
        res.writeHead(403);
        res.end(JSON.stringify({ ok: false, error: "Forbidden" }));
        return;
      }
    }

    let update;
    try {
      update = await parseBody(req);
    } catch (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false, error: err.message }));
      return;
    }

    // Rate limiting
    const chatId = String(
      update.message?.chat?.id ||
      update.callback_query?.message?.chat?.id ||
      "unknown"
    );
    if (isRateLimited(chatId)) {
      res.writeHead(429);
      res.end(JSON.stringify({ ok: false, error: "Too Many Requests" }));
      return;
    }

    // Always respond 200 immediately (Telegram requires fast response)
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));

    // Process asynchronously after responding
    setImmediate(async () => {
      try {
        if (update.message) {
          await routeMessage(update.message);
        } else if (update.callback_query) {
          await routeCallbackQuery(update.callback_query);
        }
      } catch (err) {
        console.error("[webhookHandler] Error processing update:", err.message);
        sendManagerAlert(`⚠️ Webhook error: ${err.message}`).catch(() => {});
      }
    });
  });

  server.listen(port, () => {
    console.log(`[webhookHandler] Webhook server listening on port ${port}`);
  });

  return server;
}

// Register webhook URL with Telegram
export async function registerWebhook(webhookUrl) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is not set.");

  const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
  const body = { url: webhookUrl };
  if (secretToken) body.secret_token = secretToken;

  const https = await import("https");
  const data = JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "api.telegram.org",
      path: `/bot${token}/setWebhook`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
    };
    const req = https.default.request(opts, res => {
      let raw = "";
      res.on("data", c => raw += c);
      res.on("end", () => resolve(JSON.parse(raw)));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}
