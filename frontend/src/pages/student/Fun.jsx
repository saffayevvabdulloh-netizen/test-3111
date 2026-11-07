import { Link, useSearchParams } from "react-router-dom";
import { ACTIVITIES, CATS } from "../../activities/registry";
import { useStars } from "../../activities/progress";
import { themeFor, tileBgOf } from "../../activities/themes";
import { useAuth } from "../../auth/AuthContext";
import { useTitle } from "../../hooks/useApi";
import Icon from "../../ui/Icon";
import { play } from "../../utils/sound";

export function Stars({ n, size = 18 }) {
  return <span className="starsrow" aria-label={`${n} / 3 yulduz`}>{[1, 2, 3].map((i) => <Icon key={i} name="star" size={size} stroke={2} className={i <= n ? "is-on" : ""} />)}</span>;
}

export default function Fun() {
  useTitle("Mini o'yinlar");
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const cat = sp.get("c") || "";
  const stars = useStars(user?.id);
  const list = ACTIVITIES.filter((a) => !cat || a.cat === cat);
  return (
    <div className="stack" style={{ "--gap": "1.2rem" }}>
      <div><h1>Mini o'yinlar</h1><p className="muted">O'ynab o'rgan va yulduzlar to'pla!</p></div>
      <div className="chips" role="group" aria-label="Bo'lim">
        {[{ key: "", label: "Hammasi" }, ...CATS].map((c) => <button key={c.key} type="button" className="fchip" aria-pressed={cat === c.key} onClick={() => { play("tap"); setSp(c.key ? { c: c.key } : {}); }}>{c.label}</button>)}
      </div>
      {(cat ? CATS.filter((c) => c.key === cat) : CATS).map((c) => {
        const items = list.filter((a) => a.cat === c.key);
        if (!items.length) return null;
        return (
          <section key={c.key} className="acts-sec" aria-label={c.label}>
            <div className="acts-sec__head" data-tone={c.tone}>
              <span className="acts-sec__emoji" aria-hidden="true">{c.emoji}</span><h2>{c.label}</h2>
              <span className="acts-sec__art" aria-hidden="true">{c.art.join(" ")}</span>
            </div>
            <div className="acts">
              {items.map((a) => {
                const th = themeFor(a.id), n = stars[a.id] || 0;
                return (
                  <Link key={a.id} to={`/app/fun/${a.id}`} className={`act-tile ${n >= 3 ? "is-done" : ""}`} data-tone={a.tone} onClick={() => play("pop")} style={{ "--accent": th.accent, "--art": tileBgOf(th) }}>
                    <span className="act-tile__art" aria-hidden="true">
                      {th.deco.slice(0, 3).map((e, k) => <i key={k}>{e}</i>)}
                      <b>{a.emoji}</b>
                    </span>
                    <strong>{a.title}</strong>
                    <span className="small muted">{a.sub}</span>
                    <Stars n={n} />
                    {n === 0 && <span className="act-tile__new">Yangi</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
