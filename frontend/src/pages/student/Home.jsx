import { Link } from "react-router-dom";
import { CATS, ACTIVITIES } from "../../activities/registry";
import { useStars } from "../../activities/progress";
import Icon from "../../ui/Icon";
import MoodCheckin from "../../ui/MoodCheckin";
import { RegistanArt, factOfDay } from "../../ui/Registan";
import { MascotSay } from "../../ui/Mascot";
import Avatar from "../../ui/Avatar";
import { play } from "../../utils/sound";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useApi, useTitle } from "../../hooks/useApi";
import { GameTile } from "../../ui/Cards";
import { Button, Chip, ErrorState, Skeleton } from "../../ui/kit";
import Mascot from "../../ui/Mascot";
import { dueLabel, fmtDate } from "../../utils/format";
import { useBegin } from "../../games/start";
import { typeMeta } from "../../games/meta";


function Hub({ uid }) {
  const stars = useStars(uid);
  const earned = Object.values(stars).reduce((a, b) => a + b, 0);
  return (
    <section className="hub" aria-label="Mini o'yinlar">
      <div className="hub__cats">
        {CATS.map((c, i) => {
          const acts = ACTIVITIES.filter((a) => a.cat === c.key);
          const got = acts.reduce((s, a) => s + (stars[a.id] || 0), 0);
          return (
            <Link key={c.key} to={`/app/fun?c=${c.key}`} className={`cat cat--${i}`} data-tone={c.tone} onClick={() => play("pop")}>
              <span className="cat__art" aria-hidden="true">{c.art.map((e, k) => <i key={k}>{e}</i>)}</span>
              <strong>{c.label}</strong>
              <span className="cat__meta">{acts.length} ta mashq · <Icon name="star" size={14} stroke={2.4} /> {got}/{acts.length * 3}</span>
              <span className="cat__go" aria-hidden="true"><Icon name="arrow-right" size={20} /></span>
            </Link>
          );
        })}
      </div>
      <aside className="hub__side">
        <MascotSay mood="cheer" size={190} speech={earned ? `${earned} ta yulduzing bor!` : "Sen ajoyibsan!"} />
        <div className="fact card">
          <RegistanArt />
          <p><Icon name="star" size={16} stroke={2.4} /> {factOfDay()}</p>
        </div>
      </aside>
    </section>
  );
}

function pickNext(prog, asg, cat) {
  if (prog.data?.in_progress?.length) {
    const a = prog.data.in_progress[0];
    return { kind: "resume", title: a.game_title, to: `/app/play/${a.attempt_id}`, text: "Boshlagan o'yining seni kutyapti", cta: "Davom etish" };
  }
  const todo = (asg.data?.results || []).filter((x) => x.status !== "completed")
    .sort((x, y) => (x.due_at ? new Date(x.due_at) : Infinity) - (y.due_at ? new Date(y.due_at) : Infinity))[0];
  if (todo) return { kind: "assignment", title: todo.title || todo.game.title, game: todo.game.id, assignment: todo.id, text: `Topshiriq · ${todo.classroom.name}${todo.due_at ? ` · ${dueLabel(todo.due_at)}` : ""}`, cta: "Boshlash", overdue: todo.is_overdue };
  const games = cat.data?.results || [];
  const fresh = games.find((g) => !g.my_attempts) || games[0];
  if (fresh) return { kind: "game", title: fresh.title, game: fresh.id, text: fresh.my_attempts ? "Natijangni yaxshilab ko'r" : "Yangi o'yinni sinab ko'r", cta: fresh.my_attempts ? "Qayta o'ynash" : "O'ynash" };
  return null;
}

function Mission({ prog, asg, cat }) {
  const { begin, busy } = useBegin();
  const loading = (prog.loading && !prog.data) || (asg.loading && !asg.data) || (cat.loading && !cat.data);
  if (loading) return <Skeleton h={190} className="mission-skel" />;
  const n = pickNext(prog, asg, cat);
  if (!n) {
    const err = prog.error || asg.error || cat.error;
    if (err && !prog.data && !asg.data && !cat.data) return <ErrorState error={err} onRetry={() => { prog.reload(); asg.reload(); cat.reload(); }} />;
    return (
      <section className="mission card card--sun">
        <Mascot mood="sleepy" size={130} />
        <div className="stack" style={{ "--gap": "0.6rem" }}>
          <h2>Hozircha o'yinlar yo'q</h2>
          <p>O'qituvchingiz yangi o'yin qo'shishi bilan shu yerda ko'rinadi. Sinf kodingiz bo'lsa, sinfga qo'shiling.</p>
          <div><Button to="/app/classes" variant="primary">Sinfga qo'shilish</Button></div>
        </div>
      </section>
    );
  }
  return (
    <section className="mission card card--sun" aria-labelledby="mission-h">
      <Mascot mood="cheer" size={130} className="mascot--bob" />
      <div className="stack" style={{ "--gap": "0.55rem" }}>
        <span className="mission__kicker">Keyingi qadam</span>
        <h2 id="mission-h">{n.title}</h2>
        <p className="mission__text">{n.text}</p>
        <div>
          {n.to
            ? <Button to={n.to} variant="primary" size="lg" icon="play">{n.cta}</Button>
            : <Button variant="primary" size="lg" icon="play" loading={busy === n.game} onClick={() => begin(n.game, n.assignment)}>{n.cta}</Button>}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  useTitle("Bosh sahifa");
  const { user } = useAuth();
  const prog = useApi(() => api.get("/me/progress/"), []);
  const asg = useApi(() => api.get("/me/assignments/"), []);
  const cat = useApi(() => api.get("/games/catalog/"), []);
  const p = prog.data;
  const earned = p ? p.achievements.filter((a) => a.earned).length : null;
  const pending = (asg.data?.results || []).filter((x) => x.status !== "completed");

  return (
    <div className="stack" style={{ "--gap": "1.5rem" }}>
      <div className="greet">
        <Avatar name={user.avatar} label={user.first_name || user.username} size={56} />
        <div><h1>Salom, {user.first_name || user.username}!</h1><p className="muted">Bugun nimani o'rganamiz?</p></div>
      </div>

      <MoodCheckin uid={user.id} />

      <Hub uid={user.id} />

      <Mission prog={prog} asg={asg} cat={cat} />

      <section aria-label="Statistika" className="stats">
        {[
          ["O'ynalgan o'yinlar", p?.games_played], ["Jami ball", p?.total_points],
          ["O'rtacha natija", p ? (p.average_percent == null ? "—" : `${p.average_percent}%`) : null],
          ["Yutuqlar", p ? `${earned}/${p.achievements.length}` : null],
        ].map(([label, v]) => (
          <div key={label} className="stat">
            <b>{v == null ? (prog.error ? "—" : <Skeleton h={28} w={48} />) : v}</b>
            <span>{label}</span>
          </div>
        ))}
      </section>

      {pending.length > 0 && (
        <section className="stack" style={{ "--gap": "0.7rem" }}>
          <div className="row row--between"><h2>Topshiriqlar</h2><Link to="/app/classes" className="small"><b>Barchasi</b></Link></div>
          <ul className="list">
            {pending.slice(0, 3).map((a) => (
              <li key={a.id}>
                <Link to={`/app/games/${a.game.id}?assignment=${a.id}`} className="list__row">
                  <span className="list__main"><strong>{a.title || a.game.title}</strong><span className="small muted">{a.classroom.name} · {typeMeta(a.game.game_type).label}</span></span>
                  {a.is_overdue ? <Chip tone="coral">Muddati o'tgan</Chip> : a.due_at ? <Chip tone="sun">{dueLabel(a.due_at)}</Chip> : null}
                  {a.status === "in_progress" && <Chip tone="sky">Boshlangan</Chip>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cat.data?.results?.length > 0 && (
        <section className="stack" style={{ "--gap": "0.7rem" }}>
          <div className="row row--between"><h2>O'yinlar</h2><Link to="/app/games" className="small"><b>Hammasi</b></Link></div>
          <div className="tiles">{cat.data.results.slice(0, 6).map((g) => <GameTile key={g.id} game={g} />)}</div>
        </section>
      )}

      {p?.recent?.length > 0 && (
        <section className="stack" style={{ "--gap": "0.7rem" }}>
          <h2>So'nggi natijalar</h2>
          <ul className="list">
            {p.recent.map((r) => (
              <li key={r.attempt_id}>
                <Link to={`/app/results/${r.attempt_id}`} className="list__row">
                  <span className="list__main"><strong>{r.game_title}</strong><span className="small muted">{fmtDate(r.completed_at)} · {r.score}/{r.max_score} ball</span></span>
                  <Chip tone={r.percent >= 60 ? "emerald" : r.percent >= 30 ? "sun" : "coral"}>{r.percent}%</Chip>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
