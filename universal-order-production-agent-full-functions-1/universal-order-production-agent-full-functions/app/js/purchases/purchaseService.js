import { appendRow, findOne, findRows, updateRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";
import { logActivity } from "../audit/auditService.js";

export function createOrMergePurchaseRequest(missingItems, safetyStockPercent = 10) {
  const items = missingItems.filter(i => Number(i.missing) > 0);
  if (items.length === 0) return null;

  let request = findOne("PurchaseRequests", r => ["Draft", "Pending"].includes(r.status));
  if (!request) {
    request = appendRow("PurchaseRequests", {
      purchase_request_id: id("PR"),
      status: "Draft",
      created_at: nowIso(),
      updated_at: nowIso()
    });
  }

  for (const item of items) {
    const existing = findOne("PurchaseRequestItems", r =>
      r.purchase_request_id === request.purchase_request_id &&
      r.component_id === item.component_id &&
      r.status !== "Received"
    );
    const safety = Number(item.missing) * Number(safetyStockPercent) / 100;
    const total = Number(item.missing) + safety;

    if (existing) {
      updateRow("PurchaseRequestItems", "purchase_request_item_id", existing.purchase_request_item_id, {
        required_qty: Number(existing.required_qty) + Number(item.missing),
        safety_stock_qty: Number(existing.safety_stock_qty) + safety,
        total_qty: Number(existing.total_qty) + total
      });
    } else {
      appendRow("PurchaseRequestItems", {
        purchase_request_item_id: id("PRI"),
        purchase_request_id: request.purchase_request_id,
        component_id: item.component_id,
        required_qty: item.missing,
        safety_stock_qty: safety,
        total_qty: total,
        unit: item.unit,
        status: "Draft"
      });
    }
  }

  logActivity({ entityType: "PurchaseRequest", entityId: request.purchase_request_id, action: "createOrMergePurchaseRequest", newValue: items });
  return request;
}

export function getActivePurchaseRequests() {
  return findRows("PurchaseRequests", r => ["Draft", "Pending", "Ordered"].includes(r.status));
}
