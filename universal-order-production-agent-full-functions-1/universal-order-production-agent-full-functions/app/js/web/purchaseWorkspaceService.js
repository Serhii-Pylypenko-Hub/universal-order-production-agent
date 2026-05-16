import { appendRow, findOne, findRows, getRows, updateRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { assertValid } from "../errors/validationService.js";
import { receiveStockLot } from "../stock/stockLotService.js";
import { logActivity } from "../audit/auditService.js";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function getPurchaseWorkspace() {
  const requests = getRows("PurchaseRequests");
  const items = getRows("PurchaseRequestItems");
  const components = new Map(getRows("Components").map(component => [component.component_id, component]));
  const suppliers = new Map(getRows("Suppliers").map(supplier => [supplier.supplier_id, supplier]));

  return {
    requests: requests.slice().reverse().map(request => {
      const requestItems = items.filter(item => item.purchase_request_id === request.purchase_request_id);
      return {
        ...request,
        supplier_name: suppliers.get(request.supplier_id)?.name || request.supplier_id || "",
        items_count: requestItems.length,
        total_expected_cost: requestItems.reduce((sum, item) => sum + asNumber(item.expected_total_cost), 0),
        items: requestItems.map(item => ({
          ...item,
          component_name: components.get(item.component_id)?.name || item.component_id
        }))
      };
    }),
    components: getRows("Components"),
    suppliers: getRows("Suppliers")
  };
}

export function createPurchaseRequest(input = {}) {
  const request = appendRow("PurchaseRequests", {
    purchase_request_id: id("PR"),
    status: input.status || "Draft",
    supplier_id: input.supplier_id || "",
    manager_note: input.manager_note || "",
    created_at: nowIso(),
    updated_at: nowIso()
  });
  logActivity({ entityType: "PurchaseRequest", entityId: request.purchase_request_id, action: "createPurchaseRequest", newValue: request });
  return request;
}

export function createPurchaseRequestFromProcurementPlan(planRows = [], input = {}) {
  const rows = planRows.filter(row => asNumber(row.recommended_purchase_qty) > 0);
  if (!rows.length) {
    throw new Error("Немає позицій для автоматичної заявки на закупівлю.");
  }
  const request = createPurchaseRequest({
    status: "Draft",
    manager_note: input.manager_note || `Автозаявка за контролем залишків: ${rows.length} позицій`
  });
  const items = rows.map(row => addPurchaseRequestItem({
    purchase_request_id: request.purchase_request_id,
    component_id: row.component_id,
    required_qty: row.missing_for_orders_qty || row.recommended_purchase_qty,
    safety_stock_qty: row.below_min_qty || 0,
    total_qty: row.recommended_purchase_qty,
    unit: row.unit,
    expected_unit_cost: row.expected_unit_cost || 0
  }));
  return { request, items };
}

export function addPurchaseRequestItem(input) {
  assertValid("Додавання позиції закупки", input, {
    required: [
      { name: "purchase_request_id", label: "Закупка" },
      { name: "component_id", label: "Матеріал" },
      { name: "required_qty", label: "Потрібна кількість" },
      { name: "unit", label: "Одиниця" }
    ],
    numbers: [
      { name: "required_qty", label: "Потрібна кількість", positive: true },
      { name: "expected_unit_cost", label: "Очікувана ціна" }
    ]
  });

  const requiredQty = Number(input.required_qty);
  const safetyQty = Number(input.safety_stock_qty || 0);
  const totalQty = Number(input.total_qty || requiredQty + safetyQty);
  const expectedUnitCost = Number(input.expected_unit_cost || 0);
  const item = appendRow("PurchaseRequestItems", {
    purchase_request_item_id: id("PRI"),
    purchase_request_id: input.purchase_request_id,
    component_id: input.component_id,
    required_qty: requiredQty,
    safety_stock_qty: safetyQty,
    total_qty: totalQty,
    unit: input.unit,
    expected_unit_cost: expectedUnitCost,
    expected_total_cost: Number((totalQty * expectedUnitCost).toFixed(2)),
    status: "Draft"
  });
  updateRow("PurchaseRequests", "purchase_request_id", input.purchase_request_id, { updated_at: nowIso() });
  logActivity({ entityType: "PurchaseRequest", entityId: input.purchase_request_id, action: "addPurchaseRequestItem", newValue: item });
  return item;
}

export function receivePurchaseRequest(requestId, createdBy = "web") {
  const request = findOne("PurchaseRequests", row => row.purchase_request_id === requestId);
  if (!request) throw new Error(`Purchase request ${requestId} not found.`);
  const components = new Map(getRows("Components").map(component => [component.component_id, component]));
  const items = findRows("PurchaseRequestItems", row => row.purchase_request_id === requestId && row.status !== "Received");
  const lots = [];

  for (const item of items) {
    const component = components.get(item.component_id);
    const lot = receiveStockLot({
      component_id: item.component_id,
      qty: Number(item.total_qty || item.required_qty),
      unit: item.unit || component?.unit,
      unit_cost: Number(item.expected_unit_cost || component?.unit_cost || 0),
      purchase_request_id: requestId,
      reason: `purchase_received:${requestId}`,
      created_by: createdBy
    });
    lots.push(lot);
    updateRow("PurchaseRequestItems", "purchase_request_item_id", item.purchase_request_item_id, {
      status: "Received"
    });
  }

  updateRow("PurchaseRequests", "purchase_request_id", requestId, { status: "Received", updated_at: nowIso() });
  logActivity({ entityType: "PurchaseRequest", entityId: requestId, action: "receivePurchaseRequest", newValue: lots });
  return { request_id: requestId, lots };
}
