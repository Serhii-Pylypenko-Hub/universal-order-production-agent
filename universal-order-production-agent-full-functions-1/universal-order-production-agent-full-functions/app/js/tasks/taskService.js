import { appendRow, findRows, updateRow } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso } from "../utils/time.js";

export function createTask({ orderId = "", type, title, priority = "INFO", dueAt = "" }) {
  return appendRow("Tasks", {
    task_id: id("TASK"),
    order_id: orderId,
    type,
    title,
    priority,
    status: "Open",
    due_at: dueAt,
    created_at: nowIso(),
    updated_at: nowIso()
  });
}

export function getOpenTasks() {
  return findRows("Tasks", r => r.status === "Open");
}

export function updateTaskStatus(taskId, status) {
  return updateRow("Tasks", "task_id", taskId, { status, updated_at: nowIso() });
}
