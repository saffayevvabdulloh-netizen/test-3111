// Real camera pulse widget (rPPG). Off by default: the child/parent taps the button,
// the browser asks for camera permission, frames are analysed ON THE DEVICE and never uploaded.
// If the camera is unavailable or denied we show an honest message - never made-up numbers.
import { useCallback, useEffect, useRef, useState } from "react";
import { RppgEstimator } from "../utils/rppg";
import Icon from "./Icon";

const ROI = { x: 0.3, y: 0.2, w: 0.4, h: 0.4 }; // forehead/cheeks inside the oval guide

export default function PulseWidget() {
  const [state, setState] = useState("idle"); // idle | asking | live | error
  const [msg, setMsg] = useState("");
  const [out, setOut] = useState({ bpm: null, quality: 0, progress: 0 });
  const video = useRef(null), wave = useRef(null), stream = useRef(null);
  const raf = useRef(0), est = useRef(new RppgEstimator());

  const stop = useCallback(() => {
    cancelAnimationFrame(raf.current);
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
  }, []);
  useEffect(() => stop, [stop]);

  const drawWave = useCallback((w) => {
    const c = wave.current; if (!c) return;
    const g = c.getContext("2d"), W = c.width, H = c.height;
    g.clearRect(0, 0, W, H);
    g.lineWidth = 2.2; g.lineJoin = "round"; g.strokeStyle = "#16c784"; g.beginPath();
    w.forEach((v, i) => { const x = (i / Math.max(1, w.length - 1)) * W, y = H / 2 - Math.max(-1, Math.min(1, v)) * (H / 2 - 3); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  }, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setState("error"); setMsg("Bu brauzerda kamera ishlamaydi."); return; }
    setState("asking");
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 320 }, height: { ideal: 240 }, frameRate: { ideal: 30 } }, audio: false });
      est.current.reset();
      setState("live"); // the <video> mounts now; the effect below attaches the stream
    } catch (e) {
      stop(); setState("error");
      setMsg(e?.name === "NotAllowedError" ? "Kameraga ruxsat berilmadi." : "Kamera topilmadi yoki band.");
    }
  };

  useEffect(() => {
    if (state !== "live" || !stream.current) return undefined;
    const v = video.current; if (!v) return undefined;
    let dead = false;
    v.srcObject = stream.current;
    v.play().catch(() => {});
    const cv = document.createElement("canvas"); cv.width = 24; cv.height = 24;
    const cx = cv.getContext("2d", { willReadFrequently: true });
    let last = 0, lastEst = 0;
    const tick = (now) => {
      if (dead) return;
      raf.current = requestAnimationFrame(tick);
      if (now - last < 30 || v.readyState < 2 || !v.videoWidth) return;
      last = now;
      cx.drawImage(v, v.videoWidth * ROI.x, v.videoHeight * ROI.y, v.videoWidth * ROI.w, v.videoHeight * ROI.h, 0, 0, 24, 24);
      const d = cx.getImageData(0, 0, 24, 24).data; let sum = 0;
      for (let i = 1; i < d.length; i += 4) sum += d[i];            // green channel
      est.current.push(now, sum / (d.length / 4));
      if (now - lastEst > 700) { lastEst = now; const r = est.current.estimate(); setOut({ bpm: r.bpm, quality: r.quality, progress: r.progress }); drawWave(r.wave); }
    };
    raf.current = requestAnimationFrame(tick);
    return () => { dead = true; cancelAnimationFrame(raf.current); };
  }, [state, drawWave]);

  const off = () => { stop(); setState("idle"); setOut({ bpm: null, quality: 0, progress: 0 }); };

  if (state === "idle" || state === "asking" || state === "error") {
    return (
      <div className="rppg rppg--idle">
        <button type="button" className="btn btn--sm btn--sky" onClick={start} disabled={state === "asking"} title="Kamera orqali taxminiy puls. Video qurilmadan chiqmaydi.">
          <Icon name="camera" size={18} /><span className="rppg__lbl">{state === "asking" ? "Kamera..." : "Pulsni o'lchash"}</span>
        </button>
        {state === "error" && <span className="rppg__err" role="alert">{msg}</span>}
      </div>
    );
  }
  const { bpm, quality, progress } = out;
  const status = bpm ? `${bpm} bpm` : progress < 1 ? `${Math.round(progress * 100)}%` : "yorug'lik kerak";
  return (
    <div className="rppg" role="group" aria-label="Kamera orqali puls">
      <div className="rppg__cam">
        <video ref={video} muted playsInline aria-hidden="true" />
        <i className="rppg__oval" /><i className="rppg__roi" />
      </div>
      <div className="rppg__tele">
        <span className="rppg__tag"><i className={`rppg__dot ${bpm ? "is-ok" : ""}`} />rPPG</span>
        <canvas ref={wave} width={84} height={26} aria-hidden="true" />
        <b className="rppg__bpm" aria-live="polite"><Icon name="heart" size={13} stroke={3} /> {status}</b>
      </div>
      <button type="button" className="rppg__x" onClick={off} aria-label="Kamerani o'chirish"><Icon name="x" size={14} stroke={3} /></button>
      <span className="sr-only">{quality > 0.42 ? "Signal yaxshi" : "Signal zaif"}</span>
    </div>
  );
}
