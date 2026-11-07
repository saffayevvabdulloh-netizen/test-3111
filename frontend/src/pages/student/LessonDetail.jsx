import { Link, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useApi, useTitle } from "../../hooks/useApi";
import { GameTile } from "../../ui/Cards";
import Icon from "../../ui/Icon";
import { Chip, Load, SkeletonList } from "../../ui/kit";
import { nameOf } from "../../utils/format";

export default function LessonDetail() {
  const { id } = useParams();
  const q = useApi(() => api.get(`/lessons/${id}/`), [id]);
  useTitle(q.data?.title || "Dars");
  return (
    <div className="stack" style={{ "--gap": "1.2rem" }}>
      <Link to="/app/lessons" className="back"><Icon name="arrow-left" size={18} /> Darslar</Link>
      <Load q={q} skeleton={<SkeletonList rows={2} h={180} />}>
        {(l) => (
          <>
            <article className="card prose-card stack" style={{ "--gap": "0.9rem" }}>
              {l.cover && <img className="cover" src={l.cover} alt="" />}
              <div className="row">{l.subject && <Chip tone="sky">{l.subject}</Chip>}<span className="small muted">{nameOf(l.owner)}</span></div>
              <h1>{l.title}</h1>
              {l.summary && <p className="lead">{l.summary}</p>}
              {l.body && <div className="prose">{l.body}</div>}
            </article>
            {l.games?.length > 0 && (
              <section className="stack" style={{ "--gap": "0.7rem" }}>
                <h2>Mashq qilamiz!</h2>
                <div className="tiles">{l.games.map((g) => <GameTile key={g.id} game={g} />)}</div>
              </section>
            )}
          </>
        )}
      </Load>
    </div>
  );
}
