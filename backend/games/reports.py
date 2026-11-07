"""Teacher-side analytics. Everything is computed from real stored attempts."""
from collections import defaultdict

from django.db.models import Avg, Count, Q

from school.models import Enrollment
from users.serializer import UserBriefSerializer

from .models import Attempt, AttemptAnswer, Assignment


def game_stats(game):
    attempts = Attempt.objects.filter(game=game)
    done = attempts.filter(status=Attempt.State.COMPLETED)
    avg = done.aggregate(a=Avg("percent"))["a"]
    answered = {
        r["question"]: r
        for r in AttemptAnswer.objects.filter(attempt__game=game, attempt__status=Attempt.State.COMPLETED)
        .values("question")
        .annotate(total=Count("id"), correct=Count("id", filter=Q(is_correct=True)))
    }
    per_question = []
    for q in game.questions.all():
        r = answered.get(q.pk)
        total = r["total"] if r else 0
        correct = r["correct"] if r else 0
        per_question.append(
            {
                "question_id": q.pk,
                "order": q.order,
                "prompt": q.prompt,
                "answered": total,
                "correct": correct,
                "correct_rate": round(100 * correct / total) if total else None,
            }
        )
    return {
        "attempts_total": attempts.count(),
        "attempts_completed": done.count(),
        "unique_students": done.values("user").distinct().count(),
        "average_percent": round(avg) if avg is not None else None,
        "per_question": per_question,
    }


def assignment_results(assignment):
    enrolled = list(Enrollment.objects.filter(classroom=assignment.classroom).select_related("student"))
    by_user = defaultdict(list)
    for a in Attempt.objects.filter(assignment=assignment):
        by_user[a.user_id].append(a)

    rows, best_percents = [], []
    counts = {"completed": 0, "in_progress": 0, "not_started": 0}
    for e in enrolled:
        mine = by_user.get(e.student_id, [])
        done = [a for a in mine if a.status == Attempt.State.COMPLETED]
        if done:
            st = "completed"
        elif mine:
            st = "in_progress"
        else:
            st = "not_started"
        counts[st] += 1
        best = max(done, key=lambda a: (a.percent, a.score), default=None)
        if best:
            best_percents.append(best.percent)
        rows.append(
            {
                "student": UserBriefSerializer(e.student).data,
                "status": st,
                "attempts_completed": len(done),
                "best_score": best.score if best else None,
                "best_percent": best.percent if best else None,
                "last_completed_at": max((a.completed_at for a in done), default=None),
            }
        )
    return {
        "assignment_id": assignment.pk,
        "game_id": assignment.game_id,
        "due_at": assignment.due_at,
        "summary": {
            "enrolled": len(enrolled),
            **counts,
            "average_best_percent": round(sum(best_percents) / len(best_percents)) if best_percents else None,
        },
        "students": rows,
    }


def class_results(classroom):
    assignments = list(Assignment.objects.filter(classroom=classroom).values_list("pk", flat=True))
    by_user = defaultdict(list)
    for a in Attempt.objects.filter(assignment__classroom=classroom, status=Attempt.State.COMPLETED):
        by_user[a.user_id].append(a)
    rows = []
    for e in Enrollment.objects.filter(classroom=classroom).select_related("student"):
        done = by_user.get(e.student_id, [])
        rows.append(
            {
                "student": UserBriefSerializer(e.student).data,
                "assignments_completed": len({a.assignment_id for a in done}),
                "completed_attempts": len(done),
                "average_percent": round(sum(a.percent for a in done) / len(done)) if done else None,
                "last_activity": max((a.completed_at for a in done), default=None),
            }
        )
    return {"classroom_id": classroom.pk, "assignments_total": len(assignments), "students": rows}
