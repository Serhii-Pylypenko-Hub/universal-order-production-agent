import { appendRow, findOne, findRows } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { validateUnit } from "../utils/unitConverter.js";
import { logActivity } from "../audit/auditService.js";

export function normalizeMaterialName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

export function findMaterialByName(name) {
  const normalized = normalizeMaterialName(name);
  if (!normalized) return null;
  return findOne("Components", component =>
    normalizeMaterialName(component.normalized_name || component.name) === normalized
  );
}

export function findSimilarMaterials(name) {
  const normalized = normalizeMaterialName(name);
  if (!normalized) return [];
  const words = normalized.split(" ").filter(Boolean);
  return findRows("Components", component => {
    const existing = normalizeMaterialName(component.normalized_name || component.name);
    return existing.includes(normalized) ||
      normalized.includes(existing) ||
      words.some(word => word.length >= 3 && existing.includes(word));
  });
}

export function createMaterial(input) {
  const name = String(input.name || "").trim();
  if (!name) throw new Error("Material name is required.");
  if (!validateUnit(input.unit)) throw new Error(`Invalid material unit: ${input.unit}`);

  const existing = findMaterialByName(name);
  if (existing) {
    return { created: false, material: existing, similar: [existing] };
  }

  const similar = findSimilarMaterials(name);
  if (similar.length && input.force !== true) {
    return { created: false, material: null, similar };
  }

  const material = appendRow("Components", {
    component_id: id("COMP"),
    name,
    normalized_name: normalizeMaterialName(name),
    unit: input.unit,
    unit_cost: Number(input.unit_cost || 0),
    min_qty: Number(input.min_qty || 0),
    category_id: input.category_id || "",
    description: input.description || "",
    default_supplier_id: input.default_supplier_id || "",
    allow_standalone_sale: Boolean(input.allow_standalone_sale),
    barcode: input.barcode || "",
    qr_code: input.qr_code || "",
    is_active: input.is_active ?? true
  });

  logActivity({ entityType: "Component", entityId: material.component_id, action: "createMaterial", newValue: material });
  return { created: true, material, similar: [] };
}

export function ensureDefaultWarehouse() {
  let warehouse = findOne("Warehouses", row => String(row.is_default) !== "false");
  if (!warehouse) {
    warehouse = appendRow("Warehouses", {
      warehouse_id: "WH-DEFAULT",
      name: "Основний склад",
      description: "Склад за замовчуванням",
      is_default: true,
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }
  return warehouse;
}
