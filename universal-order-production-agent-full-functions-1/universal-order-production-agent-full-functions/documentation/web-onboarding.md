# Веб-кабінет і onboarding

## Призначення

Веб-кабінет потрібен, щоб користувач міг зайти за посиланням, створити акаунт, підключити необхідні ресурси і запустити систему без ручного редагування файлів.

Поточна реалізація є MVP onboarding layer. Вона не замінює Telegram/n8n бізнес-процеси, а допомагає налаштувати середовище і бачити стан workspace.

## Запуск

У PowerShell з кореня проєкту:

```powershell
.\dev.ps1 web:start
```

Після запуску відкрити:

```text
http://localhost:3000
```

## Що вже працює

- Реєстрація користувача: ім'я, пошта, пароль.
- Логін і вихід.
- Українська мова за замовчуванням.
- Перемикач інтерфейсу `UA / EN`.
- Cookie-сесія на 7 днів.
- Пароль зберігається як PBKDF2 hash із salt.
- Форма підключення ресурсів.
- Підсвітка обов'язкових полів для демо з Telegram та AI.
- Запис конфігурації у `.env`.
- Запуск `initializeWorkspace()` з шаблоном `cakes` або `empty`.
- Dashboard зі станом workspace.
- Перегляд demo-продуктів і тестових залишків.
- Health check для Telegram, AI, Google Sheets, Google Calendar і локальних даних.

## Підключення ресурсів

Форма ресурсів зберігає такі значення:

| Поле | Для чого |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | Токен бота з BotFather |
| `MANAGER_CHAT_ID` | Telegram chat id менеджера |
| `TELEGRAM_WEBHOOK_SECRET` | Secret token для webhook mode |
| `BOT_MODE` | `polling` для dev або `webhook` для production |
| `WEBHOOK_URL` | Публічний HTTPS webhook URL |
| `OPENROUTER_API_KEY` | Ключ для AI parsing |
| `AI_MODEL` | Назва AI моделі |
| `GOOGLE_SHEETS_ID` | ID Google Spreadsheet |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Base64 service account JSON |
| `GOOGLE_SERVICE_ACCOUNT_KEY_FILE` | Альтернатива JSON: шлях до credentials file |
| `GOOGLE_CALENDAR_ID` | Google Calendar ID |
| `LOCAL_DATA_PATH` | Локальний JSON workspace |

Secret-поля після збереження не повертаються у відкритому вигляді в UI. Інтерфейс показує тільки факт, що значення збережене.

## Мінімум для демо

Для локального демо без реальних інтеграцій користувач може нічого не заповнювати в ресурсах і натиснути `Demo cakes`.

Для демо з Telegram та AI потрібно заповнити підсвічені поля:

- `TELEGRAM_BOT_TOKEN`
- `MANAGER_CHAT_ID`
- `OPENROUTER_API_KEY`

Інші поля потрібні для production/webhook/Google integrations, але не блокують перший demo запуск.

Після збереження цих трьох полів у блоці workspace має бути статус:

```text
Telegram demo: готове до запуску
```

Якщо статус просить заповнити підсвічені поля, кнопка `Запустити бота` у web не зможе запустити Telegram-бота. Запасний `start-bot-local.bat` також перевіряє `.env` перед запуском і показує список порожніх обов'язкових полів.

## Запуск Telegram-бота з web

Після збереження ресурсів і запуску demo workspace відкрийте `Операції` -> `Керування ботом` і натисніть `Запустити бота`.

Web-сервер запускає локальний polling-процес бота, записує PID у `.local/bot.pid`, а логи у:

```text
.local/bot.out.log
.local/bot.err.log
```

Кнопка `Зупинити` завершує цей локальний процес. Batch-файли `START_TELEGRAM_BOT.bat` і `STOP_TELEGRAM_BOT.bat` лишаються запасним способом.

Для постійної локальної роботи після перевірки ручного запуску натисніть у web `Увімкнути постійно`. Запасний спосіб через папку:

```text
install-bot-autostart.bat
```

Скрипт створює Windows Task Scheduler задачу `AIOperationsTelegramBot`. Вона запускатиме watchdog при вході користувача в Windows. Watchdog піднімає Telegram-бота і перезапускає його, якщо процес зупинився. У web це вимикається кнопкою `Вимкнути постійно`. Запасний спосіб:

```text
uninstall-bot-autostart.bat
```

Якщо автозапуск встановлений, web-кнопка `Зупинити` зупиняє поточний бот і watchdog-процес. Після наступного входу в Windows задача автозапуску знову підніме watchdog. Для повного вимкнення натисніть `Вимкнути постійно`.

## Як писати боту для замовлення

Після збереження ресурсів, запуску demo workspace і запуску бота з web у Telegram можна написати `/start`.

Клієнтський bot має показати меню:

- Продукти
- Тестові залишки
- Приклад замовлення

Клієнт також може написати просте замовлення:

```text
Хочу шоколадний торт 2 кг на завтра, без горіхів
```

Клієнтський діалог обмежений темою тортів і demo-продуктів. Якщо клієнт пише не по темі, бот має ввічливо повернути розмову до замовлення торта. Якщо за 10 відповідей бота не вдалося зібрати повне замовлення, бот ввічливо завершує розмову і пропонує почати заново через `/start`.

Для створення замовлення бот збирає мінімум:

- продукт;
- вагу або кількість;
- бажану дату;
- алергії/обмеження, якщо є;
- побажання або напис, якщо є.

Або:

```text
Потрібен медовик 1.5 кг на п'ятницю
```

Demo-продукти:

- Chocolate Cake
- Honey Cake
- Berry Cheesecake
- Napoleon Cake
- Carrot Cake
- Cupcake Box

Demo-добавки для Chocolate Cake:

- Add raspberry
- Remove nuts
- Add inscription

У веб-кабінеті також є кнопка `Створити тестове замовлення`. Вона створює demo-order через `OrderService`, резервує склад, планує виробництво і показує замовлення в dashboard.

## Менеджерські команди з ТЗ

Якщо Telegram chat id збігається з `MANAGER_CHAT_ID`, бот працює як менеджерський. Основні команди:

- `/menu`
- `/orders`
- `/order ORD-001`
- `/products`
- `/components`
- `/recipe Chocolate Cake`
- `/recipe PROD-001`
- `/change_status ORD-001 Paid`
- `/cancel ORD-001`
- `/start_production ORD-001`
- `/ready ORD-001`
- `/pickup ORD-001`
- `/ship ORD-001 1234567890 NovaPoshta`
- `/confirm_payment ORD-001 1200 cash`
- `/stock`
- `/low_stock`
- `/add_stock COMP-001 500`
- `/purchases`
- `/receive_purchase PR-001`
- `/calendar`
- `/block_time 2026-05-20 4 Maintenance`
- `/price_review`
- `/approve_price ORD-001`
- `/keep_price ORD-001`
- `/client Ім'я`
- `/handoffs`
- `/resolve_handoff HO-001 Done`
- `/setup_check`
- `/deadline_check`
- `/failed_ops`
- `/settings`
- `/set daily_capacity_hours 10`

### Типовий тестовий сценарій менеджера

1. Подивитися замовлення:

```text
/orders
```

2. Подивитися деталі:

```text
/order ORD-XXXX
```

3. Змінити статуси по lifecycle:

```text
/start_production ORD-XXXX
/ready ORD-XXXX
/pickup ORD-XXXX
```

4. Подивитися склад:

```text
/stock
```

5. Додати прихід матеріалу:

```text
/add_stock COMP-XXXX 5
```

6. Подивитися продукти і рецепти:

```text
/products
/recipe Chocolate Cake
```

## Файли реалізації

| Файл | Відповідальність |
| --- | --- |
| `app/js/web/server.js` | HTTP server, API routes, static files |
| `app/js/web/authStore.js` | Реєстрація, login, hash password, sessions |
| `app/js/web/envConfig.js` | Читання і запис `.env`, маскування секретів |
| `app/js/web/dashboardService.js` | Дані dashboard через Data Layer |
| `app/web/index.html` | Розмітка веб-кабінету |
| `app/web/app.js` | Browser-side API calls і rendering |
| `app/web/styles.css` | UI стилі |
| `tests/runWebTests.js` | Тести auth/env web-шару |

## API routes

| Route | Method | Дія |
| --- | --- | --- |
| `/api/auth/register` | POST | Створити користувача і сесію |
| `/api/auth/login` | POST | Увійти і створити сесію |
| `/api/auth/logout` | POST | Видалити сесію |
| `/api/me` | GET | Поточний користувач |
| `/api/connections` | GET | Стан підключень без відкриття секретів |
| `/api/connections` | POST | Зберегти `.env` конфігурацію |
| `/api/workspace/setup` | POST | Запустити workspace setup |
| `/api/dashboard` | GET | Health і операційний dashboard |

## Перевірка

```powershell
.\dev.ps1 test
.\dev.ps1 test:web
```

Очікуваний результат:

```text
All local MVP foundation tests passed.
Web onboarding tests passed.
```

## Обмеження MVP

- Користувачі поки зберігаються локально в `data/web_auth.json`.
- Немає multi-tenant ізоляції workspace по користувачах.
- Немає recovery flow для забутого пароля.
- Немає production HTTPS/TLS шару.
- Немає ролей `owner`, `manager`, `operator`.
- Переклад поки покриває onboarding/dashboard UI, але не всі системні повідомлення backend.

Ці речі треба додавати перед реальним SaaS production.
