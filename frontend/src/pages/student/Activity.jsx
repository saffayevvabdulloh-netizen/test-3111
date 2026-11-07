import { Suspense } from "react";
import { useParams } from "react-router-dom";
import { ActivityFrame } from "../../activities/frame";
import { byId, nextOf } from "../../activities/registry";
import { useTitle } from "../../hooks/useApi";
import ErrorBoundary from "../../ui/ErrorBoundary";
import Mascot from "../../ui/Mascot";
import NotFound from "../public/NotFound";

export default function Activity() {
  const { id } = useParams();
  const def = byId(id);
  useTitle(def?.title || "Mashq");
  if (!def) return <NotFound />;
  const Game = def.C;
  return (
    <ActivityFrame key={def.id} def={def} next={nextOf(def.id)}>
      <ErrorBoundary><Suspense fallback={<div className="state" role="status"><Mascot mood="happy" size={100} className="mascot--bob" /><p>Yuklanmoqda...</p></div>}><Game /></Suspense></ErrorBoundary>
    </ActivityFrame>
  );
}
