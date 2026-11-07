import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useApi, useTitle } from "../../hooks/useApi";
import { StatusChip } from "../../ui/Cards";
import Icon from "../../ui/Icon";
import { Banner, Button, Field, Load, SkeletonList } from "../../ui/kit";
import { UnsavedModal, useUnsavedGuard } from "../../ui/Guard";
import { useToast } from "../../ui/Toast";

const toForm = (l) => ({ title: l?.title || "", summary: l?.summary || "", subject: l?.subject || "", body: l?.body || "", is_public: l ? l.is_public : true });

export default function LessonEditor() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const toast = useToast();
  const q = useApi(() => (isNew ? Promise.resolve(null) : api.get(`/lessons/${id}/`)), [id], { enabled: true });
  const [lesson, setLesson] = useState(null);
  const [f, setF] = useState(toForm(null));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [upBusy, setUpBusy] = useState(false);
  const file = useRef(null);
  useTitle(isNew ? "Yangi dars" : lesson?.title || "Dars");

  useEffect(() => { if (q.data) { setLesson(q.data); setF(toForm(q.data)); } }, [q.data]);
  const base = JSON.stringify(toForm(lesson));
  const dirty = JSON.stringify(f) !== base && (!isNew || f.title.trim() !== "" || f.body !== "" || f.summary !== "");
  const blocker = useUnsavedGuard(dirty);
  const fe = err?.fields || {};
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function save() {
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      if (isNew) {
        const l = await api.post("/lessons/", { ...f, title: f.title.trim() });
        toast("Dars yaratildi", "ok");
        setLesson(l); setF(toForm(l));
        setTimeout(() => nav(`/teach/lessons/${l.id}`, { replace: true }), 0);
      } else {
        const l = await api.patch(`/lessons/${id}/`, { ...f, title: f.title.trim(), version: lesson.version });
        setLesson(l); setF(toForm(l));
        toast("Saqlandi", "ok");
      }
    } catch (e) { setErr(e); }
    setBusy(false);
  }

  async function action(name, msg) {
    setBusy(true); setErr(null);
    try { const l = await api.post(`/lessons/${id}/${name}/`); setLesson(l); toast(msg, "ok"); } catch (e) { setErr(e); }
    setBusy(false);
  }

  async function cover(e) {
    const file0 = e.target.files?.[0];
    e.target.value = "";
    if (!file0) return;
    setUpBusy(true); setErr(null);
    try { setLesson(await api.upload(`/lessons/${id}/cover/`, file0)); toast("Rasm yuklandi", "ok"); } catch (er) { setErr(er); }
    setUpBusy(false);
  }
  async function dropCover() {
    setUpBusy(true);
    try { setLesson(await api.del(`/lessons/${id}/cover/`)); } catch (er) { setErr(er); }
    setUpBusy(false);
  }

  return (
    <div className="stack" style={{ "--gap": "1.2rem", maxWidth: 860 }}>
      <UnsavedModal blocker={blocker} />
      <Link to="/teach/lessons" className="back"><Icon name="arrow-left" size={18} /> Darslar</Link>
      <Load q={isNew ? { data: {}, loading: false } : q} skeleton={<SkeletonList rows={2} h={160} />}>
        {() => (
          <>
            <div className="row row--between">
              <h1>{isNew ? "Yangi dars" : "Darsni tahrirlash"}</h1>
              {lesson && <StatusChip status={lesson.status} />}
            </div>
            {err && !Object.keys(fe).length && (
              <Banner tone="error" actions={err.code === "version_conflict" && <Button size="sm" onClick={() => window.location.reload()}>Sahifani yangilash</Button>}>{err.message}</Banner>
            )}
            <div className="panel stack" style={{ "--gap": "1rem" }}>
              <Field label="Dars nomi" error={fe.title}><input className="input" value={f.title} maxLength={200} onChange={set("title")} /></Field>
              <div className="grid-2">
                <Field label="Fan (ixtiyoriy)" error={fe.subject}><input className="input" value={f.subject} maxLength={50} placeholder="Matematika" onChange={set("subject")} /></Field>
                <Field label="Qisqa tavsif" error={fe.summary}><input className="input" value={f.summary} maxLength={300} onChange={set("summary")} /></Field>
              </div>
              <Field label="Dars matni" error={fe.body} hint="Oddiy matn. Abzaslar bo'sh qator bilan ajratiladi."><textarea className="textarea" style={{ minHeight: 240 }} value={f.body} maxLength={20000} onChange={set("body")} /></Field>
              <label className="check"><input type="checkbox" checked={f.is_public} onChange={set("is_public")} /><span>Hamma o'quvchilarga ochiq<span className="hint" style={{ display: "block" }}>O'chiq bo'lsa, faqat sizning sinflaringizdagi o'quvchilar ko'radi.</span></span></label>
              <div className="row">
                <Button variant="primary" loading={busy} disabled={!f.title.trim() || (!dirty && !isNew)} onClick={save}>{isNew ? "Yaratish" : "Saqlash"}</Button>
                {!isNew && !dirty && <span className="small muted" role="status">Hammasi saqlangan</span>}
                {dirty && <span className="small" role="status" style={{ color: "#a4540a", fontWeight: 800 }}>Saqlanmagan o'zgarishlar bor</span>}
              </div>
            </div>
            {!isNew && lesson && (
              <>
                <div className="panel stack" style={{ "--gap": "0.8rem" }}>
                  <h2>Muqova rasmi</h2>
                  {lesson.cover && <img className="cover" style={{ maxWidth: 360 }} src={lesson.cover} alt="Dars muqovasi" />}
                  <div className="row">
                    <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" id="lesson-cover" onChange={cover} />
                    <Button size="sm" icon="upload" loading={upBusy} onClick={() => file.current?.click()}>{lesson.cover ? "Almashtirish" : "Rasm yuklash"}</Button>
                    {lesson.cover && <Button size="sm" variant="ghost" icon="trash" disabled={upBusy} onClick={dropCover}>O'chirish</Button>}
                    <span className="hint">JPEG, PNG yoki WEBP, 3 MB gacha.</span>
                  </div>
                </div>
                <div className="panel stack" style={{ "--gap": "0.8rem" }}>
                  <h2>Nashr</h2>
                  <p className="muted">{lesson.status === "published" ? "Dars o'quvchilarga ko'rinmoqda." : "Dars hozircha o'quvchilarga ko'rinmaydi."}</p>
                  <div className="row">
                    {lesson.status !== "published" && <Button variant="primary" icon="send" loading={busy} disabled={dirty} onClick={() => action("publish", "Dars nashr etildi")}>Nashr etish</Button>}
                    {lesson.status === "published" && <Button loading={busy} onClick={() => action("unpublish", "Qoralamaga qaytarildi")}>Qoralamaga qaytarish</Button>}
                    {lesson.status !== "archived" && <Button variant="ghost" icon="archive" disabled={busy} onClick={() => action("archive", "Arxivga o'tkazildi")}>Arxivlash</Button>}
                    {dirty && <span className="hint">Avval o'zgarishlarni saqlang.</span>}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </Load>
    </div>
  );
}
