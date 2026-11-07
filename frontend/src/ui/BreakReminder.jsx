// Optional rest reminder (set in the comfort menu): after N minutes of play it kindly suggests a break.
// Predictable breaks help many children; it never blocks anything and is OFF unless a parent turns it on.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { GUIDE } from "../utils/guide";
import { usePrefs } from "../utils/prefs";
import { play, speak } from "../utils/sound";
import Mascot from "./Mascot";

const TICK = 5; // seconds

export default function BreakReminder() {
  const [p] = usePrefs();
  const [due, setDue] = useState(false);
  const active = useRef(0);          // seconds of visible play since the last break
  const btn = useRef(null);

  useEffect(() => {
    if (!p.breakMin) { active.current = 0; setDue(false); return undefined; }
    const id = setInterval(() => {
      if (document.hidden) return;
      active.current += TICK;
      if (active.current >= p.breakMin * 60) { setDue(true); play("badge"); speak(GUIDE.breakTime); }
    }, TICK * 1000);
    return () => clearInterval(id);
  }, [p.breakMin]);
  useEffect(() => { if (due) btn.current?.focus(); }, [due]);

  if (!due) return null;
  const close = (minutesBack = 0) => { active.current = Math.max(0, (p.breakMin - minutesBack) * 60); setDue(false); };
  return (
    <div className="act__done" role="alertdialog" aria-modal="true" aria-labelledby="brk-h">
      <div className="act__donecard card">
        <Mascot mood="sleepy" size={130} className="mascot--bob" />
        <h2 id="brk-h">Dam olish vaqti!</h2>
        <p className="muted">{GUIDE.breakTime}</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link ref={btn} to="/app/fun/nafas" className="btn btn--sky btn--lg" onClick={() => close()}>🫧 Nafas olamiz</Link>
          <button type="button" className="btn btn--primary btn--lg" onClick={() => close()}>Dam oldim</button>
          <button type="button" className="btn btn--ghost" onClick={() => close(5)}>5 daqiqadan keyin</button>
        </div>
      </div>
    </div>
  );
}
