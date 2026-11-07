import Icon from "../../ui/Icon";
import { Button } from "../../ui/kit";

const LETTERS = "ABCDEF";

export function QuizEditor({ content, onChange, locked }) {
  const opts = content.options;
  const upd = (i, patch) => onChange({ options: opts.map((o, k) => (k === i ? { ...o, ...patch } : o)) });
  return (
    <div className="stack" style={{ "--gap": "0.6rem" }}>
      <p className="hint">2–6 ta variant. To'g'ri javob(lar)ni belgilang — bir nechta bo'lishi mumkin.</p>
      {opts.map((o, i) => (
        <div key={i} className="ed-row">
          <span className="opt__key" aria-hidden="true">{LETTERS[i]}</span>
          <input className="input" value={o.text} maxLength={120} disabled={locked} placeholder={`Variant ${LETTERS[i]}`} aria-label={`Variant ${LETTERS[i]} matni`}
            onChange={(e) => upd(i, { text: e.target.value })} />
          <button type="button" className={`ed-correct ${o.is_correct ? "is-on" : ""}`} aria-pressed={!!o.is_correct} disabled={locked}
            aria-label={`Variant ${LETTERS[i]} to'g'ri javob`} onClick={() => upd(i, { is_correct: !o.is_correct })}>
            <Icon name="check" size={18} stroke={3} /><span>To'g'ri</span>
          </button>
          <Button size="sm" variant="ghost" className="btn--icon" icon="trash" aria-label={`Variant ${LETTERS[i]} ni o'chirish`}
            disabled={locked || opts.length <= 2} onClick={() => onChange({ options: opts.filter((_, k) => k !== i) })} />
        </div>
      ))}
      <div><Button size="sm" icon="plus" disabled={locked || opts.length >= 6} onClick={() => onChange({ options: [...opts, { text: "", is_correct: false }] })}>Variant qo'shish</Button></div>
    </div>
  );
}

export function TrueFalseEditor({ content, onChange, locked }) {
  return (
    <fieldset className="stack" style={{ "--gap": "0.6rem" }} disabled={locked}>
      <legend className="label">Savoldagi gap qanday?</legend>
      <div className="seg">
        {[[true, "To'g'ri"], [false, "Noto'g'ri"]].map(([v, t]) => (
          <button key={String(v)} type="button" className={`seg__btn ${content.correct === v ? "is-on" : ""}`} aria-pressed={content.correct === v}
            onClick={() => onChange({ correct: v })}>{t}</button>
        ))}
      </div>
      <p className="hint">Savol matniga o'quvchi baholaydigan gapni yozing. Masalan: «Quyosh — yulduz».</p>
    </fieldset>
  );
}

export function MatchingEditor({ content, onChange, locked }) {
  const pairs = content.pairs;
  const upd = (i, patch) => onChange({ pairs: pairs.map((p, k) => (k === i ? { ...p, ...patch } : p)) });
  return (
    <div className="stack" style={{ "--gap": "0.6rem" }}>
      <p className="hint">2–8 ta juftlik. O'quvchida o'ng ustun aralashtirilib ko'rsatiladi.</p>
      {pairs.map((p, i) => (
        <div key={i} className="ed-row ed-row--pair">
          <span className="ed-num" aria-hidden="true">{i + 1}</span>
          <input className="input" value={p.left} maxLength={60} disabled={locked} placeholder="Chap" aria-label={`${i + 1}-juftlik, chap`} onChange={(e) => upd(i, { left: e.target.value })} />
          <Icon name="arrow-right" className="ed-arrow" />
          <input className="input" value={p.right} maxLength={60} disabled={locked} placeholder="O'ng" aria-label={`${i + 1}-juftlik, o'ng`} onChange={(e) => upd(i, { right: e.target.value })} />
          <Button size="sm" variant="ghost" className="btn--icon" icon="trash" aria-label={`${i + 1}-juftlikni o'chirish`}
            disabled={locked || pairs.length <= 2} onClick={() => onChange({ pairs: pairs.filter((_, k) => k !== i) })} />
        </div>
      ))}
      <div><Button size="sm" icon="plus" disabled={locked || pairs.length >= 8} onClick={() => onChange({ pairs: [...pairs, { left: "", right: "" }] })}>Juftlik qo'shish</Button></div>
    </div>
  );
}

export function FillBlankEditor({ content, onChange, locked }) {
  const acc = content.accepted;
  const upd = (i, v) => onChange({ ...content, accepted: acc.map((a, k) => (k === i ? v : a)) });
  return (
    <div className="stack" style={{ "--gap": "0.6rem" }}>
      <p className="hint">To'g'ri deb hisoblanadigan javob(lar). Masalan: «Toshkent» va «Tashkent».</p>
      {acc.map((a, i) => (
        <div key={i} className="ed-row">
          <span className="ed-num" aria-hidden="true">{i + 1}</span>
          <input className="input" value={a} maxLength={60} disabled={locked} placeholder="Javob" aria-label={`${i + 1}-javob`} onChange={(e) => upd(i, e.target.value)} />
          <Button size="sm" variant="ghost" className="btn--icon" icon="trash" aria-label={`${i + 1}-javobni o'chirish`}
            disabled={locked || acc.length <= 1} onClick={() => onChange({ ...content, accepted: acc.filter((_, k) => k !== i) })} />
        </div>
      ))}
      <div><Button size="sm" icon="plus" disabled={locked || acc.length >= 10} onClick={() => onChange({ ...content, accepted: [...acc, ""] })}>Javob varianti qo'shish</Button></div>
      <label className="check"><input type="checkbox" checked={content.case_sensitive} disabled={locked} onChange={(e) => onChange({ ...content, case_sensitive: e.target.checked })} />
        <span>Katta-kichik harf farqlansin<span className="hint" style={{ display: "block" }}>O'chiq bo'lsa «toshkent» ham «Toshkent» ham to'g'ri.</span></span></label>
    </div>
  );
}
