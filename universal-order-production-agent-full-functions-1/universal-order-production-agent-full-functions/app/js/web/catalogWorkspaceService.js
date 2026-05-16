import { appendRow, findOne, getRows } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { assertValid } from "../errors/validationService.js";
import { logActivity } from "../audit/auditService.js";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function getCatalogWorkspace() {
  const products = getRows("Products");
  const components = getRows("Components");
  const techCards = getRows("ProductComponents");
  const componentById = new Map(components.map(component => [component.component_id, component]));

  return {
    products: products.map(product => ({
      ...product,
      tech_card_items: techCards
        .filter(row => row.product_id === product.product_id)
        .map(row => ({
          ...row,
          component_name: componentById.get(row.component_id)?.name || row.component_id,
          unit_cost: asNumber(componentById.get(row.component_id)?.unit_cost),
          line_cost: Number((asNumber(row.qty_per_unit) * asNumber(componentById.get(row.component_id)?.unit_cost)).toFixed(2))
        }))
    })),
    components
  };
}

export function createCatalogProduct(input) {
  assertValid("Створення продукту", input, {
    required: [
      { name: "name", label: "Назва продукту" },
      { name: "unit", label: "Одиниця продажу" },
      { name: "base_price", label: "Базова ціна" },
      { name: "margin_percent", label: "Маржа" }
    ],
    numbers: [
      { name: "base_price", label: "Базова ціна", positive: true },
      { name: "margin_percent", label: "Маржа" }
    ]
  });

  const existing = findOne("Products", row => row.name?.toLowerCase() === String(input.name).trim().toLowerCase());
  if (existing) return { created: false, product: existing };

  const product = appendRow("Products", {
    product_id: id("PROD"),
    name: String(input.name).trim(),
    description: input.description || "",
    unit: input.unit,
    base_price: Number(input.base_price),
    margin_percent: Number(input.margin_percent),
    estimated_work_hours: Number(input.estimated_work_hours || 0),
    packaging_hours: Number(input.packaging_hours || 0),
    cleanup_buffer: Number(input.cleanup_buffer || 0),
    is_active: true,
    allow_loss_price: false
  });

  logActivity({ entityType: "Product", entityId: product.product_id, action: "createCatalogProduct", newValue: product });
  return { created: true, product };
}

export function addTechCardItem(input) {
  assertValid("Додавання рядка техкарти", input, {
    required: [
      { name: "product_id", label: "Продукт" },
      { name: "component_id", label: "Матеріал" },
      { name: "qty_per_unit", label: "Кількість на одиницю" },
      { name: "unit", label: "Одиниця" }
    ],
    numbers: [{ name: "qty_per_unit", label: "Кількість на одиницю", positive: true }]
  });

  const existing = findOne("ProductComponents", row =>
    row.product_id === input.product_id && row.component_id === input.component_id && row.unit === input.unit
  );
  if (existing) return { created: false, item: existing };

  const item = appendRow("ProductComponents", {
    product_component_id: id("BOM"),
    product_id: input.product_id,
    component_id: input.component_id,
    qty_per_unit: Number(input.qty_per_unit),
    unit: input.unit
  });

  logActivity({ entityType: "Product", entityId: input.product_id, action: "addTechCardItem", newValue: item });
  return { created: true, item };
}
