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

const TABS = [{ key: "", label: "Hammasi" }, { key: "draft", label: "Qoralamalar" }, { key: "published", label: "Nashr etilgan" }, { key: "archived", label: "Arxiv" }];

export default function Lessons() {
  useTitle("Darslarim");
  const toast = useToast();
  const confirm = useConfirm();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const term = useDebounced(search.trim(), 300);
  const q = useApi(() => api.get(`/lessons/${qs({ status, search: term, page })}`), [status, term, page]);
  async function remove(l) {
    if (!(await confirm({ title: `«${l.title}» o'chirilsinmi?`, message: "Darsga bog'langan o'yinlar o'chmaydi, faqat bog'lanish uziladi.", confirmLabel: "O'chirish", tone: "danger" }))) return;
    try { await api.del(`/lessons/${l.id}/`); toast("O'chirildi."); q.reload(); } catch (e) { toast(e.message, "error"); }
  }
  return (
    <div className="stack" style={{ "--gap": "1.2rem" }}>
      <div className="row row--between"><h1>Darslarim</h1><Button to="/teach/lessons/new" variant="primary" icon="plus">Yangi dars</Button></div>
      <div className="filters">
        <div className="search"><Icon name="search" size={20} /><input className="input" type="search" placeholder="Qidirish..." aria-label="Dars qidirish" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} /></div>
        <Tabs tabs={TABS} value={status} onChange={(k) => { setStatus(k); setPage(1); }} label="Holat" />
      </div>
      <Load q={q} skeleton={<SkeletonList rows={3} h={70} />} isEmpty={(d) => d.results.length === 0}
        empty={<EmptyState title={term || status ? "Hech narsa topilmadi" : "Hali dars yo'q"} action={!term && !status && <Button to="/teach/lessons/new" variant="primary" icon="plus">Birinchi darsni yozish</Button>}>Dars — o'quvchilar o'yindan oldin o'qiydigan qisqa matn.</EmptyState>}>
        {(d) => (
          <>
            <ul className="list">{d.results.map((l) => (
              <li key={l.id} className="list__row">
                <Link to={`/teach/lessons/${l.id}`} className="list__main"><strong>{l.title}</strong><span className="small muted">{fmtDate(l.updated_at)}</span></Link>
                {l.subject && <Chip tone="sky">{l.subject}</Chip>}<StatusChip status={l.status} />
                <Button size="sm" to={`/teach/lessons/${l.id}`} icon="edit">Tahrirlash</Button>
                <Button size="sm" variant="ghost" className="btn--icon" icon="trash" aria-label={`${l.title} ni o'chirish`} onClick={() => remove(l)} />
              </li>
            ))}</ul>
            <Pager page={page} count={d.count} onPage={setPage} />
          </>
        )}
      </Load>
    </div>
  );
}
