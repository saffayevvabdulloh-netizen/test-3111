import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Button } from "./kit";

export function Modal({ open, onClose, title, children, actions }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={(e) => { e.preventDefault(); onClose?.(); }}
      onMouseDown={(e) => { if (e.target === ref.current) onClose?.(); }}>
      {open && (
        <div className="modal__body">
          <h2 id="modal-title">{title}</h2>
          {children}
          {actions && <div className="modal__actions">{actions}</div>}
        </div>
      )}
    </dialog>
  );
}

const ConfirmCtx = createContext(null);
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }) {
  const [st, setSt] = useState(null);
  const confirm = useCallback((opts) => new Promise((resolve) => setSt({ ...opts, resolve })), []);
  const done = (v) => { st?.resolve(v); setSt(null); };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={!!st} onClose={() => done(false)} title={st?.title || ""}
        actions={<>
          <Button onClick={() => done(false)}>{st?.cancelLabel || "Bekor qilish"}</Button>
          <Button variant={st?.tone === "danger" ? "coral" : "primary"} onClick={() => done(true)} autoFocus>{st?.confirmLabel || "Ha"}</Button>
        </>}>
        {st?.message && <p>{st.message}</p>}
      </Modal>
    </ConfirmCtx.Provider>
  );
}
