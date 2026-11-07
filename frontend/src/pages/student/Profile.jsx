import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useTitle } from "../../hooks/useApi";
import Avatar, { AVATARS } from "../../ui/Avatar";
import { Banner, Button, Chip, Field } from "../../ui/kit";
import { useToast } from "../../ui/Toast";
import { nameOf } from "../../utils/format";
import { usePrefs } from "../../utils/prefs";
import { saveBlob } from "../../utils/download";
import { useConfirm } from "../../ui/Modal";
import { Link } from "react-router-dom";
import FamilyCard from "./FamilyCard";
import { onSoundChange, setSoundEnabled, soundEnabled } from "../../utils/sound";

// Shared by students (/app/profile) and teachers (/teach/profile).
export default function Profile() {
  useTitle("Profil");
  const { user, patchUser, logout } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [f, setF] = useState({ first_name: user.first_name || "", last_name: user.last_name || "", avatar: user.avatar || "", age: user.age ?? "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(null);
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwErr, setPwErr] = useState(null);
  const confirm = useConfirm();
  const [dl, setDl] = useState(false);
  const [delPw, setDelPw] = useState("");
  const [delBusy, setDelBusy] = useState(false);
  const [delErr, setDelErr] = useState(null);
  const [sound, setSound] = useState(soundEnabled());
  const [prefs, setPref] = usePrefs();
  useEffect(() => onSoundChange(setSound), []);
  const dirty = f.first_name !== (user.first_name || "") || f.last_name !== (user.last_name || "") || f.avatar !== (user.avatar || "") || String(f.age) !== String(user.age ?? "");
  const fe = err?.fields || {};
  const pe = pwErr?.fields || {};

  async function save(e) {
    e.preventDefault();
    if (saving || !dirty) return;
    setSaving(true); setErr(null);
    try {
      const u = await api.patch("/me/", { ...f, age: f.age === "" ? null : Number(f.age) });
      patchUser(u);
      toast("Saqlandi", "ok");
    } catch (e2) { setErr(e2); }
    setSaving(false);
  }

  async function changePw(e) {
    e.preventDefault();
    if (pwBusy) return;
    setPwBusy(true); setPwErr(null);
    try {
      await api.post("/me/change-password/", pw);
      toast("Parol o'zgartirildi. Qaytadan kiring.", "ok");
      await logout();
      nav("/login", { replace: true });
    } catch (e2) { setPwErr(e2); setPwBusy(false); }
  }

  async function download() {
    if (dl) return;
    setDl(true);
    try { saveBlob(await api.getBlob("/me/export/"), "mening-malumotlarim.json"); toast("Yuklab olindi", "ok"); }
    catch (e) { toast(e.message, "error"); }
    setDl(false);
  }
  async function deleteAccount(e) {
    e.preventDefault();
    if (delBusy || !delPw) return;
    if (!(await confirm({ title: "Hisob butunlay o'chirilsinmi?", message: "Bu amalni qaytarib bo'lmaydi: ma'lumotlaringiz yo'q qilinadi.", confirmLabel: "O'chirish", tone: "danger" }))) return;
    setDelBusy(true); setDelErr(null);
    try { await api.post("/me/delete/", { password: delPw }); await logout(); nav("/login", { replace: true }); }
    catch (e2) { setDelErr(e2); setDelBusy(false); }
  }

  return (
    <div className="stack" style={{ "--gap": "1.5rem", maxWidth: 720 }}>
      <div className="row" style={{ "--gap": "1rem" }}>
        <Avatar name={f.avatar} label={nameOf(user)} size={72} />
        <div>
          <h1>{nameOf(user)}</h1>
          <p className="muted">@{user.username} · {user.age ? `${user.age} yosh · ` : ""}<Chip tone={user.role === "teacher" ? "grape" : user.role === "parent" ? "coral" : "emerald"}>{user.role === "teacher" ? "O'qituvchi" : user.role === "parent" ? "Ota-ona" : "O'quvchi"}</Chip></p>
        </div>
      </div>

      <form className="card stack" style={{ "--gap": "1rem" }} onSubmit={save} noValidate>
        <h2>Ma'lumotlarim</h2>
        <fieldset className="avatars">
          <legend className="label">Avatar tanlang</legend>
          <div className="avatars__grid">
            {AVATARS.map((a) => (
              <label key={a.key} className={`avatars__opt ${f.avatar === a.key ? "is-on" : ""}`}>
                <input type="radio" name="avatar" value={a.key} checked={f.avatar === a.key} onChange={() => setF((s) => ({ ...s, avatar: a.key }))} />
                <Avatar name={a.key} size={52} /><span className="sr-only">{a.key}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid-2">
          <Field label="Ism" error={fe.first_name}><input className="input" value={f.first_name} maxLength={150} onChange={(e) => setF((s) => ({ ...s, first_name: e.target.value }))} /></Field>
          <Field label="Familiya" error={fe.last_name}><input className="input" value={f.last_name} maxLength={150} onChange={(e) => setF((s) => ({ ...s, last_name: e.target.value }))} /></Field>
        </div>
        <div className="grid-2">
          <Field label="Yosh" error={fe.age} hint="Ixtiyoriy. 3 dan 100 gacha.">
            <input className="input" type="number" inputMode="numeric" min={3} max={100} step={1} placeholder="Masalan: 8" value={f.age}
              onChange={(e) => setF((s) => ({ ...s, age: e.target.value.replace(/\D/g, "").slice(0, 3) }))} />
          </Field>
        </div>
        {err && !Object.keys(fe).length && <Banner tone="error">{err.message}</Banner>}
        <div><Button type="submit" variant="primary" loading={saving} disabled={!dirty}>Saqlash</Button></div>
      </form>

      {user.role === "student" && <FamilyCard />}

      <section className="card stack" style={{ "--gap": "0.8rem" }}>
        <h2>Qulaylik</h2>
        <label className="check"><input type="checkbox" checked={prefs.calm} onChange={(e) => setPref("calm", e.target.checked)} />
          <span>Sokin rejim<span className="hint" style={{ display: "block" }}>Harakatlar, konfetti va baland ovozlar kamayadi, ranglar yumshoq bo'ladi.</span></span></label>
        <label className="check"><input type="checkbox" checked={prefs.big} onChange={(e) => setPref("big", e.target.checked)} />
          <span>Katta matn<span className="hint" style={{ display: "block" }}>Yozuvlar kattaroq ko'rinadi.</span></span></label>
      </section>

      <section className="card stack" style={{ "--gap": "0.8rem" }}>
        <h2>Ovoz</h2>
        <label className="check"><input type="checkbox" checked={sound} onChange={(e) => setSoundEnabled(e.target.checked)} />
          <span>O'yin ovozlari<span className="hint" style={{ display: "block" }}>To'g'ri/noto'g'ri javob va natija ovozlari. Istalgan payt o'chirishingiz mumkin.</span></span></label>
      </section>

      <form className="card stack" style={{ "--gap": "1rem" }} onSubmit={changePw} noValidate>
        <h2>Parolni almashtirish</h2>
        <Field label="Joriy parol" error={pe.current_password}><input className="input" type="password" autoComplete="current-password" value={pw.current_password} onChange={(e) => setPw((s) => ({ ...s, current_password: e.target.value }))} /></Field>
        <Field label="Yangi parol" error={pe.new_password} hint="Parolni almashtirgach, qaytadan kirishingiz kerak."><input className="input" type="password" autoComplete="new-password" value={pw.new_password} onChange={(e) => setPw((s) => ({ ...s, new_password: e.target.value }))} /></Field>
        {pwErr && !Object.keys(pe).length && <Banner tone="error">{pwErr.message}</Banner>}
        <div><Button type="submit" loading={pwBusy} disabled={!pw.current_password || !pw.new_password}>Parolni o'zgartirish</Button></div>
      </form>

      <section className="card stack" style={{ "--gap": "0.8rem" }}>
        <h2>Mening ma'lumotlarim</h2>
        <p className="muted small">Saqlanayotgan ma'lumotlaringizni ko'rish va yuklab olish huquqingiz bor. <Link to="/privacy">Maxfiylik siyosati</Link> · <Link to="/terms">Shartlar</Link></p>
        <div><Button icon="download" loading={dl} onClick={download}>Ma'lumotlarimni yuklab olish</Button></div>
        {user.role === "student"
          ? <p className="hint">Bola hisobini o'chirish yoki ma'lumotini olish uchun ota-onangizga ayting: u «Bolalarim» sahifasidan qiladi.</p>
          : <form className="stack" style={{ "--gap": "0.6rem" }} onSubmit={deleteAccount} noValidate>
              <Field label="Hisobni o'chirish" error={delErr?.fields?.password} hint="Tasdiqlash uchun parolingizni kiriting."><input className="input" type="password" autoComplete="current-password" value={delPw} onChange={(e) => setDelPw(e.target.value)} /></Field>
              {delErr && !delErr.fields?.password && <Banner tone="error">{delErr.message}</Banner>}
              <div><Button type="submit" variant="danger" icon="trash" loading={delBusy} disabled={!delPw}>Hisobni o'chirish</Button></div>
            </form>}
      </section>

      <div className="row">
        {user.role === "student" && <Button to="/app/classes">Sinfim</Button>}
        <Button icon="logout" onClick={logout}>Chiqish</Button>
      </div>
    </div>
  );
}
