import { cloneElement, useId } from "react";
import { Link } from "react-router-dom";
import Icon from "./Icon";
import Mascot from "./Mascot";

export function Button({ variant = "default", size, loading, block, icon, as: _as, to, href, className = "", children, ...rest }) {
  const cls = ["btn", variant !== "default" && `btn--${variant}`, size && `btn--${size}`, block && "btn--block", className].filter(Boolean).join(" ");
  const inner = (<>{loading ? <span className="spin" aria-hidden="true" /> : icon ? <Icon name={icon} size={size === "sm" ? 18 : 20} /> : null}{children}</>);
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{inner}</a>;
  return <button type="button" className={cls} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>{inner}</button>;
}

export function Field({ label, error, hint, children, className = "" }) {
  const id = useId();
  const described = error ? `${id}-e` : hint ? `${id}-h` : undefined;
  return (
    <div className={`field ${className}`}>
      {label && <label htmlFor={id}>{label}</label>}
      {cloneElement(children, { id, "aria-invalid": error ? true : undefined, "aria-describedby": described })}
      {error ? <span id={`${id}-e`} className="field__error" role="alert">{error}</span> : hint ? <span id={`${id}-h`} className="hint">{hint}</span> : null}
    </div>
  );
}

export const Chip = ({ tone, children, plain, ...r }) => <span className={`chip ${plain ? "chip--plain" : ""}`} data-tone={tone} {...r}>{children}</span>;

export function Banner({ tone = "info", icon, children, actions }) {
  return (
    <div className="banner" data-tone={tone} role={tone === "error" ? "alert" : "status"}>
      <Icon name={icon || (tone === "error" || tone === "warn" ? "alert" : tone === "ok" ? "check" : "info")} />
      <div className="banner__body"><div>{children}</div>{actions}</div>
    </div>
  );
}

export const Spinner = () => <span className="spin" role="status" aria-label="Yuklanmoqda" />;

export function Skeleton({ h = 20, w = "100%", className = "" }) {
  return <div className={`skeleton ${className}`} style={{ height: h, width: w }} aria-hidden="true" />;
}
export function SkeletonList({ rows = 3, h = 84 }) {
  return <div className="stack" role="status" aria-label="Yuklanmoqda">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} h={h} />)}</div>;
}

export function EmptyState({ mood = "sleepy", title, children, action }) {
  return (
    <div className="state">
      <Mascot mood={mood} size={104} />
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  const s = error?.status;
  const title = error?.network ? "Aloqa uzildi" : s === 403 ? "Ruxsat yo'q" : s === 404 ? "Topilmadi" : "Nimadir noto'g'ri ketdi";
  return (
    <div className="state" role="alert">
      <Mascot mood="think" size={104} />
      <h3>{title}</h3>
      <p>{error?.message || "Qayta urinib ko'ring."}</p>
      {s !== 403 && s !== 404 && onRetry && <Button icon="refresh" onClick={onRetry}>Qayta urinish</Button>}
    </div>
  );
}

// Uniform loading / error / empty handling for any useApi() result.
export function Load({ q, children, empty, isEmpty, skeleton }) {
  if (q.loading && !q.data) return skeleton || <SkeletonList />;
  if (q.error && !q.data) return <ErrorState error={q.error} onRetry={q.reload} />;
  if (!q.data) return null;
  if (isEmpty && isEmpty(q.data)) return empty || null;
  return children(q.data);
}

export function Pager({ page, count, pageSize = 20, onPage }) {
  const pages = Math.max(1, Math.ceil(count / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="pager" aria-label="Sahifalar">
      <Button size="sm" icon="arrow-left" disabled={page <= 1} onClick={() => onPage(page - 1)}>Oldingi</Button>
      <span className="small muted" aria-live="polite">{page} / {pages}</span>
      <Button size="sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Keyingi <Icon name="arrow-right" size={18} /></Button>
    </nav>
  );
}

export function Tabs({ tabs, value, onChange, label }) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.key} type="button" role="tab" className="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}>{t.label}</button>
      ))}
    </div>
  );
}
