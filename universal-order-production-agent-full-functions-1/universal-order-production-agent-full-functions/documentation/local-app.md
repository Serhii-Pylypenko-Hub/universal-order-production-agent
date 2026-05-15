# Локальний застосунок

## Ідея

Проєкт можна використовувати як локальний застосунок: користувач розпаковує папку, запускає файл старту і працює через браузер за адресою `http://localhost:3000`.

Це не публічний сайт. Усі дані лишаються на комп'ютері користувача, поки він не підключить Google Sheets або інші зовнішні ресурси.

## Запуск для користувача

Найпростіше:

```text
start-local.bat
```

Або з PowerShell:

```powershell
.\start-local.ps1
```

## Пакет для передачі користувачу

Для створення готового архіву:

```powershell
.\build-local-release.ps1
```

Скрипт створить:

```text
releases/AI-Operations-Local-App/
releases/AI-Operations-Local-App.zip
```

Користувачу треба передати саме zip-архів. Усередині є файл `START_HERE.txt` з простою інструкцією.

У release-пакет входять тільки потрібні для запуску файли:

- portable Node.js у `.tools/node`;
- web/backend код у `app`;
- local data у `data`;
- schemas/templates;
- документація;
- `start-local.*` і `stop-local.*`;
- `.env`, створений з `.env.example`.

У release-пакет не входять `.git`, GitHub config, tests, developer logs і службові файли розробки.

Скрипт:

1. Перевіряє локальний Node.js у `.tools/node`.
2. Стартує web server.
3. Записує PID у `.local/server.pid`.
4. Пише logs у `.local/server.out.log` і `.local/server.err.log`.
5. Відкриває браузер на `http://localhost:3000`.

## Зупинка

Найпростіше:

```text
stop-local.bat
```

Або з PowerShell:

```powershell
.\stop-local.ps1
```

Скрипт читає `.local/server.pid`, зупиняє тільки цей процес і прибирає PID file.

## Тест без відкриття браузера

Для технічної перевірки:

```powershell
.\start-local.ps1 -NoBrowser
```

Після цього перевірити:

```powershell
Invoke-WebRequest http://localhost:3000 -UseBasicParsing
```

Потім зупинити:

```powershell
.\stop-local.ps1
```

## Файли

| Файл | Для чого |
| --- | --- |
| `start-local.bat` | Запуск для користувача подвійним кліком |
| `start-local.ps1` | Основна PowerShell логіка запуску |
| `start-bot-local.bat` | Запуск Telegram-бота подвійним кліком |
| `start-bot-local.ps1` | Основна PowerShell логіка запуску бота |
| `stop-local.bat` | Зупинка подвійним кліком |
| `stop-local.ps1` | Основна PowerShell логіка зупинки |
| `stop-bot-local.bat` | Зупинка Telegram-бота подвійним кліком |
| `stop-bot-local.ps1` | Основна PowerShell логіка зупинки бота |
| `.local/server.pid` | ID запущеного server process |
| `.local/server.out.log` | Звичайний output локального сервера |
| `.local/server.err.log` | Помилки локального сервера |

## Обмеження

- Потрібен Windows і PowerShell.
- Порт `3000` має бути вільний або треба запускати з іншим портом: `.\start-local.ps1 -Port 3001`.
- Якщо користувач видалить `.tools/node`, треба або повернути portable Node, або встановити Node.js 18+ системно.
