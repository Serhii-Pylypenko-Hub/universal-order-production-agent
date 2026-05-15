import { appendRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { logActivity } from "../audit/auditService.js";

const DEFAULT_MESSAGES = {
  AI_ERROR: "Вибачте, зараз не вдалося обробити повідомлення автоматично. Я передав запит менеджеру.",
  GOOGLE_SHEETS_ERROR: "Виникла технічна проблема із збереженням даних. Менеджер уже отримає сповіщення.",
  CALENDAR_ERROR: "Не вдалося автоматично перевірити календар. Менеджер уточнить доступний час.",
  VALIDATION_ERROR: "Потрібно уточнити дані замовлення. Менеджер або бот поставить додаткове питання.",
  PRICE_BELOW_COST: "Увага: ціна нижча за собівартість. Потрібне підтвердження менеджера.",
  UNKNOWN_ERROR: "Сталася технічна помилка. Запит передано менеджеру."
};

export function createUserFacingError({ operationId = "", code = "UNKNOWN_ERROR", details = {}, severity = "WARNING" }) {
  const userMessage = DEFAULT_MESSAGES[code] || DEFAULT_MESSAGES.UNKNOWN_ERROR;
  const managerMessage = `[${code}] ${JSON.stringify(details)}`;
  const row = appendRow("UserFacingErrors", {
    error_id: id("ERR"),
    operation_id: operationId,
    user_message: userMessage,
    manager_message: managerMessage,
    severity,
    status: "Open",
    created_at: nowIso(),
    resolved_at: ""
  });
  logActivity({ entityType: "Error", entityId: row.error_id, action: "createUserFacingError", newValue: row, source: "system" });
  return row;
}

export function safeExecute(operationName, fn, fallbackCode = "UNKNOWN_ERROR") {
  try {
    return { ok: true, result: fn() };
  } catch (error) {
    const err = createUserFacingError({
      operationId: operationName,
      code: error.code || fallbackCode,
      details: { message: error.message, stack: error.stack },
      severity: "CRITICAL"
    });
    return { ok: false, error: err };
  }
}
