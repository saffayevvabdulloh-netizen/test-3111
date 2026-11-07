import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../api/client";
import { useApi, useTitle } from "../../hooks/useApi";
import Icon from "../../ui/Icon";
import { Button, Chip, Load, SkeletonList } from "../../ui/kit";
import { TypeIcon, typeMeta } from "../../games/meta";
import { useBegin } from "../../games/start";
import { nameOf } from "../../utils/format";

export default function GameDetail() {
  const { id } = useParams();
  const [sp] = useSearchParams();
  const assignment = sp.get("assignment");
  const q = useApi(() => api.get(`/games/${id}/`), [id]);
  const prog = useApi(() => api.get("/me/progress/"), []);
  const { begin, busy } = useBegin();
  useTitle(q.data?.title || "O'yin");

  return (
    <div className="stack" style={{ "--gap": "1.2rem" }}>
      <Link to="/app/games" className="back"><Icon name="arrow-left" size={18} /> O'yinlar</Link>
      <Load q={q} skeleton={<SkeletonList rows={2} h={160} />}>
        {(g) => {
          const m = typeMeta(g.game_type);
          const open = prog.data?.in_progress?.find((a) => a.game_id === g.id);
          return (
            <article className="gd card" data-tone={m.tone}>
              <div className="gd__art">
                {g.cover ? <img src={g.cover} alt="" /> : <TypeIcon type={g.game_type} size={72} />}
              </div>
              <div className="stack" style={{ "--gap": "0.9rem" }}>
                <Chip tone={m.tone}><TypeIcon type={g.game_type} size={16} /> {m.label}</Chip>
                <h1>{g.title}</h1>
                {g.description && <p>{g.description}</p>}
                <p className="muted small">{m.hint}. Muallif: {nameOf(g.owner)}</p>
                <ul className="facts">
                  <li><b>{g.question_count}</b> savol</li>
                  <li><b>{g.max_score}</b> ball</li>
                  {g.time_limit_seconds ? <li><Icon name="clock" size={16} /> <b>{Math.round(g.time_limit_seconds / 6) / 10}</b> daqiqa</li> : <li>Vaqt cheklovi yo'q</li>}
                </ul>
                {g.my_attempts > 0 && <p className="small"><b>{g.my_attempts}</b> marta tugatgansiz · eng yaxshi natija <b>{g.my_best_percent}%</b></p>}
                <div className="row">
                  {open
                    ? <Button to={`/app/play/${open.attempt_id}`} variant="primary" size="lg" icon="play">Davom etish</Button>
                    : <Button variant="primary" size="lg" icon="play" loading={busy === g.id} disabled={g.question_count === 0} onClick={() => begin(g.id, assignment)}>{g.my_attempts ? "Qayta o'ynash" : "Boshlash"}</Button>}
                </div>
                {g.question_count === 0 && <p className="small muted">Bu o'yinda hali savollar yo'q.</p>}
              </div>
            </article>
          );
        }}
      </Load>
    </div>
  );
}
