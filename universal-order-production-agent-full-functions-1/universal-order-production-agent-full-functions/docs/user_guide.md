# User Guide — Working via Telegram

## Client Flow (Order via Telegram)

1. **Send a message** to the bot describing your order:
   ```
   Хочу замовити торт "Медовик" 2кг на 15 квітня
   ```

2. **Bot clarifies** if details are missing:
   ```
   Чи є алергії або обмеження? Який декор бажаєте?
   ```

3. **Confirmation is sent** automatically:
   ```
   ✅ Замовлення ORD-001 прийнято
   💰 Ціна: 1200 грн
   📅 Готовність: 14 квітня
   ```

4. **Status updates** arrive when order is ready or shipped.

---

## Manager Commands

### Orders
| Command | Description |
|---------|-------------|
| `/orders` | List all active orders |
| `/order ORD-001` | Show order details with action buttons |
| `/change_status ORD-001 Paid` | Change order status |
| `/cancel ORD-001` | Cancel order (releases stock) |
| `/start_production ORD-001` | Move to InProduction (consumes stock) |
| `/ready ORD-001` | Mark as Ready for pickup/shipping |
| `/pickup ORD-001` | Confirm pickup |
| `/ship ORD-001 1234567890 NovaPoshta` | Mark as shipped with tracking |

### Payments
| Command | Description |
|---------|-------------|
| `/confirm_payment ORD-001 1200 cash` | Confirm full payment |
| `/confirm_payment ORD-001 600 transfer` | Confirm partial payment |

### Stock
| Command | Description |
|---------|-------------|
| `/stock` | View all stock levels |
| `/low_stock` | View critically low stock |
| `/add_stock COMP-001 500` | Add stock for a component |

### Purchases
| Command | Description |
|---------|-------------|
| `/purchases` | List active purchase requests |
| `/receive_purchase PR-001` | Confirm receipt, update stock |

### Calendar
| Command | Description |
|---------|-------------|
| `/calendar` | View next 14 days of production |
| `/block_time 2024-04-15 4 Maintenance` | Block time for maintenance |

### Pricing
| Command | Description |
|---------|-------------|
| `/price_review` | Show orders needing price approval |
| `/approve_price ORD-001` | Accept recommended new price |
| `/keep_price ORD-001` | Keep old price despite cost change |

### Clients & Handoffs
| Command | Description |
|---------|-------------|
| `/client Марія` | Search client by name or contact |
| `/handoffs` | View pending AI handoffs |
| `/resolve_handoff HO-001 Done` | Mark handoff as resolved |

### System
| Command | Description |
|---------|-------------|
| `/setup_check` | Full workspace health check |
| `/deadline_check` | Run manual deadline check |
| `/failed_ops` | View failed operations summary |
| `/settings` | View all system settings |
| `/set daily_capacity_hours 10` | Change a setting |
| `/menu` | Show main menu with buttons |

---

## Tips

- Send `/menu` to see the main button panel at any time.
- Urgent orders: include "терміново" in your message — it triggers an immediate manager alert.
- The system automatically creates purchase requests when stock is low.
- The deadline monitor runs every hour and alerts the manager about overdue orders.
