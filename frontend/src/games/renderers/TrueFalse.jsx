import Icon from "../../ui/Icon";

export default function TrueFalseRenderer({ value, onChange, feedback, locked }) {
  const truth = feedback?.correct_answer?.value;
  const opts = [{ v: true, t: "To'g'ri", icon: "check" }, { v: false, t: "Noto'g'ri", icon: "x" }];
  return (
    <div className="tf" role="radiogroup" aria-label="To'g'rimi yoki noto'g'rimi?">
      {opts.map((o) => {
        const chosen = value === o.v;
        let state = chosen ? "chosen" : "";
        if (feedback) {
          if (truth !== undefined && truth !== null) state = truth === o.v ? "right" : chosen ? "wrong" : "dim";
          else state = chosen ? (feedback.is_correct ? "right" : "wrong") : "dim";
        }
        return (
          <button key={String(o.v)} type="button" role="radio" aria-checked={chosen} disabled={locked}
            className={`tf__btn tf__btn--${o.v ? "yes" : "no"} ${state ? `is-${state}` : ""}`} onClick={() => onChange(o.v)}>
            <Icon name={o.icon} size={34} stroke={3} />
            <span>{o.t}</span>
          </button>
        );
      })}
    </div>
  );
}
