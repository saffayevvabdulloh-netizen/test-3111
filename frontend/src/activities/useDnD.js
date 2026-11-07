// Drag & drop that works with mouse, finger AND keyboard/tap:
//   * drag an item and release over a drop zone, or
//   * tap/Enter an item (it is "picked"), then tap/Enter a zone.
// The game decides what a drop means: onDrop(itemId, zoneId).
import { useRef, useState } from "react";

export function useDnD(onDrop, disabled = false) {
  const [drag, setDrag] = useState(null);     // { id, dx, dy } while moving
  const [picked, setPicked] = useState(null); // tap-selected item
  const st = useRef(null);
  const skipClick = useRef(false);

  const finish = (id, zone) => { setPicked(null); if (zone) onDrop(id, zone); };

  const item = (id) => ({
    onPointerDown: (e) => {
      if (disabled || (e.pointerType === "mouse" && e.button !== 0)) return;
      e.currentTarget.setPointerCapture?.(e.pointerId);
      st.current = { id, x0: e.clientX, y0: e.clientY, moved: false };
    },
    onPointerMove: (e) => {
      const s = st.current; if (!s) return;
      const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
      if (!s.moved && Math.hypot(dx, dy) < 8) return;
      s.moved = true; setDrag({ id, dx, dy });
    },
    onPointerUp: (e) => {
      const s = st.current; st.current = null; if (!s) return;
      skipClick.current = true;
      if (s.moved) {
        setDrag(null);
        const zone = document.elementsFromPoint(e.clientX, e.clientY).find((n) => n.dataset?.drop);
        finish(id, zone?.dataset.drop);
      } else setPicked((p) => (p === id ? null : id));
    },
    onPointerCancel: () => { st.current = null; setDrag(null); },
    onClick: () => { // keyboard (Enter/Space) - pointer clicks were already handled above
      if (skipClick.current) { skipClick.current = false; return; }
      if (!disabled) setPicked((p) => (p === id ? null : id));
    },
    "data-picked": picked === id ? "" : undefined,
    "data-dragging": drag?.id === id ? "" : undefined,
    style: { touchAction: "none", ...(drag?.id === id ? { transform: `translate(${drag.dx}px, ${drag.dy}px) scale(1.08)`, zIndex: 50, transition: "none" } : null) },
  });

  const zone = (zid) => ({
    "data-drop": zid,
    "data-ready": picked ? "" : undefined,
    onClick: () => { if (picked && !disabled) { const id = picked; setPicked(null); onDrop(id, zid); } },
  });

  return { item, zone, picked, dragging: drag?.id ?? null, clear: () => setPicked(null) };
}

export const shuffle = (a) => { const r = [...a]; for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };
