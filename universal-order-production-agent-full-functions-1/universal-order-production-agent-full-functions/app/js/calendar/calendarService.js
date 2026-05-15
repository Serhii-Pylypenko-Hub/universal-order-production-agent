import { appendRow, findRows } from "../data/rowRepository.js";
import { id } from "../utils/ids.js";
import { nowIso, addDays } from "../utils/time.js";

function getSettingNumber(key, fallback) {
  const settings = findRows("Settings", r => r.key === key);
  return settings.length ? Number(settings[0].value) : fallback;
}

export function calculateProductionHours(product, workHoursDelta = 0) {
  return Number(product.estimated_work_hours || 0) + Number(product.packaging_hours || 0) + Number(product.cleanup_buffer || 0) + Number(workHoursDelta || 0);
}

export function findNextAvailableSlot(hoursNeeded, startDate = new Date()) {
  const dailyCapacity = getSettingNumber("daily_capacity_hours", 8);
  let date = new Date(startDate);

  for (let i = 0; i < 30; i++) {
    const dateStr = date.toISOString().slice(0, 10);
    const events = findRows("CalendarLog", r => String(r.start_at).startsWith(dateStr) && r.status !== "Cancelled");
    const used = events.reduce((sum, e) => {
      const start = new Date(e.start_at);
      const end = new Date(e.end_at);
      return sum + (end - start) / 36e5;
    }, 0);

    if (dailyCapacity - used >= hoursNeeded) {
      const start = new Date(`${dateStr}T09:00:00.000Z`);
      start.setHours(start.getHours() + used);
      const end = new Date(start);
      end.setHours(end.getHours() + hoursNeeded);
      return { start_at: start.toISOString(), end_at: end.toISOString(), available_capacity: dailyCapacity - used };
    }
    date.setDate(date.getDate() + 1);
  }
  return null;
}

export function scheduleOrder(orderId, product, desiredDate = null, workHoursDelta = 0) {
  const hours = calculateProductionHours(product, workHoursDelta);
  const slot = findNextAvailableSlot(hours, desiredDate ? new Date(desiredDate) : new Date());
  if (!slot) return null;

  const event = appendRow("CalendarLog", {
    calendar_event_id: id("CAL"),
    order_id: orderId,
    type: "production",
    start_at: slot.start_at,
    end_at: slot.end_at,
    status: "Scheduled",
    created_at: nowIso()
  });

  return {
    event,
    ready_date: slot.end_at,
    shipping_date: addDays(slot.end_at, getSettingNumber("shipping_buffer_days", 1))
  };
}
