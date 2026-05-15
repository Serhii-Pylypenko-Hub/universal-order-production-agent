# Architecture

The system uses reusable business functions.

```text
Telegram / n8n
→ services
→ data layer
→ Google Sheets or LocalJsonStore
```

For MVP, `LocalJsonStore` simulates Google Sheets.
