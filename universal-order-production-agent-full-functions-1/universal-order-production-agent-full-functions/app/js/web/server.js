import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createSession, createUser, destroySession, getSessionUser, verifyLogin } from "./authStore.js";
import { buildEnvPatchFromOnboarding, getConnectionConfig, loadEnvFile, saveEnvPatch, validateConnectionPatch } from "./envConfig.js";
import { getDashboardSummary } from "./dashboardService.js";
import { initializeWorkspace } from "../setup/workspaceManager.js";
import { initStore, resetStore } from "../data/store.js";
import { createOrder } from "../orders/orderService.js";

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
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body."));
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
    const validationErrors = validateConnectionPatch(patch);
    if (validationErrors.length) {
      return sendJson(res, 400, { ok: false, error: validationErrors.join(" ") });
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
      sendJson(res, 500, { ok: false, error: error.message || "Internal server error." });
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
