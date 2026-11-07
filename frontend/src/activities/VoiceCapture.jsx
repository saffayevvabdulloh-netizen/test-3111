// "Listen and repeat": mic button + real speech recognition.
// Honest fallback: when recognition is unavailable/denied we do NOT pretend the child spoke -
// we show a "Aytdim" button so a parent/teacher can confirm. After 3 misses we help (say it together).
import { useEffect, useRef, useState } from "react";
import Icon from "../ui/Icon";
import { Button } from "../ui/kit";
import { play, speak, stopSpeak } from "../utils/sound";

export const norm = (s) => s.toLowerCase().replace(/[ʻʼ’‘`'´]/g, "").replace(/[^a-zа-яё0-9 ]/gi, " ").replace(/\s+/g, " ").trim();
const SR = typeof window !== "undefined" ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

// accept: words/phrases that count as correct (normalised comparison, substring match)
export default function VoiceCapture({ say, accept, onResult, onMiss, lang = "uz-UZ" }) {
  const [phase, setPhase] = useState("idle"); // idle | listening | wrong | manual
  const [heard, setHeard] = useState("");
  const [tries, setTries] = useState(0);
  const rec = useRef(null);
  const settled = useRef(false);

  useEffect(() => () => { try { rec.current?.abort(); } catch { /* ignore */ } stopSpeak(); }, []);
  useEffect(() => { setPhase(SR ? "idle" : "manual"); setHeard(""); setTries(0); }, [say]);

  const hear = async () => { play("pop"); await speak(say, { force: true }); };

  const listen = () => {
    if (!SR) { setPhase("manual"); return; }
    stopSpeak(); play("micOn"); settled.current = false;
    const r = new SR(); rec.current = r;
    r.lang = lang; r.maxAlternatives = 5; r.interimResults = false; r.continuous = false;
    r.onresult = (e) => {
      settled.current = true;
      const alts = Array.from(e.results[0] || [], (a) => norm(a.transcript));
      setHeard(alts[0] || "");
      const ok = alts.some((t) => accept.some((w) => t.includes(norm(w))));
      play("micOff");
      if (ok) onResult(true); else miss();
    };
    r.onerror = (e) => {
      settled.current = true; play("micOff");
      if (e.error === "no-speech" || e.error === "aborted") { setHeard(""); miss("Eshitmadim"); }
      else setPhase("manual");            // not-allowed / network / unsupported language
    };
    r.onend = () => { if (!settled.current) setPhase((p) => (p === "listening" ? "idle" : p)); };
    try { r.start(); setPhase("listening"); } catch { setPhase("manual"); }
  };

  const miss = () => {
    const n = tries + 1; setTries(n); onMiss?.();
    if (n >= 3) { setPhase("idle"); speak(say).then(() => onResult(true, { assisted: true })); }
    else setPhase("wrong");
  };

  return (
    <div className="voice">
      <div className="voice__row">
        <Button variant="sky" icon="sound-on" onClick={hear}>Eshit</Button>
        {phase !== "manual" ? (
          <button type="button" className={`mic ${phase === "listening" ? "is-live" : ""}`} onClick={listen} aria-label="Gapirish uchun bos" aria-pressed={phase === "listening"}>
            <Icon name="mic" size={44} stroke={2.2} />
          </button>
        ) : (
          <Button variant="primary" size="lg" icon="check" onClick={() => { play("pop"); onResult(true, { manual: true }); }}>Aytdim</Button>
        )}
        <div className={`wavebars ${phase === "listening" ? "is-live" : ""}`} aria-hidden="true">{[40, 75, 100, 60, 90, 45, 80].map((h, i) => <span key={i} style={{ "--h": `${h}%`, "--i": i }} />)}</div>
      </div>
      <p className="voice__msg" role="status">
        {phase === "listening" && "Tinglayapman... gapir!"}
        {phase === "wrong" && (heard ? `«${heard}» deb eshitdim. Yana bir bor urinib ko'r!` : "Eshitmadim. Yana bir bor urinib ko'r!")}
        {phase === "manual" && "Mikrofon ishlamayapti. «Eshit»ni bos, o'zing ayt, keyin «Aytdim»ni bos."}
        {phase === "idle" && tries === 0 && (SR ? "Mikrofonni bos va ayt!" : "")}
      </p>
    </div>
  );
}
