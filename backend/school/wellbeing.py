"""Mood check-ins and mini-game progress: written by the child, read by the child's teacher.

Privacy rules (enforced here, covered by tests):
  * a student only ever reads/writes their own rows;
  * a teacher only sees students enrolled in THEIR OWN class;
  * nothing is exposed to other roles.
"""
from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.permissions import IsStudent, IsTeacher

from .models import MOODS, NEGATIVE_MOODS, ActivityProgress, Classroom, Enrollment, MoodEntry


class MoodInSerializer(serializers.Serializer):
    mood = serializers.ChoiceField(choices=MOODS)
    day = serializers.DateField(required=False)

    def validate_day(self, value):
        today = timezone.localdate()
        # +1 day: the device clock/time zone may be ahead; up to 7 days back: a child who was offline
        # still gets those days saved when the device reconnects. Anything else is rejected.
        if value > today + timedelta(days=1) or value < today - timedelta(days=7):
            raise serializers.ValidationError("Kun oxirgi 7 kun ichida bo'lishi kerak.")
        return value


class ActivityInSerializer(serializers.Serializer):
    activity = serializers.RegexField(r"^[a-z0-9_-]{1,40}$")
    stars = serializers.IntegerField(min_value=1, max_value=3)
    mistakes = serializers.IntegerField(min_value=0, max_value=999, required=False, default=0)


def _days_param(request, default=14):
    try:
        return max(1, min(60, int(request.query_params.get("days", default))))
    except (TypeError, ValueError):
        return default


def _activity_row(p):
    return {"activity": p.activity, "best_stars": p.best_stars, "plays": p.plays}


@extend_schema(tags=["Well-being"], request=MoodInSerializer)
class MyMoodView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        since = timezone.localdate() - timedelta(days=_days_param(request) - 1)
        rows = MoodEntry.objects.filter(student=request.user, day__gte=since).order_by("day")
        return Response([{"day": r.day.isoformat(), "mood": r.mood} for r in rows])

    def post(self, request):
        s = MoodInSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        day = s.validated_data.get("day") or timezone.localdate()
        obj, created = MoodEntry.objects.update_or_create(
            student=request.user, day=day, defaults={"mood": s.validated_data["mood"]}
        )
        return Response({"day": obj.day.isoformat(), "mood": obj.mood},
                        status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@extend_schema(tags=["Well-being"], request=ActivityInSerializer)
class MyActivitiesView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        return Response([_activity_row(p) for p in ActivityProgress.objects.filter(student=request.user)])

    def post(self, request):
        s = ActivityInSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        with transaction.atomic():
            obj, created = ActivityProgress.objects.get_or_create(
                student=request.user, activity=d["activity"],
                defaults={"best_stars": d["stars"], "plays": 1, "last_mistakes": d["mistakes"]},
            )
            if not created:
                obj.plays = F("plays") + 1
                obj.last_mistakes = d["mistakes"]
                obj.save(update_fields=["plays", "last_mistakes", "last_played_at"])
                if d["stars"] > obj.best_stars:
                    ActivityProgress.objects.filter(pk=obj.pk).update(best_stars=d["stars"])
                obj.refresh_from_db()
        return Response(_activity_row(obj), status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@extend_schema(tags=["Well-being"])
class ClassWellbeingView(APIView):
    """Teacher: moods (last N days) and mini-game stars for every student of ONE of their classes."""

    permission_classes = [IsTeacher]

    def get(self, request, pk):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)
        days = _days_param(request)
        since = timezone.localdate() - timedelta(days=days - 1)
        week_ago = timezone.localdate() - timedelta(days=6)
        enrolls = Enrollment.objects.filter(classroom=classroom).select_related("student")
        ids = [e.student_id for e in enrolls]
        moods, progress = {i: [] for i in ids}, {i: [] for i in ids}
        for m in MoodEntry.objects.filter(student_id__in=ids, day__gte=since).order_by("day"):
            moods[m.student_id].append(m)
        for p in ActivityProgress.objects.filter(student_id__in=ids):
            progress[p.student_id].append(p)
        today = timezone.localdate()
        out = []
        for e in enrolls:
            u, ms, ps = e.student, moods[e.student_id], progress[e.student_id]
            out.append({
                "student": {"id": u.id, "username": u.username, "role": u.role, "first_name": u.first_name,
                            "last_name": u.last_name, "avatar": u.avatar},
                "moods": [{"day": m.day.isoformat(), "mood": m.mood} for m in ms],
                "today_mood": next((m.mood for m in ms if m.day == today), None),
                "negative_last_7": sum(1 for m in ms if m.day >= week_ago and m.mood in NEGATIVE_MOODS),
                "stars_total": sum(p.best_stars for p in ps),
                "activities_played": len(ps),
                "activities": [_activity_row(p) for p in ps],
                "last_played_at": max((p.last_played_at for p in ps), default=None),
            })
        return Response({"classroom_id": classroom.id, "days": days, "students": out})
