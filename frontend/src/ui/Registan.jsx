// Little Registan-style illustration + a daily fun fact about Uzbekistan.
const FACTS = [
  "Registon — Samarqanddagi mashhur maydon. U uchta katta madrasadan iborat.",
  "Do'ppi — o'zbeklarning milliy bosh kiyimi. Chust do'ppisi qora, oq naqshli bo'ladi.",
  "Toshkent — O'zbekistonning poytaxti.",
  "Navro'z — bahor bayrami, uni 21-martda nishonlaymiz.",
  "Mirzo Ulug'bek — Samarqandda rasadxona qurdirgan buyuk olim.",
  "Osh (palov) — o'zbeklarning eng sevimli taomlaridan biri.",
];
export const factOfDay = () => FACTS[Math.floor(Date.now() / 86400000) % FACTS.length];

export function RegistanArt() {
  return (
    <svg viewBox="0 0 320 170" className="registan" role="img" aria-label="Registon maydoni rasmi">
      <defs><linearGradient id="rg-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#bfe3ff" /><stop offset="1" stopColor="#fff3d6" /></linearGradient></defs>
      <rect width="320" height="170" fill="url(#rg-sky)" />
      <circle cx="268" cy="34" r="16" fill="#ffe27a" />
      <ellipse cx="60" cy="40" rx="30" ry="9" fill="#fff" opacity=".9" /><ellipse cx="90" cy="34" rx="22" ry="8" fill="#fff" opacity=".9" />
      {/* side madrasas */}
      {[[18, 0], [232, 0]].map(([x]) => (
        <g key={x}><rect x={x} y="78" width="70" height="72" fill="#e8c98a" /><path d={`M${x + 8} 150 v-48 q27 -26 54 0 v48z`} fill="#c9a35c" /><path d={`M${x + 14} 150 v-42 q21 -20 42 0 v42z`} fill="#2a7fb8" opacity=".85" />
          <rect x={x - 4} y="52" width="12" height="98" fill="#e8c98a" /><rect x={x + 62} y="52" width="12" height="98" fill="#e8c98a" /><circle cx={x + 2} cy="50" r="7" fill="#3aa0d8" /><circle cx={x + 68} cy="50" r="7" fill="#3aa0d8" /></g>
      ))}
      {/* central madrasa */}
      <rect x="104" y="70" width="112" height="80" fill="#f0d598" />
      <path d="M122 150 v-60 q38 -40 76 0 v60z" fill="#d6b06a" /><path d="M132 150 v-52 q28 -30 56 0 v52z" fill="#2a7fb8" />
      <path d="M140 150 v-40 q20 -22 40 0 v40z" fill="#12507a" />
      <ellipse cx="160" cy="62" rx="30" ry="26" fill="#37a6dc" /><path d="M132 66 q28 -52 56 0" fill="#37a6dc" />
      <path d="M160 24 v-10" stroke="#c9a35c" strokeWidth="3" /><circle cx="160" cy="12" r="3" fill="#ffc93c" />
      {[...Array(7)].map((_, i) => <path key={i} d={`M${112 + i * 16} 78 l6 -8 l6 8z`} fill="#c9a35c" />)}
      <rect y="148" width="320" height="22" fill="#9fdc8a" /><path d="M0 156 q80 -10 160 0 t160 0 v14 h-320z" fill="#7acb78" />
    </svg>
  );
}
