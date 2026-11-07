import { useStars } from "../activities/progress";
import { STICKERS, STARS_PER_STICKER, unlockedCount } from "../activities/stickers";

export default function Stickers({ uid }) {
  const stars = useStars(uid);
  const total = Object.values(stars).reduce((a, b) => a + b, 0);
  const got = unlockedCount(total);
  const toNext = got >= STICKERS.length ? 0 : STARS_PER_STICKER - (total % STARS_PER_STICKER);
  return (
    <section className="stickers card" aria-labelledby="stk-h">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 id="stk-h">Stikerlar albomi</h2>
        <span className="chip" role="status">{got} / {STICKERS.length}</span>
      </div>
      <p className="muted">{got >= STICKERS.length ? "Barcha stikerlar sening! Barakalla!" : `Mashq qilib yulduz to'pla: yana ${toNext} ta yulduz — yangi stiker!`}</p>
      <ul className="stickers__grid">
        {STICKERS.map(([e, name], i) => (
          <li key={name} className={i < got ? "is-on" : ""} title={i < got ? name : "Hali yopiq"}>
            <span aria-hidden="true">{e}</span><small>{i < got ? name : "?"}</small>
            <span className="sr-only">{i < got ? `${name}: ochilgan` : "Yopiq stiker"}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
