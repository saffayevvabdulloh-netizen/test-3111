// Game player. One component for real attempts and teacher previews.
// Phases:  ready (resume) -> playing -> submitting -> feedback -> (next question)... -> completing -> (result page)
// The page that mounts it handles LOADING / error / unauthorized (see pages/student/Play.jsx).
import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useSingleFlight } from "../hooks/useApi";
import { bgOf, typeTheme } from "../activities/themes";
import Deco from "../ui/Deco";
import Icon from "../ui/Icon";
import Mascot from "../ui/Mascot";
import { Banner, Button, Chip } from "../ui/kit";
import { useConfirm } from "../ui/Modal";
import { fmtClock } from "../utils/format";
import { play } from "../utils/sound";
import { TYPES } from "./registry";
import { typeMeta } from "./meta";

const CHEER = ["Barakalla!", "Ajoyib!", "To'g'ri!", "Zo'r ishladi!", "Juda yaxshi!"];
const GENTLE = ["Hechqisi yo'q, birga ko'ramiz.", "Deyarli bo'ldi!", "Xato qilish — o'rganishning bir qismi.", "Keling, to'g'risini ko'rib chiqamiz."];

function init(data) {
  const fbs = Object.fromEntries((data.answered || []).map((f) => [f.question_id, f]));
  const open = data.questions.findIndex((q) => !fbs[q.id]);
  const resumed = Object.keys(fbs).length > 0;
  const type = TYPES[data.game.game_type];
  return {
    phase: resumed ? "ready" : "playing", idx: open < 0 ? data.questions.length - 1 : open, allDone: open < 0,
    feedbacks: fbs, value: type.initialValue(), error: null,
  };
}

function reducer(s, a) {
  switch (a.t) {
    case "BEGIN": return { ...s, phase: "playing" };
    case "CHANGE": return { ...s, value: a.value, error: null };
    case "SUBMIT_START": return { ...s, phase: "submitting", error: null };
    case "SUBMIT_OK": return { ...s, phase: "feedback", feedbacks: { ...s.feedbacks, [a.qid]: a.fb } };
    case "SUBMIT_FAIL": return { ...s, phase: "playing", error: a.error };
    case "NEXT": return { ...s, phase: "playing", idx: s.idx + 1, value: a.initial, error: null };
    case "FINISHING": return { ...s, phase: "completing", error: null };
    case "FINISH_FAIL": return { ...s, phase: "finish_error", error: a.error };
    default: return s;
  }
}

export default function Player({ data, submit, finish, onFinished, onExit, preview = false }) {
  const confirm = useConfirm();
  const type = TYPES[data.game.game_type];
  const meta = typeMeta(data.game.game_type);
  const [s, d] = useReducer(reducer, data, init);
  const q = data.questions[s.idx];
  const fb = s.feedbacks[q.id];
  const h1 = useRef(null);
  const finishing = useRef(false);
  const flight = useSingleFlight();
  const [left, setLeft] = useState(null);
  const total = data.questions.length;
  const ready = type.ready(s.value, q);
  const answeredCount = Object.keys(s.feedbacks).length;

  // move focus to the new question (screen readers + keyboard users)
  useEffect(() => { if (s.phase === "playing") h1.current?.focus({ preventScroll: true }); }, [s.idx, s.phase === "playing"]); // eslint-disable-line

  async function doFinish(reason) {
    if (finishing.current) return;
    finishing.current = true;
    d({ t: "FINISHING" });
    if (reason === "time") play("tap");
    try {
      const res = await finish(s.feedbacks);
      play("done");
      onFinished(res);
    } catch (e) {
      finishing.current = false;
      d({ t: "FINISH_FAIL", error: e });
    }
  }

  // server-authoritative deadline: the clock is only a display, the API enforces it
  useEffect(() => {
    if (!data.deadline) return undefined;
    const end = new Date(data.deadline).getTime();
    const tick = () => {
      const sec = Math.round((end - Date.now()) / 1000);
      setLeft(sec);
      if (sec <= 0) doFinish("time");
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data.deadline]); // eslint-disable-line

  const check = () => flight(doCheck);
  async function doCheck() {
    if (s.phase !== "playing" || !ready) return;
    d({ t: "SUBMIT_START" });
    try {
      const res = await submit(q.id, type.toAnswer(s.value, q));
      play(res.is_correct ? "correct" : res.partial ? "almost" : "wrong");
      d({ t: "SUBMIT_OK", qid: q.id, fb: res });
    } catch (e) {
      if (e.code === "time_over" || e.code === "attempt_completed") { doFinish("time"); return; }
      d({ t: "SUBMIT_FAIL", error: e });
    }
  }

  function next() {
    if (s.idx >= total - 1) doFinish();
    else d({ t: "NEXT", initial: TYPES[data.game.game_type].initialValue() });
  }

  async function exit() {
    const ok = await confirm({
      title: "O'yindan chiqasizmi?",
      message: preview ? "Ko'rib chiqish to'xtatiladi." : "Javoblaringiz saqlanadi. Keyinroq shu joydan davom etishingiz mumkin.",
      confirmLabel: "Chiqish", cancelLabel: "Qolish",
    });
    if (ok) onExit();
  }

  const steps = useMemo(() => data.questions.map((x, i) => {
    const f = s.feedbacks[x.id];
    return f ? (f.is_correct ? "ok" : f.partial ? "part" : "miss") : i === s.idx ? "now" : "todo";
  }), [data.questions, s.feedbacks, s.idx]);

  const locked = s.phase !== "playing";
  const Renderer = type.Renderer;
  const lowTime = left !== null && left <= 10;
  const msgIdx = (s.idx + (fb?.points_awarded || 0)) % 4;

  const theme = typeTheme(data.game.game_type);
  return (
    <div className="play" data-tone={meta.tone} style={{ background: bgOf(theme), "--accent": theme.accent }}>
      <Deco items={theme.deco} />
      <header className="play__top">
        <Button variant="ghost" className="btn--icon" icon="x" aria-label="Chiqish" onClick={exit} />
        <div className="steps" role="progressbar" aria-label={`Savol ${s.idx + 1} / ${total}`} aria-valuemin={1} aria-valuemax={total} aria-valuenow={s.idx + 1}>
          {steps.map((st, i) => <i key={i} className={`step step--${st}`} />)}
        </div>
        {left !== null
          ? <span className={`timer ${lowTime ? "is-low" : ""}`} role="timer" aria-label={`Qolgan vaqt ${fmtClock(left)}`}><Icon name="clock" size={18} />{fmtClock(left)}</span>
          : <span className="timer timer--count" aria-hidden="true">{s.idx + 1}/{total}</span>}
      </header>

      {preview && <div className="play__banner"><Banner tone="warn">Ko'rib chiqish rejimi — natijalar saqlanmaydi.</Banner></div>}

      <main className="play__main">
        {s.phase === "ready" && (
          <div className="state">
            <Mascot mood="happy" size={120} />
            <h2>Davom etamizmi?</h2>
            <p>{answeredCount} / {total} savolga javob berilgan.{s.allDone ? " Hammasi tugagan — natijani ko'ring." : ""}</p>
            <Button variant="primary" size="lg" onClick={() => (s.allDone ? doFinish() : d({ t: "BEGIN" }))}>{s.allDone ? "Natijani ko'rish" : "Davom etish"}</Button>
          </div>
        )}

        {s.phase === "completing" && (
          <div className="state" role="status"><Mascot mood="cheer" size={120} className="mascot--bob" /><h2>Natijalar hisoblanmoqda...</h2></div>
        )}

        {s.phase === "finish_error" && (
          <div className="state" role="alert">
            <Mascot mood="think" size={110} /><h2>Natijani olib bo'lmadi</h2><p>{s.error?.message}</p>
            <p className="small">Javoblaringiz saqlangan. Qayta urinib ko'ring.</p>
            <Button variant="primary" icon="refresh" onClick={() => doFinish()}>Qayta urinish</Button>
          </div>
        )}

        {["playing", "submitting", "feedback"].includes(s.phase) && (
          <div className="qview">
            <div className="qview__head">
              <Chip tone={meta.tone}>{meta.label}</Chip>
              <span className="small muted">{q.points} ball</span>
            </div>
            <h1 className="q-prompt" ref={h1} tabIndex={-1}>{q.prompt}</h1>
            {q.image && <img className="q-img" src={q.image} alt="Savolga rasm" loading="lazy" />}
            <div className="qview__answer">
              <Renderer q={q} value={s.value} onChange={(v) => d({ t: "CHANGE", value: v })} feedback={fb && s.phase === "feedback" ? fb : null}
                locked={locked} onEnter={check} />
            </div>
            {s.error && <div className="qview__err"><Banner tone="error" actions={<Button size="sm" onClick={check}>Qayta yuborish</Button>}>{s.error.message} Javobingiz saqlanib turibdi.</Banner></div>}
          </div>
        )}
      </main>

      {["playing", "submitting"].includes(s.phase) && (
        <footer className="play__bar">
          <Button variant="primary" size="lg" block loading={s.phase === "submitting"} disabled={!ready} onClick={check}>Tekshirish</Button>
        </footer>
      )}

      {s.phase === "feedback" && fb && (
        <footer className={`play__bar fb fb--${fb.is_correct ? "ok" : fb.partial ? "almost" : "gentle"}`}>
          <div className="fb__inner" role="status" aria-live="polite">
            <Mascot mood={fb.is_correct ? "cheer" : "think"} size={64} />
            <div className="fb__body">
              <strong className="fb__title">{fb.is_correct ? CHEER[msgIdx] : fb.partial ? "Yaxshi, qisman to'g'ri!" : GENTLE[msgIdx]}</strong>
              {fb.points_awarded > 0 && <Chip tone="sun">+{fb.points_awarded} ball</Chip>}
              {!fb.is_correct && fb.hint && <p><b>Maslahat:</b> {fb.hint}</p>}
              {fb.explanation && <p><b>Tushuntirish:</b> {fb.explanation}</p>}
            </div>
            <Button variant="primary" size="lg" onClick={next} autoFocus>{s.idx >= total - 1 ? "Natijani ko'rish" : "Keyingi"}<Icon name="arrow-right" size={20} /></Button>
          </div>
        </footer>
      )}
    </div>
  );
}
