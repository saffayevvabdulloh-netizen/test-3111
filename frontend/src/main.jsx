import "@fontsource-variable/nunito";
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/layout.css";
import "./styles/pages.css";
import "./styles/games.css";
import "./styles/creator.css";
import "./styles/fun.css";
import "./styles/chat.css";
import "./utils/prefs";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ui/ErrorBoundary";

createRoot(document.getElementById("root")).render(<StrictMode><ErrorBoundary><App /></ErrorBoundary></StrictMode>);

// Installable app + offline shell (production build only, so `npm run dev` is never cached)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => { navigator.serviceWorker.register("/sw.js").catch(() => { /* not available: the site still works online */ }); });
}
