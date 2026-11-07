import { useEffect, useState } from "react";
import { api } from "../api/client";

// Number of unread chat messages (menu badge). Polls while the tab is visible.
export function useUnread(everyMs = 20000) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      if (document.hidden) return;
      try { const d = await api.get("/chat/unread/"); if (alive) setN(d.count || 0); } catch { /* offline: keep the old number */ }
    };
    tick();
    const t = setInterval(tick, everyMs);
    document.addEventListener("visibilitychange", tick);
    // a thread that was just opened tells the badge to refresh
    window.addEventListener("chat:read", tick);
    return () => { alive = false; clearInterval(t); document.removeEventListener("visibilitychange", tick); window.removeEventListener("chat:read", tick); };
  }, [everyMs]);
  return n;
}
