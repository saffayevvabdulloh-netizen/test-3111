import { useState } from "react";
import { api } from "../../api/client";
import { useApi, useTitle } from "../../hooks/useApi";
import Avatar from "../../ui/Avatar";
import { Banner, Button, Chip, EmptyState, Field, Load, SkeletonList } from "../../ui/kit";
import { useConfirm } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";
import { saveBlob } from "../../utils/download";
import { nameOf } from "../../utils/format";

export default function Children() {
  useTitle("Bolalarim");
  const toast = useToast();
  const confirm = useConfirm();
  const kids = useApi(() => api.get("/parent/children/"), []);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  async function link(e) {
    e.preventDefault();
    if (busy || code.length < 4) return;
    setBusy(true); setErr(null);
    try {
      const c = await api.post("/parent/children/", { code });
      toast(`${nameOf(c)} ulandi!`, "ok");
      setCode(""); kids.reload();
    } catch (e2) { setErr(e2); }
    setBusy(false);
  }

  const [erasing, setErasing] = useState(null);   // child being erased
  const [pw, setPw] = useState("");
  const [eBusy, setEBusy] = useState(false);
  const [eErr, setEErr] = useState(null);
  async function exportChild(c) {
    try { saveBlob(await api.getBlob(`/parent/children/${c.id}/export/`), `${c.username}-malumotlari.json`); toast("Yuklab olindi", "ok"); }
    catch (e) { toast(e.message, "error"); }
  }
  async function erase(e) {
    e.preventDefault();
    if (eBusy || !pw) return;
    setEBusy(true); setEErr(null);
    try { await api.post(`/parent/children/${erasing.id}/erase/`, { password: pw }); toast("Bola ma'lumotlari o'chirildi.", "ok"); setErasing(null); setPw(""); kids.reload(); }
    catch (e2) { setEErr(e2); }
    setEBusy(false);
  }

  async function unlink(c) {
    if (!(await confirm({ title: `${nameOf(c)} ro'yxatdan olib tashlansinmi?`, message: "Ustozlar bilan suhbat ham yopiladi. Bola kodi bilan qayta ulashingiz mumkin.", confirmLabel: "Olib tashlash", tone: "danger" }))) return;
    try { await api.del(`/parent/children/${c.id}/`); toast("Olib tashlandi."); kids.reload(); } catch (e) { toast(e.message, "error"); }
  }

  return (
    <div className="stack" style={{ "--gap": "1.5rem" }}>
      <h1>Bolalarim</h1>
      <section className="card card--sky stack" style={{ "--gap": "0.8rem" }}>
        <h2>Bolani ulash</h2>
        <p>Bolangiz o'z profilida (<b>Profil → Ota-ona kodi</b>) 6 belgili kodni ko'radi. Shu kodni kiriting.</p>
        <form className="join" onSubmit={link}>
          <Field label="Bola kodi"><input className="input code-input" maxLength={6} value={code} autoCapitalize="characters" autoComplete="off" placeholder="ABC123"
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} /></Field>
          <Button type="submit" variant="primary" loading={busy} disabled={code.length < 4}>Ulash</Button>
        </form>
        {err && <Banner tone="error">{err.message}</Banner>}
      </section>

      <section className="stack" style={{ "--gap": "0.7rem" }}>
        <h2>Ulangan bolalar</h2>
        <Load q={kids} skeleton={<SkeletonList rows={2} h={84} />} isEmpty={(d) => d.results.length === 0}
          empty={<EmptyState title="Hali bola ulanmagan">Yuqoridagi maydonga bolangizning kodini kiriting.</EmptyState>}>
          {(d) => (
            <ul className="list">
              {d.results.map((c) => (
                <li key={c.id} className="list__row">
                  <Avatar name={c.avatar} label={nameOf(c)} size={48} />
                  <span className="list__main">
                    <strong>{nameOf(c)}</strong>
                    <span className="small muted">@{c.username}{c.age ? ` · ${c.age} yosh` : ""}</span>
                    <span className="row" style={{ "--gap": "0.4rem", marginTop: "0.35rem" }}>
                      {c.classes.length === 0 && <span className="small muted">Hali sinfga qo'shilmagan</span>}
                      {c.classes.map((k) => <Chip key={k.id} tone="grape">{k.name} · {nameOf(k.teacher)}</Chip>)}
                    </span>
                  </span>
                  <span className="row" style={{ "--gap": "0.4rem" }}>
                    {c.classes.map((k) => <Button key={k.id} size="sm" variant="primary" icon="send" to={`/parent/chat/${k.teacher.id}`}>Ustozga yozish</Button>).slice(0, 1)}
                    <Button size="sm" variant="ghost" icon="download" onClick={() => exportChild(c)}>Ma'lumotlari</Button>
                    <Button size="sm" variant="ghost" icon="trash" onClick={() => unlink(c)}>Olib tashlash</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setErasing(c); setPw(""); setEErr(null); }}>Ma'lumotni o'chirish</Button>
                  </span>
                  {erasing?.id === c.id && (
                    <form className="stack" style={{ "--gap": "0.5rem", flexBasis: "100%" }} onSubmit={erase} noValidate>
                      <Banner tone="warn">{nameOf(c)} hisobi va barcha natijalari butunlay o'chiriladi. Tasdiqlash uchun o'z parolingizni kiriting.</Banner>
                      <input className="input" type="password" autoComplete="current-password" aria-label="Sizning parolingiz" value={pw} onChange={(e) => setPw(e.target.value)} />
                      {eErr && <Banner tone="error">{eErr.message}</Banner>}
                      <span className="row"><Button type="submit" variant="primary" loading={eBusy} disabled={!pw}>O'chirish</Button><Button variant="ghost" onClick={() => setErasing(null)}>Bekor qilish</Button></span>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Load>
      </section>
    </div>
  );
}
