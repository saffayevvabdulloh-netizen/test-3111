import { useMemo, useState } from "react";
import { play } from "../../utils/sound";
import { useAct, useTotal } from "../frame";
import { shuffle } from "../useDnD";

/* Social stories: short, concrete, step by step, in the first person. */
function Story({ pages }) {
  const act = useAct();
  useTotal(pages.length);
  const [i, setI] = useState(0);
  const [seen, setSeen] = useState(0);
  const p = pages[i];
  const next = () => { play("whoosh"); if (i === seen) { setSeen(seen + 1); act.ok({ say: false }); } if (i < pages.length - 1) setI(i + 1); };
  return (
    <div className="story">
      <div className="story__dots" aria-label={`${i + 1} / ${pages.length}`}>{pages.map((_, k) => <i key={k} className={k <= i ? "is-on" : ""} />)}</div>
      <div className="bigcard story__card" key={i}>
        <div className="bigemoji" role="img" aria-label={p.alt || ""}>{p.e}</div>
        <p className="story__text">{p.t}</p>
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        {i > 0 && <button type="button" className="btn btn--icon" aria-label="Oldingi" onClick={() => { play("tap"); setI(i - 1); }}>←</button>}
        <button type="button" className="btn btn--sky" onClick={() => { play("pop"); act.say(p.t, { force: true }); }}>🔊 Eshit</button>
        {!(i === pages.length - 1 && seen >= pages.length) && <button type="button" className="btn btn--sun btn--lg" onClick={next}>{i === pages.length - 1 ? "Tayyor ✓" : "Keyingi →"}</button>}
      </div>
    </div>
  );
}

const SCHOOL = [
  { e: "🌅", t: "Ertalab uyg'onaman." }, { e: "🎒", t: "Sumkamni olaman." }, { e: "🏫", t: "Maktabga kelaman." },
  { e: "👋", t: "O'qituvchi va do'stlarimga salom beraman." }, { e: "📚", t: "Dars paytida o'tirib, tinglayman." },
];
const QUEUE = [
  { e: "🧸", t: "Men bu o'yinchoq bilan o'ynashni xohlayman." }, { e: "👦", t: "Uni hozir boshqa bola ushlab turibdi." },
  { e: "⏳", t: "Men navbat kutaman. Kutish qiyin, lekin men uddalayman." }, { e: "🗣️", t: "Muloyim so'rayman: «Menga ham berasanmi?»" },
  { e: "🤝", t: "U bersa, «Rahmat» deyman. Keyin birga o'ynaymiz!" },
];
export const SchoolStory = () => <Story pages={SCHOOL} />;
export const QueueStory = () => <Story pages={QUEUE} />;

/* "What do I do?" - choose the kind / safe reaction. Wrong choices explain why, no scolding. */
const SITUATIONS = [
  { e: "😢", q: "Do'sting yiqilib ketdi va yig'layapti. Nima qilasan?", opts: [
    { t: "Kulaman", why: "Kulish uni yanada xafa qiladi." },
    { t: "Yordam beraman: «Yaxshimisan?»", good: true, why: "To'g'ri! Yordam so'rash do'stingga yaxshi his qildiradi." },
    { t: "Indamay ketaman", why: "Do'sting yordamga muhtoj, unga e'tibor ber." }] },
  { e: "🎁", q: "Senga sovg'a berishdi. Nima deysan?", opts: [
    { t: "Hech narsa demayman", why: "Minnatdorchilik bildirish yaxshi." },
    { t: "«Rahmat!» deyman", good: true, why: "To'g'ri! «Rahmat» — chiroyli so'z." },
    { t: "«Menga kerak emas» deyman", why: "Bu odamni xafa qilishi mumkin." }] },
  { e: "🔊", q: "Sinfda ovoz juda baland, qulog'ing og'riyapti. Nima qilasan?", opts: [
    { t: "Qichqiraman", why: "Qichqirish ovozni yanada baland qiladi." },
    { t: "Qo'limni ko'taraman: «Menga tinchroq joy kerak»", good: true, why: "Juda to'g'ri! O'zingga kerakli narsani aytish — kuchli ish." },
    { t: "Jim turib chidayman", why: "Chidash shart emas — yordam so'rashing mumkin." }] },
  { e: "🧒", q: "Sinfga yangi bola keldi. Nima qilasan?", opts: [
    { t: "«Salom! Ismim ... O'ynaymizmi?» deyman", good: true, why: "To'g'ri! Salomlashish do'stlik boshlaydi." },
    { t: "Qaramayman", why: "Yangi bola yolg'iz his qilishi mumkin." },
    { t: "Uning narsasini olaman", why: "Birovning narsasini so'rab olish kerak." }] },
  { e: "⏳", q: "Navbat senga kelmadi, lekin juda xohlayapsan. Nima qilasan?", opts: [
    { t: "Tortib olaman", why: "Tortib olish boshqani xafa qiladi." },
    { t: "Baqirib yig'layman", why: "Baqirish yordam bermaydi." },
    { t: "Chuqur nafas olib, navbatimni kutaman", good: true, why: "Zo'r! Kutish qiyin, lekin sen uddalading." }] },
];
export function Situations() {
  const act = useAct();
  useTotal(SITUATIONS.length);
  const rounds = useMemo(() => SITUATIONS.map((s) => ({ ...s, opts: shuffle(s.opts) })), []);
  const [i, setI] = useState(0);
  const [pick, setPick] = useState(null);
  const [solved, setSolved] = useState(false);
  const s = rounds[Math.min(i, rounds.length - 1)];
  const choose = (o, k) => {
    if (solved) return;
    setPick(k);
    if (o.good) { setSolved(true); act.ok({ say: false }); act.say(o.why); } else { act.miss({ say: false }); }
  };
  const chosen = pick != null ? s.opts[pick] : null;
  return (
    <div className="situation">
      <div className="bigcard" key={i}>
        <div className="bigemoji" role="img" aria-label="Vaziyat">{s.e}</div>
        <p className="story__text">{s.q}</p>
        <button type="button" className="btn btn--sky btn--sm" onClick={() => { play("pop"); act.say(s.q, { force: true }); }}>🔊 Eshit</button>
      </div>
      <div className="situation__opts" role="group" aria-label="Javoblar">
        {s.opts.map((o, k) => <button key={o.t} type="button" className={`sopt ${pick === k ? (o.good ? "is-good" : "is-bad") : ""}`} onClick={() => choose(o, k)} disabled={solved && !o.good}>{o.t}</button>)}
      </div>
      {chosen && <p className={`situation__why ${chosen.good ? "is-good" : ""}`} role="status">{chosen.why}{!chosen.good && " Yana urinib ko'r!"}</p>}
      {solved && i < rounds.length - 1 && <button type="button" className="btn btn--sun btn--lg" onClick={() => { play("whoosh"); setI(i + 1); setPick(null); setSolved(false); }}>Keyingi →</button>}
    </div>
  );
}
