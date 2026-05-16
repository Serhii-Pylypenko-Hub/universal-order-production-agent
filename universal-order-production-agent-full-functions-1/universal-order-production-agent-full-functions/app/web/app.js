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
  connections: null,
  reports: null,
  inventory: null,
  catalog: null,
  purchases: null,
  bot: null,
  aiStatus: null,
  activeModule: localStorage.getItem("active_module") || "dashboard",
  pendingAiCommand: ""
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
const materialForm = document.querySelector("#materialForm");
const lotForm = document.querySelector("#lotForm");
const materialMessage = document.querySelector("#materialMessage");
const lotMessage = document.querySelector("#lotMessage");
const materialSuggestions = document.querySelector("#materialSuggestions");
const materialsTable = document.querySelector("#materialsTable");
const lotsTable = document.querySelector("#lotsTable");
const orderMaterialsTable = document.querySelector("#orderMaterialsTable");
const procurementEnabled = document.querySelector("#procurementEnabled");
const procurementHorizonDays = document.querySelector("#procurementHorizonDays");
const procurementMessage = document.querySelector("#procurementMessage");
const procurementPlanTable = document.querySelector("#procurementPlanTable");
const productionPanel = document.querySelector("#productionPanel");
const productionTitle = document.querySelector("#productionTitle");
const productionMessage = document.querySelector("#productionMessage");
const productionMaterialsTable = document.querySelector("#productionMaterialsTable");
const manualMaterialForm = document.querySelector("#manualMaterialForm");
const productForm = document.querySelector("#productForm");
const techCardForm = document.querySelector("#techCardForm");
const purchaseForm = document.querySelector("#purchaseForm");
const botSettingForm = document.querySelector("#botSettingForm");
const productMessage = document.querySelector("#productMessage");
const techCardMessage = document.querySelector("#techCardMessage");
const purchaseMessage = document.querySelector("#purchaseMessage");
const botMessage = document.querySelector("#botMessage");
const catalogTable = document.querySelector("#catalogTable");
const purchaseTable = document.querySelector("#purchaseTable");
const botTable = document.querySelector("#botTable");
const aiModeStatus = document.querySelector("#aiModeStatus");
const aiCommandInput = document.querySelector("#aiCommandInput");
const aiAssistantMessage = document.querySelector("#aiAssistantMessage");
const aiAssistantResult = document.querySelector("#aiAssistantResult");
const helpOverlay = document.querySelector("#helpOverlay");
const helpSearchInput = document.querySelector("#helpSearchInput");
const helpContent = document.querySelector("#helpContent");
const reportBalanceDate = document.querySelector("#reportBalanceDate");
const reportMonths = document.querySelector("#reportMonths");
const balanceReportTable = document.querySelector("#balanceReportTable");
const monthlyReportTable = document.querySelector("#monthlyReportTable");

const helpSections = [
  {
    title: "Швидкий старт",
    keywords: "старт демо workspace початок",
    items: [
      "Увійдіть у кабінет і відкрийте вкладку Налаштування.",
      "Натисніть Запустити демо або створіть порожній workspace.",
      "Перейдіть у Склад, додайте матеріали або прийміть партії.",
      "У вкладці Операції створіть продукт і техкарту.",
      "Створіть тестове замовлення і керуйте ним у Виробництві."
    ]
  },
  {
    title: "Гарячі клавіші",
    keywords: "клавіші hotkeys enter ctrl esc tab стрілки пошук довідка",
    shortcuts: [
      ["Enter", "у полі AI виконує команду; у формах браузер запускає основну дію форми"],
      ["Ctrl+Enter", "у складських формах швидко виконує основну дію активного блоку"],
      ["Esc", "очищає повідомлення в активному складському блоці або закриває довідку"],
      ["Tab", "перехід до наступного поля або кнопки"],
      ["Shift+Tab", "повернення до попереднього поля або кнопки"],
      ["Стрілки", "рух між клітинками в таблицях"],
      ["/", "відкриває довідку і ставить курсор у пошук, якщо ви не вводите текст у полі"],
      ["Ctrl+K", "відкриває довідку з пошуком"]
    ]
  },
  {
    title: "Склад і FIFO",
    keywords: "склад fifo партії матеріали залишки резерв",
    items: [
      "Матеріал створюється один раз, різні ціни створюють нові партії.",
      "FIFO резервує і списує найстаріші партії або партії з найближчим терміном.",
      "Резерв зменшує доступний залишок, але не списує склад.",
      "Списання відбувається тільки після завершення виробництва."
    ]
  },
  {
    title: "Виробництво",
    keywords: "виробництво замовлення статус резерв списання ручна зміна",
    items: [
      "У таблиці Замовлення в роботі натисніть Керувати.",
      "Взяти в роботу змінює статус і залишає резерв активним.",
      "Завершити і списати списує зарезервовані матеріали.",
      "Ручна зміна матеріалу потребує причину."
    ]
  },
  {
    title: "AI і бот",
    keywords: "ai бот full assistant голос повідомлення статус рецепт",
    items: [
      "Економний режим може читати і аналізувати, але не змінює дані.",
      "Full Assistant вмикається окремо для потрібного бота.",
      "Дії, які змінюють дані, потребують підтвердження.",
      "AI не може змінювати код, файли, схему, .env, залежності або деплой."
    ]
  },
  {
    title: "Схема продажу бота",
    keywords: "бот схема шаблони відповіді фото алергени акції додатки категорія смак вага доставка оплата",
    items: [
      "Бот має працювати як продавець: привітатися, запропонувати категорію, уточнити параметри, показати фото, запитати алергени, запропонувати акції й додатки.",
      "Для кондитерської приклад: категорія, смак, фото, вага, додатки, алергени, дата, доставка, оплата, підтвердження.",
      "Для майстерні можна замінити кроки на тип послуги, матеріал, розмір, термін, фото прикладу, адресу.",
      "Шаблони відповідей змінюються в Керуванні ботом, а варіанти кроків зберігаються в схемі прийому замовлення.",
      "Акції та додатки мають пропонуватися після вибору основного виду товару або послуги."
    ]
  },
  {
    title: "Поля готово / пізніше",
    keywords: "готово пізніше активні поля реалізовано",
    items: [
      "Бейдж готово означає, що поле вже працює в MVP.",
      "Бейдж пізніше означає, що поле зарезервоване під наступний етап і зараз вимкнене.",
      "Невалідні поля підсвічуються червоним і показують конкретну інструкцію."
    ]
  }
];

function t(key) {
  return translations[state.lang][key] || translations.uk[key] || key;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    const error = new Error(data.error || "Request failed.");
    Object.assign(error, data);
    throw error;
  }
  return data;
}

function formJson(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function setMessage(element, text, ok = false) {
  element.textContent = text || "";
  element.classList.toggle("ok", ok);
  if (text) element.setAttribute("role", ok ? "status" : "alert");
  else element.removeAttribute("role");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderHelp(query = "") {
  const normalized = String(query || "").trim().toLowerCase();
  const sections = helpSections.filter(section => {
    if (!normalized) return true;
    const haystack = [
      section.title,
      section.keywords,
      ...(section.items || []),
      ...(section.shortcuts || []).flat()
    ].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });

  helpContent.innerHTML = sections.length
    ? sections.map(section => `
      <section class="help-section">
        <h3>${escapeHtml(section.title)}</h3>
        ${section.shortcuts ? `
          <div class="shortcut-grid">
            ${section.shortcuts.map(([keys, text]) => `<kbd>${escapeHtml(keys)}</kbd><span>${escapeHtml(text)}</span>`).join("")}
          </div>
        ` : `
          <ul>${section.items.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        `}
      </section>
    `).join("")
    : `<section class="help-section"><h3>Нічого не знайдено</h3><ul><li>Спробуйте інше слово: склад, FIFO, AI, бот, гарячі клавіші.</li></ul></section>`;
}

function openHelp(focusSearch = true) {
  renderHelp(helpSearchInput.value);
  helpOverlay.classList.remove("hidden");
  helpOverlay.setAttribute("aria-hidden", "false");
  if (focusSearch) helpSearchInput.focus();
}

function closeHelp() {
  helpOverlay.classList.add("hidden");
  helpOverlay.setAttribute("aria-hidden", "true");
}

function numberText(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Number(number.toFixed(3)).toString() : "0";
}

function validateFormDetailed(form) {
  const errors = [];
  form.querySelectorAll(".missing-field, .invalid-field").forEach(field => field.classList.remove("missing-field", "invalid-field"));

  const invalidMessages = new Map();

  form.querySelectorAll("[required]").forEach(field => {
    if (!String(field.value || "").trim()) {
      errors.push(field.dataset.instruction || `Не заповнено обов'язкове поле "${field.dataset.label || field.name}". Заповніть його, щоб продовжити.`);
      field.classList.add("missing-field");
    }
  });

  form.querySelectorAll("input[type='number']").forEach(field => {
    if (!String(field.value || "").trim()) return;
    const value = Number(field.value);
    const min = field.min === "" ? null : Number(field.min);
    if (!Number.isFinite(value) || (min !== null && value < min)) {
      invalidMessages.set(field, field.dataset.instruction || `Некоректно заповнено поле "${field.dataset.label || field.name}". Вкажіть коректне число${min !== null ? ` не менше ${min}` : ""}.`);
      field.classList.add("invalid-field");
    }
  });

  form.querySelectorAll("input[type='email']").forEach(field => {
    if (!String(field.value || "").trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value.trim())) {
      invalidMessages.set(field, `Некоректно заповнено поле "${field.dataset.label || "Пошта"}". Вкажіть email у форматі name@example.com.`);
      field.classList.add("invalid-field");
    }
  });

  form.querySelectorAll("input[minlength]").forEach(field => {
    if (!String(field.value || "").trim()) return;
    const minLength = Number(field.getAttribute("minlength"));
    if (Number.isFinite(minLength) && field.value.length < minLength) {
      invalidMessages.set(field, `Некоректно заповнено поле "${field.dataset.label || field.name}". Мінімум ${minLength} символів.`);
      field.classList.add("invalid-field");
    }
  });

  form.querySelectorAll("input[pattern]").forEach(field => {
    if (!String(field.value || "").trim() || field.disabled) return;
    const pattern = new RegExp(field.getAttribute("pattern"));
    if (!pattern.test(field.value.trim())) {
      invalidMessages.set(field, field.title || `Некоректно заповнено поле "${field.dataset.label || field.name}". Перевірте формат.`);
      field.classList.add("invalid-field");
    }
  });

  errors.push(...invalidMessages.values());

  if (errors.length) {
    const first = form.querySelector(".missing-field, .invalid-field");
    if (first) first.focus();
    return { ok: false, message: errors.join("\n") };
  }
  return { ok: true, message: "" };
}

function validateConnectionFields() {
  const errors = [];
  const checks = [
    {
      field: connectionsForm.TELEGRAM_BOT_TOKEN,
      pattern: /^\d{6,}:[A-Za-z0-9_-]{20,}$/,
      message: "Telegram bot token має формат 123456789:ABCdef... Скопіюйте повний token з BotFather."
    },
    {
      field: connectionsForm.MANAGER_CHAT_ID,
      pattern: /^-?\d{5,}$/,
      message: "Manager chat ID має бути числом мінімум 5 цифр. Для групи може починатися з -100."
    },
    {
      field: connectionsForm.TELEGRAM_WEBHOOK_SECRET,
      pattern: /^[A-Za-z0-9_-]{12,128}$/,
      message: "Webhook secret має містити 12-128 символів: літери, цифри, _ або -."
    },
    {
      field: connectionsForm.OPENROUTER_API_KEY,
      pattern: /^sk-or-[A-Za-z0-9_-]{12,}/,
      message: "OpenRouter API key має починатися з sk-or- і містити повний ключ."
    },
    {
      field: connectionsForm.WEBHOOK_URL,
      pattern: /^https:\/\/[^\s/$.?#].[^\s]*$/i,
      message: "Webhook URL має починатися з https:// і бути повною адресою."
    },
    {
      field: connectionsForm.LOCAL_DATA_PATH,
      pattern: /\.json$/i,
      message: "Local data path має закінчуватися на .json."
    }
  ];

  connectionsForm.querySelectorAll(".missing-field, .invalid-field").forEach(field => field.classList.remove("missing-field", "invalid-field"));
  for (const check of checks) {
    const value = String(check.field?.value || "").trim();
    if (!value || value === "********") continue;
    if (!check.pattern.test(value)) {
      check.field.classList.add("invalid-field");
      errors.push(check.message);
    }
  }

  if (connectionsForm.BOT_MODE.value && !["polling", "webhook"].includes(connectionsForm.BOT_MODE.value)) {
    connectionsForm.BOT_MODE.classList.add("invalid-field");
    errors.push("Bot mode має бути polling або webhook.");
  }

  const requiredConnectionFields = [
    [connectionsForm.MANAGER_CHAT_ID, "Не заповнено обов'язкове поле \"Manager chat ID\". Вкажіть chat ID менеджера або групи."],
    [connectionsForm.AI_MODEL, "Не заповнено обов'язкове поле \"AI model\". Залиште openai/gpt-4o-mini або вкажіть іншу модель."],
    [connectionsForm.LOCAL_DATA_PATH, "Не заповнено обов'язкове поле \"Local data path\". Вкажіть шлях до .json файлу."]
  ];
  for (const [field, message] of requiredConnectionFields) {
    if (!String(field?.value || "").trim()) {
      field.classList.add("missing-field");
      errors.push(message);
    }
  }

  const first = connectionsForm.querySelector(".missing-field, .invalid-field");
  if (first) first.focus();
  return { ok: errors.length === 0, message: errors.join("\n") };
}

function applyServerValidationErrors(form, validationErrors = []) {
  if (!form || !Array.isArray(validationErrors) || !validationErrors.length) return;
  form.querySelectorAll(".missing-field, .invalid-field").forEach(field => field.classList.remove("missing-field", "invalid-field"));
  for (const error of validationErrors) {
    const field = form.elements?.[error.field];
    if (!field) continue;
    field.classList.add(error.category === "missing_required" || error.type === "required" ? "missing-field" : "invalid-field");
  }
  const first = form.querySelector(".missing-field, .invalid-field");
  if (first) first.focus();
}

function showFormError(form, messageElement, error) {
  applyServerValidationErrors(form, error.validation_errors || []);
  setMessage(messageElement, error.validation_errors?.length
    ? error.validation_errors.map(item => item.instruction || item.message).join("\n")
    : error.message);
}

function markMissingFields(form, messageElement, fields) {
  form.querySelectorAll(".missing-field, .invalid-field").forEach(field => field.classList.remove("missing-field", "invalid-field"));
  const messages = [];
  for (const { name, message } of fields) {
    const field = form.elements?.[name];
    if (field) field.classList.add("missing-field");
    messages.push(message);
  }
  const first = form.querySelector(".missing-field");
  if (first) first.focus();
  setMessage(messageElement, messages.join("\n"));
}

const readyFieldSelectors = [
  "#connectionsForm [name='TELEGRAM_BOT_TOKEN']",
  "#connectionsForm [name='MANAGER_CHAT_ID']",
  "#connectionsForm [name='OPENROUTER_API_KEY']",
  "#connectionsForm [name='AI_MODEL']",
  "#connectionsForm [name='LOCAL_DATA_PATH']",
  "#connectionsForm [name='BOT_MODE']",
  "#connectionsForm [name='WEBHOOK_URL']",
  "#connectionsForm [name='TELEGRAM_WEBHOOK_SECRET']",
  "#materialForm input",
  "#materialForm select",
  "#lotForm input",
  "#lotForm select",
  "#manualMaterialForm input",
  "#manualMaterialForm select",
  "#productForm input",
  "#productForm select",
  "#techCardForm input",
  "#techCardForm select",
  "#purchaseForm input",
  "#purchaseForm select",
  "#botSettingForm [name='bot_id']",
  "#botSettingForm [name='name']",
  "#botSettingForm [name='channel']",
  "#botSettingForm [name='bot_mode']",
  "#botSettingForm [name='manager_chat_id']",
  "#botSettingForm [name='assistant_mode']",
  "#botSettingForm [name='allowed_order_statuses']",
  "#botSettingForm [name='allow_voice_control']",
  "#botSettingForm [name='allow_send_messages']",
  "#botSettingForm [name='allow_order_status_change']",
  "#botSettingForm [name='allow_read_recipes']",
  "#botSettingForm [name='key']",
  "#botSettingForm [name='value']",
  "#botSettingForm [name='template_key']",
  "#botSettingForm [name='template_text']",
  "#botSettingForm [name='step_key']",
  "#botSettingForm [name='title']",
  "#botSettingForm [name='prompt_text']",
  "#botSettingForm [name='sort_order']",
  "#aiCommandInput"
];

const plannedFieldSelectors = [
  "#connectionsForm [name='GOOGLE_SHEETS_ID']",
  "#connectionsForm [name='GOOGLE_SERVICE_ACCOUNT_JSON']",
  "#connectionsForm [name='GOOGLE_SERVICE_ACCOUNT_KEY_FILE']",
  "#connectionsForm [name='GOOGLE_CALENDAR_ID']"
];

function labelForField(field) {
  return field?.closest?.("label");
}

function applyFeatureReadiness() {
  document.querySelectorAll(".ready-field, .planned-field").forEach(label => {
    label.classList.remove("ready-field", "planned-field");
  });

  readyFieldSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(field => {
      labelForField(field)?.classList.add("ready-field");
    });
  });

  plannedFieldSelectors.forEach(selector => {
    document.querySelectorAll(selector).forEach(field => {
      const label = labelForField(field);
      if (label) label.classList.add("planned-field");
      field.disabled = true;
      field.title = "Це поле зарезервоване під наступний етап інтеграції.";
    });
  });
}

document.addEventListener("focusin", event => {
  const label = event.target.closest?.("label");
  if (!label) return;
  document.querySelectorAll(".active-field").forEach(element => element.classList.remove("active-field"));
  label.classList.add("active-field");
});

document.addEventListener("focusout", event => {
  const label = event.target.closest?.("label");
  if (label) label.classList.remove("active-field");
});

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
  if (state.inventory) renderInventory(state.inventory);
  if (state.catalog || state.purchases || state.bot) renderOperations();
  if (state.aiStatus) renderAiStatus(state.aiStatus);
  applyFeatureReadiness();
}

function setActiveModule(moduleName) {
  const exists = Boolean(document.querySelector(`.module-section[data-module="${moduleName}"]`));
  state.activeModule = exists ? moduleName : "dashboard";
  localStorage.setItem("active_module", state.activeModule);
  document.querySelectorAll(".module-tab").forEach(button => {
    button.classList.toggle("active", button.dataset.moduleTarget === state.activeModule);
  });
  document.querySelectorAll(".module-section").forEach(section => {
    section.classList.toggle("hidden", section.dataset.module !== state.activeModule);
  });
}

function showApp(user) {
  state.user = user;
  authView.classList.add("hidden");
  appView.classList.remove("hidden");
  userLabel.textContent = `${user.name} · ${user.email}`;
  setActiveModule(state.activeModule);
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

function renderReports(reports) {
  state.reports = reports;
  const balance = reports?.balance_on_date || { date: "", rows: [], totals: {} };
  const monthly = reports?.monthly_differences || { summary: [] };
  if (reportBalanceDate && !reportBalanceDate.value) reportBalanceDate.value = balance.date || new Date().toISOString().slice(0, 10);

  balanceReportTable.innerHTML = balance.rows.length ? `
    <table>
      <thead><tr><th>Матеріал</th><th>Кількість</th><th>Прихід</th><th>Списання</th><th>Вартість</th></tr></thead>
      <tbody>
        ${balance.rows.map(row => `
          <tr>
            <td tabindex="0">${escapeHtml(row.material_name)}</td>
            <td tabindex="0">${numberText(row.qty)} ${escapeHtml(row.unit)}</td>
            <td tabindex="0">${numberText(row.in_qty)} ${escapeHtml(row.unit)}</td>
            <td tabindex="0">${numberText(row.out_qty)} ${escapeHtml(row.unit)}</td>
            <td tabindex="0">${numberText(row.value)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : `<div class="empty-state">Немає складських рухів до обраної дати.</div>`;

  monthlyReportTable.innerHTML = monthly.summary.length ? `
    <table>
      <thead><tr><th>Місяць</th><th>Прихід</th><th>Списання</th><th>Різниця вартості</th></tr></thead>
      <tbody>
        ${monthly.summary.map(row => `
          <tr>
            <td tabindex="0">${escapeHtml(row.month)}</td>
            <td tabindex="0">${numberText(row.in_qty)}</td>
            <td tabindex="0">${numberText(row.out_qty)}</td>
            <td tabindex="0">${numberText(row.net_value)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  ` : `<div class="empty-state">Немає даних для помісячного звіту.</div>`;
}

function statusClass(status) {
  if (String(status).includes("Нема") || String(status).includes("РќРµРј")) return "status-empty";
  if (String(status).includes("Низ") || String(status).includes("РќРёР·")) return "status-low";
  return "status-ok";
}

function fillLotMaterialOptions(inventory) {
  const current = lotForm.component_id.value;
  const manualCurrent = manualMaterialForm.component_id.value;
  lotForm.component_id.innerHTML = `<option value="">Оберіть матеріал</option>` + inventory.materials
    .filter(material => String(material.is_active) !== "false")
    .map(material => `<option value="${escapeHtml(material.component_id)}" data-unit="${escapeHtml(material.unit)}" data-cost="${escapeHtml(material.unit_cost || material.weighted_avg_unit_cost || 0)}">${escapeHtml(material.name)} (${escapeHtml(material.unit)})</option>`)
    .join("");
  if (current) lotForm.component_id.value = current;
  manualMaterialForm.component_id.innerHTML = lotForm.component_id.innerHTML;
  if (manualCurrent) manualMaterialForm.component_id.value = manualCurrent;
}

function procurementRowClass(severity) {
  if (severity === "absent") return "procurement-absent";
  if (severity === "missing") return "procurement-missing";
  if (severity === "reserve_gap") return "procurement-reserve";
  if (severity === "below_min") return "procurement-low";
  return "";
}

function renderProcurementPlan(plan) {
  if (!plan) return;
  procurementEnabled.checked = plan.settings?.enabled !== false;
  procurementHorizonDays.value = plan.settings?.horizon_days || 7;
  document.querySelector("#createProcurementPurchaseButton").disabled = !plan.settings?.enabled || !plan.summary?.recommended_items;

  if (!plan.settings?.enabled) {
    procurementPlanTable.innerHTML = `<div class="empty-state">Контроль залишків вимкнено. Увімкніть режим, коли потрібно автоматично бачити дефіцит і формувати закупівлю.</div>`;
    return;
  }

  if (!plan.rows?.length) {
    procurementPlanTable.innerHTML = `<div class="empty-state">Критичних залишків немає: матеріали не нижче мінімуму і на замовлення найближчих ${escapeHtml(plan.settings?.horizon_days || 7)} днів вистачає резерву.</div>`;
    return;
  }

  procurementPlanTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Матеріал</th>
          <th>Доступно</th>
          <th>Резерв</th>
          <th>Потрібно ${escapeHtml(plan.settings?.horizon_days || 7)} днів</th>
          <th>Не зарезервовано</th>
          <th>Не вистачає</th>
          <th>Мінімум</th>
          <th>Купити</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody>
        ${plan.rows.map(row => `
          <tr class="${procurementRowClass(row.severity)}">
            <td tabindex="0">${escapeHtml(row.material_name)}</td>
            <td tabindex="0">${numberText(row.available_qty)} ${escapeHtml(row.unit)}</td>
            <td tabindex="0">${numberText(row.reserved_qty)} ${escapeHtml(row.unit)}</td>
            <td tabindex="0">${numberText(row.required_qty)} ${escapeHtml(row.unit)}</td>
            <td tabindex="0">${numberText(row.reservation_gap_qty)} ${escapeHtml(row.unit)}</td>
            <td tabindex="0">${numberText(row.missing_for_orders_qty)} ${escapeHtml(row.unit)}</td>
            <td tabindex="0">${numberText(row.min_qty)} ${escapeHtml(row.unit)}</td>
            <td tabindex="0"><strong>${numberText(row.recommended_purchase_qty)} ${escapeHtml(row.unit)}</strong></td>
            <td tabindex="0">${escapeHtml(row.status)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderInventory(inventory) {
  state.inventory = inventory;
  fillLotMaterialOptions(inventory);
  renderProcurementPlan(inventory.procurement_plan);

  materialsTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Матеріал</th>
          <th>Одиниця</th>
          <th>Всього</th>
          <th>Резерв</th>
          <th>Доступно</th>
          <th>Мінімум</th>
          <th>Середня ціна</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody>
        ${inventory.materials.map(material => `
          <tr>
            <td tabindex="0">${escapeHtml(material.name)}</td>
            <td tabindex="0">${escapeHtml(material.unit)}</td>
            <td tabindex="0">${numberText(material.current_qty)}</td>
            <td tabindex="0">${numberText(material.reserved_qty)}</td>
            <td tabindex="0">${numberText(material.available_qty)}</td>
            <td tabindex="0">${numberText(material.min_qty)}</td>
            <td tabindex="0">${numberText(material.weighted_avg_unit_cost)}</td>
            <td tabindex="0" class="${statusClass(material.availability_status)}">${escapeHtml(material.availability_status)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  lotsTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Партія</th>
          <th>Матеріал</th>
          <th>Залишок</th>
          <th>Резерв</th>
          <th>Доступно</th>
          <th>Ціна</th>
          <th>Отримано</th>
          <th>Термін</th>
          <th>Статус</th>
        </tr>
      </thead>
      <tbody>
        ${inventory.lots.map(lot => `
          <tr>
            <td tabindex="0">${escapeHtml(lot.lot_id)}</td>
            <td tabindex="0">${escapeHtml(lot.component_name)}</td>
            <td tabindex="0">${numberText(lot.remaining_qty)} ${escapeHtml(lot.unit)}</td>
            <td tabindex="0">${numberText(lot.reserved_qty)} ${escapeHtml(lot.unit)}</td>
            <td tabindex="0">${numberText(lot.available_qty)} ${escapeHtml(lot.unit)}</td>
            <td tabindex="0">${numberText(lot.unit_cost)}</td>
            <td tabindex="0">${escapeHtml(String(lot.received_at || "").slice(0, 10))}</td>
            <td tabindex="0">${escapeHtml(lot.expires_at || "")}</td>
            <td tabindex="0">${escapeHtml(lot.status)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  orderMaterialsTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Замовлення</th>
          <th>Статус</th>
          <th>Дата</th>
          <th>Матеріалів</th>
          <th>Резервів</th>
          <th>Партій</th>
          <th>Дефіцит</th>
          <th>Планова собівартість</th>
          <th>Дія</th>
        </tr>
      </thead>
      <tbody>
        ${inventory.active_orders.map(order => `
          <tr>
            <td tabindex="0">${escapeHtml(order.order_id)}</td>
            <td tabindex="0">${escapeHtml(order.status)}</td>
            <td tabindex="0">${escapeHtml(String(order.desired_date || "").slice(0, 10))}</td>
            <td tabindex="0">${escapeHtml(order.requirements_count)}</td>
            <td tabindex="0">${escapeHtml(order.reservations_count)}</td>
            <td tabindex="0">${escapeHtml(order.reservation_lots_count)}</td>
            <td tabindex="0" class="${Number(order.missing_count) > 0 ? "status-low" : "status-ok"}">${escapeHtml(order.missing_count)}</td>
            <td tabindex="0">${numberText(order.estimated_material_cost)}</td>
            <td><button class="secondary open-production" type="button" data-order-id="${escapeHtml(order.order_id)}">Керувати</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function refreshInventory() {
  const data = await api("/api/inventory");
  renderInventory(data.inventory);
}

function renderProductionDetails(details) {
  if (!details?.order) {
    setMessage(productionMessage, "Замовлення не знайдено.");
    return;
  }
  productionPanel.classList.remove("hidden");
  productionPanel.dataset.orderId = details.order.order_id;
  productionTitle.textContent = `Замовлення ${details.order.order_id} · ${details.order.status}`;
  manualMaterialForm.order_id.value = details.order.order_id;

  productionMaterialsTable.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Матеріал</th>
          <th>Потрібно</th>
          <th>Зарезервовано</th>
          <th>Дефіцит</th>
          <th>Джерело</th>
          <th>Причина</th>
          <th>Партії</th>
          <th>Дія</th>
        </tr>
      </thead>
      <tbody>
        ${details.materials.map(row => `
          <tr>
            <td tabindex="0">${escapeHtml(row.component_name)}</td>
            <td tabindex="0">${numberText(row.required_qty)} ${escapeHtml(row.unit)}</td>
            <td tabindex="0">${numberText(row.reserved_qty)} ${escapeHtml(row.unit)}</td>
            <td tabindex="0" class="${Number(row.missing_qty) > 0 ? "status-low" : "status-ok"}">${numberText(row.missing_qty)}</td>
            <td tabindex="0">${escapeHtml(row.source)}</td>
            <td tabindex="0">${escapeHtml(row.override_reason || "")}</td>
            <td tabindex="0">${row.lots.length ? row.lots.map(lot => `${escapeHtml(lot.lot_id)}: ${numberText(lot.reserved_qty)} ${escapeHtml(lot.unit)} @ ${numberText(lot.unit_cost)}`).join("<br>") : "FIFO не вибрано"}</td>
            <td><button class="secondary edit-requirement" type="button" data-requirement-id="${escapeHtml(row.requirement_id)}" data-component-id="${escapeHtml(row.component_id)}" data-qty="${escapeHtml(row.required_qty)}" data-unit="${escapeHtml(row.unit)}">Змінити</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
  productionPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function selectOptions(rows, idField, labelField, placeholder) {
  return `<option value="">${escapeHtml(placeholder)}</option>` + rows
    .map(row => `<option value="${escapeHtml(row[idField])}" data-unit="${escapeHtml(row.unit || "")}" data-cost="${escapeHtml(row.unit_cost || row.weighted_avg_unit_cost || 0)}">${escapeHtml(row[labelField] || row[idField])}</option>`)
    .join("");
}

function fillOperationSelects() {
  const products = state.catalog?.products || [];
  const materials = state.inventory?.materials || state.catalog?.components || [];
  const requests = state.purchases?.requests || [];
  techCardForm.product_id.innerHTML = selectOptions(products, "product_id", "name", "Оберіть продукт");
  techCardForm.component_id.innerHTML = selectOptions(materials, "component_id", "name", "Оберіть матеріал");
  purchaseForm.purchase_request_id.innerHTML = selectOptions(requests.filter(req => req.status !== "Received"), "purchase_request_id", "purchase_request_id", "Оберіть закупку");
  purchaseForm.component_id.innerHTML = selectOptions(materials, "component_id", "name", "Оберіть матеріал");
  purchaseForm.unit.innerHTML = `<option value="">Оберіть</option>${["kg", "g", "l", "ml", "pcs", "pack", "box"].map(unit => `<option value="${unit}">${unit}</option>`).join("")}`;
}

function renderOperations() {
  fillOperationSelects();
  const catalog = state.catalog || { products: [] };
  const purchases = state.purchases || { requests: [] };
  const bot = state.bot || { settings: [], templates: [], flow_steps: [], flow_schemas: [], step_options: [], promotions: [] };

  catalogTable.innerHTML = `
    <table>
      <thead><tr><th>Продукт</th><th>Ціна</th><th>Одиниця</th><th>Техкарта</th></tr></thead>
      <tbody>
        ${catalog.products.map(product => `
          <tr>
            <td tabindex="0">${escapeHtml(product.name)}</td>
            <td tabindex="0">${numberText(product.base_price)}</td>
            <td tabindex="0">${escapeHtml(product.unit)}</td>
            <td tabindex="0">${product.tech_card_items.length ? product.tech_card_items.map(item => `${escapeHtml(item.component_name)}: ${numberText(item.qty_per_unit)} ${escapeHtml(item.unit)}`).join("<br>") : "Не заповнено"}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  purchaseTable.innerHTML = `
    <table>
      <thead><tr><th>Закупка</th><th>Статус</th><th>Позицій</th><th>Сума</th><th>Позиції</th></tr></thead>
      <tbody>
        ${purchases.requests.map(request => `
          <tr>
            <td tabindex="0">${escapeHtml(request.purchase_request_id)}</td>
            <td tabindex="0">${escapeHtml(request.status)}</td>
            <td tabindex="0">${escapeHtml(request.items_count)}</td>
            <td tabindex="0">${numberText(request.total_expected_cost)}</td>
            <td tabindex="0">${request.items.length ? request.items.map(item => `${escapeHtml(item.component_name)}: ${numberText(item.total_qty)} ${escapeHtml(item.unit)} @ ${numberText(item.expected_unit_cost)}`).join("<br>") : escapeHtml(request.manager_note || "")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;

  botTable.innerHTML = `
    <table>
      <thead><tr><th>Тип</th><th>Ключ</th><th>Значення / текст</th><th>Порядок</th></tr></thead>
      <tbody>
        ${(bot.accounts || []).map(row => `<tr><td tabindex="0">Бот</td><td tabindex="0">${escapeHtml(row.bot_id)}</td><td tabindex="0">${escapeHtml(row.name)} · ${escapeHtml(row.channel)} · ${escapeHtml(row.bot_mode)}</td><td tabindex="0">${row.is_active ? "активний" : "вимкнений"}</td></tr>`).join("")}
        ${(bot.assistant_settings || []).map(row => `<tr><td tabindex="0">Full Assistant</td><td tabindex="0">${escapeHtml(row.bot_id)}</td><td tabindex="0">${row.full_assistant_enabled ? "увімкнено" : "економний"} · голос ${row.allow_voice_control ? "так" : "ні"} · повідомлення ${row.allow_send_messages ? "так" : "ні"} · статуси ${row.allow_order_status_change ? "так" : "ні"}</td><td tabindex="0">${escapeHtml(row.allowed_order_statuses || "")}</td></tr>`).join("")}
        ${(bot.settings || []).map(row => `<tr><td tabindex="0">Налаштування</td><td tabindex="0">${escapeHtml(row.key)}</td><td tabindex="0">${escapeHtml(row.value)}</td><td tabindex="0"></td></tr>`).join("")}
        ${(bot.templates || []).map(row => `<tr><td tabindex="0">Шаблон</td><td tabindex="0">${escapeHtml(row.template_key)}</td><td tabindex="0">${escapeHtml(row.template_text)}</td><td tabindex="0"></td></tr>`).join("")}
        ${(bot.flow_schemas || []).map(row => `<tr><td tabindex="0">Схема</td><td tabindex="0">${escapeHtml(row.name)}</td><td tabindex="0">${escapeHtml(row.business_type)} · ${escapeHtml(row.description)}</td><td tabindex="0">${row.is_default ? "за замовчуванням" : ""}</td></tr>`).join("")}
        ${(bot.flow_steps || []).map(row => `<tr><td tabindex="0">Крок</td><td tabindex="0">${escapeHtml(row.step_key)}</td><td tabindex="0">${escapeHtml(row.prompt_text)}</td><td tabindex="0">${escapeHtml(row.sort_order)}</td></tr>`).join("")}
        ${(bot.step_options || []).map(row => `<tr><td tabindex="0">Варіант</td><td tabindex="0">${escapeHtml(row.step_key)}</td><td tabindex="0">${escapeHtml(row.label)} · ${escapeHtml(row.payload)}${Number(row.price_delta || 0) ? ` · +${numberText(row.price_delta)}` : ""}${row.is_addon ? " · додаток" : ""}${row.is_promo ? " · акція" : ""}</td><td tabindex="0">${escapeHtml(row.sort_order)}</td></tr>`).join("")}
        ${(bot.promotions || []).map(row => `<tr><td tabindex="0">Акція</td><td tabindex="0">${escapeHtml(row.name)}</td><td tabindex="0">${escapeHtml(row.description)}</td><td tabindex="0">${row.is_active ? "активна" : "вимкнена"}</td></tr>`).join("")}
      </tbody>
    </table>
  `;
}

async function refreshOperations() {
  const [catalog, purchases, bot] = await Promise.all([
    api("/api/catalog"),
    api("/api/purchases"),
    api("/api/bot-management")
  ]);
  state.catalog = catalog.catalog;
  state.purchases = purchases.purchases;
  state.bot = bot.bot;
  renderOperations();
}

function renderAiStatus(status) {
  state.aiStatus = status;
  aiModeStatus.innerHTML = `
    <span>${status.mode === "full_assistant" ? "Повний AI-асистент" : "Економний режим"}</span>
    <span>${status.full_assistant_active ? "Підписка активна" : "Без повної підписки"}</span>
  `;
}

async function refreshAiStatus() {
  const status = await api("/api/ai-assistant/status");
  renderAiStatus(status);
}

async function runAiCommand(confirmed = false) {
  const text = aiCommandInput.value.trim();
  if (!text) {
    setMessage(aiAssistantMessage, "Напишіть команду для асистента.");
    return;
  }
  setMessage(aiAssistantMessage, "");
  aiAssistantResult.textContent = "Виконую...";
  try {
    const data = await api("/api/ai-assistant/command", { method: "POST", body: JSON.stringify({ text, confirmed }) });
    state.pendingAiCommand = data.result.requires_confirmation ? text : "";
    aiAssistantResult.textContent = data.result.message || "";
    setMessage(aiAssistantMessage, data.result.requires_confirmation ? "Потрібне підтвердження перед зміною даних." : "Готово.", true);
    await refreshAll();
  } catch (error) {
    aiAssistantResult.textContent = error.result?.message || error.message;
    setMessage(aiAssistantMessage, error.result?.requires_upgrade ? "Для цієї дії потрібен повний AI-режим." : error.message);
  }
}

async function openProductionOrder(orderId) {
  setMessage(productionMessage, "");
  const data = await api(`/api/production/order?order_id=${encodeURIComponent(orderId)}`);
  setActiveModule("production");
  renderProductionDetails(data.details);
}

async function runProductionAction(path, okMessage) {
  const orderId = productionPanel.dataset.orderId;
  if (!orderId) {
    setMessage(productionMessage, "Оберіть замовлення в таблиці.");
    return;
  }
  try {
    const data = await api(path, { method: "POST", body: JSON.stringify({ order_id: orderId }) });
    renderInventory(data.inventory);
    renderProductionDetails(data.result.details);
    setMessage(productionMessage, okMessage, true);
    await refreshAll();
  } catch (error) {
    setMessage(productionMessage, error.message);
  }
}

async function refreshAll() {
  const reportDate = reportBalanceDate?.value || new Date().toISOString().slice(0, 10);
  const months = reportMonths?.value || 6;
  const [connections, dashboard, reports, inventory, catalog, purchases, bot, aiStatus] = await Promise.all([
    api("/api/connections"),
    api("/api/dashboard"),
    api(`/api/reports/inventory?date=${encodeURIComponent(reportDate)}&months=${encodeURIComponent(months)}`),
    api("/api/inventory"),
    api("/api/catalog"),
    api("/api/purchases"),
    api("/api/bot-management"),
    api("/api/ai-assistant/status")
  ]);
  fillConnections(connections.connections);
  renderHealth(dashboard.dashboard.health);
  renderDashboard(dashboard.dashboard);
  renderReports(reports.reports);
  renderInventory(inventory.inventory);
  state.catalog = catalog.catalog;
  state.purchases = purchases.purchases;
  state.bot = bot.bot;
  renderOperations();
  renderAiStatus(aiStatus);
}

async function saveConnectionsFromForm() {
  const validation = validateConnectionFields();
  if (!validation.ok) {
    setMessage(connectionsMessage, validation.message);
    throw new Error(validation.message);
  }
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

document.querySelectorAll(".module-tab").forEach(button => {
  button.addEventListener("click", () => setActiveModule(button.dataset.moduleTarget));
});

document.querySelector("#refreshReportsButton").addEventListener("click", async () => {
  const date = reportBalanceDate.value || new Date().toISOString().slice(0, 10);
  const months = reportMonths.value || 6;
  const data = await api(`/api/reports/inventory?date=${encodeURIComponent(date)}&months=${encodeURIComponent(months)}`);
  renderReports(data.reports);
});

document.querySelector("#helpButton").addEventListener("click", () => openHelp(true));
document.querySelector("#closeHelpButton").addEventListener("click", closeHelp);
helpSearchInput.addEventListener("input", () => renderHelp(helpSearchInput.value));
helpOverlay.addEventListener("click", event => {
  if (event.target === helpOverlay) closeHelp();
});

document.addEventListener("keydown", event => {
  const isTyping = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
  if (event.key === "Escape" && !helpOverlay.classList.contains("hidden")) {
    event.preventDefault();
    closeHelp();
    return;
  }
  if ((event.ctrlKey && event.key.toLowerCase() === "k") || (event.key === "/" && !isTyping)) {
    event.preventDefault();
    openHelp(true);
  }
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
    showFormError(connectionsForm, connectionsMessage, error);
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

document.querySelector("#refreshInventoryButton").addEventListener("click", async () => {
  try {
    await refreshInventory();
    setMessage(lotMessage, "Склад оновлено.", true);
  } catch (error) {
    setMessage(lotMessage, error.message);
  }
});

document.querySelector("#refreshOperationsButton").addEventListener("click", async () => {
  try {
    await refreshOperations();
    setMessage(productMessage, "Модулі оновлено.", true);
  } catch (error) {
    showFormError(productForm, productMessage, error);
  }
});

productForm.addEventListener("submit", async event => {
  event.preventDefault();
  const validation = validateFormDetailed(productForm);
  if (!validation.ok) return setMessage(productMessage, validation.message);
  try {
    const data = await api("/api/catalog/products", { method: "POST", body: JSON.stringify(formJson(productForm)) });
    state.catalog = data.catalog;
    renderOperations();
    productForm.reset();
    setMessage(productMessage, data.result.created ? "Продукт створено. Тепер додайте техкарту." : "Такий продукт уже є.", true);
  } catch (error) {
    setMessage(productMessage, error.message);
  }
});

techCardForm.component_id.addEventListener("change", () => {
  const option = techCardForm.component_id.selectedOptions[0];
  if (option?.dataset.unit) techCardForm.unit.value = option.dataset.unit;
});

techCardForm.addEventListener("submit", async event => {
  event.preventDefault();
  const validation = validateFormDetailed(techCardForm);
  if (!validation.ok) return setMessage(techCardMessage, validation.message);
  try {
    const data = await api("/api/catalog/tech-card-items", { method: "POST", body: JSON.stringify(formJson(techCardForm)) });
    state.catalog = data.catalog;
    renderOperations();
    techCardForm.qty_per_unit.value = "";
    setMessage(techCardMessage, data.result.created ? "Рядок техкарти додано." : "Такий матеріал уже є в техкарті.", true);
  } catch (error) {
    showFormError(techCardForm, techCardMessage, error);
  }
});

document.querySelector("#createPurchaseButton").addEventListener("click", async () => {
  try {
    const data = await api("/api/purchases/requests", { method: "POST", body: JSON.stringify({ manager_note: purchaseForm.manager_note.value }) });
    state.purchases = data.purchases;
    renderOperations();
    purchaseForm.purchase_request_id.value = data.request.purchase_request_id;
    setMessage(purchaseMessage, "Закупку створено. Додайте позиції.", true);
  } catch (error) {
    showFormError(purchaseForm, purchaseMessage, error);
  }
});

purchaseForm.component_id.addEventListener("change", () => {
  const option = purchaseForm.component_id.selectedOptions[0];
  if (option?.dataset.unit) purchaseForm.unit.value = option.dataset.unit;
  if (option?.dataset.cost && !purchaseForm.expected_unit_cost.value) purchaseForm.expected_unit_cost.value = option.dataset.cost;
});

purchaseForm.addEventListener("submit", async event => {
  event.preventDefault();
  const validation = validateFormDetailed(purchaseForm);
  if (!validation.ok) return setMessage(purchaseMessage, validation.message);
  try {
    const data = await api("/api/purchases/items", { method: "POST", body: JSON.stringify(formJson(purchaseForm)) });
    state.purchases = data.purchases;
    renderOperations();
    setMessage(purchaseMessage, "Позицію додано до закупки.", true);
  } catch (error) {
    setMessage(purchaseMessage, error.message);
  }
});

document.querySelector("#receivePurchaseButton").addEventListener("click", async () => {
  if (!purchaseForm.purchase_request_id.value) return setMessage(purchaseMessage, "Оберіть закупку для приймання.");
  try {
    const data = await api("/api/purchases/receive", { method: "POST", body: JSON.stringify({ purchase_request_id: purchaseForm.purchase_request_id.value }) });
    state.purchases = data.purchases;
    renderInventory(data.inventory);
    renderOperations();
    setMessage(purchaseMessage, "Закупку прийнято, партії створено на складі.", true);
  } catch (error) {
    setMessage(purchaseMessage, error.message);
  }
});

botSettingForm.addEventListener("submit", async event => {
  event.preventDefault();
  const validation = validateFormDetailed(botSettingForm);
  if (!validation.ok) return setMessage(botMessage, validation.message);
  try {
    const data = await api("/api/bot-management/settings", { method: "POST", body: JSON.stringify(formJson(botSettingForm)) });
    state.bot = data.bot;
    renderOperations();
    setMessage(botMessage, "Налаштування бота збережено.", true);
  } catch (error) {
    showFormError(botSettingForm, botMessage, error);
  }
});

document.querySelector("#saveBotAccountButton").addEventListener("click", async () => {
  const payload = formJson(botSettingForm);
  if (!payload.name || !payload.channel) {
    return markMissingFields(botSettingForm, botMessage, [
      ...(!payload.name ? [{ name: "name", message: "Не заповнено поле \"Назва бота\". Вкажіть зрозумілу назву, наприклад Основний Telegram бот." }] : []),
      ...(!payload.channel ? [{ name: "channel", message: "Не обрано канал бота. Оберіть Telegram, web chat або інший канал." }] : [])
    ]);
  }
  try {
    const data = await api("/api/bot-management/accounts", { method: "POST", body: JSON.stringify(payload) });
    state.bot = data.bot;
    renderOperations();
    setMessage(botMessage, "Бота збережено.", true);
  } catch (error) {
    setMessage(botMessage, error.message);
  }
});

document.querySelector("#saveBotAssistantButton").addEventListener("click", async () => {
  const payload = formJson(botSettingForm);
  payload.bot_id = payload.bot_id || "BOT-DEFAULT";
  try {
    const data = await api("/api/bot-management/assistant-settings", { method: "POST", body: JSON.stringify(payload) });
    state.bot = data.bot;
    renderOperations();
    await refreshAiStatus();
    setMessage(botMessage, "Налаштування Full Assistant збережено.", true);
  } catch (error) {
    setMessage(botMessage, error.message);
  }
});

document.querySelector("#saveBotTemplateButton").addEventListener("click", async () => {
  const payload = formJson(botSettingForm);
  if (!payload.template_key || !payload.template_text) {
    return markMissingFields(botSettingForm, botMessage, [
      ...(!payload.template_key ? [{ name: "template_key", message: "Не заповнено ключ шаблону. Наприклад new_client_greeting." }] : []),
      ...(!payload.template_text ? [{ name: "template_text", message: "Не заповнено текст шаблону. Вкажіть повідомлення українською." }] : [])
    ]);
  }
  try {
    const data = await api("/api/bot-management/templates", { method: "POST", body: JSON.stringify(payload) });
    state.bot = data.bot;
    renderOperations();
    setMessage(botMessage, "Шаблон бота збережено.", true);
  } catch (error) {
    setMessage(botMessage, error.message);
  }
});

document.querySelector("#saveBotFlowStepButton").addEventListener("click", async () => {
  const payload = formJson(botSettingForm);
  if (!payload.step_key || !payload.title || !payload.prompt_text) {
    return markMissingFields(botSettingForm, botMessage, [
      ...(!payload.step_key ? [{ name: "step_key", message: "Не заповнено ключ кроку. Наприклад desired_date." }] : []),
      ...(!payload.title ? [{ name: "title", message: "Не заповнено назву кроку. Наприклад Дата." }] : []),
      ...(!payload.prompt_text ? [{ name: "prompt_text", message: "Не заповнено питання клієнту. Наприклад На яку дату потрібно виконати замовлення?" }] : [])
    ]);
  }
  try {
    const data = await api("/api/bot-management/flow-steps", { method: "POST", body: JSON.stringify(payload) });
    state.bot = data.bot;
    renderOperations();
    setMessage(botMessage, "Крок прийому замовлення збережено.", true);
  } catch (error) {
    setMessage(botMessage, error.message);
  }
});

document.querySelector("#runAiCommandButton").addEventListener("click", () => runAiCommand(false));

document.querySelector("#confirmAiCommandButton").addEventListener("click", () => {
  if (state.pendingAiCommand) aiCommandInput.value = state.pendingAiCommand;
  runAiCommand(true);
});

aiCommandInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    runAiCommand(false);
  }
});

document.querySelector("#voiceAiCommandButton").addEventListener("click", () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    setMessage(aiAssistantMessage, "Голосове введення недоступне в цьому браузері. Можна продиктувати в системне поле або ввести текст вручну.");
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.lang = "uk-UA";
  recognition.interimResults = false;
  recognition.onstart = () => setMessage(aiAssistantMessage, "Слухаю команду...", true);
  recognition.onerror = () => setMessage(aiAssistantMessage, "Не вдалося розпізнати голос. Спробуйте ще раз або введіть текст.");
  recognition.onresult = async event => {
    const transcript = event.results?.[0]?.[0]?.transcript || "";
    aiCommandInput.value = transcript;
    try {
      const data = await api("/api/ai-assistant/voice-transcript", { method: "POST", body: JSON.stringify({ transcript }) });
      state.pendingAiCommand = data.result.requires_confirmation ? transcript : "";
      aiAssistantResult.textContent = data.result.message || "";
      setMessage(aiAssistantMessage, "Голосову команду оброблено.", true);
      await refreshAll();
    } catch (error) {
      aiAssistantResult.textContent = error.result?.message || error.message;
      setMessage(aiAssistantMessage, error.message);
    }
  };
  recognition.start();
});

async function setAiMode(mode) {
  try {
    const status = await api("/api/ai-assistant/mode", { method: "POST", body: JSON.stringify({ mode }) });
    renderAiStatus(status);
    setMessage(aiAssistantMessage, mode === "full_assistant" ? "Повний AI-режим активовано для тестування підписки." : "Економний режим активовано.", true);
  } catch (error) {
    setMessage(aiAssistantMessage, error.message);
  }
}

document.querySelector("#economyAiModeButton").addEventListener("click", () => setAiMode("economy"));
document.querySelector("#fullAiModeButton").addEventListener("click", () => setAiMode("full_assistant"));

orderMaterialsTable.addEventListener("click", async event => {
  const button = event.target.closest(".open-production");
  if (!button) return;
  try {
    await openProductionOrder(button.dataset.orderId);
  } catch (error) {
    setMessage(productionMessage, error.message);
  }
});

productionMaterialsTable.addEventListener("click", event => {
  const button = event.target.closest(".edit-requirement");
  if (!button) return;
  manualMaterialForm.requirement_id.value = button.dataset.requirementId;
  manualMaterialForm.component_id.value = button.dataset.componentId;
  manualMaterialForm.required_qty.value = button.dataset.qty;
  manualMaterialForm.unit.value = button.dataset.unit;
  manualMaterialForm.override_reason.value = "";
  manualMaterialForm.override_reason.focus();
});

document.querySelector("#startProductionButton").addEventListener("click", () => {
  runProductionAction("/api/production/start", "Замовлення взято в роботу. Резерв залишається активним, списання ще не виконано.");
});

document.querySelector("#completeProductionButton").addEventListener("click", () => {
  runProductionAction("/api/production/complete", "Виробництво завершено, зарезервовані матеріали списано.");
});

document.querySelector("#releaseProductionButton").addEventListener("click", () => {
  runProductionAction("/api/production/release", "Резерв повернуто на склад.");
});

document.querySelector("#closeProductionPanelButton").addEventListener("click", () => {
  productionPanel.classList.add("hidden");
  setMessage(productionMessage, "");
});

document.querySelector("#saveProcurementSettingsButton").addEventListener("click", async () => {
  setMessage(procurementMessage, "");
  const days = Number(procurementHorizonDays.value);
  if (!Number.isFinite(days) || days < 1 || days > 31) {
    setMessage(procurementMessage, "Вкажіть горизонт планування від 1 до 31 дня.");
    procurementHorizonDays.focus();
    return;
  }
  try {
    const data = await api("/api/inventory/procurement-settings", {
      method: "POST",
      body: JSON.stringify({ enabled: procurementEnabled.checked, horizon_days: days })
    });
    renderInventory(data.inventory);
    setMessage(procurementMessage, "Налаштування контролю залишків збережено.", true);
  } catch (error) {
    setMessage(procurementMessage, error.message);
  }
});

document.querySelector("#createProcurementPurchaseButton").addEventListener("click", async () => {
  setMessage(procurementMessage, "");
  try {
    const data = await api("/api/purchases/from-procurement-plan", {
      method: "POST",
      body: JSON.stringify({
        enabled: procurementEnabled.checked,
        horizon_days: procurementHorizonDays.value,
        manager_note: `Автозаявка за контролем залишків на ${procurementHorizonDays.value || 7} днів`
      })
    });
    state.purchases = data.purchases;
    renderInventory(data.inventory);
    renderOperations();
    setMessage(procurementMessage, `Заявку ${data.result.request.purchase_request_id} створено і додано в закупівлі.`, true);
  } catch (error) {
    setMessage(procurementMessage, error.message);
  }
});

lotForm.component_id.addEventListener("change", () => {
  const option = lotForm.component_id.selectedOptions[0];
  if (!option) return;
  if (option.dataset.unit) lotForm.unit.value = option.dataset.unit;
  if (option.dataset.cost && !lotForm.unit_cost.value) lotForm.unit_cost.value = option.dataset.cost;
});

manualMaterialForm.component_id.addEventListener("change", () => {
  const option = manualMaterialForm.component_id.selectedOptions[0];
  if (option?.dataset.unit) manualMaterialForm.unit.value = option.dataset.unit;
});

materialForm.addEventListener("submit", async event => {
  event.preventDefault();
  setMessage(materialMessage, "");
  materialSuggestions.innerHTML = "";
  const validation = validateFormDetailed(materialForm);
  if (!validation.ok) {
    setMessage(materialMessage, validation.message);
    return;
  }
  try {
    const data = await api("/api/inventory/materials", { method: "POST", body: JSON.stringify(formJson(materialForm)) });
    renderInventory(data.inventory);
    materialForm.reset();
    setMessage(materialMessage, data.result?.created ? "Матеріал створено. Тепер можна прийняти партію на склад." : "Такий матеріал уже є. Виберіть його у формі приймання партії.", true);
  } catch (error) {
    showFormError(materialForm, materialMessage, error);
    if (error.similar?.length) {
      materialSuggestions.innerHTML = error.similar.map(item => `<button type="button" data-id="${escapeHtml(item.component_id)}">${escapeHtml(item.name)} (${escapeHtml(item.unit)})</button>`).join("");
    }
  }
});

document.querySelector("#forceMaterialButton").addEventListener("click", async () => {
  setMessage(materialMessage, "");
  const validation = validateFormDetailed(materialForm);
  if (!validation.ok) {
    setMessage(materialMessage, validation.message);
    return;
  }
  try {
    const payload = { ...formJson(materialForm), force: true };
    const data = await api("/api/inventory/materials", { method: "POST", body: JSON.stringify(payload) });
    renderInventory(data.inventory);
    materialForm.reset();
    materialSuggestions.innerHTML = "";
    setMessage(materialMessage, data.result?.created ? "Новий матеріал створено після підтвердження." : "Такий матеріал уже є. Виберіть його у формі приймання партії.", true);
  } catch (error) {
    setMessage(materialMessage, error.message);
  }
});

materialSuggestions.addEventListener("click", event => {
  const button = event.target.closest("button[data-id]");
  if (!button) return;
  lotForm.component_id.value = button.dataset.id;
  lotForm.component_id.dispatchEvent(new Event("change"));
  materialSuggestions.innerHTML = "";
  setMessage(materialMessage, "Вибрано існуючий матеріал. Тепер прийміть нову партію з актуальною ціною.", true);
  lotForm.qty.focus();
});

lotForm.addEventListener("submit", async event => {
  event.preventDefault();
  setMessage(lotMessage, "");
  const validation = validateFormDetailed(lotForm);
  if (!validation.ok) {
    setMessage(lotMessage, validation.message);
    return;
  }
  try {
    const data = await api("/api/inventory/lots", { method: "POST", body: JSON.stringify(formJson(lotForm)) });
    renderInventory(data.inventory);
    lotForm.reset();
    setMessage(lotMessage, "Партію прийнято на склад. Залишки оновлено.", true);
    await refreshAll();
  } catch (error) {
    showFormError(lotForm, lotMessage, error);
  }
});

manualMaterialForm.addEventListener("submit", async event => {
  event.preventDefault();
  setMessage(productionMessage, "");
  const validation = validateFormDetailed(manualMaterialForm);
  if (!validation.ok) {
    setMessage(productionMessage, validation.message);
    return;
  }
  if (!manualMaterialForm.requirement_id.value) {
    setMessage(productionMessage, "Оберіть рядок матеріалу в таблиці виробництва або натисніть \"Додати як новий рядок\".");
    return;
  }
  try {
    const data = await api("/api/production/requirement", { method: "POST", body: JSON.stringify(formJson(manualMaterialForm)) });
    renderInventory(data.inventory);
    renderProductionDetails(data.result.details);
    manualMaterialForm.reset();
    setMessage(productionMessage, "Матеріал замовлення змінено. Резерв перераховано.", true);
  } catch (error) {
    showFormError(manualMaterialForm, productionMessage, error);
  }
});

document.querySelector("#addManualMaterialButton").addEventListener("click", async () => {
  setMessage(productionMessage, "");
  manualMaterialForm.requirement_id.value = "";
  const validation = validateFormDetailed(manualMaterialForm);
  if (!validation.ok) {
    setMessage(productionMessage, validation.message);
    return;
  }
  try {
    const data = await api("/api/production/manual-material", { method: "POST", body: JSON.stringify(formJson(manualMaterialForm)) });
    renderInventory(data.inventory);
    renderProductionDetails(data.result.details);
    manualMaterialForm.reset();
    setMessage(productionMessage, "Матеріал додано до замовлення. Резерв перераховано.", true);
  } catch (error) {
    setMessage(productionMessage, error.message);
  }
});

function moveTableFocus(current, key) {
  const cell = current.closest("td,th");
  if (!cell) return;
  const row = cell.parentElement;
  const table = row.closest("table");
  const rowIndex = [...table.rows].indexOf(row);
  const cellIndex = [...row.cells].indexOf(cell);
  let nextRow = rowIndex;
  let nextCell = cellIndex;
  if (key === "ArrowRight") nextCell += 1;
  if (key === "ArrowLeft") nextCell -= 1;
  if (key === "ArrowDown") nextRow += 1;
  if (key === "ArrowUp") nextRow -= 1;
  const target = table.rows[nextRow]?.cells[nextCell];
  if (target) target.focus();
}

function enhanceNumberInputs() {
  document.querySelectorAll("input[type='number']").forEach(input => {
    if (input.closest(".number-stepper")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "number-stepper";
    const minus = document.createElement("button");
    const plus = document.createElement("button");
    minus.type = "button";
    plus.type = "button";
    minus.textContent = "-";
    plus.textContent = "+";
    minus.setAttribute("aria-label", "Зменшити");
    plus.setAttribute("aria-label", "Збільшити");
    input.parentNode.insertBefore(wrapper, input);
    wrapper.append(minus, input, plus);

    const change = direction => {
      const step = Number(input.step) || 1;
      const min = input.min === "" ? -Infinity : Number(input.min);
      const max = input.max === "" ? Infinity : Number(input.max);
      const current = input.value === "" ? 0 : Number(input.value);
      const next = Math.min(max, Math.max(min, current + direction * step));
      input.value = Number(next.toFixed(6));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    minus.addEventListener("click", () => change(-1));
    plus.addEventListener("click", () => change(1));
  });
}

document.querySelector("#inventoryWorkspace").addEventListener("keydown", event => {
  if (event.key === "Escape") {
    setMessage(materialMessage, "");
    setMessage(lotMessage, "");
    return;
  }
  if (event.ctrlKey && event.key === "Enter") {
    event.preventDefault();
    if (document.activeElement.closest("#materialForm")) materialForm.requestSubmit();
    else lotForm.requestSubmit();
    return;
  }
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key) && document.activeElement.closest(".data-table")) {
    event.preventDefault();
    moveTableFocus(document.activeElement, event.key);
  }
});

document.querySelector("#logoutButton").addEventListener("click", async () => {
  await api("/api/auth/logout", { method: "POST", body: "{}" });
  showAuth();
});

enhanceNumberInputs();
setLanguage(state.lang);
applyFeatureReadiness();
api("/api/me").then(data => showApp(data.user)).catch(showAuth);
