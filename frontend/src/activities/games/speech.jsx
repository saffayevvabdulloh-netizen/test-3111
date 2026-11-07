import { useState } from "react";
import { useAct, useTotal } from "../frame";
import VoiceCapture from "../VoiceCapture";

const LETTERS = [
  { l: "A", word: "Arslon", e: "🦁" }, { l: "O", word: "Olma", e: "🍎" }, { l: "M", word: "Mushuk", e: "🐱" },
  { l: "B", word: "Baliq", e: "🐟" }, { l: "T", word: "Tovuq", e: "🐔" }, { l: "U", word: "Uzum", e: "🍇" },
];

export function Letters() {
  const act = useAct();
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(false);
  const it = LETTERS[i];
  useTotal(LETTERS.length);
  const solved = (_, info) => { setOk(true); act.ok({ say: !info?.assisted }); };
  const next = () => { setOk(false); setI((n) => Math.min(n + 1, LETTERS.length - 1)); };
  return (
    <div className="voicegame">
      <div className="bigcard" key={it.l}>
        <div className="bigletter" aria-label={`${it.l} harfi`}>{it.l}<span>{it.l.toLowerCase()}</span></div>
        <div className="bigemoji" role="img" aria-label={it.word}>{it.e}</div>
        <div className="bigword">{it.word}</div>
      </div>
      <p className="hintline">«{it.l}» harfini ayt yoki «{it.word}» de!</p>
      <VoiceCapture say={`${it.l}. ${it.word}`} accept={[it.word, it.l]} onResult={solved} onMiss={() => act.miss({ say: false })} />
      {ok && i < LETTERS.length - 1 && <button type="button" className="btn btn--sun btn--lg" onClick={next}>Keyingi harf →</button>}
    </div>
  );
}

const PHRASES = [
  { t: "Assalomu alaykum!", e: "👋", who: "Salomlashamiz" }, { t: "Rahmat!", e: "💛", who: "Minnatdorchilik bildiramiz" },
  { t: "Iltimos", e: "🙏", who: "Odob bilan so'raymiz" }, { t: "Kechirasiz", e: "🤝", who: "Kechirim so'raymiz" },
  { t: "Xayr!", e: "🖐️", who: "Xayrlashamiz" },
];
export function Greetings() {
  const act = useAct();
  const [i, setI] = useState(0);
  const [ok, setOk] = useState(false);
  const p = PHRASES[i];
  useTotal(PHRASES.length);
  return (
    <div className="voicegame">
      <div className="kidsrow" aria-hidden="true"><span>👦</span><div className="speechcloud">{p.t}</div><span>👧</span></div>
      <div className="bigcard bigcard--wide" key={p.t}><div className="bigemoji">{p.e}</div><div className="bigword">{p.t}</div><small>{p.who}</small></div>
      <VoiceCapture say={p.t} accept={[p.t.replace(/[!?.]/g, "")]} onResult={(_, info) => { setOk(true); act.ok({ say: !info?.assisted }); }} onMiss={() => act.miss({ say: false })} />
      {ok && i < PHRASES.length - 1 && <button type="button" className="btn btn--sun btn--lg" onClick={() => { setOk(false); setI(i + 1); }}>Keyingi →</button>}
    </div>
  );
}

/* Alphabet explorer: tap any letter, the voice says the letter and a word that starts with it. */
const ALIFBO = [
  ["A", "Arslon", "🦁"], ["B", "Baliq", "🐟"], ["D", "Daraxt", "🌳"], ["E", "Echki", "🐐"], ["F", "Fil", "🐘"], ["G", "Gul", "🌸"],
  ["H", "Hovli", "🏠"], ["I", "It", "🐶"], ["J", "Jirafa", "🦒"], ["K", "Kitob", "📖"], ["L", "Lola", "🌷"], ["M", "Mushuk", "🐱"],
  ["N", "Non", "🍞"], ["O", "Olma", "🍎"], ["P", "Pomidor", "🍅"], ["Q", "Qo'ziqorin", "🍄"], ["R", "Rasm", "🖼️"], ["S", "Sichqon", "🐭"],
  ["T", "Tarvuz", "🍉"], ["U", "Uzum", "🍇"], ["V", "Velosiped", "🚲"], ["X", "Xo'roz", "🐓"], ["Y", "Yulduz", "⭐"], ["Z", "Zebra", "🦓"],
  ["O'", "O'rdak", "🦆"], ["G'", "G'isht", "🧱"], ["Sh", "Shar", "🎈"], ["Ch", "Chumoli", "🐜"],
];
const NEED = 6;  // listen to six different letters to finish
export function Alphabet() {
  const act = useAct();
  useTotal(NEED);
  const [sel, setSel] = useState(null);
  const [heard, setHeard] = useState([]);
  const pick = (item) => {
    setSel(item);
    act.say(`${item[0]}. ${item[1]}`, { talk: true, force: true });
    if (!heard.includes(item[0])) { const h = [...heard, item[0]]; setHeard(h); if (h.length <= NEED) act.ok({ say: false }); }
  };
  return (
    <div className="alifbo">
      <div className="bigcard alifbo__card" key={sel ? sel[0] : "none"}>
        {sel ? (<><div className="bigletter" aria-label={`${sel[0]} harfi`}>{sel[0]}<span>{sel[0].charAt(0).toLowerCase() + sel[0].slice(1).toLowerCase()}</span></div><div className="bigemoji" role="img" aria-label={sel[1]}>{sel[2]}</div><div className="bigword">{sel[1]}</div></>)
          : <p className="story__text">Istalgan harfni bos va tingla! 👇</p>}
      </div>
      <p className="hintline">{Math.min(heard.length, NEED)} / {NEED} ta turli harf eshitildi</p>
      <div className="alifbo__grid" role="group" aria-label="Alifbo">
        {ALIFBO.map((it) => <button key={it[0]} type="button" className={`letterkey ${sel && sel[0] === it[0] ? "is-on" : ""} ${heard.includes(it[0]) ? "is-heard" : ""}`} onClick={() => pick(it)} aria-label={`${it[0]} harfi, ${it[1]}`}>{it[0]}</button>)}
      </div>
    </div>
  );
}
