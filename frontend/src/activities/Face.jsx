// Own SVG faces: look the same on every device (emoji sets differ a lot between phones).
export default function Face({ k, size = 96 }) {
  const ink = "#3b2a14", mouth = "#7a1f2b";
  const eyes = <g fill={ink}><ellipse cx="35" cy="44" rx="5" ry="6.5" /><ellipse cx="65" cy="44" rx="5" ry="6.5" /></g>;
  const arc = (d) => <path d={d} stroke={ink} strokeWidth="4.5" fill="none" strokeLinecap="round" />;
  const parts = {
    xursand: <>{arc("M28 46 q7 -10 14 0")}{arc("M58 46 q7 -10 14 0")}<path d="M30 58 Q50 86 70 58 Z" fill={mouth} /><ellipse cx="50" cy="73" rx="8" ry="4" fill="#ff7a8a" /></>,
    xafa: <>{eyes}{arc("M26 33 l14 -5")}{arc("M74 33 l-14 -5")}{arc("M37 76 Q50 62 63 76")}<path d="M33 54 q-5 9 0 12 q5 -3 0 -12z" fill="#6ec1ff" /></>,
    jahl: <>{eyes}{arc("M25 30 l18 9")}{arc("M75 30 l-18 9")}{arc("M37 75 Q50 62 63 75")}</>,
    hayron: <><circle cx="35" cy="44" r="9" fill="#fff" stroke={ink} strokeWidth="3" /><circle cx="65" cy="44" r="9" fill="#fff" stroke={ink} strokeWidth="3" /><circle cx="35" cy="45" r="4" fill={ink} /><circle cx="65" cy="45" r="4" fill={ink} />{arc("M26 26 q9 -7 18 0")}{arc("M56 26 q9 -7 18 0")}<ellipse cx="50" cy="72" rx="7" ry="9" fill={mouth} /></>,
    qorq: <><circle cx="35" cy="44" r="8" fill="#fff" stroke={ink} strokeWidth="3" /><circle cx="65" cy="44" r="8" fill="#fff" stroke={ink} strokeWidth="3" /><circle cx="35" cy="44" r="2.5" fill={ink} /><circle cx="65" cy="44" r="2.5" fill={ink} />{arc("M26 28 l14 -4")}{arc("M74 28 l-14 -4")}{arc("M34 72 q4 -6 8 0 t8 0 t8 0 t8 0")}<path d="M84 24 q-6 10 0 13 q6 -3 0 -13z" fill="#6ec1ff" /></>,
    uyqu: <>{arc("M28 44 q7 7 14 0")}{arc("M58 44 q7 7 14 0")}{arc("M43 70 q7 5 14 0")}<text x="72" y="26" fontSize="18" fontWeight="800" fill="#55618a" fontFamily="Baloo 2, sans-serif">z</text><text x="82" y="16" fontSize="13" fontWeight="800" fill="#8b95b8" fontFamily="Baloo 2, sans-serif">z</text></>,
    mehr: <><path d="M35 53 c-12 -8 -10 -20 0 -16 c10 -4 12 8 0 16z" fill="#ff4d6d" transform="translate(0 -4)" /><path d="M65 53 c-12 -8 -10 -20 0 -16 c10 -4 12 8 0 16z" fill="#ff4d6d" transform="translate(0 -4)" />{arc("M32 62 Q50 82 68 62")}<ellipse cx="25" cy="62" rx="6" ry="4" fill="#ff9aa8" opacity=".8" /><ellipse cx="75" cy="62" rx="6" ry="4" fill="#ff9aa8" opacity=".8" /></>,
  };
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r="45" fill={k === "jahl" ? "#ff9a7a" : "#ffd84d"} stroke={k === "jahl" ? "#d9603f" : "#e0a800"} strokeWidth="3" />
      {parts[k]}
    </svg>
  );
}
