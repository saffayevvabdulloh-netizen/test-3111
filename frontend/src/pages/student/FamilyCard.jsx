import { api } from "../../api/client";
import { useApi } from "../../hooks/useApi";
import CopyButton from "../../ui/CopyButton";
import { Button, Load, SkeletonList } from "../../ui/kit";
import { useConfirm } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";
import { nameOf } from "../../utils/format";

// Student profile: the code a parent types in their own account to link to this child.
export default function FamilyCard() {
  const q = useApi(() => api.get("/me/family/"), []);
  const toast = useToast();
  const confirm = useConfirm();

  async function renew() {
    if (!(await confirm({ title: "Yangi kod yaratilsinmi?", message: "Eski kod ishlamay qoladi. Allaqachon ulangan ota-onalar ulangan holda qoladi.", confirmLabel: "Yangi kod" }))) return;
    try { q.setData(await api.post("/me/family/")); toast("Yangi kod tayyor", "ok"); } catch (e) { toast(e.message, "error"); }
  }
  async function remove(p) {
    if (!(await confirm({ title: `${nameOf(p)} ulanishdan chiqarilsinmi?`, confirmLabel: "Chiqarish", tone: "danger" }))) return;
    try { await api.del(`/me/family/parents/${p.id}/`); q.reload(); } catch (e) { toast(e.message, "error"); }
  }

  return (
    <section className="card stack" style={{ "--gap": "0.8rem" }}>
      <h2>Ota-ona kodi</h2>
      <p className="muted">Ota-onangiz o'z hisobida shu kodni kiritsa, sizning yutuqlaringiz va ustozingiz bilan yozishuvga ulanadi.</p>
      <Load q={q} skeleton={<SkeletonList rows={1} h={60} />}>
        {(d) => (
          <>
            <div className="row" style={{ "--gap": "0.8rem" }}>
              <strong className="family-code" aria-label={`Kod: ${d.code.split("").join(" ")}`}>{d.code}</strong>
              <CopyButton text={d.code} />
              <Button size="sm" icon="refresh" onClick={renew}>Yangi kod</Button>
            </div>
            <div>
              <b>Ulangan ota-onalar</b>
              {d.parents.length === 0 ? <p className="small muted">Hali hech kim ulanmagan.</p> : (
                <ul className="list list--flat">
                  {d.parents.map((p) => (
                    <li key={p.id} className="list__row"><span className="list__main"><strong>{nameOf(p)}</strong><span className="small muted">@{p.username}</span></span>
                      <Button size="sm" variant="ghost" icon="trash" onClick={() => remove(p)}>Chiqarish</Button></li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </Load>
    </section>
  );
}
