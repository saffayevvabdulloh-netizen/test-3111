import { useState } from "react";
import Icon from "../../ui/Icon";
import GuideButton from "../../ui/GuideButton";
import { Banner } from "../../ui/kit";

export const AuthCard = ({ title, lead, children, mascot, guide }) => (
  <div className="auth">
    <div className="auth__side" aria-hidden="true">{mascot}</div>
    <div className="card auth__card stack" style={{ "--gap": "1.1rem" }}>
      <div className="stack" style={{ "--gap": "0.3rem" }}>
        <h1 className="auth__title">{title}</h1>
        {lead && <p className="muted">{lead}</p>}
        {guide && <div><GuideButton text={guide} label="Eshit: bu sahifa nima?" /></div>}
      </div>
      {children}
    </div>
  </div>
);

// error text + an "Eshit" button that reads it aloud
export const FormError = ({ error }) => {
  if (!error) return null;
  const msg = error.message || String(error);
  return <Banner tone="error"><span>{msg}</span> <GuideButton text={msg} label="Eshit" /></Banner>;
};

// Password field with a show/hide eye. <Field> hands id/aria-* to its direct child, so the eye lives inside.
export function PasswordInput({ inputRef, ...rest }) {
  const [show, setShow] = useState(false);
  return (
    <span className="pw">
      <input ref={inputRef} className="input" type={show ? "text" : "password"} {...rest} />
      <button type="button" className="pw__eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Parolni yashirish" : "Parolni ko'rsatish"} aria-pressed={show}><Icon name={show ? "eye-off" : "eye"} size={20} /></button>
    </span>
  );
}
