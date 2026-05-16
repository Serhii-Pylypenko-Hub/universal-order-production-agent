import crypto from "crypto";
import fs from "fs";
import path from "path";
import { nowIso } from "../utils/time.js";

const DEFAULT_AUTH_PATH = "./data/web_auth.json";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function readAuth(filePath = DEFAULT_AUTH_PATH) {
  if (!fs.existsSync(filePath)) return { users: [], sessions: [] };
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeAuth(data, filePath = DEFAULT_AUTH_PATH) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 120000, 64, "sha512").toString("hex");
  return { salt, hash };
}

function publicUser(user) {
  if (!user) return null;
  return {
    user_id: user.user_id,
    name: user.name,
    email: user.email,
    created_at: user.created_at
  };
}

export function validateRegistration({ name, email, password }) {
  const cleanName = String(name || "").trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || "");

  if (!cleanName) return "Не заповнено поле \"Ім'я\". Вкажіть ім'я користувача.";
  if (cleanName.length < 2) return "Поле \"Ім'я\" заповнене некоректно. Вкажіть мінімум 2 символи.";
  if (!cleanEmail) return "Не заповнено поле \"Пошта\". Вкажіть email для входу.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return "Поле \"Пошта\" заповнене некоректно. Вкажіть email у форматі name@example.com.";
  if (!cleanPassword) return "Не заповнено поле \"Пароль\". Вкажіть пароль для входу.";
  if (cleanPassword.length < 8) return "Поле \"Пароль\" заповнене некоректно. Пароль має містити мінімум 8 символів.";
  return "";
}

export function createUser(input, filePath = DEFAULT_AUTH_PATH) {
  const error = validateRegistration(input);
  if (error) return { ok: false, error };

  const data = readAuth(filePath);
  const email = normalizeEmail(input.email);
  if (data.users.some(user => user.email === email)) {
    return { ok: false, error: "Користувач з такою поштою вже існує. Увійдіть або використайте іншу пошту." };
  }

  const password = hashPassword(input.password);
  const user = {
    user_id: crypto.randomUUID(),
    name: String(input.name).trim(),
    email,
    password_hash: password.hash,
    password_salt: password.salt,
    created_at: nowIso()
  };

  data.users.push(user);
  writeAuth(data, filePath);
  return { ok: true, user: publicUser(user) };
}

export function verifyLogin({ email, password }, filePath = DEFAULT_AUTH_PATH) {
  const data = readAuth(filePath);
  const user = data.users.find(row => row.email === normalizeEmail(email));
  if (!email || !password) return { ok: false, error: "Заповніть пошту і пароль для входу." };
  if (!user) return { ok: false, error: "Пошта або пароль некоректні. Перевірте дані й спробуйте ще раз." };

  const candidate = hashPassword(password, user.password_salt);
  const valid = crypto.timingSafeEqual(
    Buffer.from(candidate.hash, "hex"),
    Buffer.from(user.password_hash, "hex")
  );

  if (!valid) return { ok: false, error: "Пошта або пароль некоректні. Перевірте дані й спробуйте ще раз." };
  return { ok: true, user: publicUser(user) };
}

export function resetLocalPassword({ email, password }, filePath = DEFAULT_AUTH_PATH) {
  const data = readAuth(filePath);
  const cleanEmail = normalizeEmail(email);
  const cleanPassword = String(password || "");
  const user = data.users.find(row => row.email === cleanEmail);

  if (!cleanEmail) return { ok: false, error: "Вкажіть пошту, для якої потрібно змінити пароль." };
  if (!user) return { ok: false, error: "Користувача з такою поштою не знайдено. Спочатку створіть акаунт." };
  if (cleanPassword.length < 8) return { ok: false, error: "Новий пароль має містити мінімум 8 символів." };

  const nextPassword = hashPassword(cleanPassword);
  user.password_hash = nextPassword.hash;
  user.password_salt = nextPassword.salt;
  user.password_reset_at = nowIso();
  writeAuth(data, filePath);
  return { ok: true, user: publicUser(user) };
}

export function createSession(userId, filePath = DEFAULT_AUTH_PATH) {
  const data = readAuth(filePath);
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  data.sessions = data.sessions.filter(session => new Date(session.expires_at).getTime() > Date.now());
  data.sessions.push({ token, user_id: userId, created_at: nowIso(), expires_at: expiresAt });
  writeAuth(data, filePath);
  return { token, expires_at: expiresAt };
}

export function getSessionUser(token, filePath = DEFAULT_AUTH_PATH) {
  if (!token) return null;
  const data = readAuth(filePath);
  const session = data.sessions.find(row => row.token === token);
  if (!session || new Date(session.expires_at).getTime() <= Date.now()) return null;
  return publicUser(data.users.find(user => user.user_id === session.user_id));
}

export function destroySession(token, filePath = DEFAULT_AUTH_PATH) {
  const data = readAuth(filePath);
  data.sessions = data.sessions.filter(session => session.token !== token);
  writeAuth(data, filePath);
}
