# Parsed Code Map

## Data Layer
- `app/js/data/localJsonStore.js` - local JSON storage adapter for MVP tests.
- `app/js/data/googleSheetsStore.js` - Google Sheets storage adapter.
- `app/js/data/rowRepository.js` - shared row operations: append, update, find.
- `app/js/data/schemaManager.js` - schema loading and sheet/column creation.
- `app/js/data/idempotencyService.js` - duplicate event protection.

## Business Services
- `app/js/orders/orderService.js` - order lifecycle, creation, status updates.
- `app/js/orders/stateGuardService.js` - status transition validation.
- `app/js/orders/orderCounterService.js` - real client order index for discounts.
- `app/js/orders/productService.js` - Products, tech cards/BOM, cost requirements.
- `app/js/stock/stockService.js` - aggregate stock, reservations, release, consumption.
- `app/js/stock/materialService.js` - material dictionary, normalized names, and duplicate prevention.
- `app/js/stock/stockLotService.js` - stock lots, FIFO lot selection, lot reservation, and receipt helpers.
- `app/js/purchases/purchaseService.js` - purchase request create/merge and receipt.
- `app/js/calendar/calendarService.js` - production slot scheduling.
- `app/js/tasks/taskService.js` - tasks and reminders.
- `app/js/manager/managerService.js` - manager bot actions.
- `app/js/production/productionService.js` - order production workflow: start, complete, release reserve, manual material changes.
- `app/js/pricing/discountService.js` - discounts and personal prices.
- `app/js/pricing/priceReviewService.js` - recommended price logic.

## Bot Services
- `app/js/bot/messageRouter.js` - routes client/manager messages.
- `app/js/bot/aiService.js` - OpenRouter/OpenAI parsing and clarification.
- `BotSettings`, `BotTemplates`, `BotFlowSchemas`, `BotOrderFlowSteps`, `BotStepOptions`, `BotMediaAssets`, `Promotions`, `BotQuickReplies`, `BotHandoffRules`, and `BotConversationLogs` are schema-level bot-management sheets.

## AI Assistant Services
- `app/js/ai/subscriptionService.js` - economy/full assistant modes, subscription status, and AI permissions.
- `app/js/ai/assistantActionService.js` - text/voice command dispatcher, safe read/analyze actions, confirmed mutations, and action logs.

## Web Services
- `app/js/web/inventoryService.js` - inventory workspace API data, material creation, suggestions, and lot receipt.
- `app/js/web/catalogWorkspaceService.js` - products and tech-card management for the web cabinet.
- `app/js/web/purchaseWorkspaceService.js` - purchase request workspace and receipt into stock lots.
- `app/js/web/botManagementService.js` - bot settings, templates, and configurable order-intake flow steps.
- `app/web/index.html`, `app/web/app.js`, `app/web/styles.css` - manager-facing workspace with spreadsheet-style tables, client-side validation, active modules, and inactive planned modules such as `Платежі`.

## Documentation
- `docs/user_guide.md` - Ukrainian user guide, module navigation, hotkeys, validation behavior, and bot/AI usage.
- `docs/git_workflow.md` - Git workflow for developers: branches, commits, tests, PR checklist, and AI safety boundaries.
- `docs/code_quality_audit.md` - current quality audit for modularity, validation, error isolation, and future PR checks.

## Cross-cutting
- `app/js/audit/auditService.js` - ActivityLog.
- `app/js/errors/userErrorService.js` - safe user/manager error output.
- `app/js/errors/validationService.js` - required-field and typed validation with Ukrainian instructions.
- `app/js/errors/developerAlertService.js` - local developer alerts and optional GitHub issue reporting.
- `app/js/utils/*` - IDs, dates, unit conversion, error helpers.

## ERP Inventory Sheets
- `Components` - canonical material dictionary.
- `MaterialCategories` - material grouping.
- `Suppliers` and `SupplierMaterials` - supplier directory and supplier-specific material data.
- `Warehouses` - warehouse/location directory.
- `StockLots` - purchase batches with costs and expiration dates.
- `Stock` - aggregate balance view.
- `InventoryTransactions` - immutable stock movement log.
- `Reservations` - order-level reservations.
- `ReservationLots` - lot-level reservation details.
- `OrderMaterialRequirements` - exact material plan for each order, including manual overrides.
- `ProductionRuns` - production execution records.
- `WasteWriteOffs` and `StockAdjustments` - losses and manual corrections.
- `Alerts` - stock/system alerts.
- `DeveloperAlerts` - technical error reports for developers and optional GitHub issue links.
- `ValidationRules` - data-driven required fields and input validation instructions.
- `TableUiSettings` - spreadsheet-like UI behavior settings for table parts.

## Customization Layer
- `app/js/customizations/customizationService.js` - central add/remove/replace/note options logic.
- `app/js/clients/clientPreferenceService.js` - saves preference/history memory per client.
- `ProductOptions`, `OptionGroups`, `OrderItemCustomizations`, `ClientPreferencesHistory` are schema-level sheets.

## Key Rules
- Do not duplicate Google Sheets logic in workflows.
- Use Data Layer and Business Services.
- Keep AI limited to communication/parsing.
- Keep stock, pricing, scheduling in deterministic code.
- Keep material identity in `Components`; purchase price differences belong in `StockLots`.
- Store per-order manual ingredient changes in `OrderMaterialRequirements`, not in tech cards.
- FIFO is the default, with `MANUAL_LOT` and `MANUAL_OVERRIDE` available to managers.

- `app/js/web/inventoryService.js` also calculates `procurement_plan`: minimum stock control, order-demand shortage by planning horizon, and data for automatic purchase drafts.
- `app/js/reports/inventoryReportService.js` - inventory reports: final balance on date and monthly stock movement differences.
- `app/js/orders/paymentService.js` and `app/js/pricing/discountService.js` - backend finance primitives; web currently exposes only an inactive planned `Платежі` placeholder.
