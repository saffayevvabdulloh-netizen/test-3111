import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useSingleFlight } from "../hooks/useApi";
import { useToast } from "../ui/Toast";

// Starts (or resumes) an attempt and opens the player. Guards against double taps.
export function useBegin() {
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(null);
  const flight = useSingleFlight();
  const begin = useCallback((gameId, assignmentId) => flight(async () => {
    setBusy(gameId);
    try {
      const a = await api.post(`/games/${gameId}/attempts/`, assignmentId ? { assignment: Number(assignmentId) } : {});
      nav(`/app/play/${a.id}`);
    } catch (e) {
      toast(e.message, "error");
      setBusy(null);
    }
  }), [flight, nav, toast]);
  return { begin, busy };
}
