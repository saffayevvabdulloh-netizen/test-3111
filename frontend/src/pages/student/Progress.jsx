import { useState } from "react";
import { Link } from "react-router-dom";
import { api, qs } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import Stickers from "../../ui/Stickers";
import { useApi, useTitle } from "../../hooks/useApi";
import { AchBadge } from "../../ui/Cards";
import { Chip, EmptyState, Load, Pager, SkeletonList } from "../../ui/kit";
import { fmtDateTime } from "../../utils/format";

export default function Progress() {
  useTitle("Yutuqlar");
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const prog = useApi(() => api.get("/me/progress/"), []);
  const hist = useApi(() => api.get(`/me/attempts/${qs({ status: "completed", page })}`), [page]);
  return (
    <div className="stack" style={{ "--gap": "1.5rem" }}>
      <h1>Yutuqlarim</h1>
      <Stickers uid={user.id} />
      <Load q={prog} skeleton={<SkeletonList rows={2} h={110} />}>
        {(p) => (
          <>
            <section className="stats" aria-label="Umumiy natijalar">
              {[["Tugatilgan o'yinlar", p.completed_attempts], ["Turli o'yinlar", p.games_played], ["Jami ball", p.total_points],
                ["O'rtacha natija", p.average_percent == null ? "—" : `${p.average_percent}%`], ["100% natijalar", p.perfect_scores]].map(([l, v]) => (
                <div key={l} className="stat"><b>{v}</b><span>{l}</span></div>
              ))}
            </section>
            <section className="stack" style={{ "--gap": "0.7rem" }}>
              <h2>Nishonlar <span className="muted small">({p.achievements.filter((a) => a.earned).length}/{p.achievements.length})</span></h2>
              <div className="achs">{p.achievements.map((a) => <AchBadge key={a.key} a={a} />)}</div>
            </section>
          </>
        )}
      </Load>
      <section className="stack" style={{ "--gap": "0.7rem" }}>
        <h2>Tarix</h2>
        <Load q={hist} skeleton={<SkeletonList rows={3} h={64} />} isEmpty={(d) => d.results.length === 0}
          empty={<EmptyState title="Hali tugatilgan o'yin yo'q">Birinchi o'yinni tugatganingda natijang shu yerda paydo bo'ladi.</EmptyState>}>
          {(d) => (
            <>
              <ul className="list">
                {d.results.map((a) => (
                  <li key={a.id}>
                    <Link to={`/app/results/${a.id}`} className="list__row">
                      <span className="list__main"><strong>{a.game.title}</strong><span className="small muted">{fmtDateTime(a.completed_at)} · {a.score}/{a.max_score} ball</span></span>
                      <Chip tone={a.percent >= 60 ? "emerald" : a.percent >= 30 ? "sun" : "coral"}>{a.percent}%</Chip>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pager page={page} count={d.count} onPage={setPage} />
            </>
          )}
        </Load>
      </section>
    </div>
  );
}
