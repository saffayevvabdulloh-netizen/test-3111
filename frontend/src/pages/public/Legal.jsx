import { Link } from "react-router-dom";
import { useConfig } from "../../api/config";
import { useAuth } from "../../auth/AuthContext";
import { useTitle } from "../../hooks/useApi";
import { Logo } from "../../layouts/Parts";
import { PrivacyText, TermsText } from "./legalText";

// Public pages: readable before signing in AND while signed in (also from the consent screen).
export function LegalPage({ kind }) {
  const cfg = useConfig();
  const { user } = useAuth();
  useTitle(kind === "terms" ? "Foydalanish shartlari" : "Maxfiylik siyosati");
  const back = user ? (user.role === "teacher" ? "/teach/profile" : user.role === "parent" ? "/parent/profile" : "/app/profile") : "/login";
  return (
    <div className="legal">
      <header className="legal__top"><Logo /><Link to={back} className="btn btn--sm">Orqaga</Link></header>
      <main className="legal__body card">
        <h1>{kind === "terms" ? "Foydalanish shartlari" : "Maxfiylik siyosati"}</h1>
        {kind === "terms" ? <TermsText /> : <PrivacyText legal={{ ...cfg.legal, age_label: cfg.ageLabel }} version={cfg.consentVersion} />}
        <p className="small muted"><Link to="/privacy">Maxfiylik siyosati</Link> · <Link to="/terms">Foydalanish shartlari</Link></p>
      </main>
    </div>
  );
}
export const Privacy = () => <LegalPage kind="privacy" />;
export const Terms = () => <LegalPage kind="terms" />;
export default Privacy;
