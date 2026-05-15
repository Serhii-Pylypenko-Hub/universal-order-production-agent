export function nowIso() {
  return new Date().toISOString();
}

export function addDays(dateIso, days) {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
