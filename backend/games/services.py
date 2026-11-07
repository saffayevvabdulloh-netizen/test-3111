import random
from datetime import timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import Avg, Count, Exists, IntegerField, Max, OuterRef, Q, Subquery, Sum
from django.db.models.functions import Coalesce
from django.utils import timezone

from school.models import Enrollment

from .exceptions import Conflict
from .models import Attempt, AttemptAnswer, Game, Question, Status, UserAchievement
from .question_types import DEFAULT_CONFIG, get_type

TIME_GRACE = timedelta(seconds=5)

ACHIEVEMENTS = {
    "first_game": ("Первый шаг", "Завершена первая игра"),
    "perfect_score": ("Отличник", "100% в игре"),
    "five_games": ("Исследователь", "Пройдено 5 разных игр"),
    "ten_games": ("Знаток", "Пройдено 10 разных игр"),
}


# ------------------------------------------------------------ querysets
def visible_games(user):
    """Published games a user may open: public ones + (students) their teachers' games."""
    qs = Game.objects.filter(status=Status.PUBLISHED)
    if user.role == "teacher":
        return qs.filter(Q(is_public=True) | Q(owner=user))
    teaches_me = Enrollment.objects.filter(student=user, classroom__teacher=OuterRef("owner_id"))
    return qs.filter(Q(is_public=True) | Exists(teaches_me))


def annotate_games(qs, user=None):
    """question_count / max_score (and the student's own stats) without join blow-up."""
    q = Question.objects.filter(game=OuterRef("pk")).order_by().values("game")
    qs = qs.annotate(
        question_count=Coalesce(Subquery(q.annotate(v=Count("pk")).values("v"), output_field=IntegerField()), 0),
        max_score=Coalesce(Subquery(q.annotate(v=Sum("points")).values("v"), output_field=IntegerField()), 0),
    )
    if user is not None and user.role == "student":
        a = Attempt.objects.filter(
            game=OuterRef("pk"), user=user, status=Attempt.State.COMPLETED
        ).order_by().values("game")
        qs = qs.annotate(
            my_attempts=Coalesce(Subquery(a.annotate(v=Count("pk")).values("v"), output_field=IntegerField()), 0),
            my_best_percent=Subquery(a.annotate(v=Max("percent")).values("v"), output_field=IntegerField()),
        )
    return qs.select_related("owner")


# ------------------------------------------------------------ editing locks
def ensure_structure_editable(game):
    if game.attempts.exists():
        raise Conflict(
            "game_has_attempts",
            "У игры уже есть попытки учеников. Создайте копию, чтобы изменить вопросы.",
        )


def game_config(game):
    return {**DEFAULT_CONFIG, **(game.config or {})}


def public_config(game):
    c = game_config(game)
    return {"time_limit_seconds": c["time_limit_seconds"], "reveal_answers": c["reveal_answers"]}


# ------------------------------------------------------------ play payload
def play_questions(game, request, seed=None):
    """Student-facing questions: NO answers inside. Deterministic for a given seed."""
    cfg = game_config(game)
    qtype = get_type(game.game_type)
    questions = list(game.questions.all())
    rng = random.Random(seed)
    if cfg["shuffle_questions"]:
        rng.shuffle(questions)
    out = []
    for i, q in enumerate(questions, 1):
        qrng = random.Random(f"{seed}:{q.pk}") if cfg["shuffle_options"] else None
        out.append(
            {
                "id": q.pk,
                "position": i,
                "prompt": q.prompt,
                "image": request.build_absolute_uri(q.image.url) if q.image else None,
                "points": q.points,
                "content": qtype.public(q.content, qrng),
            }
        )
    return out


def feedback(question, game, fraction, points, already=False):
    cfg = game_config(game)
    qtype = get_type(game.game_type)
    correct = fraction >= 1.0
    return {
        "question_id": question.pk,
        "is_correct": correct,
        "partial": 0 < fraction < 1,
        "points_awarded": points,
        "max_points": question.points,
        # wrong answers GUIDE: hint + explanation, never shaming text
        "hint": "" if correct else question.hint,
        "explanation": question.explanation,
        "correct_answer": qtype.correct_answer(question.content) if (cfg["reveal_answers"] or correct) else None,
        "already_answered": already,
    }


def grade(question, game, answer):
    fraction = get_type(game.game_type).grade(question.content, answer)
    return fraction, int(round(question.points * fraction))


# ------------------------------------------------------------ attempts
def deadline_for(attempt):
    limit = game_config(attempt.game)["time_limit_seconds"]
    return attempt.started_at + timedelta(seconds=limit) if limit else None


def start_attempt(user, game, assignment=None):
    """Idempotent: returns (attempt, created). Safe against double clicks."""
    existing = Attempt.objects.filter(user=user, game=game, status=Attempt.State.IN_PROGRESS).first()
    if existing:
        return existing, False
    max_score = game.questions.aggregate(s=Sum("points"))["s"] or 0
    try:
        with transaction.atomic():
            return Attempt.objects.create(user=user, game=game, assignment=assignment, max_score=max_score), True
    except IntegrityError:  # lost the race to a parallel request
        return Attempt.objects.get(user=user, game=game, status=Attempt.State.IN_PROGRESS), False


def submit_answer(attempt, question, answer):
    """Returns (feedback_dict, created)."""
    game = attempt.game
    existing = AttemptAnswer.objects.filter(attempt=attempt, question=question).first()
    if existing:
        return feedback(question, game, 1.0 if existing.is_correct else existing.points_awarded / max(question.points, 1),
                        existing.points_awarded, already=True), False

    deadline = deadline_for(attempt)
    if deadline and timezone.now() > deadline + TIME_GRACE:
        raise Conflict("time_over", "Время вышло. Завершите игру, чтобы увидеть результат.")

    fraction, points = grade(question, game, answer)
    try:
        with transaction.atomic():
            AttemptAnswer.objects.create(
                attempt=attempt, question=question, answer=answer,
                is_correct=fraction >= 1.0, points_awarded=points, max_points=question.points,
            )
    except IntegrityError:  # parallel duplicate submit
        return submit_answer(attempt, question, answer)[0], False
    return feedback(question, game, fraction, points), True


def stored_feedback(a):
    q = a.question
    frac = 1.0 if a.is_correct else (a.points_awarded / q.points if q.points else 0)
    return feedback(q, a.attempt.game, frac, a.points_awarded, already=True)


@transaction.atomic
def complete_attempt(attempt):
    """Idempotent. Returns (attempt, newly_earned_keys)."""
    attempt = Attempt.objects.select_for_update().select_related("game").get(pk=attempt.pk)
    if attempt.status == Attempt.State.COMPLETED:
        return attempt, []
    agg = attempt.answers.aggregate(s=Sum("points_awarded"))
    attempt.score = agg["s"] or 0
    attempt.percent = round(100 * attempt.score / attempt.max_score) if attempt.max_score else 0
    attempt.status = Attempt.State.COMPLETED
    attempt.completed_at = timezone.now()
    attempt.save(update_fields=["score", "percent", "status", "completed_at"])
    return attempt, award_achievements(attempt.user, attempt)


def award_achievements(user, attempt):
    done = Attempt.objects.filter(user=user, status=Attempt.State.COMPLETED)
    distinct_games = done.values("game").distinct().count()
    earned = []
    if done.count() >= 1:
        earned.append("first_game")
    if attempt.max_score > 0 and attempt.percent == 100:
        earned.append("perfect_score")
    if distinct_games >= 5:
        earned.append("five_games")
    if distinct_games >= 10:
        earned.append("ten_games")
    new = []
    for key in earned:
        _, created = UserAchievement.objects.get_or_create(user=user, key=key, defaults={"attempt": attempt})
        if created:
            new.append(key)
    return new


def achievement_payload(key, earned_at=None):
    title, desc = ACHIEVEMENTS[key]
    return {"key": key, "title": title, "description": desc, "earned": earned_at is not None, "earned_at": earned_at}


def result_payload(attempt, new_achievements=()):
    game = attempt.game
    cfg = game_config(game)
    answers = {a.question_id: a for a in attempt.answers.select_related("question")}
    qtype = get_type(game.game_type)
    rows = []
    for q in game.questions.all():
        a = answers.get(q.pk)
        rows.append(
            {
                "question_id": q.pk,
                "prompt": q.prompt,
                "answered": a is not None,
                "is_correct": bool(a and a.is_correct),
                "points_awarded": a.points_awarded if a else 0,
                "max_points": q.points,
                "explanation": q.explanation,
                "correct_answer": qtype.correct_answer(q.content) if cfg["reveal_answers"] else None,
            }
        )
    end = attempt.completed_at or timezone.now()
    return {
        "id": attempt.pk,
        "status": attempt.status,
        "game": {"id": game.pk, "title": game.title, "game_type": game.game_type},
        "score": attempt.score,
        "max_score": attempt.max_score,
        "percent": attempt.percent,
        "correct_count": sum(1 for r in rows if r["is_correct"]),
        "total_questions": len(rows),
        "duration_seconds": int((end - attempt.started_at).total_seconds()),
        "started_at": attempt.started_at,
        "completed_at": attempt.completed_at,
        "answers": rows,
        "new_achievements": [achievement_payload(k, timezone.now()) for k in new_achievements],
    }


# ------------------------------------------------------------ progress
def progress_for(user):
    done = Attempt.objects.filter(user=user, status=Attempt.State.COMPLETED)
    agg = done.aggregate(n=Count("id"), pts=Sum("score"), avg=Avg("percent"))
    earned = {a.key: a.earned_at for a in UserAchievement.objects.filter(user=user)}
    return {
        "completed_attempts": agg["n"] or 0,
        "games_played": done.values("game").distinct().count(),
        "total_points": agg["pts"] or 0,
        "average_percent": round(agg["avg"]) if agg["avg"] is not None else None,
        "perfect_scores": done.filter(percent=100, max_score__gt=0).count(),
        "achievements": [achievement_payload(k, earned.get(k)) for k in ACHIEVEMENTS],
        "in_progress": [
            {"attempt_id": a.pk, "game_id": a.game_id, "game_title": a.game.title, "started_at": a.started_at}
            for a in Attempt.objects.filter(user=user, status=Attempt.State.IN_PROGRESS).select_related("game")
        ],
        "recent": [
            {
                "attempt_id": a.pk, "game_id": a.game_id, "game_title": a.game.title,
                "score": a.score, "max_score": a.max_score, "percent": a.percent, "completed_at": a.completed_at,
            }
            for a in done.select_related("game").order_by("-completed_at")[:5]
        ],
    }
