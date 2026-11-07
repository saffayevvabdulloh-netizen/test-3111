import { useState } from "react";

// Tap a left card, then a right card. Tap a paired card again to unpair.
// Works with finger, mouse and keyboard (all items are real buttons).
export default function MatchingRenderer({ q, value, onChange, feedback, locked }) {
  const [active, setActive] = useState(null);
  const { left, right } = q.content;
  const truth = feedback?.correct_answer?.pairs ? Object.fromEntries(feedback.correct_answer.pairs.map((p) => [p.left, p.right])) : null;
  const rightOwner = Object.fromEntries(Object.entries(value).map(([l, r]) => [r, l]));
  const colorOf = (l) => (left.indexOf(l) % 6) + 1;

  const tapLeft = (l) => {
    if (locked) return;
    if (value[l]) { const { [l]: _drop, ...rest } = value; onChange(rest); setActive(l); return; }
    setActive(active === l ? null : l);
  };
  const tapRight = (r) => {
    if (locked) return;
    if (active) {
      const next = { ...value };
      if (rightOwner[r]) delete next[rightOwner[r]];
      next[active] = r;
      onChange(next); setActive(null);
    } else if (rightOwner[r]) {
      const { [rightOwner[r]]: _drop, ...rest } = value; onChange(rest);
    }
  };
  const status = (l) => (!feedback || !truth ? "" : value[l] === truth[l] ? "right" : "wrong");

  return (
    <div>
      <p className="hint">{active ? `«${active}» uchun o'ng tomondan juftini tanlang.` : "Avval chap tomondan birini bosing, so'ng o'ng tomondan juftini."}</p>
      <div className="match">
        <ul className="match__col" aria-label="Chap ustun">
          {left.map((l) => (
            <li key={l}>
              <button type="button" className={`match__item ${active === l ? "is-active" : ""} ${value[l] ? `is-paired c${colorOf(l)}` : ""} ${status(l) ? `is-${status(l)}` : ""}`}
                disabled={locked} aria-pressed={active === l} onClick={() => tapLeft(l)}>
                {value[l] && <span className="match__dot">{left.indexOf(l) + 1}</span>}
                <span>{l}</span>
              </button>
            </li>
          ))}
        </ul>
        <ul className="match__col" aria-label="O'ng ustun">
          {right.map((r) => {
            const owner = rightOwner[r];
            return (
              <li key={r}>
                <button type="button" className={`match__item ${owner ? `is-paired c${colorOf(owner)}` : ""} ${owner && status(owner) ? `is-${status(owner)}` : ""}`}
                  disabled={locked} onClick={() => tapRight(r)}>
                  {owner && <span className="match__dot">{left.indexOf(owner) + 1}</span>}
                  <span>{r}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {feedback && truth && !feedback.is_correct && (
        <div className="match__answer"><b>To'g'ri juftliklar:</b>
          <ul>{Object.entries(truth).map(([l, r]) => <li key={l}>{l} → <b>{r}</b></li>)}</ul>
        </div>
      )}
    </div>
  );
}
