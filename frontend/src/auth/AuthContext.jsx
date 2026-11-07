import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ApiError, api, getTokens, onForcedLogout, setTokens } from "../api/client";

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);
export const homeFor = (u) => (u?.role === "teacher" ? "/teach" : u?.role === "parent" ? "/parent" : "/app");
// Where to go after signing in: the page the person wanted (only inside THEIR area), else home.
export function afterLoginPath(u, from) {
  const base = homeFor(u);
  return typeof from === "string" && (from === base || from.startsWith(base + "/") || from.startsWith(base + "?")) ? from : base;
}

export function AuthProvider({ children }) {
  const [st, setSt] = useState({ status: getTokens() ? "loading" : "anon", user: null, error: null });

  const boot = useCallback(async () => {
    if (!getTokens()) { setSt({ status: "anon", user: null, error: null }); return; }
    setSt((s) => ({ ...s, status: "loading", error: null }));
    try {
      const user = await api.get("/me/");
      setSt({ status: "authed", user, error: null });
    } catch (e) {
      // Only a real 401 from the server means "session is dead". Network errors, aborted requests
      // (reload / navigation during load) and 5xx must NEVER wipe the session.
      if (e instanceof ApiError && e.status === 401) { setTokens(null); setSt({ status: "anon", user: null, error: null }); }
      else setSt({ status: "error", user: null, error: e });
    }
  }, []);

  useEffect(() => { boot(); }, [boot]);
  useEffect(() => onForcedLogout(() => setSt({ status: "anon", user: null, error: null })), []);

  const login = useCallback(async (username, password) => {
    const d = await api.post("/login/", { username, password }, { auth: false });
    setTokens({ access: d.access, refresh: d.refresh });
    const user = await api.get("/me/");
    setSt({ status: "authed", user, error: null });
    return user;
  }, []);

  const logout = useCallback(async () => {
    const t = getTokens();
    try { if (t?.refresh) await api.post("/logout/", { refresh: t.refresh }); } catch { /* token may already be invalid */ }
    setTokens(null);
    setSt({ status: "anon", user: null, error: null });
  }, []);

  const patchUser = useCallback((u) => setSt((s) => ({ ...s, user: { ...s.user, ...u } })), []);

  const value = useMemo(() => ({ ...st, login, logout, patchUser, retry: boot }), [st, login, logout, patchUser, boot]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
