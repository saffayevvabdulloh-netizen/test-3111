import { useMemo, useState } from "react";
import { play } from "../../utils/sound";
import { useAct, useTotal } from "../frame";
import Face from "../Face";
import { shuffle } from "../useDnD";

const EMO = [
  { k: "xursand", e: "😄", label: "Xursand" }, { k: "xafa", e: "😢", label: "Xafa" }, { k: "jahl", e: "😠", label: "Jahldor" },
  { k: "hayron", e: "😮", label: "Hayron" }, { k: "qorq", e: "😨", label: "Qo'rqqan" }, { k: "uyqu", e: "😴", label: "Uyqusi kelgan" },
  { k: "mehr", e: "🥰", label: "Mehribon" },
];

const ROUNDS = 6;

export default function Emotions() {
  const act = useAct();
  useTotal(ROUNDS);
  const rounds = useMemo(() => shuffle(EMO).slice(0, ROUNDS).map((t) => ({ t, opts: shuffle([t, ...shuffle(EMO.filter((x) => x.k !== t.k)).slice(0, 3)]) })), []);
  const [i, setI] = useState(0);
  const [bad, setBad] = useState(null);
  const [good, setGood] = useState(false);
  const r = rounds[Math.min(i, ROUNDS - 1)];
  const choose = (o) => {
    if (good) return;
    if (o.k === r.t.k) {
      setGood(true); act.ok({ say: false });
      setTimeout(() => { setGood(false); setBad(null); setI((n) => n + 1); }, 1000);
    } else { setBad(o.k); act.miss({ say: false }); setTimeout(() => setBad(null), 600); }
  };
  return (
    <div className="emogame">
      <div className="emoprompt"><span className="emoface" role="img" aria-label={r.t.label}>{good ? <Face k={r.t.k} size={84} /> : <span style={{ fontSize: "4rem" }}>🤔</span>}</span><div><small>Ushbu emotsiyaga mos yuzni tanla!</small><b>{r.t.label}</b></div>
        <button type="button" className="btn btn--sky btn--icon" aria-label="Eshitish" onClick={() => { play("pop"); act.say(`${r.t.label}. Qaysi yuz ${r.t.label}?`, { force: true }); }}>🔊</button></div>
      <div className="emoopts">
        {r.opts.map((o) => (
          <button key={o.k} type="button" className={`emoopt ${bad === o.k ? "is-bad" : ""} ${good && o.k === r.t.k ? "is-good" : ""}`} onClick={() => choose(o)} aria-label={o.label}><Face k={o.k} size={110} /></button>
        ))}
      </div>
    </div>
  );
}
