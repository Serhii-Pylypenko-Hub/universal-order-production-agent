import { appendRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { logActivity } from "../audit/auditService.js";
import { createDeveloperAlert } from "./developerAlertService.js";
import { formatValidationInstructions } from "./validationService.js";

const DEFAULT_MESSAGES = {
  AI_ERROR: "Вибачте, зараз не вдалося обробити повідомлення автоматично. Я передав запит менеджеру.",
  GOOGLE_SHEETS_ERROR: "Виникла технічна проблема зі збереженням даних. Менеджер уже отримає сповіщення.",
  CALENDAR_ERROR: "Не вдалося автоматично перевірити календар. Менеджер уточнить доступний час.",
  VALIDATION_ERROR: "Потрібно уточнити дані. Перевірте підказки та заповніть обов'язкові поля.",
  PRICE_BELOW_COST: "Увага: ціна нижча за собівартість. Потрібне підтвердження менеджера.",
  ORDER_PROCESSING_FAILED: "Не вдалося завершити створення замовлення. Звіт уже передано розробнику, менеджер допоможе продовжити.",
  UNKNOWN_ERROR: "Сталася технічна помилка. Звіт уже передано розробнику. Спробуйте ще раз або зверніться до менеджера."
};

function normalizeInput(input, detailsArg = {}) {
  if (typeof input === "string") {
    return { operationId: "", code: input, details: detailsArg, severity: "WARNING" };
  }
  return input || {};
}

export function createUserFacingError(input = {}, detailsArg = {}) {
  const { operationId = "", code = "UNKNOWN_ERROR", details = {}, severity = "WARNING" } = normalizeInput(input, detailsArg);
  const userMessage = code === "VALIDATION_ERROR" && details.validation_error
    ? formatValidationInstructions(details.validation_error)
    : DEFAULT_MESSAGES[code] || DEFAULT_MESSAGES.UNKNOWN_ERROR;
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

  if (severity === "CRITICAL") {
    appendRow("Alerts", {
      alert_id: id("ALERT"),
      type: "SystemError",
      entity_type: "UserFacingErrors",
      entity_id: row.error_id,
      severity,
      message: userMessage,
      status: "Open",
      created_at: nowIso(),
      resolved_at: ""
    });
    createDeveloperAlert({
      source: operationId || code,
      severity,
      title: code,
      userMessage,
      technicalDetails: details
    }).catch(() => {});
  }

  return row;
}

export function safeExecute(operationName, fn, fallbackCode = "UNKNOWN_ERROR") {
  try {
    return { ok: true, result: fn() };
  } catch (error) {
    const err = createUserFacingError({
      operationId: operationName,
      code: error.code || fallbackCode,
      details: { message: error.message, stack: error.stack, validation_error: error },
      severity: "CRITICAL"
    });
    return { ok: false, error: err };
  }
}

export async function safeExecuteAsync(operationName, fn, fallbackCode = "UNKNOWN_ERROR") {
  try {
    return { ok: true, result: await fn() };
  } catch (error) {
    const err = createUserFacingError({
      operationId: operationName,
      code: error.code || fallbackCode,
      details: { message: error.message, stack: error.stack, validation_error: error },
      severity: "CRITICAL"
    });
    return { ok: false, error: err };
  }
}
