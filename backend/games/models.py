import uuid
from pathlib import PurePath

from django.conf import settings
from django.db import models
from django.db.models import Q

from .question_types import GAME_TYPE_CHOICES

User = settings.AUTH_USER_MODEL


def _path(prefix, filename):
    ext = PurePath(filename).suffix.lower()[:5]
    return f"{prefix}/{uuid.uuid4().hex}{ext}"


def lesson_cover_path(instance, filename):
    return _path("lessons", filename)


def game_cover_path(instance, filename):
    return _path("games", filename)


def question_image_path(instance, filename):
    return _path("questions", filename)


class Status(models.TextChoices):
    DRAFT = "draft", "Черновик"
    PUBLISHED = "published", "Опубликовано"
    ARCHIVED = "archived", "В архиве"


class Lesson(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=200)
    summary = models.CharField(max_length=300, blank=True)
    body = models.TextField(blank=True)
    subject = models.CharField(max_length=50, blank=True)
    cover = models.ImageField(upload_to=lesson_cover_path, null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    is_public = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self):
        return self.title


class Game(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="games")
    lesson = models.ForeignKey(Lesson, null=True, blank=True, on_delete=models.SET_NULL, related_name="games")
    title = models.CharField(max_length=120)
    description = models.CharField(max_length=500, blank=True)
    game_type = models.CharField(max_length=20, choices=GAME_TYPE_CHOICES)
    subject = models.CharField(max_length=50, blank=True)
    config = models.JSONField(default=dict, blank=True)
    cover = models.ImageField(upload_to=game_cover_path, null=True, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT)
    is_public = models.BooleanField(default=True)
    version = models.PositiveIntegerField(default=1)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self):
        return self.title


class Question(models.Model):
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="questions")
    order = models.PositiveIntegerField(default=0)
    prompt = models.TextField()
    image = models.ImageField(upload_to=question_image_path, null=True, blank=True)
    hint = models.CharField(max_length=300, blank=True)
    explanation = models.CharField(max_length=600, blank=True)
    points = models.PositiveSmallIntegerField(default=10)
    content = models.JSONField(default=dict)
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["order", "id"]


class Assignment(models.Model):
    classroom = models.ForeignKey("school.Classroom", on_delete=models.CASCADE, related_name="assignments")
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name="assignments")
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name="assignments_created")
    title = models.CharField(max_length=120, blank=True)
    due_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [models.UniqueConstraint(fields=["classroom", "game"], name="uniq_assignment_per_class_game")]


class Attempt(models.Model):
    class State(models.TextChoices):
        IN_PROGRESS = "in_progress", "В процессе"
        COMPLETED = "completed", "Завершена"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="attempts")
    game = models.ForeignKey(Game, on_delete=models.PROTECT, related_name="attempts")
    assignment = models.ForeignKey(Assignment, null=True, blank=True, on_delete=models.SET_NULL, related_name="attempts")
    status = models.CharField(max_length=12, choices=State.choices, default=State.IN_PROGRESS)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.PositiveIntegerField(default=0)
    max_score = models.PositiveIntegerField(default=0)
    percent = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["-started_at", "-id"]
        constraints = [
            # one open attempt per student+game: kills double-click duplicates
            models.UniqueConstraint(
                fields=["user", "game"], condition=Q(status="in_progress"), name="uniq_open_attempt"
            )
        ]


class AttemptAnswer(models.Model):
    attempt = models.ForeignKey(Attempt, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name="answers")
    answer = models.JSONField(default=dict)
    is_correct = models.BooleanField(default=False)
    points_awarded = models.PositiveSmallIntegerField(default=0)
    max_points = models.PositiveSmallIntegerField(default=0)
    answered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["attempt", "question"], name="uniq_answer_per_question")]


class UserAchievement(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="achievements")
    key = models.CharField(max_length=40)
    earned_at = models.DateTimeField(auto_now_add=True)
    attempt = models.ForeignKey(Attempt, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")

    class Meta:
        ordering = ["earned_at"]
        constraints = [models.UniqueConstraint(fields=["user", "key"], name="uniq_user_achievement")]
