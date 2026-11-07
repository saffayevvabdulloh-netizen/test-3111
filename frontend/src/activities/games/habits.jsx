import { useEffect, useMemo, useRef, useState } from "react";
import { play } from "../../utils/sound";
import { Button } from "../../ui/kit";
import { useAct, useTotal } from "../frame";
import { shuffle, useDnD } from "../useDnD";

/* ---------------------------------------------------------------- teeth */
const BRUSH_SECONDS = 120;
export function Teeth() {
  const act = useAct();
  useTotal(3);
  const [step, setStep] = useState(0);
  const [paste, setPaste] = useState(false);
  const [left, setLeft] = useState(BRUSH_SECONDS);
  const [on, setOn] = useState(false);
  const [sips, setSips] = useState(0);
  const fin = useRef(false);

  useEffect(() => {
    if (!on) return undefined;
    const id = setInterval(() => { setLeft((s) => s - 1); if (Math.random() < 0.5) play("bubble"); }, 1000);
    return () => clearInterval(id);
  }, [on]);
  useEffect(() => {
    if (left <= 0 && !fin.current) { fin.current = true; setOn(false); act.ok({ say: true }); }
  }, [left]); // eslint-disable-line

  const squeeze = () => { if (paste) return; setPaste(true); play("pop"); act.ok({ say: false }); setTimeout(() => setStep(1), 900); };
  const skip = () => { setOn(false); setLeft(0); };
  const sip = () => {
    play("splash"); const n = sips + 1; setSips(n);
    if (n >= 3) act.ok({ say: true });
  };
  const m = String(Math.floor(left / 60)), s = String(left % 60).padStart(2, "0");
  const pct = 1 - left / BRUSH_SECONDS;
  const STEPS = ["Tish pastasini qo'y", "Tishlaringni tozala", "Og'zingni chay"];
  return (
    <div className="habit">
      <ol className="habit__steps">
        {STEPS.map((t, i) => <li key={t} className={`${i === step ? "is-now" : ""} ${i < step || (i === 2 && sips >= 3) ? "is-done" : ""}`}><b>{i + 1}</b><span>{t}</span></li>)}
      </ol>
      <div className="habit__stage">
        {step === 0 && (
          <div className="habit__row">
            <button type="button" className="tube" onClick={squeeze} aria-label="Pastani siq">🧴<small>Pastani bos!</small></button>
            <div className={`brush ${paste ? "has-paste" : ""}`} aria-hidden="true"><i /><span>🪥</span></div>
          </div>
        )}
        {step === 1 && (
          <div className="habit__row">
            <div className={`ring-timer ${on ? "is-on" : ""}`} style={{ "--p": pct }}><span className="ring-timer__face">🦷</span><b>{m}:{s}</b></div>
            <div className="habit__col">
              <p>Har bir tishni yumshoq harakat bilan 2 daqiqa tozala.</p>
              {left > 0 && <Button variant={on ? "default" : "primary"} size="lg" icon={on ? "x" : "play"} onClick={() => { play("pop"); setOn(!on); }}>{on ? "To'xtatish" : left < BRUSH_SECONDS ? "Davom etish" : "Boshlash"}</Button>}
              {left > 0 && left < BRUSH_SECONDS && !on && <button type="button" className="linkbtn" onClick={skip}>Tayyor, o'tkazib yuborish</button>}
            </div>
          </div>
        )}
        {step === 1 && left <= 0 && <div className="habit__next"><Button variant="sun" size="lg" onClick={() => { play("whoosh"); setStep(2); }}>Keyingi →</Button></div>}
        {step === 2 && (
          <div className="habit__row">
            <button type="button" className="glass" onClick={sip} disabled={sips >= 3} aria-label="Suvni ichib chayqa">
              <span className="glass__water" style={{ height: `${(3 - sips) * 30}%` }} />🥛<small>{sips >= 3 ? "Tayyor!" : `Chayqa! ${sips}/3`}</small>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- ordering games */
// Put the cards in the right order (hand washing, daily schedule). Card order in `items` = right order.
function Order({ items, hint }) {
  const act = useAct();
  useTotal(items.length);
  const cards = useMemo(() => { let s; do { s = shuffle(items); } while (items.length > 1 && s.every((x, i) => x.id === items[i].id)); return s; }, [items]);
  const [placed, setPlaced] = useState({}); // slot index -> card id
  const [bad, setBad] = useState(null);
  const dnd = useDnD((cid, zid) => {
    const idx = items.findIndex((x) => x.id === cid), slot = Number(zid.slice(1));
    if (placed[slot] || Object.values(placed).includes(cid)) return;
    if (idx === slot) { play("drop"); setPlaced((p) => ({ ...p, [slot]: cid })); act.ok({ say: false }); }
    else { setBad(cid); act.miss({ say: false }); setTimeout(() => setBad(null), 500); }
  });
  const free = cards.filter((c) => !Object.values(placed).includes(c.id));
  return (
    <div className="order" style={{ "--n": items.length }}>
      <p className="hintline">{hint}</p>
      <div className="order__slots">
        {items.map((_, n) => {
          const c = items.find((x) => x.id === placed[n]);
          return <div key={n} {...dnd.zone(`s${n}`)} className={`slot ${c ? "is-filled" : ""}`} role="button" tabIndex={0} aria-label={`${n + 1}-o'rin`}><i>{n + 1}</i>{c ? <><span className="slot__e">{c.e}</span><b>{c.t}</b></> : <em>?</em>}</div>;
        })}
      </div>
      <div className="order__tray">
        {free.map((c) => <button key={c.id} type="button" {...dnd.item(c.id)} className={`dcard ${bad === c.id ? "is-bad" : ""}`}><span>{c.e}</span><b>{c.t}</b></button>)}
      </div>
    </div>
  );
}

const WASH = [
  { id: "w1", e: "🚰", t: "Qo'lingni xo'lla" }, { id: "w2", e: "🧼", t: "Sovun surtib ishqala" },
  { id: "w3", e: "💦", t: "Suv bilan chayib tashla" }, { id: "w4", e: "🧻", t: "Sochiq bilan qurit" },
];
export const HandWash = () => <Order items={WASH} hint="Qo'lni yuvish ketma-ketligini tuzing: kartani kerakli raqamga olib bor!" />;

const DAY = [
  { id: "d1", e: "🌅", t: "Uyg'onaman" }, { id: "d2", e: "🪥", t: "Tishimni yuvaman" }, { id: "d3", e: "🍳", t: "Nonushta qilaman" },
  { id: "d4", e: "🎒", t: "Maktabga boraman" }, { id: "d5", e: "🌙", t: "Uxlayman" },
];
export const DaySchedule = () => <Order items={DAY} hint="Kunim qanday o'tadi? Rasmlarni tartib bilan joylashtir!" />;

/* ----------------------------------------------------------------- toys */
const TOYS = [{ id: "ayiq", e: "🧸", t: "Ayiqcha" }, { id: "top", e: "⚽", t: "To'p" }, { id: "mashina", e: "🚗", t: "Mashinacha" }, { id: "poyezd", e: "🚂", t: "Poyezd" }, { id: "varrak", e: "🪁", t: "Varrak" }];
export function Toys() {
  const act = useAct();
  useTotal(TOYS.length);
  const [inBox, setInBox] = useState([]);
  const dnd = useDnD((id, zone) => {
    if (zone !== "box" || inBox.includes(id)) return;
    play("drop"); setInBox((b) => [...b, id]); act.ok({ say: inBox.length + 1 === TOYS.length });
  });
  const floor = TOYS.filter((t) => !inBox.includes(t.id));
  return (
    <div className="toys">
      <p className="hintline">O'yinchoqlarni savatga yig'! Ustiga bosib, so'ng savatni bos yoki sudrab olib bor.</p>
      <div className="toys__room">
        <div className="toys__floor">
          {floor.map((t, i) => <button key={t.id} type="button" {...dnd.item(t.id)} className="toy" style={{ ...dnd.item(t.id).style, "--r": `${(i % 2 ? 1 : -1) * (6 + i * 3)}deg` }} aria-label={t.t}><span>{t.e}</span><small>{t.t}</small></button>)}
          {floor.length === 0 && <div className="toys__clean">✨ Xona toza! ✨</div>}
        </div>
        <button type="button" {...dnd.zone("box")} className={`basket ${dnd.picked ? "is-ready" : ""}`} aria-label="Savat"><span className="basket__e">🧺</span><small>Yig'ildi: {inBox.length} / {TOYS.length}</small></button>
      </div>
    </div>
  );
}
