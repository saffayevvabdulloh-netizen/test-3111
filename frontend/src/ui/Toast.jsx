import { createContext, useCallback, useContext, useRef, useState } from "react";

const Ctx = createContext(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const id = useRef(0);
  const toast = useCallback((text, tone = "info") => {
    const key = ++id.current;
    setItems((l) => [...l.slice(-1), { key, text, tone }]);
    setTimeout(() => setItems((l) => l.filter((x) => x.key !== key)), tone === "error" ? 6000 : 2600);
  }, []);
  return (
    <Ctx.Provider value={toast}>
      {children}
      <div className="toasts" aria-live="polite" aria-atomic="false">
        {items.map((t) => <div key={t.key} className="toast" data-tone={t.tone}>{t.text}</div>)}
      </div>
    </Ctx.Provider>
  );
}
