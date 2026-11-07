// One-page printable report for a child (meetings with parents / specialists). Print or "Save as PDF".
import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { ACTIVITIES, CATS } from "../../activities/registry";
import Face from "../../activities/Face";
import { useApi, useTitle } from "../../hooks/useApi";
import { BRAND } from "../../brand";
import { Button, Load, SkeletonList } from "../../ui/kit";
import { lastDays } from "../../utils/day";

const MOOD_LABEL = { xursand: "Xursand", uyqu: "Charchagan", xafa: "Xafa", jahl: "Jahldor", qorq: "Qo'rqqan" };
const nameOf = (s) => [s.first_name, s.last_name].filter(Boolean).join(" ") || s.username;
const DAYS = 30;

export default function StudentReport() {
  const { id, studentId } = useParams();
  useTitle("Hisobot");
  const q = useApi(async () => {
    const [w, c] = await Promise.all([api.get(`/classes/${id}/wellbeing/?days=${DAYS}`), api.get(`/classes/${id}/`)]);
    return { w, c };
  }, [id]);
  return (
    <div className="report">
      <div className="report__bar no-print">
        <Link to={`/teach/classes/${id}`} className="btn btn--sm">← Sinfga qaytish</Link>
        <Button variant="primary" icon="download" onClick={() => window.print()}>Chop etish / PDF</Button>
      </div>
      <Load q={q} skeleton={<SkeletonList rows={3} h={80} />}>
        {({ w, c }) => {
          const s = w.students.find((x) => String(x.student.id) === String(studentId));
          if (!s) return <p>O'quvchi topilmadi.</p>;
          const byDay = Object.fromEntries(s.moods.map((m) => [m.day, m.mood]));
          const days = lastDays(DAYS);
          const counts = Object.entries(MOOD_LABEL).map(([k, label]) => [k, label, s.moods.filter((m) => m.mood === k).length]);
          const stars = Object.fromEntries(s.activities.map((a) => [a.activity, a]));
          return (
            <article className="report__page card">
              <header className="report__head">
                <div><small>{BRAND}</small><h1>Rivojlanish hisoboti</h1></div>
                <div className="report__meta"><b>{nameOf(s.student)}</b><span>{c.name}</span><span>{days[0].key} — {days[days.length - 1].key}</span></div>
              </header>

              <section>
                <h2>Kayfiyat (oxirgi {DAYS} kun)</h2>
                <p className="muted small">O'quvchi o'zi belgilagan kunlar: {s.moods.length} / {DAYS}.{s.negative_last_7 >= 3 ? ` Oxirgi 7 kunda ${s.negative_last_7} marta qiyin kayfiyat belgilangan: e'tibor bering.` : ""}</p>
                <div className="report__strip">{days.map((d) => <span key={d.key} title={`${d.key} ${byDay[d.key] ? MOOD_LABEL[byDay[d.key]] : "belgilanmagan"}`}>{byDay[d.key] ? <Face k={byDay[d.key]} size={26} /> : <i />}<small>{d.key.slice(8)}</small></span>)}</div>
                <ul className="report__counts">{counts.map(([k, label, n]) => <li key={k}><Face k={k} size={22} /> {label}: <b>{n}</b></li>)}</ul>
              </section>

              <section>
                <h2>Mashqlar</h2>
                <p className="muted small">Yulduzlar: <b>{s.stars_total}</b> / {ACTIVITIES.length * 3} · O'ynalgan mashqlar: <b>{s.activities_played}</b> / {ACTIVITIES.length}</p>
                <table className="table report__table"><thead><tr><th>Bo'lim</th><th>Mashq</th><th>Yulduz</th><th>Urinish</th></tr></thead>
                  <tbody>{ACTIVITIES.map((a) => { const r = stars[a.id]; return (
                    <tr key={a.id}><td>{CATS.find((x) => x.key === a.cat)?.label}</td><td>{a.title}</td><td>{r ? "★".repeat(r.best_stars) + "☆".repeat(3 - r.best_stars) : "—"}</td><td>{r ? r.plays : 0}</td></tr>); })}</tbody></table>
              </section>

              <footer className="report__foot">
                <p className="small">Bu hisobot bolaning o'zi belgilagan kayfiyatiga va mashq natijalariga asoslangan. Bu tibbiy xulosa emas: u bola bilan suhbat va kuzatuv uchun yordamchi material.</p>
                <div className="report__sign"><span>Mutaxassis: ______________________</span><span>Sana: ______________</span></div>
              </footer>
            </article>
          );
        }}
      </Load>
    </div>
  );
}
