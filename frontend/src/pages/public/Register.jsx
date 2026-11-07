import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useConfig } from "../../api/config";
import { homeFor, useAuth } from "../../auth/AuthContext";
import { BRAND } from "../../brand";
import { useTitle } from "../../hooks/useApi";
import Icon from "../../ui/Icon";
import { Button, Field } from "../../ui/kit";
import Mascot from "../../ui/Mascot";
import { useToast } from "../../ui/Toast";
import { AuthCard, FormError, PasswordInput } from "./AuthParts";
import { normUsername, passwordError, passwordStrength, usernameError } from "./authRules";

const ROLES = [
  { v: "student", t: "Bola", d: "O'ynayman va o'rganaman", icon: "gamepad", tone: "emerald" },
  { v: "parent", t: "Ota-ona", d: "Bolamni ulayman, ustoz bilan yozishaman", icon: "heart", tone: "coral" },
  { v: "teacher", t: "Mutaxassis / o'qituvchi", d: "Mashq yarataman, natijani kuzataman", icon: "class", tone: "grape" },
];

import BotStatus from "../../ui/BotStatus";
import { GUIDE } from "../../utils/guide";
export default function Register() {
  useTitle("Ro'yxatdan o'tish");
  const nav = useNavigate();
  const toast = useToast();
  const { login } = useAuth();
  const cfg = useConfig();
  const [f, setF] = useState({ role: "student", first_name: "", last_name: "", username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [touched, setTouched] = useState({});
  const refs = { username: useRef(null), password: useRef(null) };
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); if (err?.fields?.[k]) setErr(null); };
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const local = { username: usernameError(f.username), password: passwordError(f.password, f.username) };
  const server = err?.fields || {};
  const shown = (k) => (touched[k] || touched.submit ? local[k] : "") || server[k];
  const strength = passwordStrength(f.password);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    // real field values (browser autofill can fill inputs without React noticing)
    const fd = new FormData(e.currentTarget);
    const cur = Object.fromEntries(Object.keys(f).map((k) => [k, String(fd.get(k) ?? f[k])]));
    setF(cur);
    setTouched((t) => ({ ...t, submit: true }));
    const bad = usernameError(cur.username) ? "username" : passwordError(cur.password, cur.username) ? "password" : null;
    if (bad) { refs[bad].current?.focus(); return; }
    setBusy(true); setErr(null);
    const body = { ...cur, username: normUsername(cur.username), first_name: cur.first_name.trim(), last_name: cur.last_name.trim() };
    let created = false;
    try {
      const r = await api.post("/register/", body, { auth: false });
      created = true;
      if (r.needs_telegram_verification) {
        nav("/verify", { state: { username: body.username, link: r.telegram_link, fresh: true } });
      } else {
        const u = await login(body.username, body.password);   // dev mode: account is active immediately
        nav(homeFor(u), { replace: true });
      }
    } catch (e2) {
      if (created) { toast("Hisob yaratildi. Endi kiring.", "ok"); nav("/login", { replace: true }); return; }
      setErr(e2); setBusy(false);
      const first = ["username", "password"].find((k) => e2?.fields?.[k]);
      if (first) refs[first].current?.focus();
    }
  }

  if (cfg.ready && !cfg.registrationOpen) {
    return (
      <AuthCard title="Hisobni administrator ochadi" lead="Bu saytda o'zingiz ro'yxatdan o'tmaysiz." mascot={<Mascot mood="happy" size={200} />}>
        <p>Bolalar, ota-onalar va ustozlar uchun hisobni administrator ochib beradi. Sizga <b>kirish nomi</b> va <b>parol</b> beriladi, siz faqat kirasiz.</p>
        <Button to="/login" variant="primary" size="lg" block>Kirish</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={`${BRAND} platformasiga xush kelibsiz!`} lead="Bir daqiqada hisob oching." guide={GUIDE.register} mascot={<Mascot mood="cheer" size={200} />}>
      <BotStatus compact />
      <form className="stack" onSubmit={submit} noValidate>
        <fieldset className="roles">
          <legend className="label">Siz kimsiz?</legend>
          {ROLES.map((r) => (
            <label key={r.v} className={`role ${f.role === r.v ? "is-on" : ""}`} data-tone={r.tone}>
              <input type="radio" name="role" value={r.v} checked={f.role === r.v} onChange={set("role")} />
              <Icon name={r.icon} size={26} />
              <span><b>{r.t}</b><small>{r.d}</small></span>
            </label>
          ))}
        </fieldset>
        <div className="grid-2">
          <Field label="Ism" error={server.first_name}><input name="first_name" className="input" value={f.first_name} onChange={set("first_name")} autoComplete="given-name" maxLength={150} /></Field>
          <Field label="Familiya" error={server.last_name}><input name="last_name" className="input" value={f.last_name} onChange={set("last_name")} autoComplete="family-name" maxLength={150} /></Field>
        </div>
        <Field label="Foydalanuvchi nomi" error={shown("username")} hint="Kirish uchun ishlatiladi. Kichik harf, raqam, . _ - belgilari (kamida 3 ta).">
          <input ref={refs.username} name="username" className="input" value={f.username} onChange={set("username")} onBlur={blur("username")} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" maxLength={150} />
        </Field>
        <Field label="Parol" error={shown("password")} hint="Kamida 8 belgi, faqat raqamdan iborat emas.">
          <PasswordInput inputRef={refs.password} name="password" value={f.password} onChange={set("password")} onBlur={blur("password")} autoComplete="new-password" enterKeyHint="done" />
        </Field>
        {f.password && (
          <div className="pwmeter" data-s={strength.score} aria-live="polite">
            <span className="pwmeter__bar"><i /><i /><i /><i /></span>
            <small>Parol kuchi: <b>{strength.label}</b></small>
          </div>
        )}
        {!Object.keys(server).length && <FormError error={err} />}
        <Button type="submit" variant="primary" size="lg" loading={busy} block>Ro'yxatdan o'tish</Button>
      </form>
      <p className="small muted center">Hisobingiz bormi? <Link to="/login"><b>Kirish</b></Link></p>
    </AuthCard>
  );
}
