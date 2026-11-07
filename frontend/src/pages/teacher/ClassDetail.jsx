import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, qs } from "../../api/client";
import { useApi, useDebounced, useSingleFlight, useTitle } from "../../hooks/useApi";
import CopyButton from "../../ui/CopyButton";
import Icon from "../../ui/Icon";
import { Banner, Button, Chip, EmptyState, Field, Load, SkeletonList, Tabs } from "../../ui/kit";
import { Modal, useConfirm } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";
import { fmtDate, fmtDateTime, nameOf } from "../../utils/format";
import { typeMeta } from "../../games/meta";
import { ACTIVITIES } from "../../activities/registry";
import Face from "../../activities/Face";
import Avatar from "../../ui/Avatar";
import { downloadCsv } from "../../utils/csv";
import { lastDays } from "../../utils/day";

const STATUS = { completed: ["Tugatgan", "emerald"], in_progress: ["Boshlagan", "sky"], not_started: ["Boshlamagan", "ink"] };

function StudentsTab({ id, onChange }) {
  const q = useApi(() => api.get(`/classes/${id}/students/`), [id]);
  const confirm = useConfirm();
  const toast = useToast();
  async function remove(e) {
    if (!(await confirm({ title: `${nameOf(e.student)} sinfdan chiqarilsinmi?`, message: "O'quvchi kod bilan qayta qo'shilishi mumkin.", confirmLabel: "Chiqarish", tone: "danger" }))) return;
    try { await api.del(`/classes/${id}/students/${e.student.id}/`); toast("O'quvchi chiqarildi."); q.reload(); onChange(); } catch (er) { toast(er.message, "error"); }
  }
  return (
    <Load q={q} skeleton={<SkeletonList rows={3} h={56} />} isEmpty={(d) => d.results.length === 0}
      empty={<EmptyState title="Sinfda hali o'quvchi yo'q">Yuqoridagi kodni o'quvchilarga bering. Ular «Sinfim» bo'limida kodni kiritadi.</EmptyState>}>
      {(d) => (
        <div className="table-wrap"><table className="table">
          <thead><tr><th>O'quvchi</th><th>Foydalanuvchi nomi</th><th>Qo'shilgan</th><th><span className="sr-only">Amal</span></th></tr></thead>
          <tbody>{d.results.map((e) => (
            <tr key={e.id}><td><b>{nameOf(e.student)}</b></td><td>@{e.student.username}</td><td>{fmtDate(e.joined_at)}</td>
              <td className="right"><Button size="sm" variant="ghost" icon="trash" onClick={() => remove(e)}>Chiqarish</Button></td></tr>
          ))}</tbody>
        </table></div>
      )}
    </Load>
  );
}

function AssignModal({ id, open, onClose, onDone }) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const term = useDebounced(search.trim(), 250);
  const games = useApi(() => api.get(`/games/catalog/${qs({ search: term })}`), [term], { enabled: open });
  const [game, setGame] = useState(null);
  const [due, setDue] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const flight = useSingleFlight();
  const submit = () => flight(doSubmit);
  async function doSubmit() {
    if (!game) return;
    setBusy(true); setErr(null);
    try {
      await api.post(`/classes/${id}/assignments/`, { game, ...(due ? { due_at: new Date(due).toISOString() } : {}) });
      toast("Topshiriq berildi", "ok");
      setGame(null); setDue(""); setSearch("");
      onDone(); onClose();
    } catch (e) { setErr(e); }
    setBusy(false);
  }
  return (
    <Modal open={open} onClose={onClose} title="Topshiriq berish"
      actions={<><Button onClick={onClose}>Bekor qilish</Button><Button variant="primary" loading={busy} disabled={!game} onClick={submit}>Topshirish</Button></>}>
      <Field label="O'yinni tanlang"><input className="input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidirish..." /></Field>
      <div className="pick" role="radiogroup" aria-label="O'yinlar">
        {games.loading && !games.data && <p className="muted">Yuklanmoqda...</p>}
        {games.error && <Banner tone="error">{games.error.message}</Banner>}
        {games.data?.results.length === 0 && <p className="muted">Nashr etilgan o'yin topilmadi. Avval o'yinni nashr qiling.</p>}
        {games.data?.results.map((g) => (
          <label key={g.id} className={`pick__row ${game === g.id ? "is-on" : ""}`}>
            <input type="radio" name="game" checked={game === g.id} onChange={() => setGame(g.id)} />
            <span className="grow"><b>{g.title}</b><span className="small muted" style={{ display: "block" }}>{typeMeta(g.game_type).label} · {g.question_count} savol</span></span>
          </label>
        ))}
      </div>
      <Field label="Muddat (ixtiyoriy)" error={err?.fields?.due_at}><input className="input" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      {err && !err.fields?.due_at && <Banner tone="error">{err.message}</Banner>}
    </Modal>
  );
}

function AssignmentsTab({ id }) {
  const q = useApi(() => api.get(`/classes/${id}/assignments/`), [id]);
  const confirm = useConfirm();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [res, setRes] = useState(null);       // {title, loading, error, data}
  async function showResults(a) {
    setRes({ title: a.title || a.game_title, loading: true });
    try { setRes({ title: a.title || a.game_title, data: await api.get(`/assignments/${a.id}/results/`) }); }
    catch (e) { setRes({ title: a.title || a.game_title, error: e }); }
  }
  async function remove(a) {
    if (!(await confirm({ title: "Topshiriq bekor qilinsinmi?", message: "O'quvchilar ro'yxatidan yo'qoladi. O'ynalgan urinishlar saqlanadi.", confirmLabel: "Bekor qilish", cancelLabel: "Qolsin", tone: "danger" }))) return;
    try { await api.del(`/assignments/${a.id}/`); toast("Topshiriq o'chirildi."); q.reload(); } catch (e) { toast(e.message, "error"); }
  }
  return (
    <div className="stack">
      <div><Button variant="primary" icon="plus" onClick={() => setOpen(true)}>Topshiriq berish</Button></div>
      <Load q={q} skeleton={<SkeletonList rows={2} h={64} />} isEmpty={(d) => d.results.length === 0}
        empty={<EmptyState title="Topshiriq yo'q">Nashr etilgan o'yinni sinfga topshiring — o'quvchilar uni «Sinfim» bo'limida ko'radi.</EmptyState>}>
        {(d) => (
          <ul className="list">{d.results.map((a) => (
            <li key={a.id} className="list__row">
              <span className="list__main"><strong>{a.title || a.game_title}</strong><span className="small muted">{a.due_at ? `Muddat: ${fmtDateTime(a.due_at)}` : "Muddatsiz"}</span></span>
              <Button size="sm" icon="chart" onClick={() => showResults(a)}>Natijalar</Button>
              <Button size="sm" variant="ghost" className="btn--icon" icon="trash" aria-label="Topshiriqni bekor qilish" onClick={() => remove(a)} />
            </li>
          ))}</ul>
        )}
      </Load>
      <AssignModal id={id} open={open} onClose={() => setOpen(false)} onDone={q.reload} />
      <Modal open={!!res} onClose={() => setRes(null)} title={res?.title || ""} actions={<Button onClick={() => setRes(null)}>Yopish</Button>}>
        {res?.loading && <p className="muted">Yuklanmoqda...</p>}
        {res?.error && <Banner tone="error">{res.error.message}</Banner>}
        {res?.data && (
          <>
            <p className="small">Tugatgan: <b>{res.data.summary.completed}</b> · Boshlagan: <b>{res.data.summary.in_progress}</b> · Boshlamagan: <b>{res.data.summary.not_started}</b>{res.data.summary.average_best_percent != null && <> · O'rtacha: <b>{res.data.summary.average_best_percent}%</b></>}</p>
            <div className="table-wrap"><table className="table table--compact">
              <thead><tr><th>O'quvchi</th><th>Holat</th><th>Natija</th></tr></thead>
              <tbody>{res.data.students.map((s) => (
                <tr key={s.student.id}><td>{nameOf(s.student)}</td><td><Chip tone={STATUS[s.status][1]}>{STATUS[s.status][0]}</Chip></td><td>{s.best_percent == null ? "—" : `${s.best_percent}% (${s.best_score} ball)`}</td></tr>
              ))}</tbody>
            </table></div>
          </>
        )}
      </Modal>
    </div>
  );
}

const MOOD_LABEL = { xursand: "Xursand", uyqu: "Charchagan", xafa: "Xafa", jahl: "Jahldor", qorq: "Qo'rqqan" };

// Moods the children tapped on their own + mini game stars. Not a diagnosis: a conversation starter.
function exportCsv(d, days) {
  const head = ["O'quvchi", "Foydalanuvchi nomi", "Bugungi kayfiyat", ...days.map((x) => x.key), "Yulduzlar", "O'ynalgan mashqlar", "Qiyin kayfiyat (7 kun)"];
  const rows = d.students.map((s) => { const m = Object.fromEntries(s.moods.map((x) => [x.day, MOOD_LABEL[x.mood]])); return [nameOf(s.student), s.student.username, s.today_mood ? MOOD_LABEL[s.today_mood] : "", ...days.map((x) => m[x.key] || ""), s.stars_total, s.activities_played, s.negative_last_7]; });
  downloadCsv(`kayfiyat-${days[days.length - 1].key}.csv`, [head, ...rows]);
}

function WellbeingTab({ id }) {
  const q = useApi(() => api.get(`/classes/${id}/wellbeing/?days=14`), [id]);
  const days = lastDays(14);
  return (
    <Load q={q} skeleton={<SkeletonList rows={3} h={56} />} isEmpty={(d) => d.students.length === 0}
      empty={<EmptyState title="O'quvchilar yo'q">O'quvchilar sinfga qo'shilgach, ularning kayfiyati va mashq natijalari shu yerda ko'rinadi.</EmptyState>}>
      {(d) => (
        <div className="stack">
          <div className="row" style={{ justifyContent: "flex-end" }}>
            <Button size="sm" icon="download" onClick={() => exportCsv(d, days)}>CSV yuklab olish</Button>
          </div>
          <Banner tone="info" icon="info">Bu ma'lumotni o'quvchining o'zi belgilaydi (kayfiyat) va mashqlar natijasidan olinadi. Bu tibbiy xulosa emas: farqni sezsangiz, bola bilan mehr bilan suhbatlashing.</Banner>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>O'quvchi</th><th>Bugun</th><th>Oxirgi 14 kun</th><th>Yulduzlar</th><th>Mashqlar</th><th><span className="sr-only">Hisobot</span></th></tr></thead>
            <tbody>{d.students.map((s) => {
              const byDay = Object.fromEntries(s.moods.map((m) => [m.day, m.mood]));
              return (
                <tr key={s.student.id}>
                  <td><span className="row" style={{ "--gap": "0.5rem", flexWrap: "nowrap" }}><Avatar name={s.student.avatar} label={nameOf(s.student)} size={32} /><b>{nameOf(s.student)}</b></span>
                    {s.negative_last_7 >= 3 && <Chip tone="coral" title="Oxirgi 7 kunda 3 va undan ko'p marta qiyin kayfiyat">e'tibor bering</Chip>}</td>
                  <td>{s.today_mood ? <span className="moodcell" title={MOOD_LABEL[s.today_mood]}><Face k={s.today_mood} size={30} /><small>{MOOD_LABEL[s.today_mood]}</small></span> : <span className="muted">—</span>}</td>
                  <td><span className="moodstrip" role="img" aria-label={`Oxirgi 14 kun: ${s.moods.length} ta belgi`}>{days.map((x) => byDay[x.key] ? <span key={x.key} title={`${x.label} ${x.key.slice(5)}: ${MOOD_LABEL[byDay[x.key]]}`}><Face k={byDay[x.key]} size={18} /></span> : <i key={x.key} title={`${x.label} ${x.key.slice(5)}: belgilanmagan`} />)}</span></td>
                  <td><b>{s.stars_total}</b> <span className="muted small">/ {ACTIVITIES.length * 3}</span></td>
                  <td>{s.activities_played} / {ACTIVITIES.length}</td>
                  <td><Link className="btn btn--sm" to={`/teach/classes/${id}/report/${s.student.id}`} aria-label={`${nameOf(s.student)}: hisobot`}>Hisobot</Link></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        </div>
      )}
    </Load>
  );
}

function ResultsTab({ id }) {
  const q = useApi(() => api.get(`/classes/${id}/results/`), [id]);
  return (
    <Load q={q} skeleton={<SkeletonList rows={3} h={56} />} isEmpty={(d) => d.students.length === 0}
      empty={<EmptyState title="Natija yo'q">O'quvchilar qo'shilib, topshiriqlarni bajargach natijalar shu yerda ko'rinadi.</EmptyState>}>
      {(d) => (
        <div className="stack">
          <p className="small muted">Faqat shu sinfga berilgan topshiriqlar bo'yicha tugatilgan urinishlar hisoblanadi. Jami topshiriqlar: <b>{d.assignments_total}</b></p>
          <div className="table-wrap"><table className="table">
            <thead><tr><th>O'quvchi</th><th>Bajargan topshiriqlar</th><th>Tugatilgan urinishlar</th><th>O'rtacha natija</th><th>Oxirgi faollik</th></tr></thead>
            <tbody>{d.students.map((s) => (
              <tr key={s.student.id}><td><b>{nameOf(s.student)}</b></td><td>{s.assignments_completed} / {d.assignments_total}</td><td>{s.completed_attempts}</td>
                <td>{s.average_percent == null ? "—" : <Chip tone={s.average_percent >= 60 ? "emerald" : s.average_percent >= 30 ? "sun" : "coral"}>{s.average_percent}%</Chip>}</td><td>{s.last_activity ? fmtDateTime(s.last_activity) : "—"}</td></tr>
            ))}</tbody>
          </table></div>
        </div>
      )}
    </Load>
  );
}

export default function ClassDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const cls = useApi(() => api.get(`/classes/${id}/`), [id]);
  const [tab, setTab] = useState("students");
  const [name, setName] = useState(null);
  useTitle(cls.data?.name || "Sinf");

  async function rename(e) {
    e.preventDefault();
    try { const c = await api.patch(`/classes/${id}/`, { name: name.trim() }); cls.setData(c); setName(null); toast("Saqlandi", "ok"); } catch (er) { toast(er.message, "error"); }
  }
  async function regen() {
    if (!(await confirm({ title: "Yangi kod yaratilsinmi?", message: "Eski kod ishlamay qoladi. Sinfdagi o'quvchilar sinfdan chiqmaydi.", confirmLabel: "Yangi kod" }))) return;
    try { const c = await api.post(`/classes/${id}/regenerate-code/`); cls.setData(c); toast("Yangi kod tayyor", "ok"); } catch (er) { toast(er.message, "error"); }
  }
  async function del() {
    if (!(await confirm({ title: "Sinf o'chirilsinmi?", message: "Sinf, uning topshiriqlari va o'quvchilar a'zoligi o'chadi. Bu amalni qaytarib bo'lmaydi.", confirmLabel: "O'chirish", tone: "danger" }))) return;
    try { await api.del(`/classes/${id}/`); toast("Sinf o'chirildi."); nav("/teach/classes", { replace: true }); } catch (er) { toast(er.message, "error"); }
  }

  return (
    <div className="stack" style={{ "--gap": "1.2rem" }}>
      <Link to="/teach/classes" className="back"><Icon name="arrow-left" size={18} /> Sinflar</Link>
      <Load q={cls} skeleton={<SkeletonList rows={2} h={110} />}>
        {(c) => (
          <>
            <header className="panel class-head">
              <div className="stack" style={{ "--gap": "0.5rem" }}>
                {name === null
                  ? <div className="row"><h1>{c.name}</h1><Button size="sm" variant="ghost" icon="edit" onClick={() => setName(c.name)} aria-label="Nomni o'zgartirish" /></div>
                  : <form className="row" onSubmit={rename}><input className="input" style={{ maxWidth: 320 }} value={name} maxLength={100} onChange={(e) => setName(e.target.value)} aria-label="Sinf nomi" autoFocus /><Button type="submit" size="sm" variant="primary" disabled={!name.trim()}>Saqlash</Button><Button size="sm" onClick={() => setName(null)}>Bekor</Button></form>}
                <p className="muted">{c.students_count} o'quvchi</p>
              </div>
              <div className="code-box">
                <span className="small muted">Qo'shilish kodi</span>
                <b className="code-box__code mono" aria-label={`Kod: ${c.join_code.split("").join(" ")}`}>{c.join_code}</b>
                <div className="row"><CopyButton text={c.join_code} /><Button size="sm" icon="refresh" onClick={regen}>Yangilash</Button></div>
              </div>
            </header>
            <Tabs label="Sinf bo'limlari" value={tab} onChange={setTab} tabs={[{ key: "students", label: "O'quvchilar" }, { key: "assignments", label: "Topshiriqlar" }, { key: "results", label: "Natijalar" }, { key: "wellbeing", label: "Kayfiyat" }]} />
            <div role="tabpanel">
              {tab === "students" && <StudentsTab id={id} onChange={cls.reload} />}
              {tab === "assignments" && <AssignmentsTab id={id} />}
              {tab === "results" && <ResultsTab id={id} />}
              {tab === "wellbeing" && <WellbeingTab id={id} />}
            </div>
            <div><Button variant="ghost" icon="trash" onClick={del}>Sinfni o'chirish</Button></div>
          </>
        )}
      </Load>
    </div>
  );
}
