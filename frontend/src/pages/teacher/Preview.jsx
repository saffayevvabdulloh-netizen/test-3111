import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../api/client";
import { useApi, useTitle } from "../../hooks/useApi";
import Player from "../../games/Player";
import { Button, ErrorState, SkeletonList } from "../../ui/kit";
import Mascot from "../../ui/Mascot";

export default function Preview() {
  const { id } = useParams();
  const nav = useNavigate();
  const q = useApi(() => api.get(`/games/${id}/preview/`), [id]);
  const [run, setRun] = useState(0);
  const [summary, setSummary] = useState(null);
  useTitle("Ko'rib chiqish");

  if (q.loading && !q.data) return <div className="play"><main className="play__main"><SkeletonList rows={3} h={90} /></main></div>;
  if (q.error && !q.data) return <div className="play"><main className="play__main"><ErrorState error={q.error} onRetry={q.reload} /><div className="center"><Button onClick={() => nav(`/teach/games/${id}`)}>Tahrirlashga qaytish</Button></div></main></div>;
  if (q.data.questions.length === 0) {
    return <div className="play"><main className="play__main"><div className="state"><Mascot mood="sleepy" size={110} /><h2>Hali savollar yo'q</h2><p>Ko'rib chiqish uchun avval savol qo'shing.</p><Button variant="primary" to={`/teach/games/${id}`}>Savol qo'shish</Button></div></main></div>;
  }
  if (summary) {
    return (
      <div className="play"><main className="play__main"><div className="state">
        <Mascot mood="cheer" size={120} /><h2>Ko'rib chiqish tugadi</h2>
        <p>Siz {summary.score} / {summary.max} ball oldingiz. Bu natija hech qayerda saqlanmadi.</p>
        <div className="row"><Button icon="refresh" onClick={() => { setSummary(null); setRun((r) => r + 1); }}>Yana ko'rish</Button><Button variant="primary" to={`/teach/games/${id}`}>Tahrirlashga qaytish</Button></div>
      </div></main></div>
    );
  }
  return (
    <Player key={run} preview data={q.data}
      submit={(qid, answer) => api.post(`/games/${id}/preview/check/`, { question_id: qid, answer })}
      finish={async (fbs) => ({ score: Object.values(fbs).reduce((n, f) => n + f.points_awarded, 0), max: Object.values(fbs).reduce((n, f) => n + f.max_points, 0) })}
      onFinished={setSummary} onExit={() => nav(`/teach/games/${id}`)} />
  );
}
