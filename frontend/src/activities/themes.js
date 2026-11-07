// Look of every game: each one has its own colours, background pattern and floating decorations,
// so a child knows "this is the tooth game" or "this is the fruit game" at first glance.
//   c1 -> c2     main gradient          accent  title / border colour (dark enough for text)
//   pattern      ruled | grid | dots | bubbles | plain | floor     floor  colour of the floor for "floor"
//   deco         emojis that float softly in the background
const T = (c1, c2, accent, pattern, deco, floor) => ({ c1, c2, accent, pattern, deco, floor });

export const THEMES = {
  harf:     T("#fff6cf", "#ffe08a", "#c27a00", "ruled",   ["🦁", "✏️", "🔤", "⭐", "🌞"]),
  alifbo:   T("#cfe8ff", "#e4d6ff", "#4a5fd6", "dots",    ["🅰️", "🔤", "🎈", "⭐", "🦋"]),
  emotsiya: T("#ffe4d4", "#ffcfe0", "#d1456f", "dots",    ["😊", "💛", "😢", "🥰", "😮"]),
  nafas:    T("#bfe8f7", "#dccff8", "#3d7fa6", "bubbles", ["🫧", "☁️", "🌙", "🫧", "✨"]),
  salom:    T("#f3dfff", "#ffd9ec", "#9145c9", "dots",    ["👋", "💬", "😊", "🌸", "⭐"]),
  hikoya:   T("#fff3d6", "#ffe2b0", "#a8641a", "plain",   ["🏫", "📖", "🎒", "✏️", "🍎"]),
  navbat:   T("#ffeccf", "#ffd3a1", "#b5691a", "plain",   ["⏳", "🕐", "🧍", "🌟", "🙂"]),
  vaziyat:  T("#d3e6ff", "#e6dcff", "#3f62c9", "dots",    ["🤔", "💡", "🤝", "💬", "❓"]),
  jadval:   T("#dcf8e9", "#bdecd3", "#1f8a58", "grid",    ["☀️", "🌙", "🍽️", "🛏️", "📅"]),
  tish:     T("#dcf9ff", "#b8eaf4", "#118a9e", "grid",    ["🦷", "✨", "🪥", "🫧", "😁"]),
  qol:      T("#d9eeff", "#c4e4fb", "#2578d6", "bubbles", ["🧼", "💧", "🫧", "🫧", "👐"]),
  oyinchoq: T("#ffe3d8", "#ffd0bf", "#c9503a", "dots",    ["🧸", "🚗", "🧩", "🎲", "🪀"], "#e3b07a"),
  shakl:    T("#d6f4f1", "#bfe9e5", "#168a80", "floor",   ["🔷", "🔺", "🟡", "⭐", "🟢"], "#e0ad72"),
  meva:     T("#e1f7c8", "#bfeb94", "#3c8a14", "plain",   ["🍎", "🍋", "🍓", "🍐", "🍃"]),
  soya:     T("#d9d4fb", "#b9c8f6", "#5a49c2", "dots",    ["🌙", "✨", "🦆", "⭐", "☁️"]),
  sanoq:    T("#fff3b0", "#ffd970", "#b57a00", "dots",    ["1️⃣", "2️⃣", "3️⃣", "🍬", "⭐"]),
  xotira:   T("#ecdcff", "#ffd5ec", "#a13fa8", "dots",    ["❓", "🐼", "🃏", "⭐", "🐰"]),
};

// teacher-made games (backend types)
export const TYPE_THEMES = {
  quiz:       T("#ece4ff", "#d9ccff", "#6f55d6", "dots",    ["❓", "💡", "⭐", "🧠", "✨"]),
  true_false: T("#dcecff", "#c3deff", "#2578d6", "grid",    ["✅", "❌", "🤔", "⭐", "💬"]),
  matching:   T("#ffe3df", "#ffcdc6", "#cc4a3a", "bubbles", ["🔗", "🧩", "⭐", "🎯", "✨"]),
  fill_blank: T("#fff1c4", "#ffe08a", "#b57a00", "ruled",   ["✏️", "📝", "⭐", "🔤", "💡"]),
};
const FALLBACK = T("#dcecff", "#e4d6ff", "#4a5fd6", "dots", ["⭐", "✨", "🎈", "🌈", "🦋"]);

export const themeFor = (id) => THEMES[id] || FALLBACK;
export const typeTheme = (type) => TYPE_THEMES[type] || FALLBACK;

const white = (a) => `rgba(255,255,255,${a})`;
const dots = `radial-gradient(${white(0.55)} 16%, transparent 17%) 0 0/44px 44px, radial-gradient(${white(0.4)} 14%, transparent 15%) 22px 22px/44px 44px`;
const bubbles = [
  `radial-gradient(circle at 12% 22%, ${white(0.55)} 0 2.2%, transparent 2.6%)`, `radial-gradient(circle at 84% 18%, ${white(0.5)} 0 3.4%, transparent 3.8%)`,
  `radial-gradient(circle at 70% 62%, ${white(0.4)} 0 2.6%, transparent 3%)`, `radial-gradient(circle at 22% 70%, ${white(0.45)} 0 4%, transparent 4.5%)`,
  `radial-gradient(circle at 48% 38%, ${white(0.3)} 0 1.6%, transparent 2%)`,
].join(",");
const grid = `linear-gradient(${white(0.6)} 2px, transparent 2px) 0 0/52px 52px, linear-gradient(90deg, ${white(0.6)} 2px, transparent 2px) 0 0/52px 52px`;
const ruled = (accent) => `repeating-linear-gradient(180deg, transparent 0 38px, ${accent}33 38px 40px)`;

// page background of a game (full screen)
export function bgOf(t) {
  const base = `linear-gradient(180deg, ${t.c1}, ${t.c2})`;
  switch (t.pattern) {
    case "ruled": return `${ruled(t.accent)}, ${base}`;
    case "grid": return `${grid}, ${base}`;
    case "dots": return `${dots}, ${base}`;
    case "bubbles": return `${bubbles}, ${base}`;
    case "floor": return `linear-gradient(180deg, ${t.c1} 0 66%, ${t.floor} 66%)`;
    default: return base;
  }
}
// small picture area of a list card
export const tileBgOf = (t) => `linear-gradient(135deg, ${t.c1}, ${t.c2})`;
