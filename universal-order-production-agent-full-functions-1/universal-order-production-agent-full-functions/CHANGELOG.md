# Changelog

## Unreleased

Added:
- ERP inventory design document with FIFO, stock lots, manager manual lot selection, manual overrides, purchase receipt lots, and bot-management rules.
- Schema version `0.7.0` with `StockLots`, `ReservationLots`, `OrderMaterialRequirements`, `ProductionRuns`, `WasteWriteOffs`, `StockAdjustments`, `Warehouses`, `Suppliers`, `SupplierMaterials`, `Alerts`, and bot-management sheets.
- Validation and table UI requirements for spreadsheet-like entry, Ukrainian field-level instructions, safe system errors, local developer alerts, and optional GitHub issue reporting.
- Inventory workspace API and web UI for material creation, duplicate warnings, lot receipt, FIFO lot visibility, active order material plans, detailed Ukrainian validation, and spreadsheet-style keyboard navigation.
- Production workflow API and UI actions for starting production, completing with stock consumption, releasing reserves, and manually changing or adding order materials with automatic re-reservation.
- Catalog/tech-card, purchase, and bot-management workspaces with APIs and web forms for products, recipes, purchase receipt, bot settings, templates, and order-intake flow steps.
- Two AI usage modes: economy mode and full assistant mode with subscription status, AI permissions, text commands, browser voice transcript handling, action logs, and confirmation for mutating actions.
- AI assistant guardrails: no code/file/schema/env/dependency/deployment changes; only authenticated business UI/API actions are allowed.
- Web onboarding cabinet for registration, login, resource connection, workspace setup, and dashboard.
- `app/js/web/*` services for auth/session storage, environment configuration, HTTP API, and dashboard summaries.
- `app/web/*` browser UI for guided setup and operations overview.
- `tests/runWebTests.js` for auth and environment configuration checks.
- `documentation/` folder with Ukrainian working documentation for web onboarding and code compliance.
- `web:start` and `test:web` scripts.
- Windows local-app launch scripts: `start-local.*` and `stop-local.*`.
- Local-app documentation for downloadable/offline usage.
- Local release builder `build-local-release.ps1` and user-facing `START_HERE.txt`.
- Ukrainian-first web UI with a UA/EN language switch.
- Required-field highlighting for the current Telegram/AI demo setup path.
- Dashboard demo product and test stock lists.
- Local Telegram bot start/stop scripts for polling mode.
- Telegram demo readiness status and clearer bot startup validation.
- Telegram client menu for `/start`, products, test stock, and order examples.
- Manager command results now send configured inline keyboards when available.
- Expanded cakes demo data with additional products, components, BOM rows, and customization options.
- Web action to create a full test order through `OrderService`.
- Manager bot commands for product, component, and recipe/BOM inspection.
- Guided cake-only client conversation rules with clarification fallback and 10-response limit.
- Client callback request flow with manager Telegram alert.
- Manager Telegram alert for every successfully created client order.
- Cake customization mapping for extra chocolate, nuts, no nuts, berries, and inscriptions.
- Manager discount commands for amount thresholds, every-N-order promotions, listing, and disabling rules.
- Manager manual order price command.
- Telegram cakes demo documentation with client and manager test scenarios.
- Stock control block with material `min_qty`, configurable procurement horizon, shortage highlighting, and automatic draft purchase request creation.
- Inventory reports for final balance on a selected date and monthly stock movement differences.
- AI read/analyze commands for inventory balance reports and monthly stock differences.
- Stepper buttons for numeric web fields such as prices, quantities, days, and months.
- Backend/web/AI coverage audit document.
- Inactive `Платежі` web tab with disabled payment and discount placeholders, marked as planned until the finance workflow is activated.
- Planned Nova Poshta placeholder and fake demo payment requisites; bot flow collects delivery/payment details without creating shipments or real payment actions.
- Demo assortment stock now includes enough, low, and absent materials so procurement control, reserve changes, and draft purchase request creation are easy to test manually.
- Local demo product visuals and dashboard product cards for a more realistic presentation database.
- User-facing README, bot test instruction, and documentation overview now describe the full demo ERP cycle from materials to purchase, order, production, stock write-off, and reports.
- Web button controls for starting, stopping, and checking the local Telegram polling bot, with batch scripts kept as fallback.
- Release start instruction updated so users launch the app once and then control the Telegram bot from the web cabinet.
- Windows Task Scheduler autostart and watchdog scripts for keeping the local Telegram bot running after user login.
- Web controls for enabling and disabling the local Telegram bot permanent mode without opening the project folder.

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
