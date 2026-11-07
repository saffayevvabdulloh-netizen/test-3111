import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { prefetchFor } from "../prefetch";
import Avatar from "../ui/Avatar";
import Icon from "../ui/Icon";
import { nameOf } from "../utils/format";
import BreakReminder from "../ui/BreakReminder";
import PulseWidget from "../ui/PulseWidget";
import { MascotSay } from "../ui/Mascot";
import { ComfortToggle, Logo, SoundToggle, VoiceToggle } from "./Parts";

const NAV = [
  { to: "/app", end: true, icon: "home", label: "Bosh", tone: "sun" },
  { to: "/app/fun", icon: "puzzle", label: "Mashqlar", tone: "sky" },
  { to: "/app/games", icon: "gamepad", label: "O'yinlar", tone: "coral" },
  { to: "/app/lessons", icon: "book", label: "Darslar", tone: "grape" },
  { to: "/app/progress", icon: "trophy", label: "Yutuqlar", tone: "emerald" },
];

export default function StudentShell() {
  const { user } = useAuth();
  const main = useRef(null);
  const { pathname } = useLocation();
  useEffect(() => { prefetchFor("student"); }, []);
  useEffect(() => { main.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, [pathname]);
  return (
    <div className="s-shell">
      <BreakReminder />
      <a className="skip-link" href="#main">Asosiy qismga o'tish</a>
      <header className="s-top">
        <Logo to="/app" />
        <div className="row" style={{ "--gap": "0.25rem" }}>
          <PulseWidget />
          <SoundToggle /><VoiceToggle /><ComfortToggle />
          <NavLink to="/app/profile" className="s-me" aria-label="Profil">
            <Avatar name={user.avatar} label={nameOf(user)} size={40} />
          </NavLink>
        </div>
      </header>
      <nav className="s-nav" aria-label="Bo'limlar">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className="s-nav__item" data-tone={n.tone}>
            <Icon name={n.icon} size={24} /><span>{n.label}</span>
          </NavLink>
        ))}
        <div className="s-nav__mascot"><MascotSay mood="happy" size={130} speech="Zo'r! Davom etamiz!" /></div>
      </nav>
      <main id="main" ref={main} tabIndex={-1} className="s-main"><Outlet /></main>
    </div>
  );
}
