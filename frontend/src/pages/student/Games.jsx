import { useState } from "react";
import { api, qs } from "../../api/client";
import { useApi, useDebounced, useTitle } from "../../hooks/useApi";
import { GameTile } from "../../ui/Cards";
import Icon from "../../ui/Icon";
import { EmptyState, Load, Pager, SkeletonList } from "../../ui/kit";
import { TYPE_META } from "../../games/meta";

export default function Games() {
  useTitle("O'yinlar");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const term = useDebounced(search.trim(), 300);
  const q = useApi(() => api.get(`/games/${qs({ search: term, game_type: type, page })}`), [term, type, page]);

  return (
    <div className="stack" style={{ "--gap": "1.2rem" }}>
      <h1>O'yinlar</h1>
      <div className="filters">
        <div className="search">
          <Icon name="search" size={20} />
          <input className="input" type="search" placeholder="O'yin qidirish..." aria-label="O'yin qidirish" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <div className="chips" role="group" aria-label="O'yin turi">
          {[["", "Hammasi"], ...Object.entries(TYPE_META).map(([k, m]) => [k, m.label])].map(([k, label]) => (
            <button key={k} type="button" className="fchip" aria-pressed={type === k} onClick={() => { setType(k); setPage(1); }}>{label}</button>
          ))}
        </div>
      </div>
      <Load q={q} skeleton={<SkeletonList rows={4} h={110} />} isEmpty={(d) => d.results.length === 0}
        empty={<EmptyState title={term || type ? "Hech narsa topilmadi" : "Hozircha o'yinlar yo'q"}>{term || type ? "Boshqa so'z yoki turni sinab ko'ring." : "O'qituvchilar o'yin qo'shgach shu yerda ko'rinadi."}</EmptyState>}>
        {(d) => (
          <>
            <div className="tiles">{d.results.map((g) => <GameTile key={g.id} game={g} />)}</div>
            <Pager page={page} count={d.count} onPage={setPage} />
          </>
        )}
      </Load>
    </div>
  );
}
