import { useEffect } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useApi, useTitle } from "../../hooks/useApi";
import { AchBadge, Ring } from "../../ui/Cards";
import Icon from "../../ui/Icon";
import { Button, Load, SkeletonList } from "../../ui/kit";
import Mascot from "../../ui/Mascot";
import { fmtDuration } from "../../utils/format";
import { play } from "../../utils/sound";
import { useBegin } from "../../games/start";

const tier = (p) => (p >= 90 ? ["Ajoyib natija!", "cheer"] : p >= 60 ? ["Juda yaxshi!", "cheer"] : p >= 30 ? ["Yaxshi boshlanish!", "happy"] : ["Hechqisi yo'q — yana bir urinib ko'ramizmi?", "think"]);

function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ "--x": `${(i * 37) % 100}%`, "--d": `${(i % 6) * 0.15}s`, "--c": ["var(--sun)", "var(--emerald)", "var(--coral)", "var(--sky)", "var(--grape)"][i % 5] }} />)}
    </div>
  );
}

export default function Result() {
  const { attemptId } = useParams();
  const st = useLocation().state;
  const q = useApi(() => (st?.result ? Promise.resolve(st.result) : api.get(`/attempts/${attemptId}/`)), [attemptId]);
  const { begin, busy } = useBegin();
  useTitle("Natija");
  const fresh = q.data?.new_achievements || [];
  useEffect(() => { if (fresh.length) setTimeout(() => play("badge"), 600); }, [fresh.length]);

  return (
    <Load q={q} skeleton={<SkeletonList rows={3} h={140} />}>
      {(r) => {
        if (r.status !== "completed") return (
          <div className="state"><Mascot mood="happy" size={110} /><h2>Bu urinish hali tugamagan</h2><Button to={`/app/play/${r.id}`} variant="primary">Davom etish</Button></div>
        );
        const [headline, mood] = tier(r.percent);
        return (
          <div className="stack" style={{ "--gap": "1.5rem" }}>
            <section className="result card card--sun">
              {r.percent >= 60 && <Confetti />}
              <Ring percent={r.percent} label={`Natija: ${r.percent} foiz`} />
              <div className="stack" style={{ "--gap": "0.6rem" }}>
                <Mascot mood={mood} size={84} />
                <h1>{headline}</h1>
                <p className="muted"><b>{r.game.title}</b></p>
                <ul className="facts facts--big">
                  <li><b>{r.score}</b> / {r.max_score} ball</li>
                  <li><b>{r.correct_count}</b> / {r.total_questions} to'g'ri</li>
                  <li><Icon name="clock" size={16} /> {fmtDuration(r.duration_seconds)}</li>
                </ul>
              </div>
            </section>

            {fresh.length > 0 && (
              <section className="stack" style={{ "--gap": "0.7rem" }} aria-label="Yangi yutuqlar">
                <h2>Yangi yutuq{fresh.length > 1 ? "lar" : ""}!</h2>
                <div className="achs">{fresh.map((a) => <AchBadge key={a.key} a={{ ...a, earned: true }} fresh />)}</div>
              </section>
            )}

            <div className="row">
              <Button variant="primary" size="lg" icon="refresh" loading={busy === r.game.id} onClick={() => begin(r.game.id)}>Qayta o'ynash</Button>
              <Button to="/app/games" size="lg">Boshqa o'yin</Button>
              <Button to="/app" variant="ghost">Bosh sahifa</Button>
            </div>

            <section className="stack" style={{ "--gap": "0.7rem" }}>
              <h2>Savollar bo'yicha</h2>
              <ol className="review">
                {r.answers.map((a, i) => (
                  <li key={a.question_id} className={`review__item ${a.is_correct ? "is-ok" : a.points_awarded > 0 ? "is-part" : "is-miss"}`}>
                    <span className="review__mark" aria-label={a.is_correct ? "To'g'ri" : a.points_awarded > 0 ? "Qisman to'g'ri" : a.answered ? "Noto'g'ri" : "Javob berilmagan"}>
                      <Icon name={a.is_correct ? "check" : a.points_awarded > 0 ? "star" : "x"} size={16} stroke={3.2} />
                    </span>
                    <div className="grow">
                      <strong>{i + 1}. {a.prompt}</strong>
                      {a.explanation && <p className="small muted">{a.explanation}</p>}
                    </div>
                    <span className="review__pts">{a.points_awarded}/{a.max_points}</span>
                  </li>
                ))}
              </ol>
            </section>
            <p className="small muted"><Link to="/app/progress">Barcha yutuqlar va tarix →</Link></p>
          </div>
        );
      }}
    </Load>
  );
}
