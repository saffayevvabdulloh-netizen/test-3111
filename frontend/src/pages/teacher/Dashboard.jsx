import { Link } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useApi, useTitle } from "../../hooks/useApi";
import { StatusChip } from "../../ui/Cards";
import CopyButton from "../../ui/CopyButton";
import { Button, Chip, ErrorState, Skeleton } from "../../ui/kit";
import Mascot from "../../ui/Mascot";
import { fmtDate } from "../../utils/format";
import { typeMeta } from "../../games/meta";

export default function Dashboard() {
  useTitle("Boshqaruv");
  const { user } = useAuth();
  const all = useApi(() => api.get("/games/"), []);
  const pub = useApi(() => api.get("/games/?status=published"), []);
  const drafts = useApi(() => api.get("/games/?status=draft"), []);
  const classes = useApi(() => api.get("/classes/"), []);
  const students = classes.data ? classes.data.results.reduce((n, c) => n + c.students_count, 0) : null;
  const more = classes.data?.next ? "+" : "";
  const empty = all.data && classes.data && all.data.count === 0 && classes.data.count === 0;
  const firstErr = all.error || classes.error;

  return (
    <div className="stack" style={{ "--gap": "1.5rem" }}>
      <div className="row row--between">
        <div><h1>Salom, {user.first_name || user.username}!</h1><p className="muted">Sinflaringiz va o'yinlaringiz bir joyda.</p></div>
        <div className="row"><Button to="/teach/classes" icon="users">Yangi sinf</Button><Button to="/teach/games/new" variant="primary" icon="plus">Yangi o'yin</Button></div>
      </div>

      {firstErr && !all.data && !classes.data && <ErrorState error={firstErr} onRetry={() => { all.reload(); classes.reload(); pub.reload(); drafts.reload(); }} />}

      {empty && (
        <section className="card card--sun onboarding">
          <Mascot mood="cheer" size={130} className="mascot--bob" />
          <div className="stack" style={{ "--gap": "0.7rem" }}>
            <h2>Boshlaymizmi?</h2>
            <ol className="onboarding__steps">
              <li><b>Sinf yarating</b> — o'quvchilarga qo'shilish kodini bering.</li>
              <li><b>O'yin yarating</b> — tur tanlang, savollar yozing, ko'rib chiqing.</li>
              <li><b>Topshiriq bering</b> — natijalarni shu yerda kuzating.</li>
            </ol>
            <div className="row"><Button to="/teach/classes" variant="primary">Sinf yaratish</Button><Button to="/teach/games/new">O'yin yaratish</Button></div>
          </div>
        </section>
      )}

      <section className="stats stats--teacher" aria-label="Umumiy ko'rsatkichlar">
        {[["O'yinlar", all.data?.count, all.error], ["Nashr etilgan", pub.data?.count, pub.error], ["Qoralamalar", drafts.data?.count, drafts.error],
          ["Sinflar", classes.data?.count, classes.error], ["O'quvchilar", students == null ? null : `${students}${more}`, classes.error]].map(([l, v, e]) => (
          <div key={l} className="stat"><b>{v == null ? (e ? "—" : <Skeleton h={28} w={42} />) : v}</b><span>{l}</span></div>
        ))}
      </section>

      <div className="two-col">
        <section className="panel">
          <div className="panel__head"><h2>Sinflarim</h2><Link to="/teach/classes" className="small"><b>Barchasi</b></Link></div>
          {classes.data && classes.data.results.length === 0 && <p className="muted">Hali sinf yo'q.</p>}
          <ul className="list list--flat">
            {(classes.data?.results || []).slice(0, 5).map((c) => (
              <li key={c.id} className="list__row">
                <Link to={`/teach/classes/${c.id}`} className="list__main"><strong>{c.name}</strong><span className="small muted">{c.students_count} o'quvchi</span></Link>
                <Chip tone="sky"><span className="mono">{c.join_code}</span></Chip>
                <CopyButton text={c.join_code} label="Kod" />
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel__head"><h2>So'nggi o'yinlar</h2><Link to="/teach/games" className="small"><b>Barchasi</b></Link></div>
          {all.data && all.data.results.length === 0 && <p className="muted">Hali o'yin yo'q.</p>}
          <ul className="list list--flat">
            {(all.data?.results || []).slice(0, 5).map((g) => (
              <li key={g.id} className="list__row">
                <Link to={`/teach/games/${g.id}`} className="list__main"><strong>{g.title}</strong><span className="small muted">{typeMeta(g.game_type).label} · {g.question_count} savol · {fmtDate(g.updated_at)}</span></Link>
                <StatusChip status={g.status} />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
