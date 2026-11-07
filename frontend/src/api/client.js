import { tr, FIELD_LABELS } from "./errors";

const BASE = (import.meta.env.VITE_API_URL || "/api/v1").replace(/\/$/, "");
const STORE = "zumrad.auth";

let tokens = readTokens();
let refreshing = null;
const logoutListeners = new Set();

function readTokens() {
  try { return JSON.parse(localStorage.getItem(STORE)) || null; } catch { return null; }
}
export function setTokens(t) {
  tokens = t;
  try { t ? localStorage.setItem(STORE, JSON.stringify(t)) : localStorage.removeItem(STORE); } catch { /* storage blocked */ }
}
export const getTokens = () => tokens;
export function onForcedLogout(fn) { logoutListeners.add(fn); return () => logoutListeners.delete(fn); }

export class ApiError extends Error {
  constructor({ status, data, network }) {
    super();
    this.status = status;
    this.data = data || {};
    this.network = !!network;
    // `code` is an error code (409 etc., a string) OR a form field name (verify/join, an array)
    this.code = typeof this.data.code === "string" ? this.data.code : null;
    this.fields = extractFields(this.data);
    this.message = network
      ? "Internet bilan aloqa yo'q yoki server javob bermayapti."
      : tr(summarize(this.data, status));
  }
}

const asList = (v) => (Array.isArray(v) ? v : [v]);
const SKIP = ["detail", "error", "code", "problems", "current_version", "telegram_link"];

function extractFields(data) {
  const out = {};
  if (!data || typeof data !== "object" || Array.isArray(data)) return out;
  for (const [k, v] of Object.entries(data)) {
    if (SKIP.includes(k) && !(k === "code" && Array.isArray(v))) continue;
    const first = asList(v).find((x) => typeof x === "string");
    if (first) out[k] = tr(first);
  }
  return out;
}

function summarize(data, status) {
  if (data && typeof data === "object") {
    if (typeof data.error === "string") return data.error;
    if (typeof data.detail === "string" && data.detail) return data.detail;
    const f = extractFields(data);
    const k = Object.keys(f)[0];
    if (k) return `${FIELD_LABELS[k] || k}: ${f[k]}`;
  }
  if (status === 404) return "Topilmadi.";
  if (status === 403) return "Sizda bu amalga ruxsat yo'q.";
  if (status === 429) return "Juda ko'p urinish. Birozdan keyin qayta urining.";
  if (status >= 500) return "Serverda xatolik yuz berdi. Keyinroq qayta urinib ko'ring.";
  return "Noma'lum xatolik.";
}

async function send(path, { method = "GET", body, form, auth = true, signal, blob = false } = {}) {
  const headers = {};
  if (auth && tokens?.access) headers.Authorization = `Bearer ${tokens.access}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: payload, signal });
  } catch (e) {
    if (e?.name === "AbortError") throw e;
    throw new ApiError({ status: 0, network: true });
  }
  if (blob && res.ok) return res.blob();   // binary answer (audio); errors below are still JSON
  let data = null;
  if (res.status !== 204 && res.status !== 205) {
    const text = await res.text();
    if (text) { try { data = JSON.parse(text); } catch { data = { detail: res.ok ? "" : `HTTP ${res.status}` }; } }
  }
  if (!res.ok) throw new ApiError({ status: res.status, data });
  return data;
}

function refreshTokens() {
  if (!tokens?.refresh) return Promise.reject(new ApiError({ status: 401, data: {} }));
  if (!refreshing) {
    refreshing = send("/token/refresh/", { method: "POST", body: { refresh: tokens.refresh }, auth: false })
      .then((d) => { setTokens({ ...tokens, access: d.access, ...(d.refresh ? { refresh: d.refresh } : {}) }); })
      .catch((e) => {
        // drop the session only when the server explicitly rejected the refresh token
        if (e instanceof ApiError && (e.status === 401 || e.status === 400)) { setTokens(null); logoutListeners.forEach((fn) => fn()); }
        throw e;
      })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

async function request(path, opts = {}) {
  try {
    return await send(path, opts);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && opts.auth !== false && tokens?.refresh) {
      await refreshTokens();            // single-flight: parallel requests share one refresh
      return send(path, opts);          // retry once with the new access token
    }
    throw e;
  }
}

export const api = {
  get: (p, o) => request(p, { ...o }),
  post: (p, body, o) => request(p, { method: "POST", body: body ?? {}, ...o }),
  patch: (p, body, o) => request(p, { method: "PATCH", body, ...o }),
  del: (p, o) => request(p, { method: "DELETE", ...o }),
  getBlob: (p, o) => request(p, { blob: true, ...o }),   // -> Blob (file download)
  postBlob: (p, body, o) => request(p, { method: "POST", body: body ?? {}, blob: true, ...o }),   // -> Blob
  upload: (p, file, o) => { const form = new FormData(); form.append("image", file); return request(p, { method: "POST", form, ...o }); },
};

export function qs(params) {
  const u = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") u.set(k, v); });
  const s = u.toString();
  return s ? `?${s}` : "";
}
