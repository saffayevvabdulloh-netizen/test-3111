// Local calendar day helpers (the child's own day, not UTC).
export const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const WEEKDAYS = ["Yak", "Dush", "Sesh", "Chor", "Pay", "Jum", "Shan"]; // not toLocaleDateString: many browsers lack Uzbek
export function lastDays(n) {
  return Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (n - 1 - i)); return { key: dayKey(d), label: WEEKDAYS[d.getDay()], date: d }; });
}
