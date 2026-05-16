import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createSession, createUser, destroySession, getSessionUser, verifyLogin } from "./authStore.js";
import { buildEnvPatchFromOnboarding, getConnectionConfig, loadEnvFile, saveEnvPatch, validateConnectionPatchDetailed } from "./envConfig.js";
import { getDashboardSummary } from "./dashboardService.js";
import { createInventoryMaterial, getInventoryWorkspace, getMaterialSuggestions, getProcurementPlan, receiveInventoryLot, saveProcurementSettings } from "./inventoryService.js";
import { addTechCardItem, createCatalogProduct, getCatalogWorkspace } from "./catalogWorkspaceService.js";
import { addPurchaseRequestItem, createPurchaseRequest, createPurchaseRequestFromProcurementPlan, getPurchaseWorkspace, receivePurchaseRequest } from "./purchaseWorkspaceService.js";
import { getBotManagementWorkspace, saveBotAccount, saveBotAssistantSettings, saveBotFlowStep, saveBotSetting, saveBotTemplate } from "./botManagementService.js";
import { logVoiceCommand, runAssistantCommand } from "../ai/assistantActionService.js";
import { getActiveAiMode, isFullAssistantActive, setAiMode, setBotAssistantMode } from "../ai/subscriptionService.js";
import { getInventoryReports } from "../reports/inventoryReportService.js";
import {
  addManualOrderMaterial,
  completeOrderProduction,
  getProductionOrderDetails,
  releaseOrderProductionReservation,
  startOrderProduction,
  updateOrderMaterialRequirement
} from "../production/productionService.js";
import { initializeWorkspace } from "../setup/workspaceManager.js";
import { initStore, resetStore } from "../data/store.js";
import { createOrder } from "../orders/orderService.js";
import { createUserFacingError } from "../errors/userErrorService.js";
import { ValidationError, formatValidationInstructions } from "../errors/validationService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_ROOT = path.resolve(__dirname, "../../web");
const JSON_LIMIT_BYTES = 1024 * 1024;

function parseCookies(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key) cookies[key] = decodeURIComponent(value.join("=") || "");
  }
  return cookies;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sendStatic(res, requestPath) {
  const cleanPath = requestPath === "/" ? "/index.html" : requestPath;
  const filePath = path.resolve(WEB_ROOT, `.${cleanPath}`);
  if (!filePath.startsWith(WEB_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendJson(res, 404, { ok: false, error: "Not found" });
    return;
  }

  const ext = path.extname(filePath);
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml"
  };
  res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", chunk => {
      raw += chunk;
      if (Buffer.byteLength(raw) > JSON_LIMIT_BYTES) {
        reject(new ValidationError("Тіло запиту завелике.", [{
          field: "_body",
          label: "Запит",
          type: "invalid",
          category: "invalid_value",
          instruction: "Запит завеликий. Зменшіть обсяг даних і спробуйте ще раз."
        }]));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new ValidationError("Некоректний JSON.", [{
          field: "_body",
          label: "Запит",
          type: "invalid",
          category: "invalid_value",
          instruction: "Дані запиту мають некоректний формат. Оновіть сторінку і повторіть дію."
        }]));
      }
    });
  });
}

async function requireUser(req, res) {
  const token = parseCookies(req.headers.cookie).session;
  const user = getSessionUser(token);
  if (!user) {
    sendJson(res, 401, { ok: false, error: "Authentication required." });
    return null;
  }
  return { user, token };
}

async function handleApi(req, res, url) {
  if (req.method === "POST" && url.pathname === "/api/auth/register") {
    const body = await readJson(req);
    const created = createUser(body);
    if (!created.ok) return sendJson(res, 400, created);
    const session = createSession(created.user.user_id);
    res.setHeader("Set-Cookie", `session=${session.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
    return sendJson(res, 201, { ok: true, user: created.user });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJson(req);
    const verified = verifyLogin(body);
    if (!verified.ok) return sendJson(res, 401, verified);
    const session = createSession(verified.user.user_id);
    res.setHeader("Set-Cookie", `session=${session.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`);
    return sendJson(res, 200, { ok: true, user: verified.user });
  }

  if (req.method === "POST" && url.pathname === "/api/auth/logout") {
    const token = parseCookies(req.headers.cookie).session;
    if (token) destroySession(token);
    res.setHeader("Set-Cookie", "session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
    return sendJson(res, 200, { ok: true });
  }

  if (req.method === "GET" && url.pathname === "/api/me") {
    const user = await requireUser(req, res);
    if (!user) return;
    return sendJson(res, 200, { ok: true, user: user.user });
  }

  const auth = await requireUser(req, res);
  if (!auth) return;

  if (req.method === "GET" && url.pathname === "/api/connections") {
    return sendJson(res, 200, { ok: true, connections: getConnectionConfig() });
  }

  if (req.method === "POST" && url.pathname === "/api/connections") {
    const body = await readJson(req);
    const patch = buildEnvPatchFromOnboarding(body);
    const validationErrors = validateConnectionPatchDetailed(patch);
    if (validationErrors.length) {
      return sendJson(res, 400, {
        ok: false,
        error: validationErrors.map(error => error.instruction).join("\n"),
        validation_errors: validationErrors
      });
    }
    const values = saveEnvPatch(patch);
    if (body.reset_store === true) resetStore();
    await initStore();
    return sendJson(res, 200, { ok: true, connections: getConnectionConfig(), saved_keys: Object.keys(values) });
  }

  if (req.method === "POST" && url.pathname === "/api/workspace/setup") {
    const body = await readJson(req);
    const template = body.template === "empty" ? "empty" : "cakes";
    const result = initializeWorkspace(template);
    return sendJson(res, 200, { ok: true, result });
  }

  if (req.method === "POST" && url.pathname === "/api/demo/order") {
    const order = createOrder({
      event_id: `web_demo_${Date.now()}`,
      source: "web_demo",
      client_name: "Олена Демонстраційна",
      client_contact: "+380501112233",
      product_name: "Chocolate Cake",
      quantity: 2,
      desired_date: new Date(Date.now() + 2 * 86_400_000).toISOString(),
      restrictions_or_allergies: "без горіхів",
      preferences: "більше ягід",
      customizations: [{ name: "Add raspberry" }, { name: "Remove nuts" }, { name: "Add inscription", custom_value: "Happy Birthday" }],
      urgent: false
    });
    return sendJson(res, 200, { ok: true, order });
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    return sendJson(res, 200, { ok: true, dashboard: await getDashboardSummary() });
  }

  if (req.method === "GET" && url.pathname === "/api/reports/inventory") {
    return sendJson(res, 200, {
      ok: true,
      reports: getInventoryReports({
        date: url.searchParams.get("date") || undefined,
        months: url.searchParams.get("months") || undefined
      })
    });
  }

  if (req.method === "GET" && url.pathname === "/api/inventory") {
    return sendJson(res, 200, { ok: true, inventory: getInventoryWorkspace() });
  }

  if (req.method === "GET" && url.pathname === "/api/inventory/material-suggestions") {
    return sendJson(res, 200, { ok: true, suggestions: getMaterialSuggestions(url.searchParams.get("name") || "") });
  }

  if (req.method === "POST" && url.pathname === "/api/inventory/materials") {
    const body = await readJson(req);
    const result = createInventoryMaterial(body);
    if (!result.created && result.similar?.length && !result.material) {
      return sendJson(res, 409, {
        ok: false,
        error: "Схожий матеріал уже є в довіднику. Перевірте список і виберіть існуючий матеріал або підтвердьте створення нового.",
        similar: result.similar
      });
    }
    return sendJson(res, 200, { ok: true, result, inventory: getInventoryWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/inventory/lots") {
    const body = await readJson(req);
    const lot = receiveInventoryLot({ ...body, created_by: auth.user.user_id || "web" });
    return sendJson(res, 200, { ok: true, lot, inventory: getInventoryWorkspace() });
  }

  if (req.method === "GET" && url.pathname === "/api/inventory/procurement-plan") {
    return sendJson(res, 200, {
      ok: true,
      procurement_plan: getProcurementPlan({
        enabled: url.searchParams.get("enabled") ?? undefined,
        horizon_days: url.searchParams.get("horizon_days") ?? undefined
      })
    });
  }

  if (req.method === "POST" && url.pathname === "/api/inventory/procurement-settings") {
    const body = await readJson(req);
    const settings = saveProcurementSettings(body);
    return sendJson(res, 200, { ok: true, settings, inventory: getInventoryWorkspace() });
  }

  if (req.method === "GET" && url.pathname === "/api/production/order") {
    return sendJson(res, 200, { ok: true, details: getProductionOrderDetails(url.searchParams.get("order_id") || "") });
  }

  if (req.method === "POST" && url.pathname === "/api/production/start") {
    const body = await readJson(req);
    const result = startOrderProduction(body.order_id, auth.user.user_id || "web");
    return sendJson(res, 200, { ok: true, result, inventory: getInventoryWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/production/complete") {
    const body = await readJson(req);
    const result = completeOrderProduction(body.order_id, auth.user.user_id || "web");
    return sendJson(res, 200, { ok: true, result, inventory: getInventoryWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/production/release") {
    const body = await readJson(req);
    const result = releaseOrderProductionReservation(body.order_id, auth.user.user_id || "web");
    return sendJson(res, 200, { ok: true, result, inventory: getInventoryWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/production/requirement") {
    const body = await readJson(req);
    const result = updateOrderMaterialRequirement(body, auth.user.user_id || "web");
    return sendJson(res, 200, { ok: true, result, inventory: getInventoryWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/production/manual-material") {
    const body = await readJson(req);
    const result = addManualOrderMaterial(body, auth.user.user_id || "web");
    return sendJson(res, 200, { ok: true, result, inventory: getInventoryWorkspace() });
  }

  if (req.method === "GET" && url.pathname === "/api/catalog") {
    return sendJson(res, 200, { ok: true, catalog: getCatalogWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/catalog/products") {
    const body = await readJson(req);
    const result = createCatalogProduct(body);
    return sendJson(res, 200, { ok: true, result, catalog: getCatalogWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/catalog/tech-card-items") {
    const body = await readJson(req);
    const result = addTechCardItem(body);
    return sendJson(res, 200, { ok: true, result, catalog: getCatalogWorkspace() });
  }

  if (req.method === "GET" && url.pathname === "/api/purchases") {
    return sendJson(res, 200, { ok: true, purchases: getPurchaseWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/purchases/requests") {
    const body = await readJson(req);
    const request = createPurchaseRequest(body);
    return sendJson(res, 200, { ok: true, request, purchases: getPurchaseWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/purchases/items") {
    const body = await readJson(req);
    const item = addPurchaseRequestItem(body);
    return sendJson(res, 200, { ok: true, item, purchases: getPurchaseWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/purchases/receive") {
    const body = await readJson(req);
    const result = receivePurchaseRequest(body.purchase_request_id, auth.user.user_id || "web");
    return sendJson(res, 200, { ok: true, result, purchases: getPurchaseWorkspace(), inventory: getInventoryWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/purchases/from-procurement-plan") {
    const body = await readJson(req);
    const plan = getProcurementPlan(body);
    const result = createPurchaseRequestFromProcurementPlan(plan.rows, body);
    return sendJson(res, 200, { ok: true, result, purchases: getPurchaseWorkspace(), inventory: getInventoryWorkspace() });
  }

  if (req.method === "GET" && url.pathname === "/api/bot-management") {
    return sendJson(res, 200, { ok: true, bot: getBotManagementWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/bot-management/settings") {
    const body = await readJson(req);
    const setting = saveBotSetting(body);
    return sendJson(res, 200, { ok: true, setting, bot: getBotManagementWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/bot-management/accounts") {
    const body = await readJson(req);
    const account = saveBotAccount(body);
    return sendJson(res, 200, { ok: true, account, bot: getBotManagementWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/bot-management/assistant-settings") {
    const body = await readJson(req);
    const settings = saveBotAssistantSettings(body);
    return sendJson(res, 200, { ok: true, settings, bot: getBotManagementWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/bot-management/templates") {
    const body = await readJson(req);
    const template = saveBotTemplate(body);
    return sendJson(res, 200, { ok: true, template, bot: getBotManagementWorkspace() });
  }

  if (req.method === "POST" && url.pathname === "/api/bot-management/flow-steps") {
    const body = await readJson(req);
    const step = saveBotFlowStep(body);
    return sendJson(res, 200, { ok: true, step, bot: getBotManagementWorkspace() });
  }

  if (req.method === "GET" && url.pathname === "/api/ai-assistant/status") {
    const botId = url.searchParams.get("bot_id") || "BOT-DEFAULT";
    return sendJson(res, 200, {
      ok: true,
      bot_id: botId,
      mode: getActiveAiMode(botId),
      full_assistant_active: isFullAssistantActive(botId)
    });
  }

  if (req.method === "POST" && url.pathname === "/api/ai-assistant/mode") {
    const body = await readJson(req);
    const botId = body.bot_id || "BOT-DEFAULT";
    const subscription = setAiMode(body.mode === "full_assistant" ? "full_assistant" : "economy", {
      status: body.status || "active",
      paymentProvider: body.payment_provider || "manual",
      externalSubscriptionId: body.external_subscription_id || ""
    });
    const bot_assistant_settings = setBotAssistantMode(botId, body.mode === "full_assistant" ? "full_assistant" : "economy");
    return sendJson(res, 200, {
      ok: true,
      subscription,
      bot_assistant_settings,
      bot_id: botId,
      mode: getActiveAiMode(botId),
      full_assistant_active: isFullAssistantActive(botId)
    });
  }

  if (req.method === "POST" && url.pathname === "/api/ai-assistant/command") {
    const body = await readJson(req);
    const result = await runAssistantCommand({ text: body.text || "", source: "web", confirmed: body.confirmed === true, botId: body.bot_id || "BOT-DEFAULT" });
    return sendJson(res, result.ok ? 200 : 400, { ok: result.ok, result });
  }

  if (req.method === "POST" && url.pathname === "/api/ai-assistant/voice-transcript") {
    const body = await readJson(req);
    const voice = logVoiceCommand({ source: "web", botId: body.bot_id || "BOT-DEFAULT", transcript: body.transcript || "", language: body.language || "uk" });
    const result = await runAssistantCommand({ text: body.transcript || "", source: "voice", confirmed: body.confirmed === true, botId: body.bot_id || "BOT-DEFAULT" });
    return sendJson(res, result.ok ? 200 : 400, { ok: result.ok, voice, result });
  }

  return sendJson(res, 404, { ok: false, error: "Unknown API route." });
}

export async function createWebServer() {
  loadEnvFile();
  await initStore();

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    try {
      if (url.pathname.startsWith("/api/")) {
        await handleApi(req, res, url);
      } else {
        sendStatic(res, url.pathname);
      }
    } catch (error) {
      if (error instanceof ValidationError || error.code === "VALIDATION_ERROR") {
        return sendJson(res, 400, {
          ok: false,
          error: formatValidationInstructions(error),
          validation_errors: error.errors || []
        });
      }
      const userError = createUserFacingError({
        operationId: `${req.method} ${url.pathname}`,
        code: error.code || "UNKNOWN_ERROR",
        details: { message: error.message, stack: error.stack },
        severity: "CRITICAL"
      });
      sendJson(res, 500, { ok: false, error: userError.user_message, error_id: userError.error_id });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  const server = await createWebServer();
  server.listen(port, () => {
    console.log(`Web onboarding is running at http://localhost:${port}`);
  });
}
