// Full-screen stage shared by all mini games: home button, title bubble, star counter,
// sound switches, mascot with speech bubble, and the "well done" screen.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ComfortToggle, SoundToggle, VoiceToggle } from "../layouts/Parts";
import BreakReminder from "../ui/BreakReminder";
import GuideButton from "../ui/GuideButton";
import Icon from "../ui/Icon";
import Mascot, { MascotSay } from "../ui/Mascot";
import { Button } from "../ui/kit";
import { play, speak, stopSpeak, unlockAudio } from "../utils/sound";
import Deco from "../ui/Deco";
import { bgOf, themeFor } from "./themes";
import { saveStars, syncActivity, totalStars } from "./progress";
import { newStickers } from "./stickers";

const Ctx = createContext(null);
export const useAct = () => useContext(Ctx);
// a game declares how many steps it has (once, after mount)
export function useTotal(n) { const { setTotal } = useContext(Ctx); useEffect(() => setTotal(n), [n, setTotal]); }

const CHEER = ["Barakalla!", "Ofarin!", "Zo'r ishladi!", "Juda yaxshi!", "Qoyil!", "Sen ajoyibsan!", "Judayam yaxshi!", "Mana bu zo'r!", "Barakalla, davom et!"];
const GENTLE = ["Yana bir bor urinib ko'r!", "Deyarli topding!", "Xato qilsang ham zarar yo'q!", "Birga sinab ko'ramiz!", "Hech narsa emas, yana urinamiz!"];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function ActivityFrame({ def, next, children }) {
  const { user } = useAuth();
  const [round, setRound] = useState(0);          // bump to restart the game
  const [total, setTotal] = useState(def.rounds || 1);
  const [done, setDone] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [over, setOver] = useState(false);
  const [fresh, setFresh] = useState([]);   // stickers unlocked by this result
  const [bubble, setBubble] = useState(def.intro || "Boshladik!");
  const timers = useRef([]);
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); };
  useEffect(() => () => { timers.current.forEach(clearTimeout); stopSpeak(); }, []);

  const stars = mistakes === 0 ? 3 : mistakes <= Math.max(1, Math.ceil(total / 3)) ? 2 : 1;
  const finish = useCallback(() => { setOver(true); play("done"); }, []);
  useEffect(() => { if (over) { const before = totalStars(user?.id); saveStars(user?.id, def.id, stars); syncActivity(def.id, stars, mistakes); const won = newStickers(before, totalStars(user?.id)); setFresh(won); if (won.length) later(() => play("badge"), 900); const m = stars === 3 ? "Ajoyib! Hammasini xatosiz bajarding!" : "Barakalla! Mashqni tugatding!"; later(() => speak(m), 500); } }, [over]); // eslint-disable-line

  const api = useMemo(() => ({
    setTotal,
    done, total, mistakes,
    say: (t, { talk = true, force = false } = {}) => { setBubble(t); if (talk) speak(t, { force }); },
    ok: ({ say = true, last = false } = {}) => {
      play("correct"); play("star");
      const m = pick(CHEER); setBubble(m); if (say) speak(m);
      setDone((d) => { const n = d + 1; if (n >= total || last) later(finish, 900); return n; });
    },
    miss: ({ say = true } = {}) => {
      play("wrong"); setMistakes((m) => m + 1);
      const m = pick(GENTLE); setBubble(m); if (say) speak(m);
    },
    finish: () => later(finish, 600),
  }), [done, total, mistakes, finish]); // eslint-disable-line

  const restart = () => { stopSpeak(); setDone(0); setMistakes(0); setOver(false); setFresh([]); setBubble(def.intro || "Boshladik!"); setRound((r) => r + 1); play("whoosh"); };

  const theme = themeFor(def.id);
  return (
    <div className={`act scene scene--${def.scene || "meadow"}`} data-tone={def.tone} data-game={def.id} onPointerDown={unlockAudio}
      style={{ background: bgOf(theme), "--accent": theme.accent, "--theme-c1": theme.c1, "--theme-c2": theme.c2 }}>
      <Deco items={theme.deco} />
      <BreakReminder />
      <header className="act__top">
        <Link to="/app/fun" className="btn btn--sky btn--icon act__home" aria-label="Mashqlar ro'yxati" onClick={() => { play("whoosh"); stopSpeak(); }}><Icon name="home" size={24} /></Link>
        <div className="act__title"><h1><span className="act__badge" aria-hidden="true">{def.emoji}</span>{def.title}</h1>{def.sub && <p>{def.sub}</p>}</div>
        <div className="act__right">
          <span className="act__stars" role="status" aria-label={`${done} / ${total}`}><Icon name="star" size={20} stroke={2} />{Math.min(done, total)}/{total}</span>
          <SoundToggle /><VoiceToggle /><ComfortToggle />
        </div>
      </header>

      <main className="act__stage" key={round}>
        <Ctx.Provider value={api}>{children}</Ctx.Provider>
      </main>

      <aside className="act__mascot" aria-live="polite"><MascotSay mood={over ? "cheer" : "happy"} size={150} speech={bubble} /></aside>

      <footer className="act__foot">
        <Link to="/app/fun" className="btn btn--sky btn--icon" aria-label="Orqaga"><Icon name="arrow-left" size={24} /></Link>
        <span className="act__footbtns">{def.how && <GuideButton text={def.how} label="Tushuntirish" variant="sun" />}<Button size="sm" icon="refresh" onClick={restart}>Qaytadan</Button></span>
      </footer>

      {over && (
        <div className="act__done" role="dialog" aria-modal="true" aria-label="Natija">
          <div className="act__donecard card">
            <Mascot mood="cheer" size={150} className="mascot--bob" />
            <h2>{stars === 3 ? "Ajoyib" : "Barakalla"}{user?.first_name ? `, ${user.first_name}` : ""}!</h2>
            <div className="act__starrow" aria-label={`${stars} yulduz`}>
              {[1, 2, 3].map((n) => <span key={n} className={n <= stars ? "is-on" : ""} style={{ "--i": n }}><Icon name="star" size={54} stroke={2} /></span>)}
            </div>
            {fresh.length > 0 && <p className="newsticker" role="status">Yangi stiker: {fresh.map(([e, n]) => <span key={n} title={n}>{e} {n}</span>)}</p>}
            <p className="muted">{mistakes === 0 ? "Xatosiz bajarding!" : `${mistakes} marta xato qilding, lekin tugatding!`}</p>
            <div className="row" style={{ justifyContent: "center" }}>
              <Button variant="primary" size="lg" icon="refresh" onClick={restart}>Yana o'ynash</Button>
              {next ? <Button to={`/app/fun/${next.id}`} variant="sun" size="lg" onClick={() => play("whoosh")}>Keyingisi<Icon name="arrow-right" size={20} /></Button> : <Button to="/app/fun" variant="sun" size="lg">Mashqlar</Button>}
            </div>
          </div>
          <div className="confetti" aria-hidden="true">{Array.from({ length: 26 }, (_, i) => <i key={i} style={{ "--x": `${(i * 37) % 100}%`, "--d": `${(i % 7) * 0.12}s`, "--c": ["var(--sun)", "var(--emerald)", "var(--coral)", "var(--sky)", "var(--grape)"][i % 5] }} />)}</div>
        </div>
      )}
    </div>
  );
}
