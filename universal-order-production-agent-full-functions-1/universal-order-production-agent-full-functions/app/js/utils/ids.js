export function id(prefix) {
  const random = Math.random().toString(36).slice(2, 8);
  const time = Date.now().toString(36).slice(-6);
  return `${prefix}-${time}${random}`.toUpperCase();
}
