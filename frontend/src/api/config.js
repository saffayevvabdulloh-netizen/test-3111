import { useEffect, useState } from "react";

// Public settings (is sign-up open?). One request per page load, shared by every page that asks.
let promise = null;
export function loadConfig() {
  if (!promise) {
    promise = fetch((import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "") + "/config/")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("config"))))
      .catch(() => { promise = null; return { registration_open: false }; });   // unknown -> treat as closed (safe default)
  }
  return promise;
}

// -> { ready, registrationOpen }
export function useConfig() {
  const [cfg, setCfg] = useState(null);
  useEffect(() => { let on = true; loadConfig().then((c) => on && setCfg(c)); return () => { on = false; }; }, []);
  return { ready: !!cfg, registrationOpen: !!cfg?.registration_open, legal: cfg?.legal || {}, ageLabel: cfg?.age_label || "", consentVersion: cfg?.consent_version || "" };
}
