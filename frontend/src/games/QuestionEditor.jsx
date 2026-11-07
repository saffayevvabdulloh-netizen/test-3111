import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/client";
import { useSingleFlight } from "../hooks/useApi";
import Icon from "../ui/Icon";
import { Banner, Button, Field } from "../ui/kit";
import { TYPES } from "./registry";

const snap = (s) => JSON.stringify(s);

// Local draft + explicit Save. "Saved" is only ever shown after the API said OK.
export default function QuestionEditor({ game, question, locked, onSaved, onCancel, onDirty, onConflict, onImageChanged }) {
  const type = TYPES[game.game_type];
  const initial = useMemo(() => (question
    ? { prompt: question.prompt, points: question.points, hint: question.hint || "", explanation: question.explanation || "", content: type.fromApi(question.content) }
    : { prompt: "", points: 10, hint: "", explanation: "", content: type.empty() }), []); // eslint-disable-line
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [clientErr, setClientErr] = useState(null);
  const [imgBusy, setImgBusy] = useState(false);
  const fileRef = useRef(null);
  const flight = useSingleFlight();
  const dirty = snap(s) !== snap(initial);
  const Editor = type.Editor;
  const fe = err?.fields || {};

  useEffect(() => { onDirty?.(dirty); }, [dirty]); // eslint-disable-line
  useEffect(() => () => onDirty?.(false), []);     // eslint-disable-line

  const patch = (p) => { setS((x) => ({ ...x, ...p })); setClientErr(null); };

  const save = () => flight(doSave);
  async function doSave() {
    if (locked) return;
    const pts = Number(s.points);
    const ce = !s.prompt.trim() ? "Savol matnini yozing."
      : !Number.isInteger(pts) || pts < 1 || pts > 100 ? "Ball 1 dan 100 gacha butun son bo'lishi kerak."
      : type.validate(s.content);
    if (ce) { setClientErr(ce); return; }
    setBusy(true); setErr(null); setClientErr(null);
    const body = { prompt: s.prompt.trim(), points: pts, hint: s.hint.trim(), explanation: s.explanation.trim(), content: type.toApi(s.content) };
    try {
      const saved = question
        ? await api.patch(`/games/${game.id}/questions/${question.id}/`, { ...body, version: question.version })
        : await api.post(`/games/${game.id}/questions/`, body);
      onSaved(saved, !question);
    } catch (e) { setErr(e); }
    setBusy(false);
  }

  async function upload(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setImgBusy(true); setErr(null);
    try { await api.upload(`/games/${game.id}/questions/${question.id}/image/`, f); onImageChanged(); } catch (er) { setErr(er); }
    setImgBusy(false);
  }
  async function dropImage() {
    setImgBusy(true);
    try { await api.del(`/games/${game.id}/questions/${question.id}/image/`); onImageChanged(); } catch (er) { setErr(er); }
    setImgBusy(false);
  }

  return (
    <div className="qed stack" style={{ "--gap": "1rem" }}>
      <Field label="Savol matni" error={fe.prompt || (clientErr && !s.prompt.trim() ? clientErr : null)}>
        <textarea className="textarea" value={s.prompt} maxLength={500} disabled={locked} onChange={(e) => patch({ prompt: e.target.value })}
          placeholder={game.game_type === "true_false" ? "Baholanadigan gapni yozing..." : "Savolni yozing..."} />
      </Field>

      {question ? (
        <div className="qed__img">
          {question.image && <img src={question.image} alt="Savolga biriktirilgan rasm" />}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={upload} aria-label="Savol rasmini tanlash" />
          <Button size="sm" icon={question.image ? "image" : "upload"} loading={imgBusy} disabled={locked} onClick={() => fileRef.current?.click()}>{question.image ? "Rasmni almashtirish" : "Rasm qo'shish"}</Button>
          {question.image && <Button size="sm" variant="ghost" icon="trash" disabled={locked || imgBusy} onClick={dropImage}>Rasmni olib tashlash</Button>}
        </div>
      ) : <p className="hint"><Icon name="image" size={16} /> Rasm qo'shish uchun avval savolni saqlang.</p>}

      <fieldset className="qed__content" disabled={locked}>
        <legend className="label">Javoblar</legend>
        <Editor content={s.content} locked={locked} onChange={(c) => patch({ content: c })} />
        {fe.content && <span className="field__error" role="alert">{fe.content}</span>}
      </fieldset>

      <div className="grid-2">
        <Field label="Maslahat (noto'g'ri javobda ko'rsatiladi)" error={fe.hint} hint="Javobni aytmasdan yo'l ko'rsating.">
          <input className="input" value={s.hint} maxLength={300} disabled={locked} onChange={(e) => patch({ hint: e.target.value })} />
        </Field>
        <Field label="Ball" error={fe.points}>
          <input className="input" type="number" min={1} max={100} inputMode="numeric" value={s.points} disabled={locked} onChange={(e) => patch({ points: e.target.value })} />
        </Field>
      </div>
      <Field label="Tushuntirish (javobdan keyin ko'rsatiladi)" error={fe.explanation}>
        <textarea className="textarea" style={{ minHeight: 64 }} value={s.explanation} maxLength={600} disabled={locked} onChange={(e) => patch({ explanation: e.target.value })} />
      </Field>

      {clientErr && s.prompt.trim() && <Banner tone="error">{clientErr}</Banner>}
      {err && !Object.keys(fe).length && (
        <Banner tone="error" actions={err.code === "version_conflict" && <Button size="sm" onClick={onConflict}>Yangi holatni yuklash</Button>}>{err.message}</Banner>
      )}
      <div className="row">
        <Button variant="primary" loading={busy} disabled={locked || (!!question && !dirty)} onClick={save}>{question ? "Savolni saqlash" : "Savolni qo'shish"}</Button>
        {!question && <Button variant="ghost" onClick={onCancel}>Bekor qilish</Button>}
        {question && dirty && <span className="small" role="status" style={{ color: "#a4540a", fontWeight: 800 }}>Saqlanmagan o'zgarishlar</span>}
        {question && !dirty && <span className="small muted" role="status">Saqlangan</span>}
      </div>
    </div>
  );
}
