import { Navigate, useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useApi, useTitle } from "../../hooks/useApi";
import Player from "../../games/Player";
import { ErrorState, SkeletonList, Button } from "../../ui/kit";

export default function Play() {
  const { attemptId } = useParams();
  const nav = useNavigate();
  const q = useApi(() => api.get(`/attempts/${attemptId}/`), [attemptId]);
  useTitle(q.data?.game?.title || "O'yin");

  if (q.loading && !q.data) return <div className="play"><main className="play__main"><SkeletonList rows={3} h={90} /></main></div>;
  if (q.error && !q.data) {
    return (
      <div className="play"><main className="play__main">
        <ErrorState error={q.error} onRetry={q.reload} />
        <div className="center"><Button onClick={() => nav("/app")}>Bosh sahifa</Button></div>
      </main></div>
    );
  }
  if (q.data.status === "completed") return <Navigate to={`/app/results/${attemptId}`} replace state={{ result: q.data }} />;

  return (
    <Player
      data={q.data}
      submit={(qid, answer) => api.post(`/attempts/${attemptId}/answers/`, { question_id: qid, answer })}
      finish={() => api.post(`/attempts/${attemptId}/complete/`)}
      onFinished={(result) => nav(`/app/results/${attemptId}`, { replace: true, state: { result } })}
      onExit={() => nav("/app")}
    />
  );
}
