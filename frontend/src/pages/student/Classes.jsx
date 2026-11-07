import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useApi, useTitle } from "../../hooks/useApi";
import { Banner, Button, Chip, EmptyState, Field, Load, SkeletonList } from "../../ui/kit";
import { useConfirm } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";
import { dueLabel, nameOf } from "../../utils/format";
import { typeMeta } from "../../games/meta";

const STATUS = { not_started: ["Boshlanmagan", "ink"], in_progress: ["Boshlangan", "sky"], completed: ["Tugatilgan", "emerald"] };

export default function Classes() {
  useTitle("Sinfim");
  const toast = useToast();
  const confirm = useConfirm();
  const classes = useApi(() => api.get("/me/classes/"), []);
  const asg = useApi(() => api.get("/me/assignments/"), []);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function join(e) {
    e.preventDefault();
    if (busy || code.length < 4) return;
    setBusy(true); setErr(null);
    try {
      const c = await api.post("/classes/join/", { code });
      toast(`«${c.name}» sinfiga qo'shildingiz!`, "ok");
      setCode("");
      classes.reload(); asg.reload();
    } catch (e2) { setErr(e2); }
    setBusy(false);
  }

  async function leave(c) {
    if (!(await confirm({ title: `«${c.name}» sinfidan chiqasizmi?`, message: "Sinf topshiriqlari ro'yxatingizdan yo'qoladi. Kod bilan qayta qo'shilishingiz mumkin.", confirmLabel: "Chiqish", tone: "danger" }))) return;
    try { await api.del(`/me/classes/${c.id}/`); toast("Sinfdan chiqdingiz."); classes.reload(); asg.reload(); } catch (e) { toast(e.message, "error"); }
  }

  return (
    <div className="stack" style={{ "--gap": "1.5rem" }}>
      <h1>Sinfim</h1>
      <section className="card card--sky stack" style={{ "--gap": "0.8rem" }}>
        <h2>Sinfga qo'shilish</h2>
        <p>O'qituvchingiz bergan 6 belgili kodni kiriting.</p>
        <form className="join" onSubmit={join}>
          <Field label="Sinf kodi"><input className="input code-input" maxLength={6} value={code} autoCapitalize="characters" autoComplete="off" placeholder="ABC123"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></Field>
          <Button type="submit" variant="primary" loading={busy} disabled={code.length < 4}>Qo'shilish</Button>
        </form>
        {err && <Banner tone="error">{err.message}</Banner>}
      </section>

      <section className="stack" style={{ "--gap": "0.7rem" }}>
        <h2>Sinflarim</h2>
        <Load q={classes} skeleton={<SkeletonList rows={1} h={70} />} isEmpty={(d) => d.results.length === 0}
          empty={<EmptyState title="Siz hali sinfga qo'shilmagansiz">Yuqoridagi maydonga o'qituvchingiz bergan kodni kiriting.</EmptyState>}>
          {(d) => (
            <ul className="list">
              {d.results.map((c) => (
                <li key={c.id} className="list__row">
                  <span className="list__main"><strong>{c.name}</strong><span className="small muted">O'qituvchi: {nameOf(c.teacher)}</span></span>
                  <Button size="sm" variant="ghost" onClick={() => leave(c)}>Chiqish</Button>
                </li>
              ))}
            </ul>
          )}
        </Load>
      </section>

      <section className="stack" style={{ "--gap": "0.7rem" }}>
        <h2>Topshiriqlar</h2>
        <Load q={asg} skeleton={<SkeletonList rows={2} h={70} />} isEmpty={(d) => d.results.length === 0}
          empty={<EmptyState title="Topshiriq yo'q">O'qituvchingiz topshiriq bergach shu yerda ko'rinadi.</EmptyState>}>
          {(d) => (
            <ul className="list">
              {d.results.map((a) => (
                <li key={a.id}>
                  <Link to={`/app/games/${a.game.id}?assignment=${a.id}`} className="list__row">
                    <span className="list__main"><strong>{a.title || a.game.title}</strong>
                      <span className="small muted">{a.classroom.name} · {typeMeta(a.game.game_type).label}{a.best_percent != null ? ` · eng yaxshi ${a.best_percent}%` : ""}</span></span>
                    {a.is_overdue ? <Chip tone="coral">Muddati o'tgan</Chip> : a.due_at && a.status !== "completed" ? <Chip tone="sun">{dueLabel(a.due_at)}</Chip> : null}
                    <Chip tone={STATUS[a.status][1]}>{STATUS[a.status][0]}</Chip>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Load>
      </section>
    </div>
  );
}
