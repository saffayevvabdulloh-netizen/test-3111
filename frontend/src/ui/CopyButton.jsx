import { useState } from "react";
import { Button } from "./kit";

export default function CopyButton({ text, label = "Nusxalash", size = "sm" }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand("copy"); } catch { /* ignore */ }
      t.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1800);
  }
  return <Button size={size} icon={done ? "check" : "copy"} onClick={copy} aria-live="polite">{done ? "Nusxalandi" : label}</Button>;
}
