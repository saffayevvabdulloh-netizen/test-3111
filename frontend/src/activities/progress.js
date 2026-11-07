import { useEffect, useState } from "react";
import { api } from "../api/client";

// Stars earned in mini games. Kept on this device (no server endpoint needed), per user.
const KEY = "nq.stars.v1";
const all = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
export const getStars = (uid) => all()[uid ?? "guest"] || {};
export function saveStars(uid, id, n) {
  try {
    const a = all(), u = a[uid ?? "guest"] || {};
    if ((u[id] || 0) < n) u[id] = n;
    a[uid ?? "guest"] = u; localStorage.setItem(KEY, JSON.stringify(a));
  } catch { /* storage unavailable: progress simply isn't kept */ }
}
export const totalStars = (uid) => Object.values(getStars(uid)).reduce((s, n) => s + n, 0);

// Server copy (so a teacher can see progress and the child keeps stars on another device).
// Local storage stays the source for offline play; failures are silent and retried on the next visit.
export const syncActivity = (id, stars, mistakes = 0) => api.post("/me/activities/", { activity: id, stars, mistakes }).catch(() => {});

export function useStars(uid) {
  const [stars, setStars] = useState(() => getStars(uid));
  useEffect(() => {
    let dead = false;
    api.get("/me/activities/").then((rows) => {
      if (dead || !Array.isArray(rows)) return;
      const server = Object.fromEntries(rows.map((r) => [r.activity, r.best_stars]));
      const local = getStars(uid);
      Object.entries(local).forEach(([id, s]) => { if ((server[id] || 0) < s) syncActivity(id, s); });  // played offline / before sync existed
      const merged = { ...local };
      Object.entries(server).forEach(([id, s]) => { if ((merged[id] || 0) < s) { merged[id] = s; saveStars(uid, id, s); } });
      setStars(merged);
    }).catch(() => {});
    return () => { dead = true; };
  }, [uid]);
  return stars;
}
