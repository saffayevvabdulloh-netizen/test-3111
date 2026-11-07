import { Navigate, Outlet, useLocation } from "react-router-dom";
import Mascot from "../ui/Mascot";
import { Button } from "../ui/kit";
import { ConsentScreen, ForcePassword } from "./AccountGate";
import { afterLoginPath, homeFor, useAuth } from "./AuthContext";

export function FullLoader({ text = "Yuklanmoqda..." }) {
  return (
    <div className="full-center" role="status">
      <Mascot mood="happy" size={110} className="mascot--bob" />
      <p className="muted">{text}</p>
    </div>
  );
}

function BootError({ onRetry, message }) {
  return (
    <div className="full-center" role="alert">
      <Mascot mood="think" size={110} />
      <h2>Serverga ulanib bo'lmadi</h2>
      <p className="muted">{message}</p>
      <Button icon="refresh" variant="primary" onClick={onRetry}>Qayta urinish</Button>
    </div>
  );
}

export function RequireRole({ role }) {
  const { status, user, error, retry } = useAuth();
  const loc = useLocation();
  if (status === "loading") return <FullLoader />;
  if (status === "error") return <BootError onRetry={retry} message={error?.message} />;
  if (status !== "authed") return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />;
  if (user.must_change_password) return <ForcePassword />;
  if (user.needs_consent) return <ConsentScreen />;
  return <Outlet />;
}

export function GuestOnly() {
  const { status, user, error, retry } = useAuth();
  const loc = useLocation();
  if (status === "loading") return <FullLoader />;
  if (status === "error") return <BootError onRetry={retry} message={error?.message} />;
  // logging in flips `status` to authed BEFORE the login form navigates: honour the page the person came from
  if (status === "authed") return <Navigate to={afterLoginPath(user, loc.state?.from)} replace />;
  return <Outlet />;
}
