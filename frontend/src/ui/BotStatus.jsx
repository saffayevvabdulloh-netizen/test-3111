// Is the Telegram bot alive? Shows it in plain words + spoken, with a "check again" button.
// compact: only appears when something is WRONG (used on the sign-up / forgot-password pages).
import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";
import { BOT, BOT_TITLE } from "../utils/guide";
import GuideButton from "./GuideButton";
import Icon from "./Icon";

export default function BotStatus({ compact = false, pollMs = 15000 }) {
  const [st, setSt] = useState(null);       // null = checking
  const [busy, setBusy] = useState(false);
  const check = useCallback(async () => {
    setBusy(true);
    try { setSt(await api.get("/bot-status/", { auth: false })); }
    catch { setSt({ state: "server", connected: false, required: true }); }
    setBusy(false);
  }, []);
  useEffect(() => {
    check();
    const id = setInterval(check, pollMs);
    return () => clearInterval(id);
  }, [check, pollMs]);

  if (!st) return compact ? null : <div className="botstat botstat--wait" role="status"><i className="botstat__dot" />{BOT_TITLE.checking}</div>;
  if (st.state === "disabled") return null;
  const ok = st.state === "ok";
  if (compact && ok) return null;
  const text = BOT[st.state] || BOT.error;
  return (
    <div className={`botstat ${ok ? "is-ok" : "is-bad"}`} role={ok ? "status" : "alert"} data-state={st.state}>
      <div className="botstat__head">
        <i className="botstat__dot" aria-hidden="true" />
        <b>{ok ? `${BOT_TITLE.ok}${st.bot_username ? ` (@${st.bot_username})` : ""}` : "Bot bilan aloqa yo'q"}</b>
      </div>
      <p>{text}</p>
      <div className="row" style={{ gap: "0.5rem" }}>
        <GuideButton text={text} label="Eshit" />
        <button type="button" className="btn btn--sm" onClick={check} disabled={busy}><Icon name="refresh" size={16} />{busy ? "Tekshirilmoqda..." : "Qayta tekshirish"}</button>
      </div>
    </div>
  );
}
