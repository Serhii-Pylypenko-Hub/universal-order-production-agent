# Code Requirements

These requirements are mandatory for all contributors and AI coding agents.

## Clean Code

- Do not duplicate table access logic in workflows.
- All table operations must use Data Access Layer functions.
- Business logic must live in services, not in n8n nodes.
- One responsibility per service.
- Functions must be reusable and testable.

## Error Handling

- User-facing errors must be safe and understandable.
- Technical errors must be logged for manager/debug review.
- Google/API/AI failures must create FailedOperations or UserFacingErrors.
- Critical failures must create manager tasks.

## Pricing Rules

- Discount rules can be percentage or fixed amount.
- Manager can define every N-th order discount.
- Personal client price overrides discounts and base price.
- Personal price may be below cost only with explicit warning.
- If price < cost, system must show PRICE_BELOW_COST_REQUIRES_MANAGER_CONFIRMATION.

## Change History

- Every feature/change must update CHANGELOG.md.
- Every meaningful data change must create ActivityLog entry.
- Schema changes must update schema_version and include migration notes.

## Git / CI/CD

- main is protected.
- All changes via Pull Request.
- CI must run tests and schema validation.
- Failed CI should notify maintainers via GitHub Actions summary/issues/tasks.

## Additional consistency requirements

- Do not hardcode orderIndex. Use `getClientOrderIndex(clientId)`.
- All webhook/message inputs must pass through `withIdempotency()` when an event_id is available.
- All status changes must pass through `validateOrderTransition()`.
- Business workflow must use service functions, not duplicate table operations.
- New features must update: schema, tests, README/docs, and CHANGELOG.

## Inventory ERP Requirements

- Do not create duplicate materials for different purchase prices. Price changes must create `StockLots`.
- Material creation must normalize names and check for existing/similar materials.
- FIFO is the default lot selection strategy for reservations and consumption.
- Manager-selected lots must be stored as `MANUAL_LOT`.
- Manager changes to material, quantity, unit, or cost must be stored as `MANUAL_OVERRIDE` with a reason.
- Manual order material changes must not rewrite product tech cards.
- Every stock change must write `InventoryTransactions`.
- Reservation must decrease available stock but not total stock.
- Consumption must happen on ready/completed production, not on production start.
- Purchase receipt must create stock lots, update balances, and write inbound transactions.
- Low-stock detection must use available quantity and `min_qty`.
- Unit conversion must be used before cost, reserve, purchase, and consume calculations.

## Bot Management Requirements

- Client-facing bot text must come from Ukrainian-first templates where possible.
- The system must support multiple bot accounts through `BotAccounts`.
- Full Assistant permissions must be configured per bot through `BotAssistantSettings`.
- Order intake step order must be configurable through `BotOrderFlowSteps`.
- Handoff rules must be data-driven through `BotHandoffRules`.
- Bot quick replies must be data-driven through `BotQuickReplies`.
- Bot conversation events that affect orders should be auditable in `BotConversationLogs`.

## AI Assistant Mode Requirements

- The system must support `economy` and `full_assistant` AI modes.
- Economy mode may parse orders and answer simple read-only questions only.
- Full assistant mode requires active subscription status.
- Full assistant mode must also be enabled for the current bot.
- Full assistant mode may navigate/read/analyze modules and prepare actions.
- Full assistant mode may read recipes, ingredients, tech cards, and user instructions.
- Full assistant mode may send bot messages only when the current bot allows message sending.
- Full assistant mode may change order statuses only when the current bot allows status changes, and all changes must pass `validateOrderTransition()`.
- Mutating AI actions must require confirmation unless explicitly allowed by permission.
- Every AI assistant action must be recorded in `AiAssistantActions`.
- Voice commands must be transcribed and recorded in `VoiceCommandLogs`.
- If subscription is inactive, full-assistant requests must return a clear upgrade message and must not execute actions.
- AI assistant must never modify application code, repository files, schemas, environment files, dependencies, prompts, or deployment settings.
- AI assistant may execute only the same business actions that an authenticated user can execute through UI/API permissions.
- AI assistant must reject requests such as "change code", "edit file", "update schema", "install package", "change .env", or "deploy".

## Validation And Table UI Requirements

- Every create/update action must validate required fields before saving.
- Enter and action buttons must run the same validation path.
- Validation errors must list every missing/invalid field and explain what the user should do in Ukrainian.
- Validation must distinguish missing required fields from invalid filled fields.
- Missing required fields should use `category: missing_required`; invalid values should use `category: invalid_value`.
- The web UI must visually distinguish missing required fields from invalid filled fields.
- UI table parts must support spreadsheet-like keyboard work: arrows, Tab, Enter save, Ctrl+Enter add row, Esc cancel.
- Invalid table cells must be highlighted and focus must move to the first invalid cell.
- Server-side validation must exist even when browser validation exists.
- System errors must show a safe Ukrainian message and must not expose stack traces to users.
- System errors must create `UserFacingErrors` and `DeveloperAlerts`.
- When GitHub integration is configured, critical developer alerts must create a GitHub issue.
