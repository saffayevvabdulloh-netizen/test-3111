import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useApi, useTitle } from "../../hooks/useApi";
import Icon from "../../ui/Icon";
import { Button, Load, SkeletonList } from "../../ui/kit";

export default function GameStats() {
  const { id } = useParams();
  const game = useApi(() => api.get(`/games/${id}/`), [id]);
  const stats = useApi(() => api.get(`/games/${id}/stats/`), [id]);
  useTitle(game.data ? `${game.data.title} — statistika` : "Statistika");
  return (
    <div className="stack" style={{ "--gap": "1.3rem" }}>
      <Link to="/teach/games" className="back"><Icon name="arrow-left" size={18} /> O'yinlar</Link>
      <div className="row row--between"><h1>{game.data?.title || "Statistika"}</h1>{game.data && <Button to={`/teach/games/${id}`} icon="edit">Tahrirlash</Button>}</div>
      <Load q={stats} skeleton={<SkeletonList rows={3} h={80} />}>
        {(s) => (
          <>
            <section className="stats" aria-label="Umumiy">
              {[["Boshlangan urinishlar", s.attempts_total], ["Tugatilgan", s.attempts_completed], ["Turli o'quvchilar", s.unique_students], ["O'rtacha natija", s.average_percent == null ? "—" : `${s.average_percent}%`]].map(([l, v]) => (
                <div key={l} className="stat"><b>{v}</b><span>{l}</span></div>
              ))}
            </section>
            <section className="panel">
              <div className="panel__head"><h2>Savollar bo'yicha</h2><span className="small muted">Qaysi savol qiyin? Past foiz — qiyin savol.</span></div>
              {s.attempts_completed === 0 && <p className="muted">Hali hech kim bu o'yinni tugatmagan. Natijalar o'quvchilar tugatgach paydo bo'ladi.</p>}
              <ol className="qstats">
                {s.per_question.map((p, i) => (
                  <li key={p.question_id}>
                    <div className="row row--between"><span className="qstats__t"><b>{i + 1}.</b> {p.prompt}</span><b>{p.correct_rate == null ? "—" : `${p.correct_rate}%`}</b></div>
                    <div className={`bar ${p.correct_rate != null && p.correct_rate < 50 ? "bar--coral" : ""}`} role="img" aria-label={p.correct_rate == null ? "Ma'lumot yo'q" : `${p.correct_rate} foiz to'g'ri`}><i style={{ width: `${p.correct_rate || 0}%` }} /></div>
                    <span className="small muted">{p.answered} ta javob, {p.correct} tasi to'g'ri</span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </Load>
    </div>
  );
}
