import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BRAND } from "../brand";
import Icon from "../ui/Icon";
import Mascot from "../ui/Mascot";
import { usePrefs } from "../utils/prefs";
import { getVoicePref, guessGender, listVoices, onSoundChange, onVoicesChange, pickVoice, play, setSoundEnabled, setVoiceEnabled, setVoicePref, soundEnabled, speak, unlockAudio, voiceEnabled, voiceInfo } from "../utils/sound";

export function Logo({ to = "/", size = 44 }) {
  return (
    <Link to={to} className="logo" aria-label={`${BRAND} — bosh sahifa`}>
      <Mascot size={size} />
      <span className="logo__text"><b>Bolajon</b><i>AI</i></span>
    </Link>
  );
}

function useSoundState() {
  const [st, setSt] = useState({ sound: soundEnabled(), voice: voiceEnabled() });
  useEffect(() => onSoundChange(setSt), []);
  return st;
}

export function SoundToggle() {
  const { sound: on } = useSoundState();
  return (
    <button type="button" className="btn btn--ghost btn--icon" aria-pressed={on} aria-label={on ? "Ovozni o'chirish" : "Ovozni yoqish"} title={on ? "Ovoz yoqilgan" : "Ovoz o'chiq"}
      onClick={() => { unlockAudio(); setSoundEnabled(!on); if (!on) setTimeout(() => play("pop"), 30); }}>
      <Icon name={on ? "sound-on" : "sound-off"} />
    </button>
  );
}

// "Mascot talks" switch: reads prompts aloud when a suitable voice exists
export function VoiceToggle() {
  const { voice: on } = useSoundState();
  return (
    <button type="button" className="btn btn--ghost btn--icon" aria-pressed={on} aria-label={on ? "Nutqni o'chirish" : "Nutqni yoqish"} title={on ? "Maskot gapiradi" : "Maskot jim"}
      onClick={() => setVoiceEnabled(!on)}>
      <Icon name={on ? "mic" : "mic-off"} />
    </button>
  );
}

// "Qulaylik" menu: calm mode + big text. Works as a small popover (button + switches).
export function ComfortToggle() {
  const [open, setOpen] = useState(false);
  const [p, setPref] = usePrefs();
  const box = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", away); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="comfort" ref={box}>
      <button type="button" className="btn btn--ghost btn--icon" aria-expanded={open} aria-haspopup="true" aria-label="Qulaylik sozlamalari" title="Qulaylik" onClick={() => setOpen((o) => !o)}><Icon name="sliders" /></button>
      {open && (
        <div className="comfort__pop card" role="group" aria-label="Qulaylik sozlamalari">
          <label className="switch"><input type="checkbox" checked={p.calm} onChange={(e) => setPref("calm", e.target.checked)} /><span><b>Sokin rejim</b><small>Harakat, konfetti va baland ovozsiz; yumshoq ranglar</small></span></label>
          <label className="switch"><input type="checkbox" checked={p.big} onChange={(e) => setPref("big", e.target.checked)} /><span><b>Katta matn</b><small>Yozuvlar kattaroq bo'ladi</small></span></label>
          <label className="switch"><input type="checkbox" checked={p.music} onChange={(e) => { unlockAudio(); setPref("music", e.target.checked); }} /><span><b>Yumshoq musiqa</b><small>Juda past, tinch fon musiqasi</small></span></label>
          <label className="field-inline"><b>Dam olish eslatmasi</b>
            <select className="select" aria-label="Dam olish eslatmasi" value={p.breakMin} onChange={(e) => setPref("breakMin", Number(e.target.value))}>
              <option value={0}>O'chiq</option>{[10, 15, 20, 30].map((n) => <option key={n} value={n}>Har {n} daqiqada</option>)}
            </select>
          </label>
          <VoiceSettings />
        </div>
      )}
    </div>
  );
}

// Which voice reads the words, how fast, and a "listen" test button.
function VoiceSettings() {
  const [, tick] = useState(0);
  const [heard, setHeard] = useState(null);   // null = not tested, true/false = result of the last test
  useEffect(() => onVoicesChange(() => tick((n) => n + 1)), []);
  const voices = listVoices(), pref = getVoicePref(), cur = pickVoice(), info = voiceInfo();
  const label = (v) => `${v.name.replace(/^(Microsoft|Google)\s+/, "").replace(/\s+-\s+.*$/, "")} (${v.lang})${guessGender(v.name) ? ` · ${guessGender(v.name)}` : ""}`;
  return (
    <div className="voiceset">
      <b>Ovoz</b>
      {info.clips && <small>Tayyor ayol ovozli yozuvlar ishlatilmoqda.</small>}
      {info.remote && <small>Server ovozi (o'zbekcha, Madina) ishlatilmoqda.</small>}
      {voices.length === 0 && !info.clips && !info.remote && <small>Bu qurilmada mos (o'zbekcha yoki turkcha) ovoz topilmadi. Yozuvlar yoki ovoz o'rnatilsa, gapira boshlaydi.</small>}
      {voices.length > 0 && (
        <select className="select" aria-label="Ovozni tanlash" value={cur?.name || ""} onChange={(e) => { setVoicePref({ name: e.target.value }); }}>
          {voices.map((v) => <option key={v.name} value={v.name}>{label(v)}</option>)}
        </select>
      )}
      <label className="switch"><input type="checkbox" checked={pref.slow} onChange={(e) => setVoicePref({ slow: e.target.checked })} /><span><b>Sekin gapirsin</b><small>Har bir so'z aniqroq eshitiladi</small></span></label>
      <button type="button" className="btn btn--sm btn--sky" onClick={async () => { unlockAudio(); setVoiceEnabled(true); setHeard(null); setHeard(!!(await speak("Salom! Men sening do'sting Bolajonman.", { force: true }))); }}>🔊 Ovozni tinglash</button>
      {heard === false && <small role="status">Ovoz chiqmadi. Telefon ovozini va tovush tugmasini tekshiring, internetni tekshiring yoki sahifani yangilab qayta bosing.</small>}
    </div>
  );
}
