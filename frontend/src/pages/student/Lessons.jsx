import { useState } from "react";
import { Link } from "react-router-dom";
import { api, qs } from "../../api/client";
import { useApi, useDebounced, useTitle } from "../../hooks/useApi";
import Icon from "../../ui/Icon";
import { Chip, EmptyState, Load, Pager, SkeletonList } from "../../ui/kit";
import { nameOf } from "../../utils/format";

export default function Lessons() {
  useTitle("Darslar");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const term = useDebounced(search.trim(), 300);
  const q = useApi(() => api.get(`/lessons/${qs({ search: term, page })}`), [term, page]);
  return (
    <div className="stack" style={{ "--gap": "1.2rem" }}>
      <h1>Darslar</h1>
      <div className="search">
        <Icon name="search" size={20} />
        <input className="input" type="search" placeholder="Dars qidirish..." aria-label="Dars qidirish" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>
      <Load q={q} skeleton={<SkeletonList rows={3} h={110} />} isEmpty={(d) => d.results.length === 0}
        empty={<EmptyState title={term ? "Hech narsa topilmadi" : "Hozircha darslar yo'q"}>{term ? "Boshqa so'z bilan qidiring." : "O'qituvchilar dars qo'shgach shu yerda ko'rinadi."}</EmptyState>}>
        {(d) => (
          <>
            <ul className="lessons">
              {d.results.map((l) => (
                <li key={l.id}>
                  <Link to={`/app/lessons/${l.id}`} className="lesson">
                    <span className="lesson__art">{l.cover ? <img src={l.cover} alt="" loading="lazy" /> : <Icon name="book" size={36} />}</span>
                    <span className="lesson__body">
                      {l.subject && <Chip tone="sky">{l.subject}</Chip>}
                      <strong>{l.title}</strong>
                      {l.summary && <span className="small muted">{l.summary}</span>}
                      <span className="small muted">{nameOf(l.owner)}</span>
                    </span>
                  </Link>
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
