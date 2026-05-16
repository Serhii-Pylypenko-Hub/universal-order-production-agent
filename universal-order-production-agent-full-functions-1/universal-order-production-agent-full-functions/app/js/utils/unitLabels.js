const UNIT_LABELS_UK = {
  kg: "кг",
  g: "г",
  l: "л",
  ml: "мл",
  pcs: "шт",
  pack: "уп.",
  box: "кор."
};

export function unitLabel(unit) {
  return UNIT_LABELS_UK[String(unit || "")] || unit || "";
}

export function formatQty(value, unit) {
  return `${value} ${unitLabel(unit)}`.trim();
}
