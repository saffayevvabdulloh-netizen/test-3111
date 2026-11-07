import { BRAND } from "../brand";
import { useCallback, useEffect, useRef, useState } from "react";

// Fetch with race protection: an older, slower response can never overwrite a newer one.
export function useApi(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled });
  const reqId = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async () => {
    const id = ++reqId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (id === reqId.current) setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (id === reqId.current) setState((s) => ({ ...s, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    if (enabled) run();
    return () => { reqId.current++; };
  }, [enabled, run, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  const setData = useCallback((u) => setState((s) => ({ ...s, data: typeof u === "function" ? u(s.data) : u })), []);
  return { ...state, reload: run, setData };
}

export function useTitle(title) {
  useEffect(() => { document.title = title ? `${title} · ${BRAND}` : BRAND; }, [title]);
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t); }, [value, ms]);
  return v;
}

// Ignores re-entrant calls until the first one settles (state-based `busy` flags can't stop two clicks in one tick).
export function useSingleFlight() {
  const busy = useRef(false);
  return useCallback(async (fn) => {
    if (busy.current) return undefined;
    busy.current = true;
    try { return await fn(); } finally { busy.current = false; }
  }, []);
}
