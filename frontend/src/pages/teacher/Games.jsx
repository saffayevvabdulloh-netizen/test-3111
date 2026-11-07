import { useState } from "react";
import { Link } from "react-router-dom";
import { api, qs } from "../../api/client";
import { useApi, useDebounced, useTitle } from "../../hooks/useApi";
import { StatusChip } from "../../ui/Cards";
import Icon from "../../ui/Icon";
import { Button, Chip, EmptyState, Load, Pager, SkeletonList, Tabs } from "../../ui/kit";
import { useConfirm } from "../../ui/Modal";
import { useToast } from "../../ui/Toast";
import { fmtDate } from "../../utils/format";
import { TypeIcon, typeMeta } from "../../games/meta";

const TABS = [{ key: "", label: "Hammasi" }, { key: "draft", label: "Qoralamalar" }, { key: "published", label: "Nashr etilgan" }, { key: "archived", label: "Arxiv" }];

export default function Games() {
  useTitle("O'yinlarim");
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const term = useDebounced(search.trim(), 300);
  const q = useApi(() => api.get(`/games/${qs({ status, search: term, page })}`), [status, term, page]);

  async function act(g, fn, okMsg) {
    if (busy) return;
    setBusy(g.id);
    try { await fn(); toast(okMsg, "ok"); await q.reload(); } catch (e) { toast(e.message, "error"); }
    setBusy(null);
  }
  const dup = (g) => act(g, async () => { await api.post(`/games/${g.id}/duplicate/`); }, "Nusxa qoralama sifatida yaratildi.");
  const archive = (g) => act(g, () => api.post(`/games/${g.id}/archive/`), "Arxivga o'tkazildi.");
  const restore = (g) => act(g, () => api.post(`/games/${g.id}/unpublish/`), "Qoralamaga qaytarildi.");
  async function remove(g) {
    if (!(await confirm({ title: `«${g.title}» o'chirilsinmi?`, message: "Bu amalni qaytarib bo'lmaydi. O'quvchilar o'ynagan o'yinni o'chirib bo'lmaydi — uni arxivlang.", confirmLabel: "O'chirish", tone: "danger" }))) return;
    act(g, () => api.del(`/games/${g.id}/`), "O'chirildi.");
  }

  return (
    <div className="stack" style={{ "--gap": "1.2rem" }}>
      <div className="row row--between"><h1>O'yinlarim</h1><Button to="/teach/games/new" variant="primary" icon="plus">Yangi o'yin</Button></div>
      <div className="filters">
        <div className="search"><Icon name="search" size={20} /><input className="input" type="search" placeholder="Nom bo'yicha qidirish..." aria-label="O'yin qidirish" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <Tabs tabs={TABS} value={status} onChange={(k) => { setStatus(k); setPage(1); }} label="Holat" />
      </div>
      <Load q={q} skeleton={<SkeletonList rows={4} h={84} />} isEmpty={(d) => d.results.length === 0}
        empty={<EmptyState mood="sleepy" title={term || status ? "Hech narsa topilmadi" : "Hali o'yin yaratmagansiz"} action={!term && !status && <Button to="/teach/games/new" variant="primary" icon="plus">Birinchi o'yinni yaratish</Button>}>{term || status ? "Filtrni o'zgartirib ko'ring." : "To'rt xil turdan birini tanlab boshlang."}</EmptyState>}>
        {(d) => (
          <>
            <ul className="grows">
              {d.results.map((g) => {
                const m = typeMeta(g.game_type);
                return (
                  <li key={g.id} className="grow-row">
                    <span className="grow-row__ico" data-tone={m.tone}><TypeIcon type={g.game_type} size={26} /></span>
                    <div className="grow-row__main">
                      <Link to={`/teach/games/${g.id}`} className="grow-row__title">{g.title}</Link>
                      <div className="row" style={{ "--gap": "0.4rem" }}>
                        <StatusChip status={g.status} /><Chip tone={m.tone} plain>{m.label}</Chip>
                        <span className="small muted">{g.question_count} savol · {g.max_score} ball · {fmtDate(g.updated_at)}</span>
                      </div>
                    </div>
                    <div className="grow-row__acts">
                      <Button size="sm" to={`/teach/games/${g.id}`} icon="edit">Tahrirlash</Button>
                      <Button size="sm" variant="ghost" className="btn--icon" to={`/teach/games/${g.id}/stats`} icon="chart" aria-label={`${g.title} statistikasi`} />
                      <Button size="sm" variant="ghost" className="btn--icon" icon="copy" aria-label={`${g.title} nusxasi`} disabled={busy === g.id} onClick={() => dup(g)} />
                      {g.status === "archived"
                        ? <Button size="sm" variant="ghost" className="btn--icon" icon="refresh" aria-label="Qoralamaga qaytarish" disabled={busy === g.id} onClick={() => restore(g)} />
                        : <Button size="sm" variant="ghost" className="btn--icon" icon="archive" aria-label="Arxivga o'tkazish" disabled={busy === g.id} onClick={() => archive(g)} />}
                      <Button size="sm" variant="ghost" className="btn--icon" icon="trash" aria-label={`${g.title} ni o'chirish`} disabled={busy === g.id} onClick={() => remove(g)} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <Pager page={page} count={d.count} onPage={setPage} />
          </>
        )}
      </Load>
    </div>
  );
}
