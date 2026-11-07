import { useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { Button } from "./kit";
import { Modal } from "./Modal";

// Blocks in-app navigation + tab close while there are unsaved changes.
export function useUnsavedGuard(dirty) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty) return undefined;
    const h = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);
  return blocker;
}

export function UnsavedModal({ blocker }) {
  return (
    <Modal open={blocker.state === "blocked"} onClose={() => blocker.reset?.()} title="Saqlanmagan o'zgarishlar bor"
      actions={<><Button onClick={() => blocker.reset?.()} autoFocus>Qolish</Button><Button variant="coral" onClick={() => blocker.proceed?.()}>Saqlamasdan chiqish</Button></>}>
      <p>Chiqsangiz, kiritgan o'zgarishlaringiz yo'qoladi.</p>
    </Modal>
  );
}
