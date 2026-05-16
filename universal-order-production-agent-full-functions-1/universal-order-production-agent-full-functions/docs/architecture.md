# Architecture

The system uses reusable business functions.

```text
Telegram / n8n
→ services
→ data layer
→ Google Sheets or LocalJsonStore
```

For MVP, `LocalJsonStore` simulates Google Sheets.

## ERP Inventory Core

Inventory is a core ERP module. The canonical structure is documented in
`docs/inventory_erp_design.md` and represented in `schemas/sheets_schema.json`.

Key architecture rules:

- `Components` is the single material dictionary.
- Different purchase prices are stored as `StockLots`, not duplicate materials.
- `Stock` is an aggregate balance view for quick dashboard access.
- `InventoryTransactions` is the immutable stock movement log.
- `Reservations` and `ReservationLots` separate order-level and lot-level reservation state.
- `OrderMaterialRequirements` stores the exact material plan for each order, including manager overrides.
- FIFO is the default reservation and consumption mode.
- Managers can use `MANUAL_LOT` or `MANUAL_OVERRIDE` for specific orders without changing the tech card.
- Bot behavior is configured through `BotSettings`, `BotTemplates`, `BotOrderFlowSteps`, `BotQuickReplies`, and `BotHandoffRules`.
