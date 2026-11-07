import { Link } from "react-router-dom";
import Icon from "./Icon";
import { Chip } from "./kit";
import { tileBgOf, typeTheme } from "../activities/themes";
import { TypeIcon, typeMeta } from "../games/meta";

export function GameTile({ game, to, state }) {
  const m = typeMeta(game.game_type), th = typeTheme(game.game_type);
  return (
    <Link to={to || `/app/games/${game.id}`} state={state} className="tile" data-tone={m.tone} style={{ "--accent": th.accent, "--art": tileBgOf(th) }}>
      <span className="tile__art">
        {game.cover ? <img src={game.cover} alt="" loading="lazy" /> : <>
          {th.deco.slice(0, 3).map((e, k) => <i key={k} aria-hidden="true">{e}</i>)}
          <b><TypeIcon type={game.game_type} size={48} /></b>
        </>}
      </span>
      <span className="tile__body">
        <span className="tile__type">{m.label}</span>
        <strong className="tile__title">{game.title}</strong>
        <span className="tile__meta">
          <span>{game.question_count} savol</span><span aria-hidden="true">·</span><span>{game.max_score} ball</span>
          {game.time_limit_seconds ? <><span aria-hidden="true">·</span><span>{Math.round(game.time_limit_seconds / 60 * 10) / 10} daq</span></> : null}
        </span>
        {game.my_attempts > 0 && <Chip tone="emerald"><Icon name="check" size={14} stroke={3} /> Eng yaxshi: {game.my_best_percent}%</Chip>}
      </span>
    </Link>
  );
}

export function Ring({ percent, size = 168, label }) {
  const r = 52, c = 2 * Math.PI * r;
  const tone = percent >= 60 ? "var(--emerald)" : percent >= 30 ? "var(--sun)" : "var(--coral)";
  return (
    <div className="ring" style={{ width: size, height: size }} role="img" aria-label={label || `${percent} foiz`}>
      <svg viewBox="0 0 120 120" width={size} height={size}>
        <circle cx="60" cy="60" r={r} fill="#fff" stroke="var(--line)" strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={tone} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} transform="rotate(-90 60 60)" className="ring__arc" />
        <circle cx="60" cy="60" r="64" fill="none" stroke="var(--ink)" strokeWidth="0" />
      </svg>
      <div className="ring__text"><b>{percent}%</b></div>
    </div>
  );
}

const ACH_TEXT = {
  first_game: ["Birinchi qadam", "Birinchi o'yinni tugatding"],
  perfect_score: ["A'lochi", "O'yinda 100% natija"],
  five_games: ["Tadqiqotchi", "5 ta turli o'yinni tugatding"],
  ten_games: ["Bilimdon", "10 ta turli o'yinni tugatding"],
};
const ACH_ICON = { first_game: "flag", perfect_score: "star", five_games: "gamepad", ten_games: "trophy" };
export function AchBadge({ a, fresh }) {
  return (
    <div className={`ach ${a.earned ? "is-earned" : "is-locked"} ${fresh ? "is-fresh" : ""}`}>
      <span className="ach__icon"><Icon name={a.earned ? ACH_ICON[a.key] || "star" : "lock"} size={28} stroke={2.8} /></span>
      <div><strong>{ACH_TEXT[a.key]?.[0] || a.title}</strong><span className="small">{ACH_TEXT[a.key]?.[1] || a.description}</span></div>
    </div>
  );
}

const ST = { draft: ["Qoralama", "sun"], published: ["Nashr etilgan", "emerald"], archived: ["Arxivda", "ink"] };
export function StatusChip({ status }) {
  const [t, tone] = ST[status] || [status, "ink"];
  return <Chip tone={tone}>{t}</Chip>;
}
