import { useMemo, useState } from "react";
import { play } from "../../utils/sound";
import { useAct, useTotal } from "../frame";
import { shuffle, useDnD } from "../useDnD";

/* ---------------------------------------------------------------- shapes */
const SH = [
  { id: "doira", n: "Doira", c: "#ff5e6c", d: "circle" }, { id: "uchburchak", n: "Uchburchak", c: "#3ccf7a", d: "tri" },
  { id: "kvadrat", n: "Kvadrat", c: "#ffc93c", d: "sq" }, { id: "yulduz", n: "Yulduzcha", c: "#4aa3ff", d: "star" },
];
const STAR = "50,8 61,38 93,38 67,57 77,90 50,70 23,90 33,57 7,38 39,38";
export function ShapeSvg({ kind, color, face = true, size = 96, ghost = false }) {
  const f = ghost ? { fill: color, fillOpacity: 0.25, stroke: color, strokeOpacity: 0.55, strokeWidth: 3, strokeDasharray: "2 6", strokeLinecap: "round" } : { fill: color, stroke: color, strokeWidth: 10, strokeLinejoin: "round" };
  const fy = kind === "tri" ? 66 : 54;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      {kind === "circle" && <circle cx="50" cy="50" r="40" {...f} />}
      {kind === "tri" && <polygon points="50,14 90,84 10,84" {...f} />}
      {kind === "sq" && <rect x="14" y="14" width="72" height="72" rx="12" {...f} />}
      {kind === "star" && <polygon points={STAR} {...f} />}
      {face && !ghost && <g fill="#3b2a14"><circle cx="40" cy={fy} r="4" /><circle cx="60" cy={fy} r="4" /><path d={`M42 ${fy + 9} q8 8 16 0`} stroke="#3b2a14" strokeWidth="3.5" fill="none" strokeLinecap="round" /></g>}
    </svg>
  );
}
export function Shapes() {
  const act = useAct();
  useTotal(SH.length);
  const holes = useMemo(() => shuffle(SH), []);
  const [done, setDone] = useState([]);
  const [bad, setBad] = useState(null);
  const dnd = useDnD((id, zone) => {
    if (done.includes(zone)) return;
    if (id === zone) { play("drop"); setDone((d) => [...d, id]); act.ok({ say: false }); }
    else { setBad(id); act.miss({ say: false }); setTimeout(() => setBad(null), 500); }
  });
  return (
    <div className="sorter">
      <div className="sorter__items">
        {SH.filter((s) => !done.includes(s.id)).map((s) => (
          <button key={s.id} type="button" {...dnd.item(s.id)} className={`sitem ${bad === s.id ? "is-bad" : ""}`} aria-label={s.n}><ShapeSvg kind={s.d} color={s.c} size={104} /></button>
        ))}
      </div>
      <div className="board">
        {holes.map((s) => (
          <button key={s.id} type="button" {...dnd.zone(s.id)} className={`hole ${done.includes(s.id) ? "is-filled" : ""}`} aria-label={`${s.n} o'rni`}>
            <ShapeSvg kind={s.d} color={s.c} size={104} ghost={!done.includes(s.id)} />
          </button>
        ))}
      </div>
      <p className="hintline">Har bir shaklni o'z teshigiga joylashtir!</p>
    </div>
  );
}

/* ---------------------------------------------------------------- fruits */
const FRUIT = [
  { id: "olma", e: "🍎", c: "qizil" }, { id: "qulupnay", e: "🍓", c: "qizil" }, { id: "banan", e: "🍌", c: "sariq" },
  { id: "limon", e: "🍋", c: "sariq" }, { id: "nok", e: "🍐", c: "yashil" }, { id: "yashilolma", e: "🍏", c: "yashil" },
];
const BASK = [{ c: "qizil", css: "#ff6b6b" }, { c: "sariq", css: "#ffc93c" }, { c: "yashil", css: "#3ccf7a" }];
export function Fruits() {
  const act = useAct();
  useTotal(FRUIT.length);
  const items = useMemo(() => shuffle(FRUIT), []);
  const [done, setDone] = useState([]);
  const [bad, setBad] = useState(null);
  const dnd = useDnD((id, zone) => {
    const f = FRUIT.find((x) => x.id === id);
    if (f.c === zone) { play("drop"); setDone((d) => [...d, id]); act.ok({ say: false }); }
    else { setBad(id); act.miss({ say: false }); setTimeout(() => setBad(null), 500); }
  });
  return (
    <div className="sorter">
      <div className="sorter__items sorter__items--fruit">
        {items.filter((f) => !done.includes(f.id)).map((f) => <button key={f.id} type="button" {...dnd.item(f.id)} className={`fruit ${bad === f.id ? "is-bad" : ""}`} aria-label={f.id}>{f.e}</button>)}
      </div>
      <div className="baskets">
        {BASK.map((b) => (
          <button key={b.c} type="button" {...dnd.zone(b.c)} className="fbasket" style={{ "--bc": b.css }} aria-label={`${b.c} savat`}>
            <span className="fbasket__in">{FRUIT.filter((f) => f.c === b.c && done.includes(f.id)).map((f) => <i key={f.id}>{f.e}</i>)}</span>
            <b>{b.c[0].toUpperCase() + b.c.slice(1)}</b>
          </button>
        ))}
      </div>
      <p className="hintline">Mevalarni rangiga qarab mos savatga sol!</p>
    </div>
  );
}

/* --------------------------------------------------------------- shadows */
const SHADOW = [{ id: "mashina", e: "🚗" }, { id: "o'rdak", e: "🦆" }, { id: "ayiq", e: "🧸" }, { id: "baliq", e: "🐟" }];
export function Shadows() {
  const act = useAct();
  useTotal(SHADOW.length);
  const slots = useMemo(() => shuffle(SHADOW), []);
  const [done, setDone] = useState([]);
  const [bad, setBad] = useState(null);
  const dnd = useDnD((id, zone) => {
    if (id === zone) { play("drop"); setDone((d) => [...d, id]); act.ok({ say: false }); }
    else { setBad(id); act.miss({ say: false }); setTimeout(() => setBad(null), 500); }
  });
  return (
    <div className="shadows">
      <div className="shadows__col">
        {SHADOW.filter((s) => !done.includes(s.id)).map((s) => <button key={s.id} type="button" {...dnd.item(s.id)} className={`sitem sitem--emoji ${bad === s.id ? "is-bad" : ""}`} aria-label={s.id}>{s.e}</button>)}
      </div>
      <div className="shadows__col shadows__col--sil">
        {slots.map((s) => (
          <button key={s.id} type="button" {...dnd.zone(s.id)} className={`sil ${done.includes(s.id) ? "is-found" : ""}`} aria-label="soya"><span>{s.e}</span></button>
        ))}
      </div>
      <p className="hintline">Har bir narsaning soyasini top!</p>
    </div>
  );
}

/* --------------------------------------------------------------- counting */
const THINGS = ["🍎", "⭐", "🐟", "🎈", "🚗", "🐥"];
export function Counting() {
  const act = useAct();
  useTotal(5);
  const rounds = useMemo(() => shuffle([1, 2, 3, 4, 5]).map((n, i) => ({ n, e: THINGS[i % THINGS.length], opts: shuffle([...new Set([n, ...shuffle([1, 2, 3, 4, 5, 6].filter((x) => x !== n)).slice(0, 2)])]) })), []);
  const [i, setI] = useState(0);
  const [bad, setBad] = useState(null);
  const [good, setGood] = useState(false);
  const r = rounds[Math.min(i, 4)];
  const choose = (n) => {
    if (good) return;
    if (n === r.n) { setGood(true); act.ok({ say: false }); act.say(["", "bir", "ikki", "uch", "to'rt", "besh", "olti"][n]); setTimeout(() => { setGood(false); setI((x) => x + 1); }, 1100); }
    else { setBad(n); act.miss({ say: false }); setTimeout(() => setBad(null), 500); }
  };
  return (
    <div className="count">
      <div className="count__things" aria-label={`${r.n} ta`}>{Array.from({ length: r.n }, (_, k) => <span key={k} style={{ "--k": k }}>{r.e}</span>)}</div>
      <p className="hintline">Nechta bor? Sanab, to'g'ri raqamni tanla!</p>
      <div className="count__opts">{r.opts.map((n) => <button key={n} type="button" className={`numkey ${bad === n ? "is-bad" : ""} ${good && n === r.n ? "is-good" : ""}`} onClick={() => choose(n)}>{n}</button>)}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- memory */
const MEM = ["🐶", "🐱", "🐰", "🐼"];
export function Memory() {
  const act = useAct();
  useTotal(MEM.length);
  const deck = useMemo(() => shuffle([...MEM, ...MEM].map((e, i) => ({ id: i, e }))), []);
  const [open, setOpen] = useState([]);
  const [found, setFound] = useState([]);
  const [lock, setLock] = useState(false);
  const flip = (c) => {
    if (lock || open.includes(c.id) || found.includes(c.e)) return;
    play("flip");
    const o = [...open, c.id];
    setOpen(o);
    if (o.length === 2) {
      const [a, b] = o.map((id) => deck.find((d) => d.id === id));
      setLock(true);
      setTimeout(() => {
        if (a.e === b.e) { setFound((f) => [...f, a.e]); act.ok({ say: false }); } else act.miss({ say: false });
        setOpen([]); setLock(false);
      }, 800);
    }
  };
  return (
    <div className="memory">
      <div className="memory__grid">
        {deck.map((c) => {
          const up = open.includes(c.id) || found.includes(c.e);
          return <button key={c.id} type="button" className={`mcard ${up ? "is-up" : ""} ${found.includes(c.e) ? "is-found" : ""}`} onClick={() => flip(c)} aria-label={up ? c.e : "Yopiq karta"}><span className="mcard__back">❓</span><span className="mcard__front">{c.e}</span></button>;
        })}
      </div>
      <p className="hintline">Bir xil juftliklarni top! Karta ustiga bos.</p>
    </div>
  );
}
