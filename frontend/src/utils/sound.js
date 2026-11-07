// Sound for kids: a tiny WebAudio synth (no audio files) + speech.
//
// * Every effect is built from soft "marimba / bell" notes (a sine fundamental with
//   quiet overtones) played through a master chain with a gentle echo and a limiter,
//   so nothing is ever harsh or loud. A wrong answer is a soft, low "boop" - never a buzz.
// * One master switch (effects) and one for the voice, both remembered in localStorage.
// * Speech, best first:
//     1. recorded clips in /audio (a sweet female voice made by tools/make_audio.py) - same on every device;
//     1b. ElevenLabs "Adam" through our own server (POST /api/v1/tts/; the API key lives only on the server);
//     2. the best installed voice: Uzbek -> Turkish (closest sound system), FEMALE voices preferred,
//        or the voice the user picked in the comfort menu;
//     3. nothing. Reading Uzbek with an English/Russian voice is worse than silence, so when no suitable
//        voice exists we stay quiet (the text is always on screen too).
import { api, getTokens } from "../api/client";

const KEY = "zumrad.sound";
const VKEY = "zumrad.voice";
const read = (k) => { try { return localStorage.getItem(k) !== "off"; } catch { return true; } };
const write = (k, v) => { try { localStorage.setItem(k, v ? "on" : "off"); } catch { /* ignore */ } };

let enabled = read(KEY);
let voiceOn = read(VKEY);
const subs = new Set();
const emit = () => subs.forEach((f) => f({ sound: enabled, voice: voiceOn }));

export const soundEnabled = () => enabled;
export const voiceEnabled = () => voiceOn;
export function setSoundEnabled(v) { enabled = v; write(KEY, v); if (!v) stopSpeak(); setMusic(musicWanted); emit(); }
export function setVoiceEnabled(v) { voiceOn = v; write(VKEY, v); if (!v) stopSpeak(); emit(); }
// subscribe(fn) -> unsubscribe. fn({ sound, voice })
export const onSoundChange = (f) => { subs.add(f); return () => subs.delete(f); };

/* ------------------------------------------------------------------ synth */
let ctx = null;
let master = null;
let calm = false;
const level = () => (calm ? 0.4 : 0.9);
// calm mode: everything about half as loud (set by utils/prefs.js)
export function setCalmSound(v) { calm = !!v; if (master) master.gain.value = level(); }

function audio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = level();
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -14; limiter.knee.value = 24; limiter.ratio.value = 8;
    limiter.attack.value = 0.004; limiter.release.value = 0.2;
    // soft echo: delay -> low-pass -> feedback
    const delay = ctx.createDelay(0.5); delay.delayTime.value = 0.15;
    const fb = ctx.createGain(); fb.gain.value = 0.28;
    const damp = ctx.createBiquadFilter(); damp.type = "lowpass"; damp.frequency.value = 2600;
    const wet = ctx.createGain(); wet.gain.value = 0.32;
    master.connect(limiter);
    master.connect(delay); delay.connect(damp); damp.connect(fb); fb.connect(delay); damp.connect(wet); wet.connect(limiter);
    limiter.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

// Call from a click handler so mobile browsers allow audio.
export const unlockAudio = () => { try { audio(); } catch { /* ignore */ } };

// One marimba-ish note: fundamental + quiet 2nd/3rd partials with faster decay.
function note(freq, at, dur = 0.45, { vol = 0.16, type = "sine", partials = true, glideTo } = {}) {
  const c = ctx, t0 = c.currentTime + at;
  const voices = partials ? [[1, 1, dur], [2, 0.22, dur * 0.55], [3, 0.08, dur * 0.3]] : [[1, 1, dur]];
  voices.forEach(([mul, amp, d]) => {
    const o = c.createOscillator(), g = c.createGain();
    o.type = mul === 1 ? type : "sine";
    o.frequency.setValueAtTime(freq * mul, t0);
    if (glideTo && mul === 1) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + d * 0.9);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol * amp, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + d + 0.05);
  });
}

// filtered noise burst (whoosh / splash / tick)
function noise(at, dur, { from = 400, to = 3000, vol = 0.08, q = 1.2 } = {}) {
  const c = ctx, t0 = c.currentTime + at;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = "bandpass"; f.Q.value = q;
  f.frequency.setValueAtTime(from, t0); f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.25); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
}

// C major pentatonic across two octaves: any random order sounds pleasant
const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1568];

const FX = {
  tap: () => note(720, 0, 0.09, { vol: 0.07, partials: false, glideTo: 940 }),
  pop: () => note(480, 0, 0.12, { vol: 0.12, partials: false, glideTo: 880 }),
  correct: () => { note(523.25, 0, 0.32); note(659.25, 0.09, 0.32); note(783.99, 0.18, 0.5, { vol: 0.18 }); },
  almost: () => { note(440, 0, 0.3, { type: "triangle", vol: 0.12 }); note(523.25, 0.14, 0.4, { type: "triangle", vol: 0.12 }); },
  wrong: () => { note(311, 0, 0.3, { vol: 0.1, partials: false, glideTo: 262 }); note(247, 0.13, 0.38, { vol: 0.08, partials: false }); },
  done: () => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => note(f, i * 0.12, 0.5, { vol: 0.15 })); note(1318.51, 0.5, 0.9, { vol: 0.16 }); [1568, 1760, 2093].forEach((f, i) => note(f, 0.62 + i * 0.07, 0.3, { vol: 0.05, partials: false })); },
  badge: () => { [784, 988, 1175, 1568].forEach((f, i) => note(f, i * 0.1, 0.5, { vol: 0.14 })); },
  star: () => { const a = 880 * (1 + Math.random() * 0.02); note(a, 0, 0.25, { vol: 0.11 }); note(a * 1.5, 0.07, 0.3, { vol: 0.08, partials: false }); },
  drop: () => { note(220, 0, 0.18, { vol: 0.14, partials: false, glideTo: 150 }); note(660, 0.02, 0.14, { vol: 0.06 }); },
  whoosh: () => noise(0, 0.28, { from: 300, to: 2600, vol: 0.07 }),
  flip: () => { note(620, 0, 0.06, { vol: 0.07, partials: false }); noise(0, 0.05, { from: 2000, to: 4000, vol: 0.03 }); },
  splash: () => { noise(0, 0.4, { from: 1200, to: 3800, vol: 0.06, q: 0.7 }); note(900, 0.05, 0.2, { vol: 0.04, partials: false, glideTo: 1500 }); },
  bubble: () => { const f = 500 + Math.random() * 500; note(f, 0, 0.14, { vol: 0.08, partials: false, glideTo: f * 1.6 }); },
  micOn: () => { note(587.33, 0, 0.14, { vol: 0.1 }); note(880, 0.09, 0.22, { vol: 0.1 }); },
  micOff: () => { note(880, 0, 0.12, { vol: 0.08 }); note(587.33, 0.08, 0.2, { vol: 0.08 }); },
  tick: () => note(1200, 0, 0.04, { vol: 0.05, partials: false }),
};

export function play(name) {
  if (!enabled) return;
  try {
    if (!audio()) return;
    if (name === "sparkle") {
      for (let i = 0; i < 5; i++) note(PENTA[Math.floor(Math.random() * PENTA.length)], i * 0.06, 0.3, { vol: 0.07, partials: false });
      return;
    }
    FX[name]?.();
  } catch { /* audio unavailable: silently continue */ }
}

/* ------------------------------------------------------------ soft music (opt-in) */
const PAD = [261.63, 293.66, 329.63, 392, 440, 196];  // C pentatonic around middle C: nothing can clash
let musicWanted = false;
let musicTimer = null;
function padNote() {
  if (!enabled || !musicWanted || !ctx || ctx.state !== "running" || (typeof document !== "undefined" && document.hidden)) return;
  const f = PAD[Math.floor(Math.random() * PAD.length)], t0 = ctx.currentTime, vol = calm ? 0.012 : 0.024;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = "sine"; o.frequency.value = f;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 1.4); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 5);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + 5.2);
}
export function setMusic(v) {
  musicWanted = !!v;
  clearInterval(musicTimer); musicTimer = null;
  if (musicWanted && enabled) { try { audio(); } catch { /* ignore */ } musicTimer = setInterval(padNote, 2200); }
}

/* ----------------------------------------------------------------- speech */
const SKEY = "bolajon.voicepref";
const readPref = () => { try { return JSON.parse(localStorage.getItem(SKEY)) || {}; } catch { return {}; } };
let vpref = readPref();                                   // { name?: string, slow?: boolean }
export const getVoicePref = () => ({ name: vpref.name || "", slow: !!vpref.slow });
export function setVoicePref(p) {
  vpref = { ...vpref, ...p };
  try { localStorage.setItem(SKEY, JSON.stringify(vpref)); } catch { /* ignore */ }
  voiceSubs.forEach((f) => f());
}

let voices = [];
const voiceSubs = new Set();
// readVoices only READS (safe to call while rendering); loadVoices also tells subscribers (events only)
const readVoices = () => { try { voices = window.speechSynthesis?.getVoices() || []; } catch { voices = []; } };
const loadVoices = () => { readVoices(); voiceSubs.forEach((f) => f()); };
if (typeof window !== "undefined" && window.speechSynthesis) {
  readVoices();
  // voices load asynchronously in Chrome/Safari: reading getVoices() once is not enough
  window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}
export const onVoicesChange = (f) => { voiceSubs.add(f); return () => voiceSubs.delete(f); };

const FEMALE_RE = /\b(female|woman|ayol|madina|gulnoza|nilufar|yelda|emel|seda|filiz|aylin|zira|aria|jenny|samantha|google)\b/i;
const MALE_RE = /\b(male|man|erkak|sardor|tolga|cem|ahmet|david|mark|guy|davis)\b/i;
export const guessGender = (name = "") => (MALE_RE.test(name) ? "erkak" : FEMALE_RE.test(name) ? "ayol" : "");
const langOf = (v) => v.lang.toLowerCase().replace("_", "-");
const isNeural = (v) => /natural|online|neural/i.test(v.name);

// Higher = better. Wrong language is never usable (-> null), so we never mispronounce Uzbek.
export function scoreVoice(v) {
  const l = langOf(v);
  const base = l.startsWith("uz") ? 100 : l.startsWith("tr") ? 50 : -1000;
  return base + (guessGender(v.name) === "ayol" ? 40 : 0) - (guessGender(v.name) === "erkak" ? 60 : 0) + (isNeural(v) ? 10 : 0);
}
// Usable voices, best first (what the comfort menu lists).
export function listVoices() {
  if (!voices.length) readVoices();
  return voices.filter((v) => scoreVoice(v) > -500).sort((a, b) => scoreVoice(b) - scoreVoice(a));
}
// The voice the user picked, else the best (female) one, else null.
export function pickVoice() {
  const all = listVoices();
  return all.find((v) => v.name === vpref.name) || all[0] || null;
}

/* recorded clips: /audio/manifest.json maps the exact spoken text -> mp3 file */
let manifest = null, manifestLoad = null;
const normText = (t) => String(t).trim().replace(/\s+/g, " ");
function loadManifest() {
  if (!manifestLoad) {
    manifestLoad = (typeof fetch === "function" ? fetch("/audio/manifest.json", { cache: "no-cache" }) : Promise.reject())
      .then((r) => (r.ok ? r.json() : {})).catch(() => ({})).then((m) => { manifest = m && typeof m === "object" ? m : {}; return manifest; });
  }
  return manifestLoad;
}
if (typeof window !== "undefined") loadManifest();    // start early; failure just means "no recorded clips"
export const hasClip = (text) => !!(manifest && manifest[normText(text)]);

export function voiceInfo() {
  const v = pickVoice();
  return { clips: !!manifest && Object.keys(manifest).length > 0, remote: remoteOk(true), voice: v ? v.name : "", gender: v ? guessGender(v.name) : "" };
}
export const canSpeak = () => voiceInfo().clips || remoteOk() || (typeof window !== "undefined" && !!window.speechSynthesis && !!pickVoice());

let speakGen = 0;
let clip = null;
export function stopSpeak() {
  speakGen++;
  if (remoteCtrl) { try { remoteCtrl.abort(); } catch { /* ignore */ } remoteCtrl = null; }
  try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  if (clip) { try { clip.pause(); } catch { /* ignore */ } clip = null; }
}

// Plays one audio source. Resolves true if it played to the end, false if it could not (blocked, broken, stopped).
function playSrc(src, gen) {
  return new Promise((resolve) => {
    try {
      const a = new Audio(src);
      a.volume = calm ? 0.75 : 1;
      a.playbackRate = vpref.slow ? 0.88 : 1;
      clip = a;
      const done = (ok) => { if (clip === a) clip = null; resolve(ok === true); };
      a.onended = () => done(true); a.onerror = () => done(false);
      if (gen !== speakGen) return done(false);
      const p = a.play(); if (p && p.catch) p.catch(() => done(false));   // autoplay blocked etc.
    } catch { resolve(false); }
  });
}
const playClip = (file, gen) => playSrc(`/audio/${file}`, gen);

/* ElevenLabs (voice "Adam") via our server: POST /api/v1/tts/ {text} -> mp3.
   Texts already generated in this session are replayed from memory (no second request, no second charge). */
const REMOTE_MAX_CHARS = 500;                 // keep in sync with TTS_MAX_CHARS on the server
const remoteCache = new Map();                // text -> blob: URL (small LRU)
let remoteCtrl = null;                        // lets stopSpeak() cancel a request that is still running
let remoteOffUntil = 0;                       // after a server-side failure stop asking for a while
const remoteOk = (force = false) => typeof window !== "undefined" && !!getTokens()?.access && (force || Date.now() > remoteOffUntil);

const REMOTE_WAIT_MS = 1800;                  // a slow server voice must never freeze a child's exercise: wait this long, then use the device voice
const inflight = new Map();                   // text -> promise (a request that outlived the wait keeps running and fills the cache for next time)

function fetchRemote(text) {
  if (text.length > REMOTE_MAX_CHARS) return Promise.resolve(null);
  const hit = remoteCache.get(text);
  if (hit) { remoteCache.delete(text); remoteCache.set(text, hit); return Promise.resolve(hit); }
  if (inflight.has(text)) return inflight.get(text);
  const p = requestRemote(text).finally(() => inflight.delete(text));
  inflight.set(text, p);
  return p;
}

// like fetchRemote, but gives up WAITING after ms (the request itself is not cancelled)
const fetchRemoteSoon = (text, ms = REMOTE_WAIT_MS) => {
  const p = fetchRemote(text);
  if (remoteCache.has(text)) return p;
  return Promise.race([p, new Promise((r) => setTimeout(() => { if (inflight.has(text)) remoteCtrl = null; r(null); }, ms))]);   // detach: stopSpeak() will not abort it
};

async function requestRemote(text) {
  const ctrl = new AbortController();
  remoteCtrl = ctrl;
  try {
    const blob = await api.postBlob("/tts/", { text }, { signal: ctrl.signal });
    const url = URL.createObjectURL(blob);
    remoteCache.set(text, url);
    if (remoteCache.size > 30) {
      const [oldest, u] = remoteCache.entries().next().value;
      remoteCache.delete(oldest); URL.revokeObjectURL(u);
    }
    return url;
  } catch (e) {
    if (e?.name === "AbortError") return null;                       // the person pressed stop: not an error
    // not configured / quota / provider down / our rate limit: fall back quietly for a while
    if (e?.status === 429) remoteOffUntil = Date.now() + 60 * 1000;
    else if (e?.status >= 500 || e?.network) remoteOffUntil = Date.now() + 5 * 60 * 1000;
    return null;
  } finally {
    if (remoteCtrl === ctrl) remoteCtrl = null;
  }
}

// speakElevenLabs("Salom!") -> true if the ElevenLabs voice was heard, false if not possible (no fallback here).
export async function speakElevenLabs(text) {
  const t = normText(text || "");
  if (!t || !remoteOk(true)) return false;
  stopSpeak();
  const gen = speakGen;
  const url = await fetchRemote(t);
  if (!url || gen !== speakGen) return false;
  return playSrc(url, gen);
}

function say(text, gen, { rate, pitch }) {
  return new Promise((resolve) => {
    const voice = pickVoice();
    if (!voice || !window.speechSynthesis) return resolve(false);
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.voice = voice; u.lang = voice.lang; u.volume = 1;
      u.rate = rate ?? (vpref.slow ? 0.7 : 0.85);
      // natural/neural voices already sound warm: raising their pitch makes them squeaky
      u.pitch = pitch ?? (isNeural(voice) ? 1.05 : 1.2);
      const done = (ok) => resolve(ok === true);
      u.onend = () => done(true); u.onerror = () => done(false);
      // Chrome drops an utterance queued in the same tick as cancel(): defer a moment
      setTimeout(() => { if (gen === speakGen) window.speechSynthesis.speak(u); else resolve(false); }, 60);
      setTimeout(done, Math.min(12000, 1500 + text.length * 160));   // safety net: some engines never fire onend
    } catch { resolve(false); }
  });
}

// speak("Salom!") -> Promise<boolean>: true if something was actually heard, false/undefined if not.
export async function speak(text, opts = {}) {
  if ((!voiceOn && !opts.force) || !text) return;   // force: the person pressed an "Eshit" button on purpose
  const t = normText(text);
  stopSpeak();
  const gen = speakGen;
  const m = manifest || (await loadManifest());
  if (gen !== speakGen) return;
  if (m[t]) return playClip(m[t], gen);
  if (remoteOk(!!opts.force)) {                      // no recorded clip: generate it with ElevenLabs (cached)
    const url = await fetchRemoteSoon(t);
    if (gen !== speakGen) return;
    if (url && (await playSrc(url, gen))) return;
    if (gen !== speakGen) return;                    // stopped meanwhile; otherwise fall through to the browser voice
  }
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  return say(t, gen, opts);
}
