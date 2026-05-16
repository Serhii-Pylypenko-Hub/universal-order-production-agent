export class ValidationError extends Error {
  constructor(message, errors = []) {
    super(message);
    this.name = "ValidationError";
    this.code = "VALIDATION_ERROR";
    this.errors = errors;
  }
}

function isEmpty(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function fieldLabel(field) {
  return field.label || field.label_uk || field.name;
}

function instructionFor(field, type) {
  if (field.instruction_uk) return field.instruction_uk;
  const label = fieldLabel(field);
  if (type === "required") return `Заповніть поле "${label}". Це обов'язкове поле для продовження.`;
  if (type === "positive_number") return `У полі "${label}" вкажіть число більше нуля.`;
  if (type === "number") return `У полі "${label}" вкажіть коректне число.`;
  if (type === "invalid") return `Поле "${label}" заповнене некоректно. Перевірте формат і виправте значення.`;
  return `Перевірте поле "${label}" і виправте значення.`;
}

export function validateRequiredFields(data, fields) {
  const errors = [];
  for (const field of fields) {
    if (isEmpty(data[field.name])) {
      errors.push({
        field: field.name,
        label: fieldLabel(field),
        type: "required",
        category: "missing_required",
        instruction: instructionFor(field, "required")
      });
    }
  }
  return errors;
}

export function validateNumberFields(data, fields) {
  const errors = [];
  for (const field of fields) {
    if (isEmpty(data[field.name]) && field.required !== true) continue;
    const value = Number(data[field.name]);
    if (!Number.isFinite(value)) {
      errors.push({
        field: field.name,
        label: fieldLabel(field),
        type: "number",
        category: "invalid_value",
        instruction: instructionFor(field, "number")
      });
      continue;
    }
    if (field.positive === true && value <= 0) {
      errors.push({
        field: field.name,
        label: fieldLabel(field),
        type: "positive_number",
        category: "invalid_value",
        instruction: instructionFor(field, "positive_number")
      });
    }
  }
  return errors;
}

export function validatePatternFields(data, fields) {
  const errors = [];
  for (const field of fields) {
    if (isEmpty(data[field.name]) && field.required !== true) continue;
    const value = String(data[field.name] || "").trim();
    const pattern = field.pattern instanceof RegExp ? field.pattern : new RegExp(field.pattern);
    if (!pattern.test(value)) {
      errors.push({
        field: field.name,
        label: fieldLabel(field),
        type: "invalid",
        category: "invalid_value",
        instruction: instructionFor(field, "invalid")
      });
    }
  }
  return errors;
}

export function assertValid(entityName, data, rules = {}) {
  const errors = [
    ...validateRequiredFields(data, rules.required || []),
    ...validateNumberFields(data, rules.numbers || []),
    ...validatePatternFields(data, rules.patterns || [])
  ];

  if (errors.length) {
    const message = [
      `Не вдалося виконати дію "${entityName}". Перевірте дані:`,
      ...errors.map(error => `- ${error.instruction}`)
    ].join("\n");
    throw new ValidationError(message, errors);
  }

  return { ok: true };
}

export function formatValidationInstructions(error) {
  if (!error?.errors?.length) {
    return "Перевірте введені дані та спробуйте ще раз.";
  }
  return error.errors.map(item => item.instruction).join("\n");
}
