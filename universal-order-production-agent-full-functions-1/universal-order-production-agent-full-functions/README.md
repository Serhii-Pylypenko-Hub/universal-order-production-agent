# Universal AI Order & Production Assistant

MVP локального AI-асистента для прийому замовлень, виробництва, залишків, закупівель і менеджерського контролю.

Поточне демо налаштоване під український ринок і сценарій кондитерської: клієнт пише Telegram-боту, бот збирає замовлення на торт, враховує побажання до рецепта, створює замовлення, резервує матеріали та надсилає менеджеру сповіщення.

## Що вже є

- Веб-кабінет для реєстрації, входу та налаштування ресурсів.
- Український інтерфейс з перемикачем UA / EN.
- Локальний запуск на Windows без встановлення серверу.
- Telegram-бот у polling mode для тестування.
- Demo cakes workspace з тестовими продуктами, рецептами, залишками й замовленнями.
- AI-розбір клієнтських повідомлень через OpenRouter.
- Клієнтське меню `/start`: продукти, тестові залишки, приклади замовлень.
- Створення замовлень з Telegram.
- Побажання до рецепта: більше шоколаду, додати горіхи, без горіхів, більше ягід, напис.
- Розрахунок BOM, собівартості, ціни, знижок і робочих годин.
- Сповіщення менеджеру про нове замовлення.
- Запит клієнта на зворотний зв'язок із менеджером.
- Менеджерські команди для замовлень, рецептів, матеріалів, залишків, статусів, знижок і ручної ціни.
- Документація в папці `documentation/`.

## Швидкий запуск для тестувальника

Для користувача без програмування основна інструкція тут:

```text
BOT_TEST_INSTRUCTION_UA.txt
```

Коротко:

1. Запустити веб-кабінет:

```text
START_APP.bat
```

2. Відкрити:

```text
http://localhost:3000
```

3. Зареєструвати користувача.

4. Заповнити 3 поля для Telegram demo:

```text
TELEGRAM_BOT_TOKEN
MANAGER_CHAT_ID
OPENROUTER_API_KEY
```

5. Натиснути `Demo cakes`.

6. Запустити Telegram-бота:

```text
START_TELEGRAM_BOT.bat
```

7. У Telegram написати боту:

```text
/start
```

Приклад замовлення:

```text
Хочу шоколадний торт 2 кг на завтра, більше шоколаду і без горіхів
```

## Менеджерські команди

Писати їх треба з Telegram-акаунта, chat id якого вказаний у `MANAGER_CHAT_ID`.

```text
/orders
/order ORD-XXXX
/products
/components
/recipe Chocolate Cake
/stock
/ready ORD-XXXX
/pickup ORD-XXXX
```

Знижки:

```text
/discount_over_amount 1500 10
/discount_every_n 10 15
/discounts
/discount_disable DISC-XXXX
```

Ручна ціна:

```text
/set_order_price ORD-XXXX 1200 індивідуальна домовленість
```

## Запуск для розробника

```bash
npm install
npm run setup:demo
npm run health
npm run demo:order
npm test
```

Запуск web server:

```bash
npm run web:start
```

Відкрити:

```text
http://localhost:3000
```

## Архітектура

Бізнес-логіка винесена в JS services. Telegram, n8n або web layer мають викликати сервісні функції, а не працювати напряму з таблицями.

Базовий потік:

```text
Telegram / Web / n8n -> JS business services -> Data Layer -> Local JSON / Google Sheets
```

Для локального MVP використовується `LocalJsonStore`. Пізніше його можна замінити на `GoogleSheetsStore` без переписування бізнес-логіки.

## Важливі файли

- `BOT_TEST_INSTRUCTION_UA.txt` - проста інструкція для тестувальника.
- `START_APP.bat` - запуск веб-кабінету.
- `START_TELEGRAM_BOT.bat` - запуск Telegram-бота.
- `STOP_APP.bat` - зупинка веб-кабінету.
- `STOP_TELEGRAM_BOT.bat` - зупинка Telegram-бота.
- `documentation/telegram-cakes-demo.md` - сценарії тестування Telegram demo.
- `documentation/web-onboarding.md` - опис web onboarding.
- `templates/cakes/demo_data.json` - шаблон demo cakes.
- `data/local_workspace.json` - локальні тестові дані workspace.

## Безпека даних

Файл `.env`, локальні логи, release-архіви, web auth storage і secret json файли ігноруються через `.gitignore`.

Не комітьте реальні токени, API keys або приватні credentials у репозиторій.

## Статус

Це MVP/demo-версія для локального тестування. Вона ще не є публічним production-сайтом в інтернеті.
