# Inventory ERP Design

This document fixes the target inventory, production, purchasing, and bot-management structure for the Production CRM/ERP MVP.

## Core Decisions

- The inventory module is a central ERP module, not a secondary report.
- A material/component is created once in `Components`; different purchase prices create new `StockLots`, not duplicate materials.
- Stock is valued and consumed by FIFO by default.
- Managers can override automatic FIFO for a specific order by selecting lots, changing quantities, replacing materials, or adding manual materials.
- Manual order material changes do not rewrite the product tech card. They are stored in `OrderMaterialRequirements` for that order only.
- Materials are reserved after manager/order confirmation. Total stock does not decrease while stock is only reserved.
- Materials are consumed from reserved lots when the order is completed or marked ready, not immediately when production starts.
- Cancelling an order before consumption releases reservations. Cancelling after consumption requires a manual write-off/return decision.
- All stock movements must create `InventoryTransactions`.
- All user-facing bot and web texts must be Ukrainian-first.

## Material Identity

`Components` is the material dictionary. One row represents one real material.

Examples:

- `Цукор білий` is one material.
- `Цукор білий` purchased at 45 UAH/kg and later at 52 UAH/kg remains one material.
- Each purchase price is stored as a separate `StockLots` row.

Required anti-duplication rules:

- Normalize names before creating materials: trim spaces, lower-case, collapse repeated spaces.
- Search by `normalized_name` before creation.
- Show similar existing materials to the manager before creating a new material.
- Unit changes must use controlled units and conversion rules.
- Price changes must create lots, not materials.

## Units

Supported unit families:

- Weight: `kg`, `g`
- Volume: `l`, `ml`
- Count: `pcs`
- Packaging: `pack`, `box`

Every material has one base unit. Incoming quantities may be entered in compatible units and converted to the base unit.

Examples:

- Flour base unit: `kg`; incoming `500 g` becomes `0.5 kg`.
- Milk base unit: `l`; incoming `250 ml` becomes `0.25 l`.
- Count/package units are not converted across families unless an explicit packaging rule is added later.

## Stock Lots And FIFO

`StockLots` stores purchase batches:

- material/component
- warehouse
- supplier
- received date
- expiration date
- initial quantity
- remaining quantity
- reserved quantity
- unit cost
- total cost
- status

FIFO selection order:

1. Active lots for the required component and warehouse.
2. Earliest `expires_at` first when present.
3. Earliest `received_at` second.
4. Earliest `created_at` as fallback.

The system can reserve one required material from multiple lots.

## Reservation Modes

Supported reservation modes:

- `AUTO_FIFO`: automatic oldest-lot reservation.
- `MANUAL_LOT`: manager selects exact lots.
- `MANUAL_OVERRIDE`: manager changes material, quantity, unit, or cost for this order.

Manual overrides must store:

- manager override flag
- reason
- source
- estimated cost
- reservation mode
- audit log entry

## Order Material Flow

1. Order is created from bot, web, or manager input.
2. Product tech card and customizations are expanded into `OrderMaterialRequirements`.
3. System validates units and converts required quantities to material base units.
4. System checks available stock by `StockLots`.
5. If enough stock exists, reservations are created using FIFO or manager selection.
6. If stock is missing, purchase requests and manager tasks are created.
7. When production starts, reservations remain active.
8. When order is marked ready/completed, reserved lots are consumed and `InventoryTransactions` records are written.
9. If order is cancelled before consumption, reservations are released.
10. If order is cancelled after consumption, the manager records a write-off, return, or adjustment.

## Excel / Google Sheets Structure

Inventory and production sheets:

- `MaterialCategories`: material grouping.
- `Components`: canonical material dictionary.
- `Suppliers`: supplier directory.
- `SupplierMaterials`: supplier-specific material data.
- `Warehouses`: warehouse/location directory.
- `StockLots`: purchase batches with cost and expiration.
- `Stock`: aggregated current, reserved, available, and status values.
- `InventoryTransactions`: immutable stock movement log.
- `Reservations`: order-level material reservation.
- `ReservationLots`: lot-level reservation details.
- `OrderMaterialRequirements`: material plan for a specific order.
- `ProductionRuns`: production execution record.
- `WasteWriteOffs`: losses, spoilage, manual write-offs.
- `StockAdjustments`: inventory count corrections.
- `PurchaseRequests`: purchase request header.
- `PurchaseRequestItems`: purchase request rows.
- `Alerts`: low-stock and system alerts.

Bot-management sheets:

- `BotAccounts`: configured bots/channels. One business can have multiple bots, for example Telegram, web chat, Instagram, or future channels.
- `BotAssistantSettings`: per-bot assistant mode and action permissions.
- `BotFlowSchemas`: reusable order-intake schemas for different business types.
- `BotStepOptions`: selectable answers for flow steps: categories, tastes, weights, delivery, payment, addons.
- `BotMediaAssets`: photos or media linked to products, options, or flow steps.
- `Promotions`: active sales offers that the bot can propose during ordering.
- `BotSettings`: bot operating mode and global settings.
- `BotTemplates`: greetings, handoff messages, order confirmations, missing-field prompts.
- `BotOrderFlowSteps`: configurable order intake order.
- `BotQuickReplies`: menu buttons.
- `BotHandoffRules`: rules for transferring to manager.
- `BotConversationLogs`: auditable conversation events.

## Bot Management

The manager must be able to configure:

- one or more bots
- channel and launch mode for each bot
- Full Assistant enablement per bot
- per-bot permissions for text control, voice control, sending messages, changing order statuses, reading recipes, and reading instructions
- greeting for new clients
- greeting for returning clients
- order intake steps and their order
- required fields
- quick replies/buttons
- handoff rules
- out-of-hours message
- maximum clarification count
- whether orders require manager confirmation before reservation

Handoff triggers:

- urgent request
- unknown product
- risky allergy/restriction wording
- unclear date
- high-value order
- missing stock
- client asks for manager
- AI confidence below threshold

## Bot Order Intake Logic

The bot must behave like a sales assistant, not only like a passive form.

The order-intake flow is configured through `BotFlowSchemas`, `BotOrderFlowSteps`, `BotStepOptions`, `BotMediaAssets`, `Promotions`, and `BotTemplates`.

The default bakery example:

1. Greeting: `Вітаю! Що бажаєте замовити?`
2. Category:
   - `Замовити торт`
   - `Готовий торт`
   - `Інше замовлення`
3. If category is `Замовити торт`, ask taste:
   - `Медовик`
   - `Шоколадний`
   - `Наполеон`
   - `Інше`
4. Offer photos/examples when useful.
5. Ask weight:
   - `1.5 кг`
   - `2 кг`
   - `3 кг`
6. Offer addons after the main type is selected:
   - inscription
   - berries
   - candles
   - other configurable additions
7. Ask allergens/restrictions:
   - nuts
   - honey
   - lactose
   - gluten
   - custom text
8. Ask date and show production rules, for example minimum 3 days.
9. Ask delivery method:
   - pickup
   - courier
   - Nova Poshta
   If Nova Poshta is selected, collect city, branch/postomat, recipient name, and recipient phone. API shipment creation is planned but inactive.
10. Ask payment method:
   - prepayment
   - full payment
   - cash on delivery
   Payment requisites can be shown from bot settings. Demo uses fake requisites until the user enters real details.
11. Show confirmation summary.
12. After confirmation, create the order and send the accepted-order template.

The flow must be business-type independent:

- Bakery uses tastes, weights, fillings, inscriptions, allergens.
- Workshop may use service category, object type, material, dimensions, deadline, pickup/delivery.
- Any business can replace steps, options, media, promotions, and templates without changing core code.

The bot should proactively offer:

- active promotions from `Promotions`;
- photo examples from `BotMediaAssets`;
- addons from `BotStepOptions` where `is_addon = true`;
- clarification questions when required fields are missing;
- manager handoff when the client asks for something outside the configured schema.

Confirmation text should include all selected values, for example:

```text
Перевірте замовлення:
Торт: Медовик
Вага: 2 кг
Дата: 20 травня
Отримання: Кур'єр
Оплата: Передоплата
Алергії: без горіхів
Додатки: напис, ягоди
Підтвердити замовлення?
```

## AI Usage Modes

The product has two AI modes.

### Economy Mode

Economy mode is the default mode.

Allowed:

- Parse client order text into structured order data.
- Ask clarifying questions.
- Show simple stock/product/order answers.
- Create manager handoff when confidence is low.

Not allowed:

- Directly change stock, production, pricing, purchases, or bot settings.
- Execute navigation/action commands like "open this order and change material".
- Voice control.
- Automatic multi-step analysis across modules.

### Full Assistant Mode

Full assistant mode is available only with an active subscription and must be enabled for the specific bot in `BotAssistantSettings`.

Allowed:

- Understand text and voice commands.
- Navigate modules: stock, orders, production, purchases, products, tech cards, bot settings, tasks, reports.
- Read module data and summarize it.
- Read product ingredients, recipes, tech cards, and user instructions.
- Analyze shortages, active orders, purchase needs, deadlines, and production load.
- Prepare actions for confirmation.
- Execute allowed actions after confirmation.
- Send messages through a connected bot channel when `allow_send_messages` is enabled.
- Change order statuses through the normal order state guard when `allow_order_status_change` is enabled.

Examples:

- "Відкрий склад і покажи дефіцит."
- "Зайди в замовлення ORD-123 і покажи матеріали."
- "Проаналізуй, що треба докупити сьогодні."
- "Створи закупку для всіх дефіцитних матеріалів."
- "Голосом: візьми замовлення ORD-123 в роботу."
- "Прочитай рецепт Chocolate Cake."
- "Зміни статус ORD-123 на Ready."
- "Відправ повідомлення chat 123456789: Замовлення готове."

Safety rules:

- Read-only actions may execute immediately.
- Mutating actions must require confirmation by default.
- Every AI action must be logged in `AiAssistantActions`.
- Voice commands must be transcribed and logged in `VoiceCommandLogs`.
- Full mode must check `SubscriptionStatus` before execution.
- Full mode must also check the current bot's `BotAssistantSettings`.
- Voice commands must be blocked when `allow_voice_control` is disabled for the bot.
- Message sending and order-status changes must be blocked unless explicitly enabled for the bot.
- If subscription is inactive, the system must return an upgrade message and keep economy mode available.
- AI assistant must not change code, repository files, schemas, prompts, environment variables, dependencies, or deployment settings.
- AI assistant may only perform actions that a normal authenticated user can perform through the business UI/API.
- Requests to edit code, alter the database schema, install packages, change `.env`, or deploy must be rejected and redirected to a developer workflow.

## Validation And Error Handling

Inventory operations must validate:

- material exists and is active
- unit is valid
- unit can be converted to material base unit
- quantity is positive for inbound/reserve/consume operations
- stock lot has enough remaining quantity
- reserved quantity cannot exceed lot remaining quantity
- consumed quantity cannot exceed reserved quantity
- manual override includes a reason
- purchase receipt writes lots and transactions

Failures must:

- return a safe Ukrainian user message
- create manager/debug details where useful
- create `FailedOperations` for retryable integration errors
- create `Alerts` or `Tasks` for critical stock situations

## Table UI And Keyboard Workflow

Managers must be able to work with table parts like in Excel:

- Add row.
- Copy row.
- Delete row with confirmation.
- Move through cells with arrows and Tab.
- Save current row with Enter.
- Add a new row with Ctrl+Enter.
- Cancel cell editing with Esc.
- Copy/paste tabular values where possible.
- Validate required fields after Enter and after action buttons.
- Highlight invalid cells and keep focus on the first invalid field.

Table UI validation must show a detailed Ukrainian instruction, not a generic error.

Example:

> Не заповнено поле "Назва матеріалу". Вкажіть коротку зрозумілу назву, наприклад "Цукор білий". Якщо матеріал вже існує, виберіть його зі списку.

## System Error Reporting

System errors must not crash the user flow.

Required behavior:

- Show the user: `Сталася технічна помилка. Звіт уже передано розробнику. Спробуйте ще раз або зверніться до менеджера.`
- Create a `UserFacingErrors` row.
- Create a `DeveloperAlerts` row with technical details.
- Create an `Alerts` row for manager visibility when severity is warning/critical.
- If GitHub reporting is configured, create a GitHub issue for the developer.

GitHub issue creation is optional at runtime and depends on configuration:

- `GITHUB_TOKEN`
- `GITHUB_REPO`, for example `owner/repo`

If GitHub is not configured, the system still stores the developer alert locally.

## Future Extensions

- Multi-warehouse stock transfers.
- Supplier price comparison.
- Automatic purchase orders.
- QR/barcode scanning.
- Mobile warehouse mode.
- Demand forecasting and AI shortage prediction.

## Контроль залишків і заявка на закупівлю

- У матеріалі зберігається `min_qty` - мінімальна кількість залишку на складі.
- Сервіс планування закупівель читає активні замовлення в горизонті `procurement_planning_horizon_days`, за замовчуванням 7 днів.
- Режим можна вимкнути через `procurement_control_enabled`, щоб тимчасові або неактуальні замовлення не створювали шум.
- Для кожного матеріалу розраховується: поточний залишок, резерв, доступно, потрібно на замовлення в горизонті, зарезервовано під ці замовлення, дефіцит, нижче мінімуму, рекомендовано купити.
- Якщо замовлення ще не зарезервоване, але доступного залишку вистачає, система показує `Потрібно зарезервувати`, але не додає позицію в автозаявку на закупівлю.
- Статуси плану: `Немає на складі`, `Не вистачає на замовлення`, `Потрібно зарезервувати`, `Нижче мінімуму`, `Достатньо`.
- З плану можна створити чернетку `PurchaseRequests` з рядками `PurchaseRequestItems`; ціна береться з середньозваженої або базової ціни матеріалу.
- Demo seed навмисно містить матеріали з різними станами: достатньо, нижче мінімуму, повністю відсутні та такі, що стають нижче мінімуму після резервування тестового замовлення. Це дає швидкий ручний сценарій перевірки плану закупівель і створення заявки.
