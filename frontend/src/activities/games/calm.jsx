import { useEffect, useRef, useState } from "react";
import { play } from "../../utils/sound";
import { useAct, useTotal } from "../frame";

// "Nafas olamiz": slow breathing (4 s in, 2 s hold, 6 s out) with spoken cues. In calm mode the circle stays still:
// the words and the countdown carry the guidance, so nothing moves for a child who is sensitive to motion.
const PHASES = [
  { k: "in", sec: 4, label: "Nafas ol", say: "Nafas ol." },
  { k: "hold", sec: 2, label: "Ushla", say: "Ushla." },
  { k: "out", sec: 6, label: "Sekin chiqar", say: "Sekin chiqar." },
];
const CYCLES = 4;

export function Breathing() {
  const act = useAct();
  useTotal(CYCLES);
  const [on, setOn] = useState(false);
  const [cycle, setCycle] = useState(0);   // finished cycles
  const [pi, setPi] = useState(0);         // current phase index
  const [left, setLeft] = useState(PHASES[0].sec);
  const actRef = useRef(act); actRef.current = act;

  useEffect(() => {
    if (!on) return undefined;
    actRef.current.say(PHASES[pi].say, { talk: true });
    setLeft(PHASES[pi].sec);
    let n = PHASES[pi].sec;
    const id = setInterval(() => {
      n -= 1; setLeft(n);
      if (n > 0) return;
      clearInterval(id);
      if (pi < PHASES.length - 1) setPi(pi + 1);
      else { setCycle((c) => c + 1); actRef.current.ok({ say: false }); setPi(0); }
    }, 1000);
    return () => clearInterval(id);
  }, [on, pi, cycle]);                     // `cycle` restarts the first phase after every full breath

  useEffect(() => { if (cycle >= CYCLES) setOn(false); }, [cycle]);

  const ph = PHASES[pi];
  const scale = !on ? 0.6 : ph.k === "in" ? 1 : ph.k === "hold" ? 1 : 0.6;
  return (
    <div className="breath">
      <div className={`breath__circle is-${on ? ph.k : "idle"}`} style={{ "--s": scale, "--d": `${on ? ph.sec : 1}s` }} role="img" aria-label={on ? ph.label : "Nafas doirasi"}>
        <span className="breath__word">{on ? ph.label : "Tayyormisan?"}</span>
        {on && <b className="breath__count" aria-live="off">{Math.max(left, 0)}</b>}
      </div>
      <div className="breath__dots" aria-label={`${Math.min(cycle, CYCLES)} / ${CYCLES} marta`}>{Array.from({ length: CYCLES }, (_, i) => <i key={i} className={i < cycle ? "is-on" : ""} />)}</div>
      {!on && cycle < CYCLES && <button type="button" className="btn btn--sky btn--lg" onClick={() => { play("pop"); setPi(0); setOn(true); }}>{cycle ? "Davom etamiz" : "Boshlaymiz"}</button>}
      {on && <button type="button" className="btn btn--sm" onClick={() => { setOn(false); setPi(0); }}>To'xtatish</button>}
      <p className="hintline">Doira kattalashganda burundan nafas ol. Kichraygach, og'izdan sekin chiqar.</p>
    </div>
  );
}
