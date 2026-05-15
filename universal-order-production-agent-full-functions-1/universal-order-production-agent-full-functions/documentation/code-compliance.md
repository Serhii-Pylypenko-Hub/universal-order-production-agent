# Вимоги до коду з ТЗ

Цей файл фіксує правила, яких треба дотримуватися при кожній новій зміні.

Базове джерело правил: `docs/CODE_REQUIREMENTS.md`.

## Основний принцип архітектури

```text
UI / Telegram / n8n
-> service function
-> Data Access Layer
-> storage adapter
```

Не можна переносити бізнес-логіку в UI, n8n nodes або ad-hoc scripts.

## Правила для веб-шару

- UI не читає і не пише таблиці напряму.
- API routes мають бути тонкими.
- Бізнес-операції викликаються через існуючі сервіси.
- Dashboard читає дані через `rowRepository`.
- Workspace setup викликає `initializeWorkspace()`.
- Health status викликає `healthCheckWorkspace()`.
- Конфігурація ресурсів проходить через `envConfig.js`.
- Auth/session логіка ізольована в `authStore.js`.

## Що треба оновлювати з кожною фічею

- Тести.
- Документацію.
- `CHANGELOG.md`.
- `.env.example`, якщо з'явилися нові env-змінні.
- Schema files, якщо змінилася структура workspace даних.

## Error handling

- Користувачу показуємо безпечну і зрозумілу помилку.
- Технічні деталі не мають витікати в UI.
- Для зовнішніх API збоїв production-flow має створювати `FailedOperations` або `UserFacingErrors`.
- Критичні збої мають перетворюватися в manager task або manager alert.

## Дані і безпека

- Паролі не можна зберігати plain text.
- Secret-поля не можна повертати в UI у відкритому вигляді.
- `.env`, `data/web_auth.json`, credentials і local tools не мають потрапляти в git.
- Для webhook треба перевіряти secret token.
- Для подій із `event_id` треба використовувати idempotency.

## Поточна відповідність web onboarding

| Вимога | Стан |
| --- | --- |
| Бізнес-логіка не в UI | Виконано |
| Table access через Data Layer | Виконано для dashboard |
| Password hash | Виконано |
| Secret masking | Виконано |
| Tests | Є `tests/runWebTests.js` |
| Docs | Є `documentation/web-onboarding.md` |
| Changelog | Оновлюється разом із фічею |

## Наступні production gaps

- Multi-tenancy: `tenant_id` у даних і окрема конфігурація ресурсів на tenant.
- Role-based access control.
- Audit log для змін конфігурації в production mode.
- Password reset.
- HTTPS deployment profile.
- CSRF protection для form/API requests у production.
