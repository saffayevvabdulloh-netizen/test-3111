// Qoplon (snow-leopard cub) in a chust-doppi. Moods: happy | cheer | think | sleepy
// Square viewBox so it can drop in anywhere the old mascot was used (same props).
const BR = "#6b3a12";
const SPOTS = [[62, 70], [74, 60], [138, 70], [126, 60], [58, 100], [142, 100], [100, 52]];

export default function Mascot({ mood = "happy", size = 120, className = "", label }) {
  const eye = (cx, flip) => {
    if (mood === "cheer") return <path d={`M${cx - 11} 96 q11 -15 22 0`} stroke="#201509" strokeWidth="5" fill="none" strokeLinecap="round" />;
    if (mood === "sleepy") return <path d={`M${cx - 11} 92 q11 11 22 0`} stroke="#201509" strokeWidth="5" fill="none" strokeLinecap="round" />;
    const lx = mood === "think" ? (flip ? 3 : -4) : 0, ly = mood === "think" ? -4 : 0;
    return (
      <g>
        <ellipse cx={cx} cy="94" rx="14" ry="17" fill="#fff" stroke="#201509" strokeWidth="3" />
        <ellipse cx={cx + lx} cy={96 + ly} rx="10" ry="13" fill="#2f8fd8" />
        <ellipse cx={cx + lx} cy={96 + ly} rx="6" ry="9" fill="#14233a" />
        <circle cx={cx + lx + 3} cy={91 + ly} r="3.6" fill="#fff" />
        <circle cx={cx + lx - 3} cy={101 + ly} r="1.7" fill="#fff" />
      </g>
    );
  };
  return (
    <svg className={`mascot mascot--${mood} ${className}`} width={size} height={size} viewBox="0 0 200 200"
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
      {/* body + vest */}
      <ellipse cx="100" cy="176" rx="58" ry="36" fill="#f2a93b" stroke={BR} strokeWidth="4" />
      <path d="M56 160 Q100 190 144 160 L140 205 L60 205 Z" fill="#2f5fc4" stroke={BR} strokeWidth="3" />
      <path d="M84 158 L100 178 L116 158" fill="none" stroke="#ffc93c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M72 188 h12 M116 188 h12 M96 192 h8" stroke="#ffc93c" strokeWidth="3" strokeLinecap="round" />
      {/* ears */}
      <circle cx="46" cy="64" r="22" fill="#f2a93b" stroke={BR} strokeWidth="4" /><circle cx="46" cy="64" r="12" fill="#ffd3a0" />
      <circle cx="154" cy="64" r="22" fill="#f2a93b" stroke={BR} strokeWidth="4" /><circle cx="154" cy="64" r="12" fill="#ffd3a0" />
      {/* head (an ellipse - <circle> has no rx/ry) */}
      <ellipse cx="100" cy="96" rx="56" ry="50" fill="#f7b955" stroke={BR} strokeWidth="4" />
      <ellipse cx="100" cy="116" rx="32" ry="23" fill="#ffe8bd" />
      {SPOTS.map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="4" ry="5.5" fill="#9a5513" opacity=".85" />)}
      {/* doppi */}
      <g>
        <path d="M50 66 Q100 14 150 66 L146 80 Q100 90 54 80 Z" fill="#1b1e28" stroke={BR} strokeWidth="3" strokeLinejoin="round" />
        <path d="M54 76 Q100 86 146 76" fill="none" stroke="#fff" strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" />
        {[[78, 62], [100, 50], [122, 62]].map(([x, y]) => <path key={x} d={`M${x - 6} ${y + 6} Q${x} ${y - 8} ${x + 6} ${y + 6} Q${x} ${y + 2} ${x - 6} ${y + 6}Z`} fill="#fff" />)}
      </g>
      {mood === "think" && <path d="M64 78 q14 -9 28 -2" stroke={BR} strokeWidth="4" fill="none" strokeLinecap="round" />}
      {eye(76, false)}{eye(124, true)}
      <ellipse cx="60" cy="112" rx="7" ry="4.5" fill="#ff9aa8" opacity=".7" /><ellipse cx="140" cy="112" rx="7" ry="4.5" fill="#ff9aa8" opacity=".7" />
      <path d="M92 108 h16 q-1 9 -8 10 q-7 -1 -8 -10z" fill="#e0566a" stroke={BR} strokeWidth="2" strokeLinejoin="round" />
      {mood === "cheer"
        ? <path d="M84 122 Q100 146 116 122 Q100 128 84 122Z" fill="#7a1f2b" stroke={BR} strokeWidth="3" strokeLinejoin="round" />
        : mood === "sleepy"
          ? <path d="M92 124 q8 4 16 0" stroke={BR} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          : <path d="M84 120 Q92 132 100 122 Q108 132 116 120" stroke={BR} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />}
      <path d="M40 112 l16 3 M40 122 l16 -2 M160 112 l-16 3 M160 122 l-16 -2" stroke={BR} strokeWidth="2" strokeLinecap="round" opacity=".5" />
      {/* waving paw */}
      <g className="mascot__arm">
        <ellipse cx="164" cy={mood === "cheer" ? 128 : 154} rx="15" ry="17" fill="#f7b955" stroke={BR} strokeWidth="3.5" />
        <circle cx="158" cy={mood === "cheer" ? 122 : 148} r="3.6" fill="#ffe8bd" /><circle cx="166" cy={mood === "cheer" ? 121 : 147} r="3.6" fill="#ffe8bd" />
      </g>
      {mood === "think" && <text x="150" y="30" fontSize="30" fontWeight="800" fill="#1f2a52" fontFamily="Baloo 2, sans-serif">?</text>}
      {mood === "sleepy" && <text x="150" y="34" fontSize="26" fontWeight="800" fill="#55618a" fontFamily="Baloo 2, sans-serif">z</text>}
      {mood === "cheer" && <g fill="#ffc93c" stroke="#d99c0a" strokeWidth="2"><path d="M178 30l4 9 9 4-9 4-4 9-4-9-9-4 9-4z" /><path d="M20 40l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" /></g>}
    </svg>
  );
}

// Mascot + speech bubble (the "Sen ajoyibsan!" cloud from the design)
export function MascotSay({ mood = "happy", size = 170, speech, className = "" }) {
  return (
    <div className={`say ${className}`} style={{ width: size }}>
      {speech && <div className="say__bubble" role="status"><span>{speech}</span><span className="say__heart" aria-hidden="true">♥</span></div>}
      <Mascot mood={mood} size={size} className="mascot--bob" />
    </div>
  );
}
