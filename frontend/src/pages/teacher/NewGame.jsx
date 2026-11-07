import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useApi, useSingleFlight, useTitle } from "../../hooks/useApi";
import { Banner, Button, Field, Load, SkeletonList } from "../../ui/kit";
import { TypeIcon, typeMeta } from "../../games/meta";

export default function NewGame() {
  useTitle("Yangi o'yin");
  const nav = useNavigate();
  const types = useApi(() => api.get("/game-types/"), []);
  const [type, setType] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const flight = useSingleFlight();

  const create = (e) => { e.preventDefault(); return flight(doCreate); };
  async function doCreate() {
    if (!type || !title.trim()) return;
    setBusy(true); setErr(null);
    try {
      const g = await api.post("/games/", { title: title.trim(), game_type: type });
      nav(`/teach/games/${g.id}?tab=questions`, { replace: true });
    } catch (e2) { setErr(e2); setBusy(false); }
  }

  return (
    <form className="stack" style={{ "--gap": "1.4rem", maxWidth: 820 }} onSubmit={create} noValidate>
      <div><h1>Yangi o'yin</h1><p className="muted">1-qadam: o'yin turini tanlang. Keyin savollar qo'shasiz.</p></div>
      <Load q={types} skeleton={<SkeletonList rows={2} h={110} />}>
        {(list) => (
          <fieldset className="type-pick">
            <legend className="sr-only">O'yin turi</legend>
            {list.map((t) => {
              const m = typeMeta(t.key);
              return (
                <label key={t.key} className={`type-opt ${type === t.key ? "is-on" : ""}`} data-tone={m.tone}>
                  <input type="radio" name="type" value={t.key} checked={type === t.key} onChange={() => setType(t.key)} />
                  <span className="type-opt__ico"><TypeIcon type={t.key} size={34} /></span>
                  <span><b>{m.label}</b><small>{t.description}</small></span>
                </label>
              );
            })}
          </fieldset>
        )}
      </Load>
      <Field label="O'yin nomi" error={err?.fields?.title} hint="Keyin o'zgartirishingiz mumkin."><input className="input" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Kasrlar bilan tanishamiz" /></Field>
      {err && !err.fields?.title && <Banner tone="error">{err.message}</Banner>}
      <div className="row"><Button type="submit" variant="primary" size="lg" loading={busy} disabled={!type || !title.trim()} icon="arrow-right">Davom etish</Button><Button to="/teach/games" variant="ghost">Bekor qilish</Button></div>
    </form>
  );
}
