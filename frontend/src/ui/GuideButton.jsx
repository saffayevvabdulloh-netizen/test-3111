// "Eshit" button: reads an explanation aloud (recorded female voice if available, else the browser's best female voice).
// Press again to stop. If this device has no suitable voice it says so instead of staying silent.
import { useEffect, useRef, useState } from "react";
import { canSpeak, speak, stopSpeak, unlockAudio } from "../utils/sound";
import Icon from "./Icon";

export default function GuideButton({ text, label = "Eshit", variant = "sky", size = "sm" }) {
  const [playing, setPlaying] = useState(false);
  const [noVoice, setNoVoice] = useState(false);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; stopSpeak(); }; }, []);

  const click = async () => {
    unlockAudio();
    if (playing) { stopSpeak(); setPlaying(false); return; }
    if (!text) return;
    if (!canSpeak()) { setNoVoice(true); return; }
    setNoVoice(false); setPlaying(true);
    await speak(text, { force: true, rate: 0.8 });   // a little slower than usual: clear and easy to follow
    if (alive.current) setPlaying(false);
  };
  return (
    <span className="guide">
      <button type="button" className={`btn btn--${variant} btn--${size}`} aria-pressed={playing} onClick={click} title={text}>
        <Icon name={playing ? "x" : "sound-on"} size={18} />{playing ? "To'xtatish" : label}
      </button>
      {noVoice && <small className="guide__hint" role="status">Bu qurilmada o'zbekcha yoki turkcha ovoz topilmadi, shuning uchun o'qib berolmayman. Matnni o'zingiz o'qing yoki ⚙ menyuda ovozni tekshiring.</small>}
    </span>
  );
}
