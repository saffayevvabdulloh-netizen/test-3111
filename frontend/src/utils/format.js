const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
const pad = (n) => String(n).padStart(2, "0");

export function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}`;
}
export function fmtDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return `${d.getDate()}-${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDuration(sec) {
  if (sec == null) return "—";
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m} daq ${s} son` : `${s} soniya`;
}
export function fmtClock(sec) {
  const v = Math.max(sec, 0);
  return `${Math.floor(v / 60)}:${String(v % 60).padStart(2, "0")}`;
}
export function dueLabel(iso) {
  if (!iso) return null;
  const diff = new Date(iso) - Date.now();
  if (diff < 0) return "Muddati o'tgan";
  const d = Math.ceil(diff / 86400000);
  return d <= 1 ? "Bugun/ertaga tugaydi" : `${d} kun qoldi`;
}
export function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
export const nameOf = (u) => (u ? [u.first_name, u.last_name].filter(Boolean).join(" ") || u.username : "");
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
