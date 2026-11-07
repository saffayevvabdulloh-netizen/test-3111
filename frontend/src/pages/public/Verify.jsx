import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { Banner, Button, Field } from "../../ui/kit";
import Mascot from "../../ui/Mascot";
import { useTitle } from "../../hooks/useApi";
import { AuthCard, FormError, PasswordInput } from "./AuthParts";

import BotStatus from "../../ui/BotStatus";
import GuideButton from "../../ui/GuideButton";
import { GUIDE } from "../../utils/guide";
export default function Verify() {
  useTitle("Telegram orqali tasdiqlash");
  const nav = useNavigate();
  const st = useLocation().state || {};
  const [username, setUsername] = useState(st.username || "");
  const [link, setLink] = useState(st.link || "");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [pw, setPw] = useState("");
  const [relinking, setRelinking] = useState(false);
  const [linkErr, setLinkErr] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (busy || code.length !== 6) return;
    setBusy(true); setErr(null);
    try {
      await api.post("/verify-code/", { username: username.trim(), code }, { auth: false });
      nav("/login", { replace: true, state: { username: username.trim(), justVerified: true } });
    } catch (e2) { setErr(e2); setBusy(false); setCode(""); }
  }

  async function getLink() {
    setRelinking(true); setLinkErr(null);
    try {
      const r = await api.post("/telegram-link/", { username: username.trim(), password: pw }, { auth: false });
      if (r.verified) nav("/login", { replace: true, state: { username: username.trim(), justVerified: true } });
      else setLink(r.telegram_link);
    } catch (e2) { setLinkErr(e2); }
    setRelinking(false);
  }

  return (
    <AuthCard title="Telegram orqali tasdiqlang" lead="Hisobingiz xavfsizligi uchun ikki qadam kerak." guide={GUIDE.verify} mascot={<Mascot mood="think" size={190} />}>
      <BotStatus />
      {st.fresh && <Banner tone="ok">Hisob yaratildi! Endi uni tasdiqlaymiz.</Banner>}
      <ol className="steps-list">
        <li>
          <b>Botni oching</b> <GuideButton text={GUIDE.verifyStep1} />
          <span className="muted small">Telegramda «Start» tugmasini bosing — bot sizga 6 xonali kod yuboradi.</span>
          {link
            ? <Button as="a" href={link} target="_blank" rel="noopener noreferrer" variant="sun" icon="link" className="mt" style={{ alignSelf: "flex-start" }}>Telegram botni ochish</Button>
            : (
              <div className="stack mt" style={{ "--gap": "0.6rem" }}>
                <p className="small">Havola yo'q. Hisob parolini kiriting — havolani qayta beramiz.</p>
                <Field label="Parol"><PasswordInput value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" /></Field>
                <FormError error={linkErr} />
                <Button size="sm" onClick={getLink} loading={relinking} disabled={!username || !pw}>Havolani olish</Button>
              </div>
            )}
        </li>
        <li>
          <b>Kodni kiriting</b> <GuideButton text={GUIDE.verifyStep2} />
          <form className="stack mt" onSubmit={submit} noValidate>
            {!st.username && <Field label="Foydalanuvchi nomi"><input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" /></Field>}
            <Field label="6 xonali kod">
              <input className="input code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••" />
            </Field>
            <FormError error={err} />
            <Button type="submit" variant="primary" size="lg" loading={busy} disabled={code.length !== 6 || !username} block>Tasdiqlash</Button>
          </form>
        </li>
      </ol>
      <p className="small muted center">Kod 5 daqiqa amal qiladi. 5 marta xato kiritilsa, botdan yangi kod oling. · <Link to="/login">Kirish</Link></p>
    </AuthCard>
  );
}
