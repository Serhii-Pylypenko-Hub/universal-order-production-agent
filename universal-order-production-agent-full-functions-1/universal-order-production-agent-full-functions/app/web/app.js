const translations = {
  uk: {
    heroTitle: "Робочий кабінет виробництва",
    heroLead: "Реєстрація, підключення Telegram, AI, Google ресурсів і запуск workspace в одному місці.",
    registerTab: "Реєстрація",
    loginTab: "Вхід",
    nameLabel: "Ім'я",
    emailLabel: "Пошта",
    passwordLabel: "Пароль",
    createAccount: "Створити акаунт",
    signIn: "Увійти",
    appTitle: "Підключення і контроль",
    logout: "Вийти",
    stepOne: "Крок 1",
    resourcesTitle: "Ресурси",
    save: "Зберегти",
    demoRequiredTitle: "Для локального демо ключі не потрібні.",
    demoRequiredText: "Для демо з Telegram та AI заповніть підсвічені поля.",
    autoSaveNote: "Кнопка \"Запустити демо\" також автоматично збереже введені поля.",
    secretSaveNote: "Після збереження token та API key очищаються на екрані, але мають показати статус \"збережено\".",
    requiredBadge: "обов'язково",
    stepTwo: "Крок 2",
    setupDemo: "Запустити демо",
    createDemoOrder: "Створити тестове замовлення",
    setupEmpty: "Порожній workspace",
    refresh: "Оновити",
    demoStarted: "Демо запущено. Дані cakes workspace готові.",
    demoOrderCreated: "Тестове замовлення створено.",
    emptyStarted: "Порожній workspace підготовлено.",
    botReadyTitle: "Telegram demo",
    botReady: "готове до запуску",
    botNotReady: "заповніть підсвічені поля і натисніть Зберегти",
    tokenSaved: "Telegram token збережено",
    keySaved: "OpenRouter key збережено",
    operations: "Операції",
    currentState: "Поточний стан",
    recentOrders: "Останні замовлення",
    lowStockTitle: "Низькі залишки",
    demoProducts: "Demo-продукти",
    testStock: "Тестові залишки",
    saved: "Збережено.",
    savedPlaceholder: "збережено",
    noOrdersTitle: "Поки немає",
    noOrdersText: "створи demo order",
    stockOkTitle: "Все нормально",
    stockOkText: "критичних залишків немає",
    yes: "так",
    no: "ні",
    ready: "готово",
    missing: "немає",
    connected: "підключено",
    healthMode: "Режим",
    healthReady: "Готовність",
    healthProducts: "Продукти",
    healthStock: "Склад",
    healthTelegram: "Telegram",
    healthAi: "AI",
    healthSheets: "Таблиці",
    healthCalendar: "Календар",
    ordersTotal: "Замовлень",
    activeOrders: "Активні",
    clientsTotal: "Клієнти",
    revenueTotal: "Сума",
    lowStock: "Низькі залишки",
    openPurchases: "Закупівлі",
    openTasks: "Завдання"
  },
  en: {
    heroTitle: "Production operations cabinet",
    heroLead: "Register, connect Telegram, AI, Google resources, and start the workspace in one place.",
    registerTab: "Register",
    loginTab: "Sign in",
    nameLabel: "Name",
    emailLabel: "Email",
    passwordLabel: "Password",
    createAccount: "Create account",
    signIn: "Sign in",
    appTitle: "Connections and control",
    logout: "Log out",
    stepOne: "Step 1",
    resourcesTitle: "Resources",
    save: "Save",
    demoRequiredTitle: "No keys are required for the local demo.",
    demoRequiredText: "For a Telegram and AI demo, fill in the highlighted fields.",
    autoSaveNote: "The \"Start demo\" button also saves the entered fields automatically.",
    secretSaveNote: "After saving, token and API key fields are cleared on screen, but should show the \"saved\" status.",
    requiredBadge: "required",
    stepTwo: "Step 2",
    setupDemo: "Start demo",
    createDemoOrder: "Create test order",
    setupEmpty: "Empty workspace",
    refresh: "Refresh",
    demoStarted: "Demo started. Cakes workspace data is ready.",
    demoOrderCreated: "Test order created.",
    emptyStarted: "Empty workspace is ready.",
    botReadyTitle: "Telegram demo",
    botReady: "ready to start",
    botNotReady: "fill the highlighted fields and click Save",
    tokenSaved: "Telegram token saved",
    keySaved: "OpenRouter key saved",
    operations: "Operations",
    currentState: "Current state",
    recentOrders: "Recent orders",
    lowStockTitle: "Low stock",
    demoProducts: "Demo products",
    testStock: "Test stock",
    saved: "Saved.",
    savedPlaceholder: "saved",
    noOrdersTitle: "No orders yet",
    noOrdersText: "create a demo order",
    stockOkTitle: "Everything is fine",
    stockOkText: "no critical stock issues",
    yes: "yes",
    no: "no",
    ready: "ready",
    missing: "missing",
    connected: "connected",
    healthMode: "Mode",
    healthReady: "Ready",
    healthProducts: "Products",
    healthStock: "Stock",
    healthTelegram: "Telegram",
    healthAi: "AI",
    healthSheets: "Sheets",
    healthCalendar: "Calendar",
    ordersTotal: "Orders",
    activeOrders: "Active",
    clientsTotal: "Clients",
    revenueTotal: "Amount",
    lowStock: "Low stock",
    openPurchases: "Purchases",
    openTasks: "Tasks"
  }
};

const state = {
  user: null,
  lang: localStorage.getItem("ui_lang") || "uk",
  dashboard: null,
  connections: null
};

const authView = document.querySelector("#authView");
const appView = document.querySelector("#appView");
const registerForm = document.querySelector("#registerForm");
const loginForm = document.querySelector("#loginForm");
const authMessage = document.querySelector("#authMessage");
const connectionsForm = document.querySelector("#connectionsForm");
const connectionsMessage = document.querySelector("#connectionsMessage");
const workspaceMessage = document.querySelector("#workspaceMessage");
const demoReadiness = document.querySelector("#demoReadiness");
const userLabel = document.querySelector("#userLabel");

function t(key) {
  return translations[state.lang][key] || translations.uk[key] || key;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) throw new Error(data.error || "Request failed.");
  return data;
}

function formJson(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setMessage(element, text, ok = false) {
  element.textContent = text || "";
  element.classList.toggle("ok", ok);
}

function setLanguage(lang) {
  state.lang = translations[lang] ? lang : "uk";
  localStorage.setItem("ui_lang", state.lang);
  document.documentElement.lang = state.lang;

  document.querySelectorAll("[data-i18n]").forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });

  document.querySelectorAll(".lang-button").forEach(button => {
    button.classList.toggle("active", button.dataset.lang === state.lang);
  });

  if (state.connections) fillConnections(state.connections);
  if (state.dashboard) {
    renderHealth(state.dashboard.health);
    renderDashboard(state.dashboard);
  }
}

function showApp(user) {
  state.user = user;
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  userLabel.textContent = `${user.name} · ${user.email}`;
  refreshAll();
}

function showAuth() {
  state.user = null;
  appView.classList.add("hidden");
  authView.classList.remove("hidden");
}

function fillConnections(connections) {
  state.connections = connections;
  connectionsForm.MANAGER_CHAT_ID.value = connections.telegram.manager_chat_id || "";
  connectionsForm.BOT_MODE.value = connections.telegram.bot_mode || "polling";
  connectionsForm.WEBHOOK_URL.value = connections.telegram.webhook_url || "";
  connectionsForm.AI_MODEL.value = connections.ai.model || "openai/gpt-4o-mini";
  connectionsForm.GOOGLE_SHEETS_ID.value = connections.google.sheets_id || "";
  connectionsForm.GOOGLE_SERVICE_ACCOUNT_KEY_FILE.value = connections.google.service_account_key_file || "";
  connectionsForm.GOOGLE_CALENDAR_ID.value = connections.google.calendar_id || "";
  connectionsForm.LOCAL_DATA_PATH.value = connections.local.data_path || "./data/local_workspace.json";

  connectionsForm.TELEGRAM_BOT_TOKEN.placeholder = connections.telegram.token_set ? `${t("savedPlaceholder")} (${connections.telegram.token_length})` : "123456:ABC...";
  connectionsForm.TELEGRAM_WEBHOOK_SECRET.placeholder = connections.telegram.webhook_secret_set ? t("savedPlaceholder") : "random-secret";
  connectionsForm.OPENROUTER_API_KEY.placeholder = connections.ai.openrouter_key_set ? `${t("savedPlaceholder")} (${connections.ai.openrouter_key_length})` : "sk-or-...";
  connectionsForm.GOOGLE_SERVICE_ACCOUNT_JSON.placeholder = connections.google.service_account_json_set ? t("savedPlaceholder") : "base64 json";

  const ready = Boolean(
    connections.telegram.token_set &&
    connections.telegram.manager_chat_id &&
    connections.ai.openrouter_key_set
  );
  demoReadiness.classList.toggle("ok", ready);
  const details = connections.telegram.token_set
    ? `${t("tokenSaved")}: ${connections.telegram.token_length}`
    : t("botNotReady");
  demoReadiness.innerHTML = `<strong>${t("botReadyTitle")}</strong><span>${ready ? `${t("botReady")} · ${details}` : details}</span>`;
}

function renderHealth(health) {
  const rows = [
    [t("healthMode"), health.mode],
    [t("healthReady"), health.ready_for_orders ? t("yes") : t("no")],
    [t("healthProducts"), health.products_filled ? t("ready") : t("missing")],
    [t("healthStock"), health.stock_filled ? t("ready") : t("missing")],
    [t("healthTelegram"), health.telegram.connected ? health.telegram.botName || t("connected") : health.telegram.reason],
    [t("healthAi"), health.ai.connected ? health.ai.model : health.ai.reason],
    [t("healthSheets"), health.google_sheets.connected ? t("connected") : health.google_sheets.reason],
    [t("healthCalendar"), health.google_calendar.connected ? t("connected") : health.google_calendar.reason]
  ];

  document.querySelector("#healthBox").innerHTML = rows.map(([label, value]) => `
    <div class="health-item"><strong>${label}</strong><span>${value || ""}</span></div>
  `).join("");
}

function renderDashboard(dashboard) {
  state.dashboard = dashboard;
  const labels = {
    orders_total: t("ordersTotal"),
    active_orders: t("activeOrders"),
    clients_total: t("clientsTotal"),
    revenue_total: t("revenueTotal"),
    low_stock: t("lowStock"),
    open_purchases: t("openPurchases"),
    open_tasks: t("openTasks")
  };

  document.querySelector("#metrics").innerHTML = Object.entries(dashboard.metrics).map(([key, value]) => `
    <div class="metric"><span>${labels[key] || key}</span><strong>${value}</strong></div>
  `).join("");

  document.querySelector("#ordersList").innerHTML = dashboard.recent_orders.length
    ? dashboard.recent_orders.map(order => `
      <div class="list-item"><strong>${order.order_id}</strong><span>${order.status} · ${order.final_price || 0}</span></div>
    `).join("")
    : `<div class="list-item"><strong>${t("noOrdersTitle")}</strong><span>${t("noOrdersText")}</span></div>`;

  document.querySelector("#stockList").innerHTML = dashboard.low_stock.length
    ? dashboard.low_stock.map(row => `
      <div class="list-item"><strong>${row.component_id}</strong><span>${row.current_qty} ${row.unit || ""}</span></div>
    `).join("")
    : `<div class="list-item"><strong>${t("stockOkTitle")}</strong><span>${t("stockOkText")}</span></div>`;

  document.querySelector("#productsList").innerHTML = dashboard.products.length
    ? dashboard.products.map(product => `
      <div class="list-item"><strong>${product.name}</strong><span>${product.base_price || 0} UAH / ${product.unit || "unit"}</span></div>
    `).join("")
    : `<div class="list-item"><strong>${t("noOrdersTitle")}</strong><span>Demo cakes</span></div>`;

  document.querySelector("#allStockList").innerHTML = dashboard.stock.length
    ? dashboard.stock.map(row => `
      <div class="list-item"><strong>${row.component_name}</strong><span>${row.current_qty} ${row.unit || ""}</span></div>
    `).join("")
    : `<div class="list-item"><strong>${t("noOrdersTitle")}</strong><span>Stock</span></div>`;
}

async function refreshAll() {
  const [connections, dashboard] = await Promise.all([
    api("/api/connections"),
    api("/api/dashboard")
  ]);
  fillConnections(connections.connections);
  renderHealth(dashboard.dashboard.health);
  renderDashboard(dashboard.dashboard);
}

async function saveConnectionsFromForm() {
  await api("/api/connections", { method: "POST", body: JSON.stringify(formJson(connectionsForm)) });
  setMessage(connectionsMessage, t("saved"), true);
  connectionsForm.TELEGRAM_BOT_TOKEN.value = "";
  connectionsForm.TELEGRAM_WEBHOOK_SECRET.value = "";
  connectionsForm.OPENROUTER_API_KEY.value = "";
  connectionsForm.GOOGLE_SERVICE_ACCOUNT_JSON.value = "";
}

document.querySelectorAll(".lang-button").forEach(button => {
  button.addEventListener("click", () => setLanguage(button.dataset.lang));
});

document.querySelector("#registerTab").addEventListener("click", () => {
  document.querySelector("#registerTab").classList.add("active");
  document.querySelector("#loginTab").classList.remove("active");
  registerForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
});

document.querySelector("#loginTab").addEventListener("click", () => {
  document.querySelector("#loginTab").classList.add("active");
  document.querySelector("#registerTab").classList.remove("active");
  loginForm.classList.remove("hidden");
  registerForm.classList.add("hidden");
});

registerForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const data = await api("/api/auth/register", { method: "POST", body: JSON.stringify(formJson(registerForm)) });
    setMessage(authMessage, "");
    showApp(data.user);
  } catch (error) {
    setMessage(authMessage, error.message);
  }
});

loginForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify(formJson(loginForm)) });
    setMessage(authMessage, "");
    showApp(data.user);
  } catch (error) {
    setMessage(authMessage, error.message);
  }
});

connectionsForm.addEventListener("submit", async event => {
  event.preventDefault();
  try {
    await saveConnectionsFromForm();
    await refreshAll();
  } catch (error) {
    setMessage(connectionsMessage, error.message);
  }
});

document.querySelector("#setupDemoButton").addEventListener("click", async () => {
  setMessage(workspaceMessage, "");
  try {
    await saveConnectionsFromForm();
    await api("/api/workspace/setup", { method: "POST", body: JSON.stringify({ template: "cakes" }) });
    setMessage(workspaceMessage, t("demoStarted"), true);
    await refreshAll();
  } catch (error) {
    setMessage(workspaceMessage, error.message);
  }
});

document.querySelector("#setupEmptyButton").addEventListener("click", async () => {
  setMessage(workspaceMessage, "");
  try {
    await saveConnectionsFromForm();
    await api("/api/workspace/setup", { method: "POST", body: JSON.stringify({ template: "empty" }) });
    setMessage(workspaceMessage, t("emptyStarted"), true);
    await refreshAll();
  } catch (error) {
    setMessage(workspaceMessage, error.message);
  }
});

document.querySelector("#createDemoOrderButton").addEventListener("click", async () => {
  setMessage(workspaceMessage, "");
  try {
    await api("/api/demo/order", { method: "POST", body: "{}" });
    setMessage(workspaceMessage, t("demoOrderCreated"), true);
    await refreshAll();
  } catch (error) {
    setMessage(workspaceMessage, error.message);
  }
});

document.querySelector("#refreshButton").addEventListener("click", refreshAll);

document.querySelector("#logoutButton").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST", body: "{}" });
  showAuth();
});

setLanguage(state.lang);
api("/api/me").then(data => showApp(data.user)).catch(showAuth);
