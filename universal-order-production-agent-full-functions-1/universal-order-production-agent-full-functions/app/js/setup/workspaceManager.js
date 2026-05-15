import fs from "fs";
import { getStore } from "../data/store.js";
import { loadSchema, ensureSchema } from "../data/schemaManager.js";
import { appendRow, findOne } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { logActivity } from "../audit/auditService.js";

export function initializeWorkspace(template = "empty") {
  const store = getStore();
  const schema = loadSchema();
  ensureSchema(store, schema);

  if (!findOne("SystemMeta", r => r.key === "schema_version")) {
    appendRow("SystemMeta", { key: "schema_version", value: schema.schema_version, updated_at: nowIso() });
    appendRow("SystemMeta", { key: "initialized_at", value: nowIso(), updated_at: nowIso() });
    appendRow("SystemMeta", { key: "business_template", value: template, updated_at: nowIso() });
  }

  seedBaseTemplates();
  seedCodeRequirements();

  if (template === "cakes") {
    seedCakesDemo();
  }

  logActivity({ entityType: "Workspace", entityId: "default", action: "initializeWorkspace", newValue: { template } });
  return { ok: true, template, schema_version: schema.schema_version };
}

function seedBaseTemplates() {
  const templates = [
    ["greeting", "Вітаю! Я допоможу оформити замовлення. Що саме бажаєте замовити та на яку дату?"],
    ["allergy_reminder", "Щоб підготувати безпечну пропозицію, повідомте, будь ласка, якщо є алергії або продукти, яких варто уникати."],
    ["manager_handoff", "Дякуємо. Я передав запит менеджеру. Залиште контакт — з вами зв’яжуться."],
    ["proposal_message", "Попередня пропозиція сформована. Очікуємо підтвердження."]
  ];

  for (const [key, text] of templates) {
    if (!findOne("MessageTemplates", r => r.template_key === key)) {
      appendRow("MessageTemplates", { template_key: key, template_text: text, language: "uk", updated_at: nowIso() });
    }
  }
}

function seedCakesDemo() {
  const demo = JSON.parse(fs.readFileSync("./templates/cakes/demo_data.json", "utf-8"));

  for (const [key, value] of Object.entries(demo.settings)) {
    if (!findOne("Settings", r => r.key === key)) {
      appendRow("Settings", { key, value: String(value), type: typeof value, description: "demo setting" });
    }
  }

  const productMap = {};
  for (const p of demo.products) {
    let product = findOne("Products", r => r.name === p.name);
    if (!product) {
      product = appendRow("Products", {
        product_id: id("PROD"),
        name: p.name,
        description: p.description,
        unit: p.unit,
        base_price: p.base_price,
        margin_percent: p.margin_percent,
        estimated_work_hours: p.estimated_work_hours,
        packaging_hours: p.packaging_hours,
        cleanup_buffer: p.cleanup_buffer,
        is_active: true
      });
    }
    productMap[p.name] = product.product_id;
  }

  const componentMap = {};
  for (const c of demo.components) {
    let component = findOne("Components", r => r.name === c.name);
    if (!component) {
      component = appendRow("Components", {
        component_id: id("COMP"),
        name: c.name,
        unit: c.unit,
        unit_cost: c.unit_cost,
        is_active: true
      });
      appendRow("Stock", {
        stock_id: id("STOCK"),
        component_id: component.component_id,
        current_qty: c.stock,
        reserved_qty: 0,
        unit: c.unit,
        min_qty: c.min_qty,
        unit_cost: c.unit_cost
      });
    }
    componentMap[c.name] = component.component_id;
  }

  for (const b of demo.bom) {
    const product_id = productMap[b.product];
    const component_id = componentMap[b.component];
    if (!findOne("ProductComponents", r => r.product_id === product_id && r.component_id === component_id)) {
      appendRow("ProductComponents", {
        product_component_id: id("BOM"),
        product_id,
        component_id,
        qty_per_unit: b.qty_per_unit,
        unit: "kg"
      });
    }
  }

  const optionGroupMap = {};
  for (const group of demo.option_groups || []) {
    const product_id = productMap[group.product];
    if (!product_id) continue;
    let optionGroup = findOne("OptionGroups", r => r.product_id === product_id && r.name === group.name);
    if (!optionGroup) {
      optionGroup = appendRow("OptionGroups", {
        option_group_id: id("OG"),
        product_id,
        name: group.name,
        selection_type: group.selection_type || "multi",
        is_required: Boolean(group.is_required),
        min_select: group.min_select || 0,
        max_select: group.max_select || 10,
        is_active: true
      });
    }
    optionGroupMap[`${group.product}::${group.name}`] = optionGroup.option_group_id;
  }

  for (const option of demo.product_options || []) {
    const product_id = productMap[option.product];
    const component_id = option.component ? componentMap[option.component] : "";
    const option_group_id = optionGroupMap[`${option.product}::${option.group}`] || "";
    if (!product_id) continue;
    if (!findOne("ProductOptions", r => r.product_id === product_id && r.name === option.name)) {
      appendRow("ProductOptions", {
        option_id: id("OPT"),
        option_group_id,
        product_id,
        name: option.name,
        type: option.type || "note",
        component_id,
        qty_delta: option.qty_delta || 0,
        unit: option.unit || "",
        price_delta: option.price_delta || 0,
        cost_delta: option.cost_delta || 0,
        work_hours_delta: option.work_hours_delta || 0,
        is_active: true,
        description: option.description || ""
      });
    }
  }
}


function seedCodeRequirements() {
  const requirements = [
    ["REQ-CLEAN-001", "clean_code", "All table operations must use Data Access Layer functions."],
    ["REQ-ERR-001", "error_handling", "All technical errors must create safe user-facing output and manager debug details."],
    ["REQ-PRICE-001", "pricing", "Personal price overrides discounts and base price."],
    ["REQ-PRICE-002", "pricing", "If final price is below cost, show manager warning."],
    ["REQ-HISTORY-001", "history", "Every feature change must update CHANGELOG.md and relevant docs."],
    ["REQ-IDEMP-001", "idempotency", "Every webhook/event must be checked through ProcessedEvents before creating orders."],
    ["REQ-STATE-001", "state_guards", "Order status transitions must use validateOrderTransition()."],
    ["REQ-DISCOUNT-001", "pricing", "Every-N-order discount must calculate real client order index, not hardcoded values."],
    ["REQ-CUSTOM-001", "customization", "Product customizations must be applied through CustomizationService, not duplicated in order workflows."],
    ["REQ-PREF-001", "client_memory", "Client preferences and restrictions must be saved to ClientPreferencesHistory when relevant."]
  ];
  for (const [requirement_id, category, description] of requirements) {
    if (!findOne("CodeRequirements", r => r.requirement_id === requirement_id)) {
      appendRow("CodeRequirements", { requirement_id, category, description, status: "active" });
    }
  }
}
