import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { prefetchFor } from "../prefetch";
import { useUnread } from "../chat/useUnread";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";
import { Button } from "../ui/kit";
import { nameOf } from "../utils/format";
import { Logo, SoundToggle } from "./Parts";

const NAV = [
  { to: "/parent", end: true, icon: "heart", label: "Bolalarim" },
  { to: "/parent/chat", icon: "send", label: "Xabarlar", badge: true },
  { to: "/parent/profile", icon: "user", label: "Profil" },
];

export default function ParentShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const unread = useUnread();
  const main = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { prefetchFor("parent"); }, []);
  useEffect(() => { setOpen(false); main.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="t-shell">
      <a className="skip-link" href="#main">Asosiy qismga o'tish</a>
      <header className="t-top">
        <button type="button" className="btn btn--ghost btn--icon" aria-label="Menyu" aria-expanded={open} aria-controls="t-side" onClick={() => setOpen((v) => !v)}><Icon name="menu" /></button>
        <Logo to="/parent" size={34} />
        <span className="grow" />
        {unread > 0 && <NavLink to="/parent/chat" className="chat__badge" aria-label={`${unread} ta o'qilmagan xabar`}>{unread}</NavLink>}
        <SoundToggle />
      </header>
      {open && <button type="button" className="t-scrim" aria-label="Menyuni yopish" onClick={() => setOpen(false)} />}
      <aside id="t-side" className={`t-side ${open ? "is-open" : ""}`}>
        <div className="t-side__logo"><Logo to="/parent" size={38} /></div>
        <nav aria-label="Bo'limlar" className="t-nav">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className="t-nav__item">
              <Icon name={n.icon} size={20} />{n.label}
              {n.badge && unread > 0 && <span className="chat__badge" style={{ marginLeft: "auto" }} aria-label={`${unread} ta o'qilmagan`}>{unread}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="t-side__foot">
          <div className="row" style={{ "--gap": "0.6rem", flexWrap: "nowrap" }}>
            <Avatar name={user.avatar} label={nameOf(user)} size={38} />
            <div className="grow"><div className="truncate" style={{ fontWeight: 800 }}>{nameOf(user)}</div><div className="small muted">Ota-ona</div></div>
          </div>
          <Button size="sm" icon="logout" onClick={logout} block>Chiqish</Button>
        </div>
      </aside>
      <main id="main" ref={main} tabIndex={-1} className="t-main"><Outlet /></main>
    </div>
  );
}
