# Universal AI Order & Production Assistant — MVP Function Foundation

This repository contains the reusable code foundation for the MVP.

## What is included

- Local JSON data adapter that simulates Google Sheets
- Schema manager
- Workspace setup
- Order service
- Product/BOM service
- Stock/reservation service
- Purchase request service
- Calendar/capacity service
- Task/reminder service
- Manager actions
- Cost review and recommended price logic
- Audit log
- Idempotency / duplicate protection
- Local demo scenario

## Quick start

```bash
npm install
npm run setup:demo
npm run health
npm run demo:order
npm test
```

## Architecture

Telegram / n8n should call these reusable functions instead of duplicating table logic inside workflows.

Flow:

```text
Telegram → n8n → JS business services → Data Layer → Google Sheets / Local Adapter
```

For MVP this repo uses `LocalJsonStore`. Later replace it with `GoogleSheetsStore` without rewriting business logic.


## Mandatory Code Rules

See `docs/CODE_REQUIREMENTS.md`.

Core principle:

```text
n8n workflow → service function → Data Access Layer → storage adapter
```

Do not duplicate table logic inside workflows.

## Pricing Features

- Percent discount
- Fixed discount
- Every N-th order discount
- Personal client price
- Warning when final price is below cost

## Error Handling

Use `createUserFacingError()` for safe user messages and manager/debug details.


## v12 Customization Layer

This version adds flexible product customizations:

- ProductOptions and OptionGroups
- OrderItemCustomizations
- ClientPreferencesHistory
- Final BOM = base BOM + additions/removals/replacements
- Customization deltas for cost, price, and work hours
- Client preferences and restrictions saved for future orders

Examples:

- cakes: add raspberry, remove nuts, add inscription
- woodworking: add handles, change coating, remove drawer

Business workflows must call `CustomizationService` instead of duplicating customization logic in n8n.
