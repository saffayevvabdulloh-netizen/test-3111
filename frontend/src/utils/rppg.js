// Camera pulse estimate (rPPG): the skin's green-channel brightness pulses slightly with each heartbeat.
// Pure functions + a small class so it can be unit-tested without a camera.
// Approximate, NOT medical: it needs light, a still face and ~10 s of data.
const FS = 30;                 // resampling rate, Hz
const WINDOW = 12;             // seconds analysed
const MIN_SPAN = 8;            // seconds needed before the first estimate
const F_LO = 0.8, F_HI = 3.0;  // 48..180 bpm

function resample(ts, vs, t0, t1) {
  const n = Math.floor((t1 - t0) * FS), out = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const t = t0 + i / FS;
    while (j < ts.length - 2 && ts[j + 1] < t) j++;
    const a = ts[j], b = ts[j + 1], k = b > a ? Math.min(1, Math.max(0, (t - a) / (b - a))) : 0;
    out[i] = vs[j] + (vs[j + 1] - vs[j]) * k;
  }
  return out;
}

const movAvg = (x, w) => {
  const out = new Float64Array(x.length), h = w >> 1;
  let sum = 0, lo = 0, hi = -1;
  for (let i = 0; i < x.length; i++) {
    const L = Math.max(0, i - h), H = Math.min(x.length - 1, i + h);
    while (hi < H) sum += x[++hi];
    while (lo < L) sum -= x[lo++];
    out[i] = sum / (hi - lo + 1);
  }
  return out;
};

export function bandpass(x) {
  const slow = movAvg(x, Math.round(FS * 1.2));      // remove drift / lighting changes
  const d = x.map((v, i) => v - slow[i]);
  return movAvg(d, 5);                                // remove sensor noise
}

export function spectrum(sig) {
  const n = sig.length;
  let mean = 0; for (const v of sig) mean += v; mean /= n;
  const w = sig.map((v, i) => (v - mean) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1))));
  const bins = [];
  for (let f = F_LO; f <= F_HI; f += 0.01) {
    let re = 0, im = 0;
    for (let i = 0; i < n; i++) { const a = (2 * Math.PI * f * i) / FS; re += w[i] * Math.cos(a); im -= w[i] * Math.sin(a); }
    bins.push([f, re * re + im * im]);
  }
  return bins;
}

export class RppgEstimator {
  constructor() { this.t = []; this.v = []; this.hist = []; }
  reset() { this.t = []; this.v = []; this.hist = []; }
  push(tMs, value) {
    this.t.push(tMs / 1000); this.v.push(value);
    const cut = tMs / 1000 - WINDOW - 1;
    while (this.t.length > 2 && this.t[0] < cut) { this.t.shift(); this.v.shift(); }
  }
  get span() { return this.t.length > 1 ? this.t[this.t.length - 1] - this.t[0] : 0; }
  // -> { bpm|null, quality 0..1, progress 0..1, wave: number[] }
  estimate() {
    const progress = Math.min(1, this.span / MIN_SPAN);
    if (this.span < 3) return { bpm: null, quality: 0, progress, wave: [] };
    const t1 = this.t[this.t.length - 1], t0 = Math.max(this.t[0], t1 - WINDOW);
    const sig = bandpass(resample(this.t, this.v, t0, t1));
    let sd = 0; for (const v of sig) sd += v * v; sd = Math.sqrt(sd / sig.length) || 1;
    const wave = Array.from(sig.slice(-FS * 4), (v) => v / (sd * 3));
    if (this.span < MIN_SPAN) return { bpm: null, quality: 0, progress, wave };
    const bins = spectrum(sig);
    let best = bins[0], total = 0;
    for (const b of bins) { total += b[1]; if (b[1] > best[1]) best = b; }
    // energy near the peak (+-0.12 Hz) relative to the whole band = how "clean" the rhythm is
    let near = 0; for (const [f, p] of bins) if (Math.abs(f - best[0]) < 0.12) near += p;
    const quality = total ? near / total : 0;
    if (quality > 0.42) { this.hist.push(best[0] * 60); if (this.hist.length > 7) this.hist.shift(); }
    else if (this.hist.length) this.hist.shift();
    const s = [...this.hist].sort((a, b) => a - b);
    const bpm = s.length >= 3 ? Math.round(s[s.length >> 1]) : null;
    return { bpm, quality, progress: 1, wave };
  }
}
