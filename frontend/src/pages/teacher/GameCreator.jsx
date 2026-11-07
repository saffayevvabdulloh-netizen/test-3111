import { useCallback, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { useApi, useSingleFlight, useTitle } from "../../hooks/useApi";
import QuestionEditor from "../../games/QuestionEditor";
import { TYPES } from "../../games/registry";
import { TypeIcon, typeMeta } from "../../games/meta";
import { StatusChip } from "../../ui/Cards";
import Icon from "../../ui/Icon";
import { Banner, Button, Chip, Field, Load, SkeletonList, Tabs } from "../../ui/kit";
import { UnsavedModal, useUnsavedGuard } from "../../ui/Guard";
import { useConfirm } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";
import { fmtDateTime } from "../../utils/format";

const snap = (x) => JSON.stringify(x);
const toMeta = (g) => ({ title: g.title, description: g.description || "", subject: g.subject || "", is_public: g.is_public, lesson: g.lesson ?? "", config: { ...g.config } });
const TIME_PRESETS = [null, 30, 60, 120, 180, 300, 600, 900, 1200, 1800, 3600];
const timeLabel = (s) => (s === null ? "Cheklovsiz" : s < 60 ? `${s} soniya` : `${s / 60} daqiqa`);

function Creator({ game, setGame, reload }) {
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [sp] = useSearchParams();
  const type = TYPES[game.game_type];
  const meta = typeMeta(game.game_type);
  const lessons = useApi(() => api.get("/lessons/"), []);

  const [step, setStep] = useState(sp.get("tab") === "questions" ? "questions" : "info");
  const [form, setForm] = useState(() => toMeta(game));
  const [metaBusy, setMetaBusy] = useState(false);
  const [metaErr, setMetaErr] = useState(null);
  const [dirtyMap, setDirtyMap] = useState({});
  const [open, setOpen] = useState(() => new Set(game.questions.length === 0 ? ["new"] : []));
  const [rowBusy, setRowBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [pubBusy, setPubBusy] = useState(false);
  const [problems, setProblems] = useState(null);
  const coverRef = useRef(null);
  const flight = useSingleFlight();

  const setDirty = useCallback((k, v) => setDirtyMap((m) => (m[k] === v ? m : { ...m, [k]: v })), []);
  const metaDirty = snap(form) !== snap(toMeta(game));
  const qDirty = Object.values(dirtyMap).some(Boolean);
  const anyDirty = metaDirty || qDirty;
  const blocker = useUnsavedGuard(anyDirty);
  const locked = game.has_attempts;
  const fe = metaErr?.fields || {};
  const qCount = game.questions.length;

  const setF = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const setCfg = (k, v) => setForm((s) => ({ ...s, config: { ...s.config, [k]: v } }));
  const toggle = (k) => setOpen((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const saveMeta = () => flight(doSaveMeta);
  async function doSaveMeta() {
    if (!form.title.trim()) return;
    setMetaBusy(true); setMetaErr(null);
    try {
      const fresh = await api.patch(`/games/${game.id}/`, {
        title: form.title.trim(), description: form.description.trim(), subject: form.subject.trim(),
        is_public: form.is_public, lesson: form.lesson ? Number(form.lesson) : null, config: form.config, version: game.version,
      });
      setGame(fresh); setForm(toMeta(fresh));
      toast("Saqlandi", "ok");
    } catch (e) { setMetaErr(e); }
    setMetaBusy(false);
  }
  async function reloadFromServer() {
    const fresh = await reload();
    if (fresh) { setForm(toMeta(fresh)); setMetaErr(null); }
  }

  async function uploadCover(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setCoverBusy(true); setMetaErr(null);
    try { setGame(await api.upload(`/games/${game.id}/cover/`, f)); toast("Rasm yuklandi", "ok"); } catch (er) { setMetaErr(er); }
    setCoverBusy(false);
  }
  async function dropCover() {
    setCoverBusy(true);
    try { setGame(await api.del(`/games/${game.id}/cover/`)); } catch (er) { setMetaErr(er); }
    setCoverBusy(false);
  }

  async function rowAction(fn, okMsg) {
    if (rowBusy) return;
    setRowBusy(true);
    try { await fn(); if (okMsg) toast(okMsg, "ok"); await reload(); } catch (e) { toast(e.message, "error"); }
    setRowBusy(false);
  }
  const move = (i, dir) => {
    const ids = game.questions.map((q) => q.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    return rowAction(() => api.post(`/games/${game.id}/questions/reorder/`, { order: ids }));
  };
  const dupQ = (q) => rowAction(() => api.post(`/games/${game.id}/questions/${q.id}/duplicate/`), "Savol nusxalandi");
  async function delQ(q, i) {
    if (!(await confirm({ title: `${i + 1}-savol o'chirilsinmi?`, message: "Bu amalni qaytarib bo'lmaydi.", confirmLabel: "O'chirish", tone: "danger" }))) return;
    rowAction(() => api.del(`/games/${game.id}/questions/${q.id}/`), "Savol o'chirildi");
  }
  async function onSaved(saved, wasNew) {
    toast(wasNew ? "Savol qo'shildi" : "Savol saqlandi", "ok");
    if (wasNew) setOpen((s) => { const n = new Set(s); n.delete("new"); return n; });
    await reload();
  }

  const publishAction = (name, msg) => flight(() => doPublish(name, msg));
  async function doPublish(name, msg) {
    setPubBusy(true); setProblems(null);
    try { setGame(await api.post(`/games/${game.id}/${name}/`)); toast(msg, "ok"); }
    catch (e) { if (e.data?.problems) setProblems(e.data.problems); else toast(e.message, "error"); }
    setPubBusy(false);
  }
  async function makeCopy() {
    try { const g = await api.post(`/games/${game.id}/duplicate/`); toast("Nusxa yaratildi", "ok"); nav(`/teach/games/${g.id}?tab=questions`); } catch (e) { toast(e.message, "error"); }
  }

  const qErrors = game.questions.map((q, i) => ({ i, id: q.id, err: type.validate(type.fromApi(q.content)) })).filter((x) => x.err);
  const checks = [
    [game.title.trim().length > 0, "O'yin nomi yozilgan"],
    [qCount > 0, `Kamida 1 ta savol bor (hozir ${qCount})`],
    [qErrors.length === 0, "Barcha savollar to'liq to'ldirilgan"],
    [!anyDirty, "Saqlanmagan o'zgarishlar yo'q"],
  ];
  const canPublish = checks.every(([ok]) => ok);
  const timeOptions = TIME_PRESETS.includes(form.config.time_limit_seconds) ? TIME_PRESETS : [...TIME_PRESETS, form.config.time_limit_seconds].sort((a, b) => (a ?? -1) - (b ?? -1));
  const saveBar = (
    <div className="row">
      <Button variant="primary" loading={metaBusy} disabled={!metaDirty || !form.title.trim()} onClick={saveMeta}>Saqlash</Button>
      {metaDirty ? <span className="small" role="status" style={{ color: "#a4540a", fontWeight: 800 }}>Saqlanmagan o'zgarishlar bor</span> : <span className="small muted" role="status">Hammasi saqlangan</span>}
    </div>
  );
  const metaError = metaErr && !Object.keys(fe).length && (
    <Banner tone="error" actions={metaErr.code === "version_conflict" && <Button size="sm" onClick={reloadFromServer}>Yangi holatni yuklash</Button>}>{metaErr.message}</Banner>
  );

  return (
    <div className="stack creator" style={{ "--gap": "1.1rem" }}>
      <UnsavedModal blocker={blocker} />
      <Link to="/teach/games" className="back"><Icon name="arrow-left" size={18} /> O'yinlar</Link>
      <header className="creator__head">
        <span className="grow-row__ico" data-tone={meta.tone}><TypeIcon type={game.game_type} size={30} /></span>
        <div className="grow">
          <h1 className="truncate">{game.title}</h1>
          <div className="row" style={{ "--gap": "0.4rem" }}><StatusChip status={game.status} /><Chip tone={meta.tone} plain>{meta.label}</Chip><span className="small muted">{qCount} savol · {game.max_score} ball</span></div>
        </div>
        <div className="row">
          {locked && <Button to={`/teach/games/${game.id}/stats`} icon="chart">Statistika</Button>}
          <Button to={`/teach/games/${game.id}/preview`} icon="eye">Ko'rib chiqish</Button>
        </div>
      </header>

      {locked && (
        <Banner tone="warn" actions={<Button size="sm" onClick={makeCopy}>Nusxa olib tahrirlash</Button>}>
          Bu o'yinni o'quvchilar o'ynagan, shuning uchun savollarni o'zgartirib bo'lmaydi (natijalar buzilmasligi uchun). Nom, tavsif va sozlamalarni o'zgartirish mumkin.
        </Banner>
      )}
      {game.status === "published" && !locked && <Banner tone="info">O'yin nashr etilgan: o'zgarishlar o'quvchilarga darhol ko'rinadi.</Banner>}

      <Tabs label="Yaratish qadamlari" value={step} onChange={setStep} tabs={[
        { key: "info", label: "1 · Ma'lumot" }, { key: "questions", label: `2 · Savollar (${qCount})${qDirty ? " •" : ""}` },
        { key: "settings", label: "3 · Sozlamalar" }, { key: "publish", label: "4 · Nashr" }]} />

      {/* --------------------------------------------------- 1. INFO */}
      <section role="tabpanel" hidden={step !== "info"} className="panel stack" style={{ "--gap": "1rem" }} aria-label="Ma'lumot">
        <Field label="O'yin nomi" error={fe.title}><input className="input" value={form.title} maxLength={120} onChange={setF("title")} /></Field>
        <Field label="Tavsif" error={fe.description} hint="O'quvchi o'yin kartasida ko'radi."><textarea className="textarea" style={{ minHeight: 76 }} value={form.description} maxLength={500} onChange={setF("description")} /></Field>
        <div className="grid-2">
          <Field label="Fan (ixtiyoriy)" error={fe.subject}><input className="input" value={form.subject} maxLength={50} placeholder="Matematika" onChange={setF("subject")} /></Field>
          <Field label="Dars (ixtiyoriy)" error={fe.lesson} hint="O'yinni darsga bog'laydi.">
            <select className="select" value={form.lesson} onChange={setF("lesson")}>
              <option value="">— Darssiz —</option>
              {(lessons.data?.results || []).map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
            </select>
          </Field>
        </div>
        <label className="check"><input type="checkbox" checked={form.is_public} onChange={setF("is_public")} />
          <span>Hamma o'quvchilarga ochiq<span className="hint" style={{ display: "block" }}>O'chiq bo'lsa, faqat sizning sinflaringizdagi o'quvchilar o'ynay oladi.</span></span></label>
        <div className="qed__img">
          {game.cover && <img src={game.cover} alt="O'yin muqovasi" />}
          <input ref={coverRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={uploadCover} aria-label="Muqova rasmini tanlash" />
          <Button size="sm" icon="upload" loading={coverBusy} onClick={() => coverRef.current?.click()}>{game.cover ? "Muqovani almashtirish" : "Muqova rasmi"}</Button>
          {game.cover && <Button size="sm" variant="ghost" icon="trash" disabled={coverBusy} onClick={dropCover}>Olib tashlash</Button>}
          <span className="hint">JPEG, PNG yoki WEBP, 3 MB gacha.</span>
        </div>
        {metaError}
        {saveBar}
      </section>

      {/* --------------------------------------------------- 2. QUESTIONS */}
      <section role="tabpanel" hidden={step !== "questions"} className="stack" style={{ "--gap": "0.8rem" }} aria-label="Savollar">
        {qCount === 0 && !open.has("new") && <p className="muted">Hali savol yo'q. Birinchi savolni qo'shing.</p>}
        <ol className="qlist">
          {game.questions.map((q, i) => {
            const key = `q${q.id}`;
            const isOpen = open.has(key);
            return (
              <li key={q.id} className={`qcard ${isOpen ? "is-open" : ""}`}>
                <div className="qcard__head">
                  <button type="button" className="qcard__toggle" aria-expanded={isOpen} aria-controls={`qb-${q.id}`} onClick={() => toggle(key)}>
                    <span className="qcard__n">{i + 1}</span>
                    <span className="qcard__text"><span className="qcard__t">{q.prompt}</span><span className="small muted">{type.summary(type.fromApi(q.content))} · {q.points} ball{q.image ? " · rasm bor" : ""}</span></span>
                    {dirtyMap[key] && <Chip tone="sun">Saqlanmagan</Chip>}
                    <Icon name={isOpen ? "chevron-up" : "chevron-down"} size={20} />
                  </button>
                  <div className="qcard__acts">
                    <Button size="sm" variant="ghost" className="btn--icon" icon="up" aria-label={`${i + 1}-savolni yuqoriga`} disabled={locked || rowBusy || i === 0} onClick={() => move(i, -1)} />
                    <Button size="sm" variant="ghost" className="btn--icon" icon="down" aria-label={`${i + 1}-savolni pastga`} disabled={locked || rowBusy || i === qCount - 1} onClick={() => move(i, 1)} />
                    <Button size="sm" variant="ghost" className="btn--icon" icon="copy" aria-label={`${i + 1}-savolni nusxalash`} disabled={locked || rowBusy} onClick={() => dupQ(q)} />
                    <Button size="sm" variant="ghost" className="btn--icon" icon="trash" aria-label={`${i + 1}-savolni o'chirish`} disabled={locked || rowBusy} onClick={() => delQ(q, i)} />
                  </div>
                </div>
                {isOpen && (
                  <div id={`qb-${q.id}`} className="qcard__body">
                    <QuestionEditor key={`${q.id}:${q.version}`} game={game} question={q} locked={locked} onSaved={onSaved}
                      onDirty={(v) => setDirty(key, v)} onConflict={reloadFromServer} onImageChanged={reload} />
                  </div>
                )}
              </li>
            );
          })}
          {open.has("new") && (
            <li className="qcard is-open is-new">
              <div className="qcard__head"><span className="qcard__n">{qCount + 1}</span><strong className="qcard__t">Yangi savol</strong></div>
              <div className="qcard__body">
                <QuestionEditor key="new" game={game} question={null} locked={locked} onSaved={onSaved} onDirty={(v) => setDirty("new", v)}
                  onCancel={() => setOpen((s) => { const n = new Set(s); n.delete("new"); return n; })} />
              </div>
            </li>
          )}
        </ol>
        {!open.has("new") && <div><Button variant="primary" icon="plus" disabled={locked || qCount >= 50} onClick={() => setOpen((s) => new Set(s).add("new"))}>Savol qo'shish</Button>{qCount >= 50 && <span className="hint"> Eng ko'pi 50 ta savol.</span>}</div>}
      </section>

      {/* --------------------------------------------------- 3. SETTINGS */}
      <section role="tabpanel" hidden={step !== "settings"} className="panel stack" style={{ "--gap": "1rem" }} aria-label="Sozlamalar">
        <label className="check"><input type="checkbox" checked={form.config.shuffle_questions} onChange={(e) => setCfg("shuffle_questions", e.target.checked)} /><span>Savollar tartibini aralashtirish<span className="hint" style={{ display: "block" }}>Har bir o'quvchi uchun tartib boshqacha bo'ladi.</span></span></label>
        <label className="check"><input type="checkbox" checked={form.config.shuffle_options} onChange={(e) => setCfg("shuffle_options", e.target.checked)} /><span>Javob variantlarini aralashtirish<span className="hint" style={{ display: "block" }}>Viktorina variantlariga ta'sir qiladi. «Juftlash»da o'ng ustun doim aralashtiriladi.</span></span></label>
        <label className="check"><input type="checkbox" checked={form.config.reveal_answers} onChange={(e) => setCfg("reveal_answers", e.target.checked)} /><span>Xato javobdan keyin to'g'ri javobni ko'rsatish<span className="hint" style={{ display: "block" }}>Bolalar xatodan o'rganishi uchun yoqilgani tavsiya etiladi.</span></span></label>
        <Field label="Vaqt cheklovi" error={fe.config} hint="Vaqt serverda tekshiriladi. Tugagach o'yin yakunlanadi.">
          <select className="select" value={form.config.time_limit_seconds ?? ""} onChange={(e) => setCfg("time_limit_seconds", e.target.value === "" ? null : Number(e.target.value))}>
            {timeOptions.map((t) => <option key={String(t)} value={t ?? ""}>{timeLabel(t)}</option>)}
          </select>
        </Field>
        {metaError}
        {saveBar}
      </section>

      {/* --------------------------------------------------- 4. PUBLISH */}
      <section role="tabpanel" hidden={step !== "publish"} className="stack" style={{ "--gap": "1rem" }} aria-label="Nashr">
        <div className="panel stack" style={{ "--gap": "0.8rem" }}>
          <h2>Nashrdan oldin tekshiruv</h2>
          <ul className="checks">
            {checks.map(([ok, t]) => <li key={t} className={ok ? "is-ok" : "is-bad"}><Icon name={ok ? "check" : "x"} size={18} stroke={3} />{t}</li>)}
          </ul>
          {qErrors.length > 0 && <Banner tone="warn">To'liq bo'lmagan savollar: {qErrors.map((e) => `${e.i + 1}-savol (${e.err})`).join("; ")}</Banner>}
          {problems && (
            <Banner tone="error">
              Server nashrga ruxsat bermadi:
              <ul>{problems.map((p, k) => <li key={k}>{p.question_id ? `${game.questions.findIndex((q) => q.id === p.question_id) + 1}-savol: ` : ""}{p.errors.join(", ")}</li>)}</ul>
            </Banner>
          )}
          {game.status === "published"
            ? <p>Nashr etilgan{game.published_at ? ` · ${fmtDateTime(game.published_at)}` : ""}. O'quvchilar uni {game.is_public ? "katalogda" : "sizning sinflaringizda"} ko'radi.</p>
            : game.status === "archived" ? <p>O'yin arxivda: o'quvchilarga ko'rinmaydi.</p> : <p>O'yin hozircha qoralama: o'quvchilarga ko'rinmaydi.</p>}
          <div className="row">
            {game.status !== "published" && <Button variant="primary" size="lg" icon="send" loading={pubBusy} disabled={!canPublish} onClick={() => publishAction("publish", "O'yin nashr etildi!")}>Nashr etish</Button>}
            {game.status === "published" && <Button loading={pubBusy} onClick={() => publishAction("unpublish", "Qoralamaga qaytarildi")}>Qoralamaga qaytarish</Button>}
            {game.status !== "archived" && <Button variant="ghost" icon="archive" disabled={pubBusy} onClick={() => publishAction("archive", "Arxivga o'tkazildi")}>Arxivlash</Button>}
            <Button icon="eye" to={`/teach/games/${game.id}/preview`}>Ko'rib chiqish</Button>
          </div>
        </div>
        {game.status === "published" && (
          <div className="panel stack" style={{ "--gap": "0.6rem" }}>
            <h2>Keyingi qadam</h2>
            <p>O'yinni sinfga topshiring — o'quvchilar uni «Sinfim» bo'limida ko'radi.</p>
            <div className="row"><Button to="/teach/classes" variant="primary" icon="users">Sinfga topshirish</Button><Button to={`/teach/games/${game.id}/stats`} icon="chart">Statistika</Button></div>
          </div>
        )}
      </section>
    </div>
  );
}

export default function GameCreator() {
  const { id } = useParams();
  const q = useApi(() => api.get(`/games/${id}/`), [id]);
  useTitle(q.data?.title || "O'yin");
  return (
    <Load q={q} skeleton={<SkeletonList rows={3} h={120} />}>
      {(g) => (
        g.questions
          ? <Creator key={g.id} game={g} setGame={q.setData} reload={q.reload} />
          : <div className="state"><h2>Bu o'yinni tahrirlash huquqingiz yo'q</h2><Button to="/teach/games">O'yinlarim</Button></div>
      )}
    </Load>
  );
}
