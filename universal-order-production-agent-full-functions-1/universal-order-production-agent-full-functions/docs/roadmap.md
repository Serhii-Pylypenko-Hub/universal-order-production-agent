# Roadmap

## v0.6.0 (Current — Connection Layer)
- GoogleSheetsStore adapter
- Telegram Bot / webhook handler
- NotificationService (real Telegram messages)
- SettingsService
- Manager Bot full commands
- PaymentService / DeliveryService (separate)
- HandoffService
- RetryService (FailedOperations queue)
- DeadlineMonitorService
- n8n workflow skeletons (01–09)
- docs/setup.md, docs/roadmap.md

## v0.7.0 (Google Calendar Integration)
- Real Google Calendar adapter
- calendarService → googleCalendarAdapter
- Calendar overrides synced to Google Calendar
- Production slots visible in Calendar

## v0.8.0 (Manager Bot UX Polish)
- Inline keyboards for all major flows
- Conversation state for multi-step manager actions
- `/stats` command with order/revenue summary
- Weekly summary report

## v0.9.0 (Client Experience)
- Client order history via `/myorders`
- PDF proposal generation
- Partial payment reminders
- Order status notifications to clients

## v1.0.0 (Production Release)
- End-to-end demo video
- Full documentation
- One-click Heroku/Railway deploy
- setup wizard with guided onboarding

## SaaS Roadmap (Post v1.0)

### Multi-tenancy
- tenant_id on all tables
- Per-tenant Google Sheets
- Per-tenant Telegram bots
- Billing / subscription management

### Supplier Management
- Suppliers table + SupplierProducts
- Price comparison across suppliers
- Automatic reorder suggestions
- Purchase order emails to suppliers

### Multi-warehouse
- warehouse_id on Stock
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
