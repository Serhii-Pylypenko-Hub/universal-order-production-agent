import fs from "fs";
import { getStore } from "../data/store.js";
import { loadSchema, ensureSchema } from "../data/schemaManager.js";
import { appendRow, findOne } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { logActivity } from "../audit/auditService.js";
import { normalizeMaterialName, ensureDefaultWarehouse } from "../stock/materialService.js";
import { receiveStockLot } from "../stock/stockLotService.js";
import { seedAiSubscriptionDefaults } from "../ai/subscriptionService.js";

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
  seedValidationAndTableUiSettings();
  seedBotManagement();
  seedAiSubscriptionDefaults();

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

function seedValidationAndTableUiSettings() {
  const validationRules = [
    ["VAL-MAT-001", "Component", "name", "Назва матеріалу", "required", "", "Вкажіть коротку зрозумілу назву матеріалу, наприклад Цукор білий."],
    ["VAL-MAT-002", "Component", "unit", "Одиниця виміру", "required", "", "Оберіть одиницю виміру: kg, g, l, ml, pcs, pack або box."],
    ["VAL-STOCK-001", "StockLot", "qty", "Кількість", "positive_number", "", "Вкажіть кількість більше нуля."],
    ["VAL-STOCK-002", "StockLot", "unit_cost", "Ціна за одиницю", "positive_number", "", "Вкажіть закупівельну ціну за базову одиницю матеріалу."],
    ["VAL-ORDER-001", "Order", "product_name", "Продукт", "required", "", "Оберіть продукт або створіть новий продукт перед замовленням."],
    ["VAL-ORDER-002", "Order", "quantity", "Кількість", "positive_number", "", "Вкажіть кількість або вагу замовлення більше нуля."],
    ["VAL-ORDER-003", "Order", "desired_date", "Дата виконання", "required", "", "Вкажіть дату, на яку потрібно виконати замовлення."]
  ];

  for (const [validation_rule_id, entity_type, field_name, label_uk, rule_type, rule_value, instruction_uk] of validationRules) {
    if (!findOne("ValidationRules", row => row.validation_rule_id === validation_rule_id)) {
      appendRow("ValidationRules", {
        validation_rule_id,
        entity_type,
        field_name,
        label_uk,
        rule_type,
        rule_value,
        instruction_uk,
        is_active: true,
        updated_at: nowIso()
      });
    }
  }

  const tableSettings = [
    ["TUI-001", "OrderMaterialRequirements", "keyboard.enter", "save_current_row", "Enter зберігає поточний рядок після валідації."],
    ["TUI-002", "OrderMaterialRequirements", "keyboard.ctrl_enter", "add_row", "Ctrl+Enter додає новий рядок."],
    ["TUI-003", "OrderMaterialRequirements", "keyboard.esc", "cancel_edit", "Esc скасовує редагування клітинки."],
    ["TUI-004", "StockLots", "validation.highlight_invalid_cells", "true", "Некоректні клітинки підсвічуються."],
    ["TUI-005", "StockLots", "validation.focus_first_invalid", "true", "Після помилки фокус переходить на першу некоректну клітинку."]
  ];

  for (const [table_ui_setting_id, table_name, setting_key, setting_value, description] of tableSettings) {
    if (!findOne("TableUiSettings", row => row.table_ui_setting_id === table_ui_setting_id)) {
      appendRow("TableUiSettings", {
        table_ui_setting_id,
        table_name,
        setting_key,
        setting_value,
        description,
        updated_at: nowIso()
      });
    }
  }

  const procurementSettings = [
    ["procurement_control_enabled", "true", "boolean", "Контроль залишків та автоплан закупівель увімкнено."],
    ["procurement_planning_horizon_days", "7", "number", "Горизонт планування потреби матеріалів у днях."]
  ];

  for (const [key, value, type, description] of procurementSettings) {
    if (!findOne("Settings", row => row.key === key)) {
      appendRow("Settings", { key, value, type, description });
    }
  }
}

function seedBotManagement() {
  if (!findOne("BotFlowSchemas", row => row.flow_schema_id === "FLOW-CAKES-DEFAULT")) {
    appendRow("BotFlowSchemas", {
      flow_schema_id: "FLOW-CAKES-DEFAULT",
      name: "Оформлення замовлення кондитерської",
      business_type: "bakery",
      description: "Приклад сценарію: категорія, смак, вага, дата, доставка, оплата, алергени, додатки, підтвердження.",
      is_default: true,
      is_active: true,
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }

  const settings = [
    ["BOT-SET-001", "language", "uk", "string", "Основна мова бота."],
    ["BOT-SET-002", "manager_confirmation_before_reservation", "true", "boolean", "Чи потрібне підтвердження менеджера перед резервуванням."],
    ["BOT-SET-003", "max_clarification_count", "10", "number", "Максимальна кількість уточнень перед handoff."],
    ["BOT-SET-004", "out_of_hours_enabled", "true", "boolean", "Чи показувати окреме повідомлення поза робочим часом."]
  ];
  for (const [setting_id, key, value, type, description] of settings) {
    if (!findOne("BotSettings", row => row.key === key)) {
      appendRow("BotSettings", { setting_id, key, value, type, description, updated_at: nowIso() });
    }
  }

  const templates = [
    ["BT-001", "new_client_greeting", "Вітаю! Що бажаєте замовити?", "uk", "telegram"],
    ["BT-002", "order_created", "Ваше замовлення №{order_id} прийнято. Ми повідомимо, коли воно буде готове.", "uk", "telegram"],
    ["BT-003", "missing_fields", "Потрібно уточнити дані: {fields}.", "uk", "telegram"],
    ["BT-004", "system_error", "Сталася технічна помилка. Звіт уже передано розробнику. Спробуйте ще раз або зверніться до менеджера.", "uk", "telegram"],
    ["BT-005", "order_confirmation", "Перевірте замовлення:\n{summary}\nПідтвердити замовлення?", "uk", "telegram"],
    ["BT-006", "allergen_question", "Чи є алергії або продукти, яких варто уникати? Наприклад горіхи, мед, лактоза, глютен.", "uk", "telegram"],
    ["BT-007", "promo_offer", "Зараз активні акції: {promotions}. Бажаєте додати до замовлення?", "uk", "telegram"],
    ["BT-008", "photo_offer", "Можу надіслати фото прикладів. Оберіть варіант або напишіть, що саме показати.", "uk", "telegram"]
  ];
  for (const [template_id, template_key, template_text, language, channel] of templates) {
    if (!findOne("BotTemplates", row => row.template_key === template_key)) {
      appendRow("BotTemplates", { template_id, template_key, template_text, language, channel, is_active: true, updated_at: nowIso() });
    }
  }

  const steps = [
    ["BSTEP-001", "category", "Категорія", "Оберіть категорію замовлення.", 10, true, "option", "", "", ""],
    ["BSTEP-002", "taste", "Смак", "Оберіть смак.", 20, true, "option", "category", "custom_cake", ""],
    ["BSTEP-003", "photo_examples", "Фото прикладів", "Бажаєте переглянути фото прикладів?", 25, false, "option", "category", "custom_cake", "BMEDIA-001"],
    ["BSTEP-004", "weight", "Вага", "Оберіть вагу.", 30, true, "option", "category", "custom_cake", ""],
    ["BSTEP-005", "addons", "Додатки", "Оберіть додатки до основного замовлення.", 40, false, "multi_option", "category", "custom_cake", ""],
    ["BSTEP-006", "allergens", "Алергії", "Чи є алергії або продукти, яких варто уникати?", 50, true, "text", "", "", ""],
    ["BSTEP-007", "desired_date", "Дата", "На яку дату потрібне замовлення? Мінімальний термін виготовлення - 3 дні.", 60, true, "date", "", "", ""],
    ["BSTEP-008", "delivery", "Отримання", "Оберіть спосіб отримання.", 70, true, "option", "", "", ""],
    ["BSTEP-009", "payment", "Оплата", "Оберіть спосіб оплати.", 80, true, "option", "", "", ""],
    ["BSTEP-010", "contact", "Контакт", "Залиште номер телефону або інший контакт.", 90, true, "text", "", "", ""],
    ["BSTEP-011", "confirmation", "Підтвердження", "Перевірте замовлення і підтвердьте.", 100, true, "confirmation", "", "", ""]
  ];
  for (const [step_id, step_key, title, prompt_text, sort_order, is_required, validation_type, depends_on_step_key, depends_on_value, media_asset_id] of steps) {
    if (!findOne("BotOrderFlowSteps", row => row.step_key === step_key)) {
      appendRow("BotOrderFlowSteps", {
        step_id,
        flow_schema_id: "FLOW-CAKES-DEFAULT",
        step_key,
        title,
        prompt_text,
        sort_order,
        is_required,
        validation_type,
        depends_on_step_key,
        depends_on_value,
        media_asset_id,
        handoff_on_fail: false,
        is_active: true,
        updated_at: nowIso()
      });
    }
  }

  const mediaAssets = [
    ["BMEDIA-001", "Приклади тортів", "photo", "", "Фото прикладів тортів для вибору стилю.", "bot_flow_step", "photo_examples"],
    ["BMEDIA-002", "Медовик", "photo", "", "Приклад торта Медовик.", "product_option", "taste_honey"],
    ["BMEDIA-003", "Шоколадний", "photo", "", "Приклад шоколадного торта.", "product_option", "taste_chocolate"]
  ];
  for (const [media_asset_id, name, asset_type, url_or_file_id, caption, linked_entity_type, linked_entity_id] of mediaAssets) {
    if (!findOne("BotMediaAssets", row => row.media_asset_id === media_asset_id)) {
      appendRow("BotMediaAssets", { media_asset_id, name, asset_type, url_or_file_id, caption, linked_entity_type, linked_entity_id, is_active: true, updated_at: nowIso() });
    }
  }

  const stepOptions = [
    ["BOPT-001", "category", "Замовити торт", "custom_cake", 10, 0, false, false, ""],
    ["BOPT-002", "category", "Готовий торт", "ready_cake", 20, 0, false, false, ""],
    ["BOPT-003", "category", "Інше замовлення", "other_order", 30, 0, false, false, ""],
    ["BOPT-004", "taste", "Медовик", "taste_honey", 10, 0, false, false, "BMEDIA-002"],
    ["BOPT-005", "taste", "Шоколадний", "taste_chocolate", 20, 0, false, false, "BMEDIA-003"],
    ["BOPT-006", "taste", "Наполеон", "taste_napoleon", 30, 0, false, false, ""],
    ["BOPT-007", "taste", "Інше", "taste_other", 40, 0, false, false, ""],
    ["BOPT-008", "weight", "1.5 кг", "1.5_kg", 10, 0, false, false, ""],
    ["BOPT-009", "weight", "2 кг", "2_kg", 20, 0, false, false, ""],
    ["BOPT-010", "weight", "3 кг", "3_kg", 30, 0, false, false, ""],
    ["BOPT-011", "delivery", "Самовивіз", "pickup", 10, 0, false, false, ""],
    ["BOPT-012", "delivery", "Кур'єр", "courier", 20, 0, false, false, ""],
    ["BOPT-013", "delivery", "Нова Пошта", "nova_poshta", 30, 0, false, false, ""],
    ["BOPT-014", "payment", "Передоплата", "prepayment", 10, 0, false, false, ""],
    ["BOPT-015", "payment", "Повна оплата", "full_payment", 20, 0, false, false, ""],
    ["BOPT-016", "payment", "Готівка при отриманні", "cash_on_delivery", 30, 0, false, false, ""],
    ["BOPT-017", "addons", "Напис на торті", "addon_inscription", 10, 150, false, true, ""],
    ["BOPT-018", "addons", "Ягоди", "addon_berries", 20, 250, false, true, ""],
    ["BOPT-019", "addons", "Свічки", "addon_candles", 30, 80, false, true, ""],
    ["BOPT-020", "photo_examples", "Так, покажіть фото", "show_photos", 10, 0, false, false, "BMEDIA-001"],
    ["BOPT-021", "photo_examples", "Без фото", "skip_photos", 20, 0, false, false, ""]
  ];
  for (const [option_id, step_key, label, payload, sort_order, price_delta, is_promo, is_addon, media_asset_id] of stepOptions) {
    if (!findOne("BotStepOptions", row => row.option_id === option_id)) {
      appendRow("BotStepOptions", { option_id, flow_schema_id: "FLOW-CAKES-DEFAULT", step_key, label, payload, sort_order, price_delta, is_promo, is_addon, media_asset_id, is_active: true, updated_at: nowIso() });
    }
  }

  const promotions = [
    ["PROMO-001", "Свічки у подарунок", "При замовленні торта від 2 кг можна запропонувати свічки.", "category", "custom_cake", "gift", 0],
    ["PROMO-002", "Знижка на ягоди", "Додаток Ягоди зі знижкою для активної акції.", "addon", "addon_berries", "percent", 10]
  ];
  for (const [promotion_id, name, description, target_type, target_id, discount_type, discount_value] of promotions) {
    if (!findOne("Promotions", row => row.promotion_id === promotion_id)) {
      appendRow("Promotions", { promotion_id, name, description, target_type, target_id, discount_type, discount_value, starts_at: "", ends_at: "", is_active: true, updated_at: nowIso() });
    }
  }

  const replies = [
    ["BQR-001", "Асортимент", "client_products", 10],
    ["BQR-002", "Зробити замовлення", "client_order", 20],
    ["BQR-003", "Зв'язатися з менеджером", "client_handoff", 30],
    ["BQR-004", "Акції", "client_discounts", 40]
  ];
  for (const [reply_id, label, payload, sort_order] of replies) {
    if (!findOne("BotQuickReplies", row => row.reply_id === reply_id)) {
      appendRow("BotQuickReplies", { reply_id, label, payload, sort_order, is_active: true, updated_at: nowIso() });
    }
  }

  const rules = [
    ["BHR-001", "Термінове замовлення", "keyword", "терміново|срочно|urgent", "WARNING", "Клієнт просить термінове замовлення."],
    ["BHR-002", "Невідомий продукт", "system", "unknown_product", "WARNING", "Бот не знайшов продукт у каталозі."],
    ["BHR-003", "Нестача матеріалів", "system", "missing_stock", "CRITICAL", "Для замовлення не вистачає матеріалів."],
    ["BHR-004", "Клієнт просить менеджера", "keyword", "менеджер|передзвоніть|зв'яжіться", "INFO", "Клієнт просить зв'язок з менеджером."]
  ];
  for (const [rule_id, name, trigger_type, trigger_value, severity, manager_message] of rules) {
    if (!findOne("BotHandoffRules", row => row.rule_id === rule_id)) {
      appendRow("BotHandoffRules", { rule_id, name, trigger_type, trigger_value, severity, manager_message, is_active: true, updated_at: nowIso() });
    }
  }
}

function seedCakesDemo() {
  const demo = JSON.parse(fs.readFileSync("./templates/cakes/demo_data.json", "utf-8"));
  const warehouse = ensureDefaultWarehouse();

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
        normalized_name: normalizeMaterialName(c.name),
        unit: c.unit,
        unit_cost: c.unit_cost,
        min_qty: c.min_qty,
        category_id: c.category_id || "",
        description: c.description || "",
        default_supplier_id: "",
        allow_standalone_sale: false,
        barcode: "",
        qr_code: "",
        is_active: true
      });
      appendRow("Stock", {
        stock_id: id("STOCK"),
        component_id: component.component_id,
        warehouse_id: warehouse.warehouse_id,
        current_qty: c.stock,
        reserved_qty: 0,
        available_qty: c.stock,
        unit: c.unit,
        min_qty: c.min_qty,
        unit_cost: c.unit_cost,
        weighted_avg_unit_cost: c.unit_cost,
        availability_status: Number(c.stock) <= Number(c.min_qty) ? "Низький залишок" : "Достатньо",
        allow_standalone_sale: false,
        linked_order_ids: "",
        updated_at: nowIso()
      });
    }
    if (!findOne("StockLots", r => r.component_id === component.component_id)) {
      receiveStockLot({
        component_id: component.component_id,
        warehouse_id: warehouse.warehouse_id,
        qty: c.stock,
        unit: c.unit,
        unit_cost: c.unit_cost,
        reason: "demo initial lot",
        created_by: "workspace_seed"
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
        unit: findOne("Components", r => r.component_id === component_id)?.unit || "kg"
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
