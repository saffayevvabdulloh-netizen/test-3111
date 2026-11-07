import { BRAND } from "../../brand";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useConfig } from "../../api/config";
import { Button, Field } from "../../ui/kit";
import Mascot from "../../ui/Mascot";
import { useTitle } from "../../hooks/useApi";
import { AuthCard, FormError, PasswordInput } from "./AuthParts";

const BOT_URL = import.meta.env.VITE_TELEGRAM_BOT_URL;

import BotStatus from "../../ui/BotStatus";
import { GUIDE } from "../../utils/guide";
export default function Forgot() {
  useTitle("Parolni tiklash");
  const nav = useNavigate();
  const cfg = useConfig();
  const [f, setF] = useState({ username: "", code: "", new_password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: k === "code" ? e.target.value.replace(/\D/g, "").slice(0, 6) : e.target.value }));
  const fe = err?.fields || {};

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      await api.post("/password-reset/confirm/", { ...f, username: f.username.trim() }, { auth: false });
      nav("/login", { replace: true, state: { username: f.username.trim(), passwordReset: true } });
    } catch (e2) { setErr(e2); setBusy(false); }
  }

  if (cfg.ready && !cfg.registrationOpen) {
    return (
      <AuthCard title="Parolni tiklash" lead="Parolni administrator yangilaydi." mascot={<Mascot mood="think" size={190} />}>
        <p>Parolni unutgan bo'lsangiz, administratorga ayting. U sizga yangi parol beradi.</p>
        <Button to="/login" variant="primary" size="lg" block>Kirishga qaytish</Button>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Parolni tiklash" lead="Telegram orqali yangi parol o'rnating." guide={GUIDE.forgot} mascot={<Mascot mood="think" size={190} />}>
      <BotStatus compact />
      <ol className="steps-list">
        <li>
          <b>Botdan kod oling</b>
          <span className="muted small">Hisobingizga ulangan Telegramda {BRAND} botiga <code>/reset</code> deb yozing. Bot kod yuboradi.</span>
          {BOT_URL && <Button as="a" href={BOT_URL} target="_blank" rel="noopener noreferrer" variant="sun" icon="link" className="mt" style={{ alignSelf: "flex-start" }}>Botni ochish</Button>}
        </li>
        <li>
          <b>Yangi parol o'rnating</b>
          <form className="stack mt" onSubmit={submit} noValidate>
            <Field label="Foydalanuvchi nomi" error={fe.username}><input className="input" value={f.username} onChange={set("username")} autoCapitalize="none" autoComplete="username" /></Field>
            <Field label="6 xonali kod" error={fe.code}><input className="input code-input" inputMode="numeric" maxLength={6} value={f.code} onChange={set("code")} placeholder="••••••" /></Field>
            <Field label="Yangi parol" error={fe.new_password}><PasswordInput value={f.new_password} onChange={set("new_password")} autoComplete="new-password" /></Field>
            {!Object.keys(fe).length && <FormError error={err} />}
            <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!f.username || f.code.length !== 6 || !f.new_password} block>Parolni o'zgartirish</Button>
          </form>
        </li>
      </ol>
      <p className="small muted center"><Link to="/login">← Kirishga qaytish</Link></p>
    </AuthCard>
  );
}
