# Git Workflow

Ця інструкція описує, як безпечно вести зміни в репозиторії.

## Перед початком роботи

1. Перевірте стан файлів:

```bash
git status --short
```

2. Не видаляйте і не відкочуйте чужі зміни без явного рішення.
3. Для задач по складу, виробництву, ботах або AI оновлюйте разом код, схему, тести й документацію.

## Гілки

Рекомендований формат назв:

- `feature/inventory-fifo`
- `feature/bot-full-assistant`
- `fix/validation-connections`
- `docs/user-guide-hotkeys`

## Коміти

Коміт має описувати одну логічну зміну.

Приклади:

```bash
git add app docs schemas tests
git commit -m "Add full assistant bot permissions"
```

```bash
git commit -m "Document user hotkeys and help search"
```

## Перед pull request

Запустіть перевірки:

```bash
.tools/node/node.exe tests/runLocalTests.js
.tools/node/node.exe tests/runWebTests.js
```

Перевірте синтаксис JS:

```bash
.tools/node/node.exe --check app/web/app.js
```

Для повної локальної перевірки всіх JS-файлів:

```powershell
$files = Get-ChildItem app,tests -Filter *.js -Recurse | Select-Object -ExpandProperty FullName
foreach ($file in $files) { .tools\node\node.exe --check $file; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } }
```

## Pull Request

У PR вкажіть:

- що змінено;
- які модулі зачеплено;
- чи змінювалась схема;
- які тести запущено;
- чи оновлено інструкцію користувача.

## Заборонено для AI-асистента

Full Assistant у продукті не має права:

- змінювати код;
- редагувати файли репозиторію;
- змінювати схему напряму;
- міняти `.env`;
- встановлювати залежності;
- робити деплой.

Такі дії виконує тільки розробник через Git workflow.

## Обов'язковий чекліст перед merge у main

Перед merge у `main` потрібно:

1. Перевірити `git status --short`.
2. Запустити доступні тести або зафіксувати, чому тест не запускався в поточному середовищі.
3. Перевірити, що README, ТЗ, інструкція користувача і changelog описують поточний стан.
4. Переконатися, що `.env`, локальні логи, секрети, release-архіви і приватні credentials не потрапили в commit.
5. Для наступних функціональних доробок web пройти всі вкладки: `Огляд`, `Календар`, `Залишки`, `Надходження`, `Закупівлі`, `Виробництво`, `Техкарти`, `Бот`, `Платежі`, `AI`, `Налаштування`.
6. Для кожної вкладки перевірити: основна дія першою, довідники тільки за потреби, українська валідація активних полів, успішне збереження, системна помилка, planned-блоки без збереження неповних даних.
