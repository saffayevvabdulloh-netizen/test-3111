import { Component } from "react";
import Mascot from "./Mascot";

// Catches render errors so a bug in one screen shows a friendly message instead of a white page.
export default class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) { console.error("UI error:", error, info?.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="full-center" role="alert">
        <Mascot mood="sleepy" size={140} />
        <h1>Voy, nimadir xato ketdi</h1>
        <p className="muted">Sahifani yangilab ko'ring. Muammo takrorlansa, o'qituvchingizga ayting.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>Yangilash</button>
          <a className="btn" href="/">Bosh sahifa</a>
        </div>
      </div>
    );
  }
}
