// Soft floating emojis behind a game (purely decorative; hidden from screen readers; still in calm mode).
const SLOTS = [
  { x: "6%", y: "20%", s: "3.2rem", d: "0s" }, { x: "86%", y: "16%", s: "3.6rem", d: "1.2s" }, { x: "10%", y: "64%", s: "2.8rem", d: "2.1s" },
  { x: "78%", y: "56%", s: "3rem", d: "0.7s" }, { x: "44%", y: "8%", s: "2.4rem", d: "1.7s" },
];
export default function Deco({ items = [] }) {
  return (
    <div className="deco" aria-hidden="true">
      {items.slice(0, SLOTS.length).map((e, i) => <i key={i} style={{ "--x": SLOTS[i].x, "--y": SLOTS[i].y, "--s": SLOTS[i].s, "--d": SLOTS[i].d }}>{e}</i>)}
    </div>
  );
}
