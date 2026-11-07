"""Data-subject rights (Law "On Personal Data"): the person may get a copy of everything stored about them and may have it erased."""
from django.db import transaction
from django.db.models import ProtectedError
from django.utils import timezone

from .models import AuditLog, User


def _dt(v):
    return v.isoformat() if v else None


def export_user(user):
    """Everything the system stores about this account, as plain JSON-able data."""
    from chat.models import Message
    from games.models import Attempt, Game, Lesson, UserAchievement
    from school.models import ActivityProgress, Classroom, Enrollment, FamilyCode, MoodEntry, ParentLink

    data = {
        "exported_at": _dt(timezone.now()),
        "account": {
            "username": user.username, "role": user.role, "first_name": user.first_name, "last_name": user.last_name,
            "age": user.age, "avatar": user.avatar, "created_at": _dt(user.created_at), "last_login": _dt(user.last_login),
            "telegram_linked": user.telegram_id is not None, "consent_version": user.consent_version, "consent_at": _dt(user.consent_at),
        },
        "classes_joined": [{"class": e.classroom.name, "teacher": e.classroom.teacher.display_name, "joined_at": _dt(e.joined_at)}
                           for e in Enrollment.objects.filter(student=user).select_related("classroom__teacher")],
        "classes_owned": [{"name": c.name, "students": c.enrollments.count(), "created_at": _dt(c.created_at)} for c in Classroom.objects.filter(teacher=user)],
        "parents_linked": [{"username": l.parent.username, "name": l.parent.display_name} for l in ParentLink.objects.filter(student=user).select_related("parent")],
        "children_linked": [{"username": l.student.username, "name": l.student.display_name} for l in ParentLink.objects.filter(parent=user).select_related("student")],
        "moods": [{"day": m.day.isoformat(), "mood": m.mood} for m in MoodEntry.objects.filter(student=user)],
        "mini_games": [{"activity": p.activity, "best_stars": p.best_stars, "plays": p.plays, "last_played_at": _dt(p.last_played_at)} for p in ActivityProgress.objects.filter(student=user)],
        "game_attempts": [{"game": a.game.title, "status": a.status, "score": a.score, "max_score": a.max_score, "percent": a.percent,
                           "started_at": _dt(a.started_at), "completed_at": _dt(a.completed_at)} for a in Attempt.objects.filter(user=user).select_related("game")],
        "achievements": [{"key": a.key, "earned_at": _dt(a.earned_at)} for a in UserAchievement.objects.filter(user=user)],
        "games_created": list(Game.objects.filter(owner=user).values_list("title", flat=True)),
        "lessons_created": list(Lesson.objects.filter(owner=user).values_list("title", flat=True)),
        "chat_messages": [{"from": m.sender.username, "text": m.text, "at": _dt(m.created_at)}
                          for m in Message.objects.filter(conversation__teacher=user).select_related("sender", "conversation")] +
                         [{"from": m.sender.username, "text": m.text, "at": _dt(m.created_at)}
                          for m in Message.objects.filter(conversation__parent=user).select_related("sender", "conversation")],
        "security_journal": [{"action": a.action, "at": _dt(a.created_at), "ip": a.ip} for a in AuditLog.objects.filter(user=user)[:500]],
    }
    try:
        data["family_code"] = FamilyCode.objects.get(student=user).code
    except FamilyCode.DoesNotExist:
        pass
    return data


def erase_user(user):
    """Delete the account and everything that hangs on it. If other people's results depend on the account's games
    (a teacher whose games were played) the account is anonymised and closed instead, so that their records stay intact."""
    uid = user.pk
    try:
        with transaction.atomic():
            AuditLog.objects.filter(user=user).update(username=f"deleted-{uid}")
            user.delete()
        return "deleted"
    except ProtectedError:
        from games.models import Game, Status

        with transaction.atomic():
            Game.objects.filter(owner_id=uid).update(status=Status.ARCHIVED)
            u = User.objects.get(pk=uid)
            u.username, u.first_name, u.last_name, u.avatar, u.age = f"deleted-{uid}", "", "", "", None
            u.telegram_id, u.is_active = None, False
            u.set_unusable_password()
            u.save()
            from chat.models import Conversation
            Conversation.objects.filter(teacher=u).delete()
            Conversation.objects.filter(parent=u).delete()
        return "anonymised"
