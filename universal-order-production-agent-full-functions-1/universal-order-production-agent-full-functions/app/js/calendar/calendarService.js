import { appendRow, findRows, updateRow } from "../data/rowRepository.js";
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

function buildDateTime(date, time) {
  const datePart = String(date || "").slice(0, 10);
  const timePart = String(time || "09:00").slice(0, 5);
  const value = new Date(`${datePart}T${timePart}:00.000Z`);
  if (Number.isNaN(value.getTime())) throw new Error("Некоректна дата або час календаря.");
  return value;
}

function validateTimeValue(value, label) {
  const time = String(value || "").slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(time)) throw new Error(`${label}: вкажіть час у форматі HH:MM.`);
  const [hours, minutes] = time.split(":").map(Number);
  if (hours > 23 || minutes > 59) throw new Error(`${label}: час має бути в межах доби.`);
  return time;
}

function eventDurationHours(event, fallback = 1) {
  const start = new Date(event?.start_at || "");
  const end = new Date(event?.end_at || "");
  if (Number.isFinite(start.getTime()) && Number.isFinite(end.getTime()) && end > start) {
    return (end - start) / 36e5;
  }
  return fallback;
}

export function rescheduleOrderProduction(input) {
  const orderId = String(input.order_id || "").trim();
  if (!orderId) throw new Error("Оберіть замовлення для перенесення.");
  if (!input.date) throw new Error("Вкажіть дату перенесення.");

  const events = findRows("CalendarLog", row => row.order_id === orderId && row.status !== "Cancelled")
    .sort((a, b) => new Date(b.created_at || b.start_at) - new Date(a.created_at || a.start_at));
  const current = events.find(row => row.type === "production") || events[0] || null;
  const hours = Number(input.duration_hours || eventDurationHours(current, 1));
  if (!Number.isFinite(hours) || hours <= 0) throw new Error("Вкажіть тривалість більше 0 год.");

  const startTime = validateTimeValue(input.start_time || "09:00", "Початок");
  const start = buildDateTime(input.date, startTime);
  const end = new Date(start);
  end.setMinutes(end.getMinutes() + hours * 60);

  let event;
  if (current) {
    event = updateRow("CalendarLog", "calendar_event_id", current.calendar_event_id, {
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "Scheduled"
    });
  } else {
    event = appendRow("CalendarLog", {
      calendar_event_id: id("CAL"),
      order_id: orderId,
      type: "production",
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      status: "Scheduled",
      created_at: nowIso()
    });
  }

  updateRow("Orders", "order_id", orderId, {
    ready_date: end.toISOString(),
    shipping_date: addDays(end.toISOString(), getSettingNumber("shipping_buffer_days", 1)),
    updated_at: nowIso()
  });

  return event;
}

export function blockCalendarTime(input) {
  if (!input.date) throw new Error("Вкажіть дату блокування.");
  const start = validateTimeValue(input.start_time || "09:00", "Початок");
  const end = validateTimeValue(input.end_time || "18:00", "Завершення");
  if (start >= end) throw new Error("Час завершення має бути пізніше часу початку.");
  const startAt = buildDateTime(input.date, start);
  const endAt = buildDateTime(input.date, end);
  const blockedHours = (endAt - startAt) / 36e5;

  return appendRow("CalendarOverrides", {
    override_id: id("COV"),
    date: String(input.date).slice(0, 10),
    type: "blocked",
    start_time: start,
    end_time: end,
    blocked_hours: Number(blockedHours.toFixed(2)),
    reason: input.reason || "",
    created_by: input.created_by || "web",
    created_at: nowIso()
  });
}
