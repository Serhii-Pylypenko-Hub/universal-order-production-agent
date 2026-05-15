# Setup Guide

## Prerequisites

- Node.js 18+
- Telegram Bot (create via [@BotFather](https://t.me/BotFather))
- OpenRouter API key (or OpenAI)
- Google account with a Spreadsheet (optional for production)

---

## Quick Start (Local / Demo)

```bash
# 1. Clone and install
git clone <repo-url>
cd universal-order-production-agent
# No npm install needed — zero external dependencies

# 2. Configure environment
cp .env.example .env
# Edit .env: set TELEGRAM_BOT_TOKEN, MANAGER_CHAT_ID, OPENROUTER_API_KEY

# 3. Initialize workspace with demo data (cakes template)
npm run setup:demo

# 4. Check workspace health
npm run health

# 5. Start the bot in polling mode (development)
npm run bot:polling
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | From @BotFather |
| `MANAGER_CHAT_ID` | Yes | Your Telegram chat ID (get from @userinfobot) |
| `OPENROUTER_API_KEY` | Yes | API key for AI parsing |
| `AI_MODEL` | No | Default: `openai/gpt-4o-mini` |
| `TELEGRAM_WEBHOOK_SECRET` | Prod | Random secret for webhook validation |
| `BOT_MODE` | No | `polling` (dev) or `webhook` (prod) |
| `WEBHOOK_URL` | Webhook | Your public HTTPS URL + `/webhook` |
| `GOOGLE_SHEETS_ID` | Prod | From Google Sheets URL |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Prod | Base64-encoded service account JSON |
| `GOOGLE_CALENDAR_ID` | Optional | For Google Calendar integration |

---

## Google Sheets Setup (Production)

1. Create a new Google Spreadsheet.
2. Create a Service Account in Google Cloud Console.
3. Enable Google Sheets API.
4. Share the spreadsheet with the service account email (Editor).
5. Download the JSON credentials.
6. Encode as base64: `base64 -i credentials.json`
7. Set `GOOGLE_SERVICE_ACCOUNT_JSON` to the base64 string.
8. Set `GOOGLE_SHEETS_ID` to the spreadsheet ID.
9. Run `npm run setup:demo` — workspace structure is created automatically.

---

## Production Deployment (Webhook Mode)

```bash
# Set environment variables
export BOT_MODE=webhook
export WEBHOOK_URL=https://your-domain.com/webhook
export PORT=3000

# Start bot (registers webhook automatically)
npm run bot:webhook
```

The bot registers the webhook URL with Telegram on startup. Ensure your server has a valid SSL certificate (Telegram requires HTTPS).

---

## Products & Materials Setup

After running `setup:demo` or `setup:empty`:

1. **Open your Google Spreadsheet** (or `data/local_workspace.json` for local).
2. **Fill in Products**: name, unit, margin_percent, production_hours.
3. **Fill in Components**: name, unit, safety_stock_qty.
4. **Fill in ProductComponents** (BOM): link each product to its components with qty.
5. **Fill in Stock**: initial quantities for each component.
6. Run `npm run health` to verify `ready_for_orders: true`.

---

## n8n Integration

Import workflow files from `workflows/` into your n8n instance:

1. `01_setup_workspace.json` — one-time workspace initialization
2. `02_order_intake.json` — Telegram webhook → AI parse → create order
3. `07_manager_bot.json` — manager commands
4. `06_tasks_reminders.json` — hourly deadline monitoring (cron)
5. `09_workspace_health.json` — daily health check (cron)

Set n8n environment variables to match your `.env` file.
