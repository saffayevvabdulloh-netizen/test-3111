import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { afterLoginPath, useAuth } from "../../auth/AuthContext";
import { Banner, Button, Field } from "../../ui/kit";
import Mascot from "../../ui/Mascot";
import { useConfig } from "../../api/config";
import { useTitle } from "../../hooks/useApi";
import { AuthCard, FormError, PasswordInput } from "./AuthParts";

import { GUIDE } from "../../utils/guide";
export default function Login() {
  useTitle("Kirish");
  const { login } = useAuth();
  const { registrationOpen } = useConfig();
  const nav = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ username: loc.state?.username || "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const refs = { username: useRef(null), password: useRef(null) };

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    // Read the real field values: browser autofill / password managers sometimes fill the inputs
    // without React noticing, and a disabled button would then leave the person stuck.
    const fd = new FormData(e.currentTarget);
    const username = String(fd.get("username") ?? f.username).trim();
    const password = String(fd.get("password") ?? f.password);
    if (!username || !password) {
      setErr({ message: !username ? "Foydalanuvchi nomini yozing." : "Parolni yozing." });
      (username ? refs.password : refs.username).current?.focus();
      return;
    }
    setBusy(true); setErr(null);
    try {
      const u = await login(username, password);
      nav(afterLoginPath(u, loc.state?.from), { replace: true });
    } catch (e2) {
      if (e2.code === "telegram_not_verified") {
        nav("/verify", { state: { username, link: e2.data.telegram_link } });
      } else {
        setErr(e2); setBusy(false);
        setTimeout(() => { refs.password.current?.focus(); refs.password.current?.select(); }, 0);  // typo? retype the password
      }
    }
  }

  return (
    <AuthCard title="Qaytganingdan xursandmiz!" lead="Hisobingizga kiring." guide={GUIDE.login} mascot={<Mascot mood="happy" size={200} className="mascot--bob" />}>
      {loc.state?.justVerified && <Banner tone="ok">Telegram tasdiqlandi. Endi kirishingiz mumkin!</Banner>}
      {loc.state?.passwordReset && <Banner tone="ok">Parol o'zgartirildi. Yangi parol bilan kiring.</Banner>}
      <form className="stack" onSubmit={submit} noValidate>
        <Field label="Foydalanuvchi nomi"><input ref={refs.username} name="username" className="input" value={f.username} onChange={set("username")} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} autoFocus={!f.username} enterKeyHint="next" /></Field>
        <Field label="Parol"><PasswordInput inputRef={refs.password} name="password" value={f.password} onChange={set("password")} autoComplete="current-password" autoFocus={!!f.username} enterKeyHint="go" /></Field>
        <FormError error={err} />
        <Button type="submit" variant="primary" size="lg" loading={busy} block>Kirish</Button>
      </form>
      {registrationOpen ? (
        <p className="small muted center">
          Hisobingiz yo'qmi? <Link to="/register"><b>Ro'yxatdan o'ting</b></Link> · <Link to="/forgot">Parolni unutdim</Link>
        </p>
      ) : (
        <p className="small muted center">Hisobni administrator ochib beradi. Kirish nomi yoki parolni unutgan bo'lsangiz, administratorga ayting.</p>
      )}
    </AuthCard>
  );
}
