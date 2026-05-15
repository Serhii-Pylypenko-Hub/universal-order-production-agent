# Аналіз TZ та план внесення змін у проект

## Context

Проект `universal-order-production-agent-full-functions` — це MVP операційної системи для малого виробництва (поточний стан: v0.5.0). Система побудована на чистій сервісній архітектурі з LocalJsonStore як адаптером сховища. ТЗ (Updated_TZ_AI_Operations_MVP_v12_customizations-2.docx) описує бачення продукту, але поточний код реалізує лише ~60% від описаного.

---

## Оцінка ТЗ (критичний аналіз)

### Що зроблено добре
- Чітка модульна архітектура з поділом відповідальностей (Data Layer → Services → Orchestration)
- Реалістичний MVP-scope (один бізнес, один склад, один менеджер)
- State machine для замовлень — продуманий і точний
- Customization layer добре специфікований (add/remove/replace/note)
- Ідемпотентність і StateGuards явно прописані — rare в таких ТЗ
- Рішення "AI тільки для парсингу/комунікації" — правильне і зберігає токени
- Прийняті acceptance criteria per module

### Критика ТЗ

| # | Проблема | Серйозність |
|---|----------|-------------|
| 1 | **Нумерація секцій зламана** — є два набори секцій 77–84 (merge conflict артефакт) | Середня |
| 2 | **Дублювання** — clean code rules, data layer principles повторюються 4–5 разів | Середня |
| 3 | **"MVP за 2 дні"** — нереальна оцінка для системи з Telegram bot + Google Sheets + Google Calendar + n8n + AI + усіма сервісами | Висока |
| 4 | **Python-модулі без деталей** — `app/python/` згадано але нічого не специфіковано | Низька |
| 5 | **Відсутні SLA/performance requirements** — скільки ms на відповідь боту? | Середня |
| 6 | **Setup Wizard UX не описаний** — ТЗ каже "натискає Setup" але не пояснює що саме відбувається, які помилки, flow | Висока |
| 7 | **Стратегія retry для FailedOperations не вказана** — exponential backoff? max retries? dead-letter? | Середня |
| 8 | **Мульти-валюта** — ціни вказані але немає специфіки currency handling | Низька |
| 9 | **Backup/export** — виробничий бізнес потребує data export/backup, ТЗ мовчить | Середня |
| 10 | **Time zones** — calendar scheduling без timezone spec | Середня |
| 11 | **Якість AI парсингу** — жодних acceptance criteria: який % accuracy прийнятний? що коли AI повернув невалідний JSON? | Висока |
| 12 | **Cancellation fees** — відміна після початку виробництва — реальний бізнес-кейс, не покритий | Низька |
| 13 | **n8n workflow JSONs відсутні** — ТЗ описує 9 файлів, але вони не існують у репо | Висока |

### Що варто додати до ТЗ

1. **Webhook security** — Telegram webhook повинен перевіряти secret token, не лише приймати запити
2. **Rate limiting** — один клієнт не повинен генерувати 1000 замовлень за хвилину
3. **Soft delete** — в ТЗ є `softDeleteRow()` але нема правил коли soft delete vs hard delete
4. **Schema migration versioning** — чіткий формат migration files, не просто "addMissingColumns()"
5. **Multi-language support** — MessageTemplates є, але мови не специфіковані
6. **Order search/filter** — менеджер-бот має /orders але нема spec для пошуку по клієнту, даті, статусу
7. **PDF/receipt generation** — клієнт хоче квитанцію про оплату або пропозицію у PDF
8. **Price history** — аналітика: як змінювались ціни на матеріали з часом

---

## Аналіз gap між ТЗ та поточним кодом

### Реалізовано (v0.5.0) ✅
- Data Access Layer (LocalJsonStore, rowRepository, schemaManager)
- OrderService з повним lifecycle
- ProductService (products, BOM, cost)
- StockService (reserve, release, consume)
- PurchaseService (create/merge)
- CalendarService (scheduling, capacity)
- TaskService
- DiscountService (percent/fixed/every-N/personal price)
- StateGuardService
- IdempotencyService
- OrderCounterService
- CustomizationService (add/remove/replace/note)
- ClientPreferenceService
- AuditService
- UserErrorService
- PriceReviewService
- WorkspaceManager (setup + health check)
- CI/CD (GitHub Actions)
- Tests (runLocalTests.js)
- Demo data (cakes)

### Відсутнє (критичні gaps) ❌

| Компонент | TZ секція | Пріоритет |
|-----------|-----------|-----------|
| **GoogleSheetsStore adapter** | §38-45 | P0 — без нього система не виходить в продакшн |
| **Telegram Bot / webhook handler** | §14, §55-56 | P0 — без нього немає UX |
| **n8n Workflow JSONs** | §18, §23-36 | P0 — без них нема end-to-end flow |
| **NotificationService** (реальне надсилання) | §7 | P1 |
| **SettingsService** | §71 | P1 |
| **Manager Bot commands** | §54-56 | P1 |
| **PaymentService** (окремий від OrderService) | §71 | P2 |
| **DeliveryService** | §71 | P2 |
| **FailedOperations retry logic** | §63 | P2 |
| **Human Handoff flow** | §57 | P2 |
| **Deadline Monitoring job** | §9 | P2 |
| **Google Calendar adapter** | §30 | P3 |
| **Unit conversion rules** | §61 | P3 |
| **Additional schema JSON files** | §23 | P3 |
| **docs/**: setup.md, user_guide.md, roadmap.md | §23 | P3 |
| **Webhook security** (не в ТЗ, але потрібно) | — | P1 |

---

## План внесення змін

### Фаза 1 — P0: Зв'язковий шар (система повинна запускатись наскрізно)

#### 1.1 GoogleSheetsStore adapter
**Файли:**
- `app/js/data/googleSheetsStore.js` — новий файл
- `app/js/data/store.js` — оновити factory, вибір адаптера за ENV

**Логіка:** реалізувати той самий interface що LocalJsonStore (`getRows`, `appendRow`, `updateRow`, `findRows`, `findOne`, `ensureSheet`), але поверх Google Sheets API v4.

**Переключення:** якщо `GOOGLE_SHEETS_ID` не заданий → використовувати LocalJsonStore; якщо заданий → GoogleSheetsStore.

#### 1.2 Telegram Bot / Webhook Handler
**Файли:**
- `app/js/bot/telegramBot.js` — ініціалізація bot, реєстрація handlers
- `app/js/bot/webhookHandler.js` — обробка вхідного webhook (з перевіркою secret)
- `app/js/bot/messageRouter.js` — роутинг: клієнтське повідомлення vs команда менеджера

**Залежить від:** NotificationService для надсилання відповідей

#### 1.3 n8n Workflow skeleton files
**Файли (9 штук):**
- `workflows/01_setup_workspace.json`
- `workflows/02_order_intake.json`
- `workflows/03_stock_reservation.json`
- `workflows/04_purchase_requests.json`
- `workflows/05_calendar_scheduling.json`
- `workflows/06_tasks_reminders.json`
- `workflows/07_manager_bot.json`
- `workflows/08_payments_delivery_status.json`
- `workflows/09_workspace_health.json`

**Підхід:** скелети з коментарями де виклики до JS-сервісів; не бізнес-логіка всередині nodes.

---

### Фаза 2 — P1: Сервісний шар (повна функціональність)

#### 2.1 NotificationService — реальне надсилання
**Файл:** `app/js/tasks/notificationService.js` (вже існує, розширити)

Додати:
- `sendTelegramMessage(chatId, text, keyboard?)` — via Telegram Bot API
- `sendManagerAlert(text)` — надсилання MANAGER_CHAT_ID
- `sendClientMessage(clientId, text)` — lookup chatId клієнта з Clients

#### 2.2 SettingsService
**Файл:** `app/js/manager/settingsService.js` — новий

Функції:
- `getSetting(key)` — читання з Settings sheet
- `setSetting(key, value)` — запис
- `getThresholds()` — cost_change_threshold, price_buffer_percent і т.д.

#### 2.3 Manager Bot Commands
**Файл:** `app/js/manager/managerService.js` (вже існує, розширити)

Додати повну реалізацію команд зі §54:
- `/orders` — getActiveOrders() + форматований список
- `/order ORD-001` — деталі + статус + кнопки
- `/change_status ORD-001` — inline keyboard з доступними переходами
- `/stock` — getStock() all components
- `/add_stock` — форма введення
- `/low_stock` — components де current_qty < safety_stock
- `/purchases` — getActivePurchaseRequests()
- `/receive_purchase PR-001` — updateStock() + InventoryTransactions IN
- `/tasks` — getOpenTasks()
- `/calendar` — CalendarLog на найближчі N днів
- `/block_time` — createCalendarOverride()
- `/price_review` — orders з price_review_status = ReviewRequired
- `/approve_price ORD-001` / `/keep_price ORD-001` — manager decision flow
- `/client [name/phone]` — пошук клієнта

#### 2.4 Webhook Security
**Файл:** `app/js/bot/webhookHandler.js`

- Перевірка `X-Telegram-Bot-Api-Secret-Token` header
- Rate limiting per chat_id (простий in-memory counter для MVP)

---

### Фаза 3 — P2: Операційна стійкість

#### 3.1 FailedOperations Retry Logic
**Файл:** `app/js/utils/retryService.js` — новий

- `saveFailedOperation(operation, error, payload)` — запис у FailedOperations
- `retryPendingOperations()` — читання операцій з retry_count < max_retries, повторний виклик
- `scheduleRetry()` — exponential backoff (1m, 5m, 15m, 1h)

#### 3.2 PaymentService (окремий)
**Файл:** `app/js/orders/paymentService.js` — новий

Виділити з OrderService:
- `confirmPayment(orderId, amount, method)` — оновлення payment_status, payment_amount
- `addPartialPayment(orderId, amount)` — partial payment tracking
- `getPaymentSummary(orderId)` — статус і деталі оплати

#### 3.3 DeliveryService (окремий)
**Файл:** `app/js/orders/deliveryService.js` — новий

- `markReadyForPickup(orderId)` — статус Ready + notification
- `confirmPickup(orderId)` — статус PickedUp + stock finalize
- `markShipped(orderId, trackingInfo)` — статус Sent + tracking
- `confirmDelivered(orderId)` — статус Delivered + close order

#### 3.4 Human Handoff Flow
**Файл:** `app/js/orders/handoffService.js` — новий

- `requestHandoff(orderId, reason)` — статус AI_HANDOFF_REQUIRED + manager task
- `managerPickup(orderId)` — MANAGER_ACTIVE
- `resolveHandoff(orderId, resolution)` — HANDOFF_RESOLVED + resume flow

#### 3.5 Deadline Monitoring
**Файл:** `app/js/tasks/deadlineMonitorService.js` — новий

- `checkOverdueOrders()` — замовлення де ready_date < today і статус < Ready
- `checkSlowPurchases()` — PurchaseRequests старіші за N днів без оновлення
- `checkCalendarOverload()` — дні де reserved_capacity > daily_capacity_hours
- Результати → Tasks + ActivityLog

---

### Фаза 4 — P3: Документація і додаткові схеми

#### 4.1 Документація
- `docs/setup.md` — покрокова інструкція для нового користувача
- `docs/user_guide.md` — як користуватись через Telegram
- `docs/roadmap.md` — що планується після MVP (SaaS, multi-tenant, suppliers)
- `docs/testing.md` — як запускати тести

#### 4.2 Додаткові JSON схеми
- `schemas/product_schema.json`
- `schemas/component_schema.json`
- `schemas/payment_schema.json`
- `schemas/task_schema.json`

#### 4.3 Unit Conversion
**Файл:** `app/js/utils/unitConverter.js` — новий

- `convert(value, fromUnit, toUnit)` — базова конвертація (g↔kg, ml↔l)
- `validateUnit(unit)` — перевірка допустимих значень

---

## Критичні файли для модифікації

| Файл | Зміна |
|------|-------|
| `app/js/data/store.js` | Додати factory switch LocalJson ↔ GoogleSheets |
| `app/js/setup/workspaceManager.js` | Додати connectivity checks (Telegram, Google APIs) |
| `app/js/setup/healthCheck.js` | Розширити: перевірка з'єднань, а не тільки схеми |
| `app/js/orders/orderService.js` | Виділити payment/delivery в окремі сервіси |
| `app/js/tasks/notificationService.js` | Додати реальне надсилання через Telegram API |
| `app/js/manager/managerService.js` | Реалізувати всі команди зі §54 ТЗ |
| `schemas/sheets_schema.json` | Можливо додати handoff_status поля |
| `tests/runLocalTests.js` | Додати тести для нових сервісів |
| `CHANGELOG.md` | Оновити до v0.6.0 |

---

## Рекомендований порядок реалізації

```
Week 1 (Foundation):
  Day 1-2: GoogleSheetsStore adapter + store.js factory
  Day 3-4: Telegram Bot handler + webhookHandler + messageRouter
  Day 5:   n8n workflow skeletons

Week 2 (Services):
  Day 1:   NotificationService (реальне надсилання)
  Day 2:   SettingsService
  Day 3-4: Manager Bot commands (повна реалізація)
  Day 5:   Webhook security + rate limiting

Week 3 (Reliability):
  Day 1-2: PaymentService + DeliveryService
  Day 3:   FailedOperations retry logic
  Day 4:   Human Handoff flow
  Day 5:   Deadline Monitoring job

Week 4 (Polish):
  Day 1-2: Docs (setup.md, user_guide.md, roadmap.md)
  Day 3:   Additional JSON schemas
  Day 4:   Unit conversion
  Day 5:   Integration tests + CHANGELOG v0.6.0-v0.9.0
```

---

## Верифікація / Acceptance Criteria

Система вважається готовою до demo коли:

1. `npm run setup:demo` + `npm run health` → `ready_for_orders: true`
2. Telegram webhook отримує повідомлення → AI парсить → замовлення створюється в Google Sheets
3. Менеджер бачить сповіщення в Telegram
4. `/orders` повертає список активних замовлень
5. `/change_status ORD-001` → inline keyboard → статус оновлюється з guard-перевіркою
6. Дублікат webhook-а не створює другого замовлення
7. `/price_review` показує замовлення з попередженнями
8. `/receive_purchase PR-001` оновлює stock
9. `npm test` проходить локально і в GitHub Actions
10. FailedOperation зберігається і ретрається після відновлення з'єднання
