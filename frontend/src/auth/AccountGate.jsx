import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useConfig } from "../api/config";
import { PasswordInput } from "../pages/public/AuthParts";
import { Banner, Button, Field } from "../ui/kit";
import Mascot from "../ui/Mascot";
import { useAuth } from "./AuthContext";

// Shown instead of the app until (1) the administrator's first password was replaced and (2) the privacy policy was accepted.
export function ForcePassword() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [f, setF] = useState({ current_password: "", new_password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const fe = err?.fields || {};
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(null);
    try {
      await api.post("/me/change-password/", f);
      await logout();
      nav("/login", { replace: true, state: { passwordReset: true } });
    } catch (e2) { setErr(e2); setBusy(false); }
  }
  return (
    <div className="gate"><form className="gate__card card stack" onSubmit={submit} noValidate>
      <Mascot mood="think" size={110} />
      <h1>Yangi parol o'ylab toping</h1>
      <p className="muted">Hisobni administrator ochdi va sizga vaqtinchalik parol berdi. Xavfsizlik uchun uni o'zingiz o'ylagan parolga almashtiring. Keyin yangi parol bilan kirasiz.</p>
      <Field label="Hozirgi (vaqtinchalik) parol" error={fe.current_password}><PasswordInput name="current_password" value={f.current_password} onChange={(e) => setF((s) => ({ ...s, current_password: e.target.value }))} autoComplete="current-password" /></Field>
      <Field label="Yangi parol" error={fe.new_password} hint="Kamida 8 belgi, faqat raqamdan iborat emas."><PasswordInput name="new_password" value={f.new_password} onChange={(e) => setF((s) => ({ ...s, new_password: e.target.value }))} autoComplete="new-password" /></Field>
      {err && !Object.keys(fe).length && <Banner tone="error">{err.message}</Banner>}
      <Button type="submit" variant="primary" size="lg" loading={busy} disabled={!f.current_password || !f.new_password} block>Parolni almashtirish</Button>
      <Button variant="ghost" onClick={logout} block>Chiqish</Button>
    </form></div>
  );
}

export function ConsentScreen() {
  const { user, patchUser, logout } = useAuth();
  const { consentVersion } = useConfig();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const kid = user.role === "student";
  async function accept() {
    if (!ok || busy) return;
    setBusy(true); setErr(null);
    try { patchUser(await api.post("/me/consent/", { accept: true, version: consentVersion || undefined })); }
    catch (e) { setErr(e); setBusy(false); }
  }
  return (
    <div className="gate"><div className="gate__card card stack">
      <Mascot mood="happy" size={110} />
      <h1>{kid ? "Salom! Bir muhim narsa" : "Ma'lumotlarni qayta ishlashga rozilik"}</h1>
      <p>Bolajon AI sizning ismingiz, mashq natijalaringiz{kid ? "" : ", yozishmalaringiz"} va kirish jurnalingizni <b>faqat o'qitish uchun</b> saqlaydi. Natijalarni faqat o'qituvchi va ota-onangiz ko'radi. Ma'lumot O'zbekistondagi serverda saqlanadi, sotilmaydi va reklama uchun ishlatilmaydi.</p>
      <p className="small">To'liq matn: <Link to="/privacy" target="_blank">Maxfiylik siyosati</Link> · <Link to="/terms" target="_blank">Foydalanish shartlari</Link>. Rozilikni istalgan vaqtda qaytarib olish va ma'lumotni o'chirtirish mumkin.</p>
      <label className="check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} />
        <span>{kid ? "Ota-onam yoki vasiyim bu qoidalar bilan tanishgan va men shu sayt bilan ishlashimga rozi." : user.role === "parent" ? "Men maxfiylik siyosati bilan tanishdim, o'zim va o'z bolam (qonuniy vakili sifatida) ma'lumotlarini qayta ishlashga roziman." : "Men maxfiylik siyosati bilan tanishdim va ma'lumotlarimni qayta ishlashga roziman."}</span></label>
      {err && <Banner tone="error">{err.message}</Banner>}
      <Button variant="primary" size="lg" loading={busy} disabled={!ok} onClick={accept} block>Roziman, davom etish</Button>
      <Button variant="ghost" onClick={logout} block>Rozi emasman, chiqish</Button>
    </div></div>
  );
}
