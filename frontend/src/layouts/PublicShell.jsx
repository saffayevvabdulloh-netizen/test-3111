import { BRAND } from "../brand";
import { Link, Outlet } from "react-router-dom";
import { useConfig } from "../api/config";
import { Button } from "../ui/kit";
import { Logo } from "./Parts";

export default function PublicShell() {
  const { registrationOpen, ageLabel } = useConfig();
  return (
    <>
      <a className="skip-link" href="#main">Asosiy qismga o'tish</a>
      <header className="pub-top">
        <Logo />
        <nav className="row" aria-label="Asosiy">
          {registrationOpen ? <>
            <Button as="a" to="/login" variant="ghost" size="sm">Kirish</Button>
            <Button to="/register" variant="primary" size="sm">Boshlash</Button>
          </> : <Button to="/login" variant="primary" size="sm">Kirish</Button>}
        </nav>
      </header>
      <main id="main" className="pub-main"><Outlet /></main>
      <footer className="pub-foot small muted">
        <span>© {BRAND}</span>
        <Link to="/privacy">Maxfiylik siyosati</Link>
        <Link to="/terms">Shartlar</Link>
        {ageLabel && <span className="age-badge" title="Axborot mahsulotining yosh belgisi">{ageLabel}</span>}
        {registrationOpen && <Link to="/forgot">Parolni unutdingizmi?</Link>}
      </footer>
    </>
  );
}
