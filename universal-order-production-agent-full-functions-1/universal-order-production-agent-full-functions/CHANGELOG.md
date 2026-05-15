# Changelog

## 0.6.0 — Connection Layer

Added:
- `GoogleSheetsStore` adapter with JWT/OAuth2 authentication, in-memory cache, and background write queue
- `store.js` factory: auto-selects LocalJsonStore (dev) or GoogleSheetsStore (prod) based on `GOOGLE_SHEETS_ID`
- `telegramBot.js` — bot startup with long-polling (dev) and webhook (prod) modes
- `webhookHandler.js` — HTTP server, Telegram secret token validation, per-chat rate limiting
- `messageRouter.js` — routes client messages to AI order intake, manager commands to managerService
- `aiService.js` — OpenRouter/OpenAI integration for order parsing and clarification
- `notificationService.js` — real Telegram message sending (sendTelegramMessage, sendManagerAlert, sendClientMessage)
- `settingsService.js` — read/write business settings from Settings sheet
- `paymentService.js` — confirmPayment, addPartialPayment, getPaymentSummary
- `deliveryService.js` — markReadyForPickup, confirmPickup, markShipped, confirmDelivered
- `handoffService.js` — AI handoff flow: requestHandoff → managerPickup → resolveHandoff
- `retryService.js` — FailedOperations queue with exponential backoff retry
- `deadlineMonitorService.js` — hourly checks for overdue orders, slow purchases, calendar overload
- `unitConverter.js` — unit conversions (g↔kg, ml↔l) with validation
- `managerService.js` — full implementation of all 25+ manager commands with Telegram inline keyboards
- `healthCheck.js` — extended with Telegram, AI, Google Sheets, Calendar connectivity checks
- n8n workflow skeletons: 01_setup_workspace through 09_workspace_health
- `docs/setup.md`, `docs/user_guide.md`, `docs/roadmap.md`
- Updated `.env.example` with all new variables
- Updated `package.json` with bot:start, bot:polling, bot:webhook scripts

## 0.5.0 — Customization Layer

- Added ProductOptions and OptionGroups schema.
- Added OrderItemCustomizations.
- Added ClientPreferencesHistory.
- Added CustomizationService for flexible add/remove/replace/note options.
- Updated OrderService to calculate final BOM, cost, price, work hours and preference history.
- Added demo cake options: add raspberry, remove nuts, add inscription.
- Added tests for customizations and client preference memory.

## 0.4.0 — Consistency Cleanup

- Added `orderCounterService` for real every-N-order discount logic.
- Added `idempotencyService` for duplicate webhook protection.
- Added `stateGuardService` for order transition validation.
- Added parsed code map documentation.
- Updated schema to 0.4.0.

## 0.3.0

Added:
- User-facing error handling service
- Manager/debug notification service
- Discount rules
- Every N-th order discount logic
- Personal client price override
- Price below cost warning
- ChangeLog service
- Code requirements for clean architecture

## 0.2.0

Added:
- Data Access Layer
- OrderService
- StockService
- PurchaseService
- CalendarService
- TaskService
- ActivityLog
- InventoryTransactions
- Local demo mode
