// Comfort settings for sensory-sensitive children. Saved on the device, applied as <html data-*>.
//   calm: no bouncing/confetti/animations, softer colours, quieter sounds
//   big : larger text
//   breakMin: remind to rest every N minutes of play (0 = off)
//   music: very soft background music (off unless the child/parent switches it on)
// If nothing was chosen yet, "calm" starts ON when the OS asks for reduced motion.
import { useEffect, useState } from "react";
import { setCalmSound, setMusic, unlockAudio } from "./sound";

const KEY = "bolajon.prefs";
const subs = new Set();
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const osReduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

let prefs = (() => { const s = read(); return { calm: s ? !!s.calm : osReduced(), big: s ? !!s.big : false, music: s ? !!s.music : false, breakMin: s && Number.isFinite(s.breakMin) ? s.breakMin : 0 }; })();

function apply() {
  const el = document.documentElement;
  el.toggleAttribute("data-calm", prefs.calm);
  el.toggleAttribute("data-big", prefs.big);
  setCalmSound(prefs.calm);
  setMusic(prefs.music);
}
if (typeof document !== "undefined") {
  apply();
  // browsers only allow sound after a tap: if music was left on, start the audio at the first tap
  if (prefs.music) document.addEventListener("pointerdown", unlockAudio, { once: true });
}

export const getPrefs = () => prefs;
export function setPref(key, value) {
  prefs = { ...prefs, [key]: typeof value === "number" ? value : !!value };
  try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch { /* storage unavailable */ }
  apply(); subs.forEach((f) => f(prefs));
}
export function usePrefs() {
  const [p, setP] = useState(prefs);
  useEffect(() => { subs.add(setP); setP(prefs); return () => subs.delete(setP); }, []);
  return [p, setPref];
}
