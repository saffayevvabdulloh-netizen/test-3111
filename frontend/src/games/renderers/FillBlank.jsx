export default function FillBlankRenderer({ q, value, onChange, feedback, locked, onEnter }) {
  const show = feedback?.correct_answer?.text;
  return (
    <div className="fill">
      <label className="sr-only" htmlFor="fill-input">Javobingiz</label>
      <input id="fill-input" className={`input fill__input ${feedback ? (feedback.is_correct ? "is-right" : "is-wrong") : ""}`} value={value}
        maxLength={q.content.max_length || 60} disabled={locked} autoComplete="off" autoCapitalize="none" spellCheck="false"
        placeholder="Javobni shu yerga yozing" onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEnter?.(); } }} />
      {feedback && !feedback.is_correct && show && <p className="fill__answer">To'g'ri javob: <b>{show}</b></p>}
    </div>
  );
}
