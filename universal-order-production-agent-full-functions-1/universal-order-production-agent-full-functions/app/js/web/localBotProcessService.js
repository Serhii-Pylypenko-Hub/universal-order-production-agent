import fs from "fs";
import path from "path";
import { spawn, spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { loadEnvFile } from "./envConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const AUTOSTART_TASK_NAME = "AIOperationsTelegramBot";

function paths(root = PROJECT_ROOT) {
  const localDir = path.join(root, ".local");
  return {
    root,
    localDir,
    pidFile: path.join(localDir, "bot.pid"),
    watchdogPidFile: path.join(localDir, "bot-watchdog.pid"),
    outLogFile: path.join(localDir, "bot.out.log"),
    errLogFile: path.join(localDir, "bot.err.log"),
    watchdogLogFile: path.join(localDir, "bot-watchdog.log"),
    envFile: path.join(root, ".env"),
    installAutostartScript: path.join(root, "install-bot-autostart.ps1"),
    uninstallAutostartScript: path.join(root, "uninstall-bot-autostart.ps1"),
    bundledNode: path.join(root, ".tools", "node", process.platform === "win32" ? "node.exe" : "node"),
    botScript: path.join(root, "app", "js", "bot", "telegramBot.js")
  };
}

function runPowerShellScript(scriptPath, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    if (process.platform !== "win32") {
      const error = new Error("Autostart is available only on Windows local mode.");
      error.code = "BOT_AUTOSTART_UNSUPPORTED";
      reject(error);
      return;
    }
    if (!fs.existsSync(scriptPath)) {
      const error = new Error(`PowerShell script was not found: ${scriptPath}`);
      error.code = "BOT_AUTOSTART_SCRIPT_MISSING";
      reject(error);
      return;
    }
    const child = spawn("powershell.exe", [
      "-NoProfile",
      "-ExecutionPolicy", "Bypass",
      "-File", scriptPath,
      ...args
    ], {
      cwd: options.cwd || PROJECT_ROOT,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", chunk => stdout += chunk.toString());
    child.stderr.on("data", chunk => stderr += chunk.toString());
    child.on("error", reject);
    child.on("close", code => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const error = new Error(stderr || stdout || `PowerShell script failed with code ${code}`);
      error.code = "BOT_AUTOSTART_FAILED";
      error.stdout = stdout;
      error.stderr = stderr;
      reject(error);
    });
  });
}

function queryAutostartStatus() {
  if (process.platform !== "win32") {
    return { supported: false, enabled: false, task_name: AUTOSTART_TASK_NAME, state: "unsupported" };
  }
  const result = spawnSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    `$task = Get-ScheduledTask -TaskName '${AUTOSTART_TASK_NAME}' -ErrorAction SilentlyContinue; if ($task) { $task.State }`
  ], { encoding: "utf-8", windowsHide: true });
  if (result.error) {
    return { supported: true, enabled: false, task_name: AUTOSTART_TASK_NAME, state: "unknown" };
  }
  const state = String(result.stdout || "").trim();
  return {
    supported: true,
    enabled: Boolean(state),
    task_name: AUTOSTART_TASK_NAME,
    state: state || "not_installed"
  };
}

function isProcessRunning(pid) {
  const id = Number(pid);
  if (!Number.isInteger(id) || id <= 0) return false;
  try {
    process.kill(id, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid(pidFile) {
  if (!fs.existsSync(pidFile)) return "";
  return fs.readFileSync(pidFile, "utf-8").trim();
}

function tail(filePath, limit = 1200) {
  if (!fs.existsSync(filePath)) return "";
  const content = fs.readFileSync(filePath, "utf-8");
  return content.slice(Math.max(0, content.length - limit));
}

function validateBotConfig(envValues) {
  const missing = [];
  if (!envValues.TELEGRAM_BOT_TOKEN) missing.push("Telegram bot token");
  if (!envValues.MANAGER_CHAT_ID) missing.push("Manager chat ID");
  if (!envValues.OPENROUTER_API_KEY) missing.push("OpenRouter API key");
  return missing;
}

export function getLocalBotStatus(options = {}) {
  const p = paths(options.root);
  const pid = readPid(p.pidFile);
  const running = isProcessRunning(pid);
  if (pid && !running && fs.existsSync(p.pidFile)) {
    fs.rmSync(p.pidFile, { force: true });
  }
  const envValues = fs.existsSync(p.envFile) ? loadEnvFile(p.envFile) : {};
  const missing = fs.existsSync(p.envFile) ? validateBotConfig(envValues) : ["Configuration file .env"];
  return {
    running,
    pid: running ? Number(pid) : null,
    watchdog_running: isProcessRunning(readPid(p.watchdogPidFile)),
    autostart: queryAutostartStatus(),
    config_ready: missing.length === 0,
    config_missing: missing,
    env_file: p.envFile,
    out_log: p.outLogFile,
    err_log: p.errLogFile,
    watchdog_log: p.watchdogLogFile,
    last_error: tail(p.errLogFile),
    last_output: tail(p.outLogFile),
    last_watchdog_output: tail(p.watchdogLogFile)
  };
}

export async function enableLocalBotAutostart(options = {}) {
  const p = paths(options.root);
  await runPowerShellScript(p.installAutostartScript, ["-StartNow", "-NoPause"], { cwd: p.root });
  return getLocalBotStatus(options);
}

export async function disableLocalBotAutostart(options = {}) {
  const p = paths(options.root);
  await runPowerShellScript(p.uninstallAutostartScript, ["-NoPause"], { cwd: p.root });
  return getLocalBotStatus(options);
}

export async function startLocalTelegramBot(options = {}) {
  const p = paths(options.root);
  fs.mkdirSync(p.localDir, { recursive: true });

  const status = getLocalBotStatus(options);
  if (status.running) {
    return { ...status, started: false, message: `Telegram bot already running. PID: ${status.pid}` };
  }

  if (!fs.existsSync(p.envFile)) {
    const error = new Error("Configuration file .env was not found. Збережіть налаштування ресурсів перед запуском бота.");
    error.code = "BOT_CONFIG_MISSING";
    throw error;
  }

  if (!fs.existsSync(p.botScript)) {
    const error = new Error("Файл запуску Telegram-бота не знайдено. Перевірте цілісність папки проєкту.");
    error.code = "BOT_SCRIPT_MISSING";
    throw error;
  }

  const envValues = loadEnvFile(p.envFile);
  const missing = validateBotConfig(envValues);
  if (missing.length) {
    const error = new Error(`Telegram bot cannot start because required fields are empty: ${missing.join(", ")}.`);
    error.code = "BOT_CONFIG_INCOMPLETE";
    error.missing = missing;
    throw error;
  }

  const nodePath = fs.existsSync(p.bundledNode) ? p.bundledNode : process.execPath;
  const out = fs.openSync(p.outLogFile, "a");
  const err = fs.openSync(p.errLogFile, "a");
  const child = spawn(nodePath, [p.botScript], {
    cwd: p.root,
    detached: true,
    windowsHide: true,
    env: {
      ...process.env,
      ...envValues,
      BOT_MODE: "polling",
      PATH: `${path.dirname(nodePath)}${path.delimiter}${process.env.PATH || ""}`
    },
    stdio: ["ignore", out, err]
  });
  child.unref();
  fs.writeFileSync(p.pidFile, String(child.pid));

  await new Promise(resolve => setTimeout(resolve, 1600));
  const next = getLocalBotStatus(options);
  if (!next.running) {
    const error = new Error("Telegram bot did not start. Перевірте token, інтернет і лог помилки.");
    error.code = "BOT_START_FAILED";
    error.log = next.last_error;
    throw error;
  }

  return { ...next, started: true, message: `Telegram bot started in polling mode. PID: ${next.pid}` };
}

export function stopLocalTelegramBot(options = {}) {
  const p = paths(options.root);
  const pid = readPid(p.pidFile);
  const watchdogPid = readPid(p.watchdogPidFile);
  const watchdogRunning = isProcessRunning(watchdogPid);
  if (watchdogRunning) {
    process.kill(Number(watchdogPid));
  }
  if (fs.existsSync(p.watchdogPidFile)) fs.rmSync(p.watchdogPidFile, { force: true });

  const running = isProcessRunning(pid);
  if (running) {
    process.kill(Number(pid));
  }
  if (fs.existsSync(p.pidFile)) fs.rmSync(p.pidFile, { force: true });
  return {
    running: false,
    pid: null,
    watchdog_running: false,
    stopped: running,
    watchdog_stopped: watchdogRunning,
    message: running || watchdogRunning
      ? `Telegram bot stopped. PID: ${pid || "none"}${watchdogRunning ? `; watchdog stopped: ${watchdogPid}` : ""}`
      : "Telegram bot was not running."
  };
}
