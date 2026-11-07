// Presentation metadata for the 4 backend game types (colour + icon + copy).
export const TYPE_META = {
  quiz: { label: "Viktorina", tone: "grape", hint: "Bir nechta javobdan to'g'risini tanla", verb: "Tanla" },
  true_false: { label: "To'g'ri / Noto'g'ri", tone: "sky", hint: "Gap to'g'rimi yoki yo'qmi?", verb: "Baho ber" },
  matching: { label: "Juftlash", tone: "coral", hint: "Mos juftliklarni bog'la", verb: "Bog'la" },
  fill_blank: { label: "Javob yoz", tone: "sun", hint: "To'g'ri javobni o'zing yoz", verb: "Yoz" },
};
export const typeMeta = (k) => TYPE_META[k] || { label: k, tone: "ink", hint: "", verb: "" };

export function TypeIcon({ type, size = 26 }) {
  const common = { width: size, height: size, viewBox: "0 0 32 32", fill: "none", stroke: "currentColor", strokeWidth: 2.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, className: "icon" };
  if (type === "quiz") return <svg {...common}><path d="M5 6h22v14H15l-6 6v-6H5z" /><path d="M13.5 11.5a2.7 2.7 0 115 1c-.9.8-2 1.2-2 2.6M16.5 17.4v.01" /></svg>;
  if (type === "true_false") return <svg {...common}><path d="M4 9l4.5 4.5L15 6" /><path d="M18 18l9 9M27 18l-9 9" /><path d="M4 24h8" /></svg>;
  if (type === "matching") return <svg {...common}><circle cx="7" cy="9" r="3" /><circle cx="7" cy="23" r="3" /><circle cx="25" cy="9" r="3" /><circle cx="25" cy="23" r="3" /><path d="M10 9l12 14M10 23L22 9" /></svg>;
  return <svg {...common}><path d="M5 25h22" /><path d="M8 19l11-11 5 5-11 11H8z" /></svg>;
}
