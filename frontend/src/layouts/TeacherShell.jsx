import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { prefetchFor } from "../prefetch";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";
import { Button } from "../ui/kit";
import { useUnread } from "../chat/useUnread";
import { nameOf } from "../utils/format";
import { Logo, SoundToggle } from "./Parts";

const NAV = [
  { to: "/teach", end: true, icon: "chart", label: "Boshqaruv" },
  { to: "/teach/games", icon: "gamepad", label: "O'yinlar" },
  { to: "/teach/lessons", icon: "book", label: "Darslar" },
  { to: "/teach/classes", icon: "users", label: "Sinflar" },
  { to: "/teach/chat", icon: "send", label: "Xabarlar", badge: true },
  { to: "/teach/profile", icon: "user", label: "Profil" },
];

export default function TeacherShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const unread = useUnread();
  const main = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { prefetchFor("teacher"); }, []);
  useEffect(() => { setOpen(false); main.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="t-shell">
      <a className="skip-link" href="#main">Asosiy qismga o'tish</a>
      <header className="t-top">
        <button type="button" className="btn btn--ghost btn--icon" aria-label="Menyu" aria-expanded={open} aria-controls="t-side" onClick={() => setOpen((v) => !v)}><Icon name="menu" /></button>
        <Logo to="/teach" size={34} />
        <span className="grow" />
        <SoundToggle />
      </header>
      {open && <button type="button" className="t-scrim" aria-label="Menyuni yopish" onClick={() => setOpen(false)} />}
      <aside id="t-side" className={`t-side ${open ? "is-open" : ""}`}>
        <div className="t-side__logo"><Logo to="/teach" size={38} /></div>
        <Button to="/teach/games/new" variant="primary" icon="plus" block>Yangi o'yin</Button>
        <nav aria-label="Bo'limlar" className="t-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="t-nav__item"><Icon name={n.icon} size={20} />{n.label}{n.badge && unread > 0 && <span className="chat__badge" style={{ marginLeft: "auto" }} aria-label={`${unread} ta o'qilmagan`}>{unread}</span>}</NavLink>
          ))}
        </nav>
        <div className="t-side__foot">
          <div className="row" style={{ "--gap": "0.6rem", flexWrap: "nowrap" }}>
            <Avatar name={user.avatar} label={nameOf(user)} size={38} />
            <div className="grow"><div className="truncate" style={{ fontWeight: 800 }}>{nameOf(user)}</div><div className="small muted">O'qituvchi</div></div>
          </div>
          <Button size="sm" icon="logout" onClick={logout} block>Chiqish</Button>
        </div>
      </aside>
      <main id="main" ref={main} tabIndex={-1} className="t-main"><Outlet /></main>
    </div>
  );
}
