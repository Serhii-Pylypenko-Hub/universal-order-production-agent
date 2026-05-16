# Backend, Web, AI Coverage Audit

## Exposed in Web

- Inventory: materials, stock lots, balances, procurement plan, procurement settings, purchase request from shortages.
- Production: open order, start production, complete and consume, release reservation, edit requirement, add manual material.
- Operations: products, tech-card rows, purchases, purchase receipt, bot accounts/settings/templates/flow steps/options/promotions.
- AI: mode switching, text command, voice transcript command, confirmation flow.
- Reports: inventory balance on date, monthly inventory differences.

## Exposed in AI

- Read/show: inventory, shortages, purchases, catalog/tech cards, active orders, one order with materials.
- Read/analyze/summarize: daily summary, procurement/purchase state, balance on date, monthly inventory differences.
- Mutate with Full Assistant and confirmation: start production, change order status, send/prep bot message.
- Explicitly blocked: code, files, schema, `.env`, dependencies, deploy, git/repository changes.

## Remaining Backlog

- Deep CRUD editors for every historical row are intentionally not exposed yet; current web exposes operational workflows first.
- Full report export to Excel/PDF is not implemented yet.
- Payment and discount management have backend support, but need a dedicated web settings view before daily use.
