import Icon from "../../ui/Icon";

const LETTERS = "ABCDEF";

export default function QuizRenderer({ q, value, onChange, feedback, locked }) {
  const multiple = q.content.multiple;
  const correct = feedback?.correct_answer?.selected;
  const toggle = (id) => {
    if (locked) return;
    onChange(multiple ? (value.includes(id) ? value.filter((x) => x !== id) : [...value, id]) : [id]);
  };
  return (
    <div role={multiple ? "group" : "radiogroup"} aria-label={multiple ? "Bir nechta javobni tanlash mumkin" : "Javob variantlari"} className="opts">
      {multiple && <p className="hint">Bir nechta to'g'ri javob bor — hammasini belgilang.</p>}
      {q.content.options.map((o, i) => {
        const chosen = value.includes(o.id);
        let state = chosen ? "chosen" : "";
        if (feedback) {
          if (correct) state = correct.includes(o.id) ? "right" : chosen ? "wrong" : "dim";
          else state = chosen ? (feedback.is_correct ? "right" : "wrong") : "dim";
        }
        return (
          <button key={o.id} type="button" className={`opt ${state ? `is-${state}` : ""}`} role={multiple ? "checkbox" : "radio"}
            aria-checked={chosen} disabled={locked} onClick={() => toggle(o.id)}>
            <span className="opt__key">{LETTERS[i]}</span>
            <span className="opt__text">{o.text}</span>
            {state === "right" && <Icon name="check" className="opt__mark" />}
            {state === "wrong" && <span className="opt__mark opt__mark--soft">Yana o'ylab ko'r</span>}
          </button>
        );
      })}
    </div>
  );
}
