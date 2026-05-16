import { getRows } from "../data/rowRepository.js";

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function dateOnly(value) {
  if (!value) return new Date().toISOString().slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  return date.toISOString().slice(0, 10);
}

function transactionTime(row) {
  return new Date(row.created_at || row.received_at || row.updated_at || 0).getTime();
}

function signedQty(row) {
  if (row.type === "IN") return asNumber(row.qty);
  if (row.type === "OUT" || row.type === "WRITE_OFF") return -asNumber(row.qty);
  return 0;
}

function signedValue(row) {
  const value = asNumber(row.total_cost) || asNumber(row.qty) * asNumber(row.unit_cost);
  if (row.type === "IN") return value;
  if (row.type === "OUT" || row.type === "WRITE_OFF") return -value;
  return 0;
}

function materialMap() {
  return new Map(getRows("Components").map(row => [row.component_id, row]));
}

export function getInventoryBalanceOnDate(date = new Date().toISOString()) {
  const targetDate = dateOnly(date);
  const cutoff = new Date(`${targetDate}T23:59:59.999Z`).getTime();
  const components = materialMap();
  const balances = new Map();

  for (const transaction of getRows("InventoryTransactions")) {
    const time = transactionTime(transaction);
    if (!Number.isFinite(time) || time > cutoff) continue;
    const qty = signedQty(transaction);
    const value = signedValue(transaction);
    if (!qty && !value) continue;
    const current = balances.get(transaction.component_id) || { qty: 0, value: 0, in_qty: 0, out_qty: 0 };
    current.qty += qty;
    current.value += value;
    if (qty > 0) current.in_qty += qty;
    if (qty < 0) current.out_qty += Math.abs(qty);
    balances.set(transaction.component_id, current);
  }

  const rows = [...balances.entries()].map(([componentId, balance]) => {
    const component = components.get(componentId) || {};
    return {
      component_id: componentId,
      material_name: component.name || componentId,
      unit: component.unit || "",
      qty: Number(balance.qty.toFixed(6)),
      value: Number(balance.value.toFixed(2)),
      in_qty: Number(balance.in_qty.toFixed(6)),
      out_qty: Number(balance.out_qty.toFixed(6))
    };
  }).sort((a, b) => a.material_name.localeCompare(b.material_name));

  return {
    date: targetDate,
    rows,
    totals: {
      qty_positions: rows.length,
      value: Number(rows.reduce((sum, row) => sum + asNumber(row.value), 0).toFixed(2))
    }
  };
}

export function getMonthlyInventoryDifferences(months = 6) {
  const limit = Math.min(24, Math.max(1, Number(months) || 6));
  const components = materialMap();
  const monthMap = new Map();
  const now = new Date();
  const allowedMonths = new Set();
  for (let i = limit - 1; i >= 0; i -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    allowedMonths.add(date.toISOString().slice(0, 7));
  }

  for (const transaction of getRows("InventoryTransactions")) {
    const time = transactionTime(transaction);
    if (!Number.isFinite(time)) continue;
    const month = new Date(time).toISOString().slice(0, 7);
    if (!allowedMonths.has(month)) continue;
    const component = components.get(transaction.component_id) || {};
    const key = `${month}:${transaction.component_id}`;
    const current = monthMap.get(key) || {
      month,
      component_id: transaction.component_id,
      material_name: component.name || transaction.component_id,
      unit: component.unit || transaction.unit || "",
      in_qty: 0,
      out_qty: 0,
      net_qty: 0,
      net_value: 0
    };
    const qty = signedQty(transaction);
    if (qty > 0) current.in_qty += qty;
    if (qty < 0) current.out_qty += Math.abs(qty);
    current.net_qty += qty;
    current.net_value += signedValue(transaction);
    monthMap.set(key, current);
  }

  const rows = [...monthMap.values()]
    .map(row => ({
      ...row,
      in_qty: Number(row.in_qty.toFixed(6)),
      out_qty: Number(row.out_qty.toFixed(6)),
      net_qty: Number(row.net_qty.toFixed(6)),
      net_value: Number(row.net_value.toFixed(2))
    }))
    .sort((a, b) => `${b.month}${a.material_name}`.localeCompare(`${a.month}${b.material_name}`));

  const summary = [...allowedMonths].map(month => {
    const monthRows = rows.filter(row => row.month === month);
    return {
      month,
      in_qty: Number(monthRows.reduce((sum, row) => sum + asNumber(row.in_qty), 0).toFixed(6)),
      out_qty: Number(monthRows.reduce((sum, row) => sum + asNumber(row.out_qty), 0).toFixed(6)),
      net_value: Number(monthRows.reduce((sum, row) => sum + asNumber(row.net_value), 0).toFixed(2))
    };
  });

  return { months: limit, summary, rows };
}

export function getInventoryReports({ date, months } = {}) {
  return {
    balance_on_date: getInventoryBalanceOnDate(date),
    monthly_differences: getMonthlyInventoryDifferences(months)
  };
}
