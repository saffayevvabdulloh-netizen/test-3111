import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useAuth } from "../../auth/AuthContext";
import { useApi, useTitle } from "../../hooks/useApi";
import Avatar from "../../ui/Avatar";
import Icon from "../../ui/Icon";
import { Banner, Button, EmptyState, Load, SkeletonList } from "../../ui/kit";
import { useToast } from "../../ui/Toast";
import { fmtDateTime, nameOf } from "../../utils/format";

const POLL_MS = 4000;
const MAX = 2000;

const timeOf = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const dayKey = (iso) => new Date(iso).toDateString();

// Shared by teachers (/teach/chat) and parents (/parent/chat).
export default function Chat() {
  useTitle("Xabarlar");
  const { user } = useAuth();
  const { peerId } = useParams();
  const base = user.role === "teacher" ? "/teach" : "/parent";
  const threads = useApi(() => api.get("/chat/threads/"), []);

  // keep the list (last message / unread dots) fresh
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) threads.reload(); }, 10000);
    return () => clearInterval(t);
  }, [threads.reload]);  // eslint-disable-line react-hooks/exhaustive-deps

  const isTeacher = user.role === "teacher";
  return (
    <div className="stack" style={{ "--gap": "1rem" }}>
      <h1>Xabarlar</h1>
      <div className={`chat ${peerId ? "chat--open" : ""}`}>
        <aside className="chat__list" aria-label="Suhbatlar">
          <Load q={threads} skeleton={<SkeletonList rows={3} h={64} />} isEmpty={(d) => d.results.length === 0}
            empty={<EmptyState title={isTeacher ? "Hali ota-ona yo'q" : "Hali ustoz yo'q"}>
              {isTeacher
                ? "Ota-onalar bolaning kodi bilan o'z hisobiga bolani ulaganidan keyin, bola sizning sinfingizda bo'lsa, shu yerda ko'rinadi."
                : "Avval «Bolalarim» bo'limida bolangizni kod bilan ulang. Bola ustozning sinfiga qo'shilgach, ustoz shu yerda ko'rinadi."}
              {!isTeacher && <><br /><Button to="/parent" variant="primary" style={{ marginTop: "0.8rem" }}>Bolani ulash</Button></>}
            </EmptyState>}>
            {(d) => (
              <ul className="list">
                {d.results.map((t) => {
                  const active = String(t.peer.id) === peerId;
                  return (
                    <li key={t.peer.id}>
                      <Link to={`${base}/chat/${t.peer.id}`} className={`list__row chat__thread ${active ? "is-on" : ""}`} aria-current={active ? "true" : undefined}>
                        <Avatar name={t.peer.avatar} label={nameOf(t.peer)} size={42} />
                        <span className="list__main">
                          <strong className="truncate">{nameOf(t.peer)}</strong>
                          <span className="small muted truncate">
                            {isTeacher ? `Ota-ona: ${t.children.join(", ")}` : `Ustoz · ${t.classes.join(", ")}`}
                          </span>
                          {t.last_message && <span className="small truncate chat__last">{t.last_message.mine ? "Siz: " : ""}{t.last_message.text}</span>}
                        </span>
                        {t.unread > 0 && <span className="chat__badge" aria-label={`${t.unread} ta o'qilmagan`}>{t.unread}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Load>
        </aside>
        <section className="chat__pane" aria-label="Suhbat">
          {peerId ? <Conversation key={peerId} peerId={peerId} base={base} thread={threads.data?.results.find((t) => String(t.peer.id) === peerId)} onActivity={threads.reload} />
            : <div className="chat__none"><EmptyState mood="happy" title="Suhbatni tanlang">Chapdan odamni tanlab, xabar yozing.</EmptyState></div>}
        </section>
      </div>
    </div>
  );
}

function Conversation({ peerId, base, thread, onActivity }) {
  const { user } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [msgs, setMsgs] = useState([]);
  const [peer, setPeer] = useState(null);
  const [state, setState] = useState("loading");   // loading | ok | error
  const [error, setError] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const last = useRef(0);
  const box = useRef(null);
  const activity = useRef(Date.now());   // last time something was sent / received
  const stick = useRef(true);   // auto-scroll only while the reader is at the bottom

  const merge = useCallback((incoming) => {
    if (!incoming.length) return;
    setMsgs((cur) => {
      const have = new Map(cur.map((m) => [m.id, m]));
      incoming.forEach((m) => have.set(m.id, m));
      activity.current = Date.now();
      const out = [...have.values()].sort((a, b) => a.id - b.id);
      last.current = out.length ? out[out.length - 1].id : 0;
      return out;
    });
  }, []);

  const load = useCallback(async (initial) => {
    try {
      const d = await api.get(`/chat/threads/${peerId}/messages/${initial || !last.current ? "" : `?after=${last.current}`}`);
      setPeer(d.peer);
      if (initial) { setMsgs(d.results); last.current = d.results.length ? d.results[d.results.length - 1].id : 0; setState("ok"); }
      else merge(d.results);
      if (d.results.length) { window.dispatchEvent(new Event("chat:read")); }
    } catch (e) {
      if (initial) { setError(e); setState("error"); }
    }
  }, [peerId, merge]);

  useEffect(() => { load(true); }, [load]);
  // Polling slows down while the conversation is quiet (4 s -> 8 s -> 15 s) and stops in a hidden tab: far fewer requests.
  useEffect(() => {
    if (state !== "ok") return undefined;
    let timer, alive = true;
    const next = () => {
      const quiet = Date.now() - activity.current;
      timer = setTimeout(async () => { if (!document.hidden) await load(false); if (alive) next(); }, quiet < 60000 ? POLL_MS : quiet < 300000 ? 8000 : 15000);
    };
    const wake = () => { if (!document.hidden) { clearTimeout(timer); load(false).finally(() => { if (alive) next(); }); } };
    document.addEventListener("visibilitychange", wake);
    next();
    return () => { alive = false; clearTimeout(timer); document.removeEventListener("visibilitychange", wake); };
  }, [state, load]);

  useLayoutEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs, state]);

  async function send(e) {
    e?.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const m = await api.post(`/chat/threads/${peerId}/messages/`, { text: body });
      stick.current = true;
      merge([m]); setText(""); onActivity?.();
    } catch (er) { toast(er.message, "error"); }
    setSending(false);
  }

  const onKey = (e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) send(e); };

  if (state === "loading") return <div className="chat__body"><SkeletonList rows={4} h={48} /></div>;
  if (state === "error") {
    return (
      <div className="chat__body stack">
        <Banner tone="error">{error?.status === 404 ? "Bu odam bilan suhbat mavjud emas (bola sinfdan chiqqan yoki ulanish o'chirilgan bo'lishi mumkin)." : error?.message}</Banner>
        <div><Button to={`${base}/chat`}>Orqaga</Button></div>
      </div>
    );
  }

  const isTeacher = user.role === "teacher";
  let prevDay = null;
  return (
    <div className="chat__conv">
      <header className="chat__head">
        <Button variant="ghost" size="sm" className="chat__back" icon="arrow-left" aria-label="Suhbatlar ro'yxati" onClick={() => nav(`${base}/chat`)} />
        <Avatar name={peer?.avatar} label={nameOf(peer)} size={40} />
        <div className="grow">
          <strong className="truncate" style={{ display: "block" }}>{nameOf(peer)}</strong>
          <span className="small muted truncate" style={{ display: "block" }}>
            {thread ? (isTeacher ? `Ota-ona · ${thread.children.join(", ")}` : `Ustoz · ${thread.classes.join(", ")}`) : (isTeacher ? "Ota-ona" : "Ustoz")}
          </span>
        </div>
      </header>
      <div className="chat__msgs" ref={box} role="log" aria-live="polite" aria-label="Xabarlar"
        onScroll={(e) => { const el = e.currentTarget; stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80; }}>
        {msgs.length === 0 && <p className="muted center chat__empty">Hali xabar yo'q. Birinchi bo'lib yozing 👋</p>}
        {msgs.map((m) => {
          const showDay = dayKey(m.created_at) !== prevDay; prevDay = dayKey(m.created_at);
          return (
            <div key={m.id} className="chat__row">
              {showDay && <div className="chat__day">{fmtDateTime(m.created_at).split(",")[0]}</div>}
              <div className={`bubble ${m.mine ? "bubble--mine" : ""}`}>
                <p>{m.text}</p>
                <span className="bubble__meta">{timeOf(m.created_at)}{m.mine && <Icon name="check" size={13} className={m.read ? "bubble__read" : ""} />}</span>
              </div>
            </div>
          );
        })}
      </div>
      <form className="chat__form" onSubmit={send}>
        <label className="sr-only" htmlFor="chat-text">Xabar</label>
        <textarea id="chat-text" className="textarea chat__input" rows={1} maxLength={MAX} value={text} placeholder="Xabar yozing…"
          onChange={(e) => setText(e.target.value)} onKeyDown={onKey} enterKeyHint="send" />
        <Button type="submit" variant="primary" icon="send" loading={sending} disabled={!text.trim()} aria-label="Yuborish">Yuborish</Button>
      </form>
    </div>
  );
}
