# Parsed Code Map

## Data Layer
- `app/js/data/localJsonStore.js` — local JSON storage adapter for MVP tests.
- `app/js/data/rowRepository.js` — shared row operations: append, update, find.
- `app/js/data/schemaManager.js` — schema loading and sheet/column creation.
- `app/js/data/idempotencyService.js` — duplicate event protection.

## Business Services
- `app/js/orders/orderService.js` — order lifecycle, creation, status updates.
- `app/js/orders/stateGuardService.js` — status transition validation.
- `app/js/orders/orderCounterService.js` — real client order index for discounts.
- `app/js/orders/productService.js` — Products, BOM, cost requirements.
- `app/js/stock/stockService.js` — stock, reservations, release, consumption.
- `app/js/purchases/purchaseService.js` — purchase request create/merge.
- `app/js/calendar/calendarService.js` — production slot scheduling.
- `app/js/tasks/taskService.js` — tasks and reminders.
- `app/js/manager/managerService.js` — manager bot actions.
- `app/js/pricing/discountService.js` — discounts and personal prices.
- `app/js/pricing/priceReviewService.js` — recommended price logic.

## Cross-cutting
- `app/js/audit/auditService.js` — ActivityLog.
- `app/js/errors/userErrorService.js` — safe user/manager error output.
- `app/js/utils/*` — IDs, dates, error helpers.

## Key rules
- Do not duplicate Google Sheets logic in workflows.
- Use Data Layer and Business Services.
- Keep AI limited to communication/parsing.
- Keep stock, pricing, scheduling in deterministic code.


## Customization Layer

- `app/js/customizations/customizationService.js` — central add/remove/replace/note options logic.
- `app/js/clients/clientPreferenceService.js` — saves preference/history memory per client.
- `ProductOptions`, `OptionGroups`, `OrderItemCustomizations`, `ClientPreferencesHistory` are schema-level sheets.
