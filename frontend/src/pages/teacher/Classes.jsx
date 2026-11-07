import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, qs } from "../../api/client";
import { useApi, useSingleFlight, useTitle } from "../../hooks/useApi";
import CopyButton from "../../ui/CopyButton";
import { Banner, Button, Chip, EmptyState, Field, Load, Pager, SkeletonList } from "../../ui/kit";
import { useToast } from "../../ui/Toast";

export default function Classes() {
  useTitle("Sinflar");
  const nav = useNavigate();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const q = useApi(() => api.get(`/classes/${qs({ page })}`), [page]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const flight = useSingleFlight();

  const create = (e) => { e.preventDefault(); return flight(doCreate); };
  async function doCreate() {
    if (!name.trim()) return;
    setBusy(true); setErr(null);
    try {
      const c = await api.post("/classes/", { name: name.trim() });
      toast("Sinf yaratildi", "ok");
      nav(`/teach/classes/${c.id}`);
    } catch (e2) { setErr(e2); setBusy(false); }
  }

  return (
    <div className="stack" style={{ "--gap": "1.3rem" }}>
      <h1>Sinflar</h1>
      <form className="panel inline-form" onSubmit={create} noValidate>
        <Field label="Yangi sinf nomi" error={err?.fields?.name}><input className="input" value={name} maxLength={100} placeholder="Masalan: 5-A sinf" onChange={(e) => setName(e.target.value)} /></Field>
        <Button type="submit" variant="primary" icon="plus" loading={busy} disabled={!name.trim()}>Yaratish</Button>
      </form>
      {err && !err.fields?.name && <Banner tone="error">{err.message}</Banner>}
      <Load q={q} skeleton={<SkeletonList rows={3} h={76} />} isEmpty={(d) => d.results.length === 0}
        empty={<EmptyState title="Hali sinf yo'q">Sinf yarating va o'quvchilarga qo'shilish kodini bering.</EmptyState>}>
        {(d) => (
          <>
            <ul className="list">
              {d.results.map((c) => (
                <li key={c.id} className="list__row">
                  <Link to={`/teach/classes/${c.id}`} className="list__main"><strong>{c.name}</strong><span className="small muted">{c.students_count} o'quvchi</span></Link>
                  <Chip tone="sky">Kod: <span className="mono">{c.join_code}</span></Chip>
                  <CopyButton text={c.join_code} label="Nusxalash" />
                </li>
              ))}
            </ul>
            <Pager page={page} count={d.count} onPage={setPage} />
          </>
        )}
      </Load>
    </div>
  );
}
