import fs from "fs";
import { createSession, createUser, destroySession, getSessionUser, verifyLogin } from "../app/js/web/authStore.js";
import { buildEnvPatchFromOnboarding, getConnectionConfig, saveEnvPatch, validateConnectionPatch } from "../app/js/web/envConfig.js";

const tempDir = "./data/test-web";
const authPath = `${tempDir}/auth.json`;
const envPath = `${tempDir}/.env`;

fs.rmSync(tempDir, { recursive: true, force: true });
fs.mkdirSync(tempDir, { recursive: true });

const badUser = createUser({ name: "A", email: "bad", password: "123" }, authPath);
if (badUser.ok) throw new Error("Invalid registration passed");

const created = createUser({
  name: "Manager",
  email: "manager@example.com",
  password: "strong-password"
}, authPath);
if (!created.ok) throw new Error("Valid registration failed");

const duplicate = createUser({
  name: "Manager 2",
  email: "manager@example.com",
  password: "strong-password"
}, authPath);
if (duplicate.ok) throw new Error("Duplicate email registration passed");

const failedLogin = verifyLogin({ email: "manager@example.com", password: "wrong-password" }, authPath);
if (failedLogin.ok) throw new Error("Invalid password passed");

const login = verifyLogin({ email: "manager@example.com", password: "strong-password" }, authPath);
if (!login.ok) throw new Error("Valid login failed");

const session = createSession(login.user.user_id, authPath);
const sessionUser = getSessionUser(session.token, authPath);
if (!sessionUser || sessionUser.email !== "manager@example.com") throw new Error("Session user lookup failed");

destroySession(session.token, authPath);
if (getSessionUser(session.token, authPath)) throw new Error("Session destroy failed");

saveEnvPatch(buildEnvPatchFromOnboarding({
  TELEGRAM_BOT_TOKEN: "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  MANAGER_CHAT_ID: "123456789",
  OPENROUTER_API_KEY: "sk-or-valid_key_123456789",
  AI_MODEL: "openai/gpt-4o-mini",
  LOCAL_DATA_PATH: "./data/local_workspace.json"
}), envPath);

const connections = getConnectionConfig(envPath);
if (!connections.telegram.token_set) throw new Error("Telegram token was not saved");
if (!connections.ai.openrouter_key_set) throw new Error("OpenRouter key was not saved");
if (connections.telegram.manager_chat_id !== "123456789") throw new Error("Manager chat id mismatch");

if (validateConnectionPatch({ TELEGRAM_BOT_TOKEN: "bad-token" }).length === 0) {
  throw new Error("Invalid Telegram token passed validation");
}
if (validateConnectionPatch({ MANAGER_CHAT_ID: "not-a-number" }).length === 0) {
  throw new Error("Invalid manager chat id passed validation");
}
if (validateConnectionPatch({ OPENROUTER_API_KEY: "bad-key" }).length === 0) {
  throw new Error("Invalid OpenRouter key passed validation");
}
try {
  saveEnvPatch(buildEnvPatchFromOnboarding({ TELEGRAM_BOT_TOKEN: "bad-token" }), envPath);
  throw new Error("Invalid token was saved");
} catch (error) {
  if (error.message === "Invalid token was saved") throw error;
}
saveEnvPatch(buildEnvPatchFromOnboarding({ TELEGRAM_BOT_TOKEN: "987654321:ABCDEFGHIJKLMNOPQRSTUVWXYZ" }), envPath);
if (!getConnectionConfig(envPath).telegram.token_set) throw new Error("Valid Telegram token was not resaved");

fs.rmSync(tempDir, { recursive: true, force: true });
console.log("Web onboarding tests passed.");
