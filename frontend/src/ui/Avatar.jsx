// Preset avatars: the profile stores only the key (no photo uploads for children).
export const AVATARS = [
  { key: "mushuk", bg: "#ffc53d", ears: "cat" }, { key: "ayiq", bg: "#c9a27a", ears: "round" },
  { key: "quyon", bg: "#ffb8c8", ears: "bunny" }, { key: "tulki", bg: "#ff8a4c", ears: "cat" },
  { key: "baqa", bg: "#7fdc8c", ears: "frog" }, { key: "panda", bg: "#e6e6ee", ears: "round-dark" },
  { key: "sher", bg: "#ffd36b", ears: "round" }, { key: "robot", bg: "#9ad0ff", ears: "robot" },
];
const byKey = Object.fromEntries(AVATARS.map((a) => [a.key, a]));

function Ears({ type }) {
  const s = { stroke: "#1f2347", strokeWidth: 3 };
  switch (type) {
    case "cat": return <g><path d="M12 28L14 8l14 11z" fill="#ff9aa8" {...s} strokeLinejoin="round" /><path d="M52 28L50 8 36 19z" fill="#ff9aa8" {...s} strokeLinejoin="round" /></g>;
    case "bunny": return <g><ellipse cx="22" cy="12" rx="6" ry="13" fill="#ffd5df" {...s} /><ellipse cx="42" cy="12" rx="6" ry="13" fill="#ffd5df" {...s} /></g>;
    case "frog": return <g><circle cx="19" cy="17" r="8" fill="#a8eeb1" {...s} /><circle cx="45" cy="17" r="8" fill="#a8eeb1" {...s} /></g>;
    case "round-dark": return <g><circle cx="16" cy="17" r="8" fill="#1f2347" {...s} /><circle cx="48" cy="17" r="8" fill="#1f2347" {...s} /></g>;
    case "robot": return <g><path d="M32 8V2" {...s} strokeLinecap="round" /><circle cx="32" cy="3" r="3" fill="#ff6b57" {...s} /></g>;
    default: return <g><circle cx="16" cy="17" r="8" fill="inherit" {...s} /><circle cx="48" cy="17" r="8" fill="inherit" {...s} /></g>;
  }
}

export default function Avatar({ name, size = 44, label }) {
  const a = byKey[name];
  if (!a) {
    const letter = (label || "?").trim().charAt(0).toUpperCase();
    return (
      <span className="avatar avatar--letter" style={{ width: size, height: size, fontSize: size * 0.46 }} aria-hidden="true">{letter}</span>
    );
  }
  return (
    <svg className="avatar" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ fill: a.bg }}>
      <Ears type={a.ears} />
      <circle cx="32" cy="36" r="22" fill={a.bg} stroke="#1f2347" strokeWidth="3.5" />
      <circle cx="24" cy="34" r="3.2" fill="#1f2347" /><circle cx="40" cy="34" r="3.2" fill="#1f2347" />
      <path d="M27 43q5 5 10 0" stroke="#1f2347" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
}
