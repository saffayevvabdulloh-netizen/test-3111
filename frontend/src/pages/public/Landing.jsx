import { PURPOSE, TAGLINE } from "../../brand";
import { Button, Chip } from "../../ui/kit";
import Mascot from "../../ui/Mascot";
import Icon from "../../ui/Icon";
import { TYPE_META, TypeIcon } from "../../games/meta";
import { useConfig } from "../../api/config";
import { useTitle } from "../../hooks/useApi";

const LOOP = [
  { icon: "book", t: "O'rgan", d: "Darslarni o'qi, mavzuni tushun." },
  { icon: "gamepad", t: "O'yna", d: "Savollarga javob ber, xatodan o'rgan." },
  { icon: "chart", t: "O'sib bor", d: "Natijalaring va ballaring to'planadi." },
  { icon: "trophy", t: "Yutuq ol", d: "Haqiqiy yutuqlarni ochib bor." },
];

export default function Landing() {
  useTitle("");
  const { registrationOpen } = useConfig();
  const go = registrationOpen ? "/register" : "/login";
  return (
    <>
      <section className="hero">
        <div className="hero__copy stack" style={{ "--gap": "1.1rem" }}>
          <Chip tone="sun">{TAGLINE}</Chip>
          <h1>Bolajon <span className="hl">AI</span></h1>
          <p className="hero__lead">{PURPOSE}. Bolalar uchun sokin va tushunarli mashqlar; mutaxassis, o'qituvchi va ota-onalar uchun esa o'z mashqini yaratish va natijalarni kuzatish joyi.</p>
          <div className="row">
            <Button to={go} variant="primary" size="lg">{registrationOpen ? "Bepul boshlash" : "Kirish"}</Button>
            <Button to="/login" size="lg">Kirish</Button>
          </div>
        </div>
        <div className="hero__art" aria-hidden="true">
          <div className="hero__blob" />
          <Mascot mood="cheer" size={230} className="mascot--bob" />
          {Object.entries(TYPE_META).map(([k, m], i) => (
            <span key={k} className={`hero__tile hero__tile--${i}`} data-tone={m.tone}><TypeIcon type={k} size={30} /></span>
          ))}
        </div>
      </section>

      <section className="loop" aria-labelledby="loop-h">
        <h2 id="loop-h" className="sr-only">Qanday ishlaydi</h2>
        <ol className="loop__list">
          {LOOP.map((s, i) => (
            <li key={s.t} className="loop__step">
              <span className="loop__num">{i + 1}</span>
              <Icon name={s.icon} size={28} />
              <h3>{s.t}</h3>
              <p className="muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="teachers card card--grape">
        <div className="stack" style={{ "--gap": "0.8rem" }}>
          <h2>Mutaxassis yoki o'qituvchimisiz? Mashqni o'zingiz yarating</h2>
          <p>To'rt xil o'yin turi, rasm qo'shish, oldindan ko'rish, sinfga topshirish va har bir savol bo'yicha natijalarni ko'rish.</p>
          <ul className="types-inline">
            {Object.entries(TYPE_META).map(([k, m]) => (
              <li key={k}><Chip tone={m.tone}><TypeIcon type={k} size={18} /> {m.label}</Chip></li>
            ))}
          </ul>
          <div><Button to={go} variant="sun">{registrationOpen ? "O'qituvchi sifatida boshlash" : "Ustoz sifatida kirish"}</Button></div>
        </div>
        <Mascot mood="think" size={150} />
      </section>
    </>
  );
}
