# Roadmap

## v0.6.0 (Current - Connection Layer)
- GoogleSheetsStore adapter
- Telegram Bot / webhook handler
- NotificationService (real Telegram messages)
- SettingsService
- Manager Bot full commands
- PaymentService / DeliveryService (separate)
- HandoffService
- RetryService (FailedOperations queue)
- DeadlineMonitorService
- n8n workflow skeletons (01-09)
- docs/setup.md, docs/roadmap.md

## v0.7.0 (ERP Inventory Foundation)
- Google Sheets/Excel schema for material categories, suppliers, warehouses, stock lots, reservation lots, production runs, write-offs, adjustments, alerts, and bot management.
- FIFO stock lot model with manager override modes.
- Material duplicate prevention rules.
- Order material requirements separate from product tech cards.
- Purchase receipt model creates stock lots instead of directly changing one flat stock value.
- Bot management structure for greetings, templates, order-flow steps, quick replies, and handoff rules.

## v0.8.0 (Google Calendar Integration)
- Real Google Calendar adapter
- calendarService to googleCalendarAdapter
- Calendar overrides synced to Google Calendar
- Production slots visible in Calendar

## v0.9.0 (Manager Bot UX Polish)
- Inline keyboards for all major flows
- Conversation state for multi-step manager actions
- `/stats` command with order/revenue summary
- Weekly summary report

## v1.0.0 (Client Experience)
- Client order history via `/myorders`
- PDF proposal generation
- Partial payment reminders
- Order status notifications to clients

## v1.1.0 (Production Release)
- End-to-end demo video
- Full documentation
- One-click Heroku/Railway deploy
- setup wizard with guided onboarding

## SaaS Roadmap (Post v1.1)

### Multi-tenancy
- tenant_id on all tables
- Per-tenant Google Sheets
- Per-tenant Telegram bots
- Billing / subscription management

### Supplier Management
- Suppliers table + SupplierMaterials
- Price comparison across suppliers
- Automatic reorder suggestions
- Purchase order emails to suppliers

### Multi-warehouse
- warehouse_id on stock and lots
- Inter-warehouse transfers
- Location-aware scheduling

### Advanced Analytics
- Cost trend analysis
- Top products by margin
- Customer lifetime value
- Demand forecasting

### ERP Extensions
- Barcode/QR code scanning
- OCR for incoming invoices
- Nova Poshta API integration
- SMS notifications fallback
