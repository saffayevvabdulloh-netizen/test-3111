// "How do you feel today?" - one tap, kept on this device (last 7 days shown as little faces).
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import Face from "../activities/Face";
import { dayKey, lastDays } from "../utils/day";
import { play, speak } from "../utils/sound";

const MOODS = [
  { k: "xursand", label: "Xursand", say: "Ajoyib! Xursandligingdan xursandman!" },
  { k: "uyqu", label: "Charchagan", say: "Dam olish ham muhim. Bugun sekin-asta o'ynaymiz." },
  { k: "xafa", label: "Xafa", say: "Xafa bo'lsang ham mayli. Kerak bo'lsa, ota-onang yoki o'qituvchingga ayt." },
  { k: "jahl", label: "Jahldor", say: "Keling, chuqur nafas olamiz: sekin, sekin, sekin. Hammasi o'tadi." },
  { k: "qorq", label: "Qo'rqqan", say: "Sen xavfsizsan. Kerak bo'lsa, yoningdagi kattadan yordam so'ra." },
];
const store = (uid) => `bolajon.mood.${uid ?? "guest"}`;
const load = (uid) => { try { return JSON.parse(localStorage.getItem(store(uid))) || {}; } catch { return {}; } };

export default function MoodCheckin({ uid }) {
  const [log, setLog] = useState(() => load(uid));
  const [msg, setMsg] = useState("");
  const today = log[dayKey()];
  const days = lastDays(7);
  const persist = (next) => { try { localStorage.setItem(store(uid), JSON.stringify(next)); } catch { /* not saved, still shown */ } };

  // Merge with the server copy: the server wins; days that exist only on this device are pushed up.
  useEffect(() => {
    let dead = false;
    api.get("/me/mood/?days=7").then((rows) => {
      if (dead || !Array.isArray(rows)) return;
      const server = Object.fromEntries(rows.map((r) => [r.day, r.mood]));
      const local = load(uid);
      const keys = new Set(days.map((d) => d.key));
      Object.entries(local).forEach(([day, mood]) => { if (keys.has(day) && !server[day]) api.post("/me/mood/", { mood, day }).catch(() => {}); });
      const merged = { ...local, ...server };
      persist(merged); setLog(merged);
    }).catch(() => {});
    return () => { dead = true; };
  }, [uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const choose = (m) => {
    play("pop");
    const next = { ...log, [dayKey()]: m.k };
    setLog(next); setMsg(m.say); speak(m.say); persist(next);
    api.post("/me/mood/", { mood: m.k, day: dayKey() }).catch(() => {});  // offline? it is re-sent on the next visit
  };
  return (
    <section className="mood card" aria-labelledby="mood-h">
      <h2 id="mood-h">Bugun kayfiyating qanday?</h2>
      <div className="mood__row" role="group" aria-label="Kayfiyatni tanla">
        {MOODS.map((m) => (
          <button key={m.k} type="button" className={`mood__btn ${today === m.k ? "is-on" : ""}`} aria-pressed={today === m.k} onClick={() => choose(m)}>
            <Face k={m.k} size={56} /><span>{m.label}</span>
          </button>
        ))}
      </div>
      <p className="small muted">Kayfiyatingni sinf o'qituvching ko'ra oladi, shunda sengga yordam bera oladi.</p>
      {msg && <p className="mood__msg" role="status">{msg}</p>}
      {["xafa", "jahl", "qorq"].includes(today) && <Link to="/app/fun/nafas" className="btn btn--sky btn--sm mood__calm" onClick={() => play("pop")}>🫧 Tinchlanamiz: nafas olamiz</Link>}
      <div className="mood__week" aria-label="Oxirgi 7 kun">
        {days.map((d) => <span key={d.key} className="mood__day" title={d.label}>{log[d.key] ? <Face k={log[d.key]} size={26} /> : <i />}<small>{d.label}</small></span>)}
      </div>
    </section>
  );
}
