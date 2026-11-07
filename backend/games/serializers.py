from django.db import transaction
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from school.models import Classroom
from users.serializer import UserBriefSerializer

from .exceptions import Conflict
from .models import Assignment, Game, Lesson, Question
from .question_types import clean_config, get_type


def check_version(model, instance, validated):
    """Optimistic lock: client sends the `version` it loaded; mismatch -> 409."""
    expected = validated.pop("version", None)
    locked = model.objects.select_for_update().get(pk=instance.pk)
    if expected is not None and expected != locked.version:
        raise Conflict(
            "version_conflict",
            "Эти данные уже изменены в другом окне. Обновите страницу, чтобы не потерять чужие правки.",
            {"current_version": locked.version},
        )
    return locked


class QuestionSerializer(serializers.ModelSerializer):
    """Teacher view: includes answers inside `content`."""

    version = serializers.IntegerField(required=False, min_value=1)
    image = serializers.ImageField(read_only=True)

    class Meta:
        model = Question
        fields = ["id", "order", "prompt", "image", "hint", "explanation", "points", "content", "version"]
        read_only_fields = ["id", "order", "image"]

    def validate_prompt(self, v):
        v = v.strip()
        if not (1 <= len(v) <= 500):
            raise serializers.ValidationError("Текст вопроса: от 1 до 500 символов.")
        return v

    def validate_points(self, v):
        if not (1 <= v <= 100):
            raise serializers.ValidationError("Баллы: от 1 до 100.")
        return v

    def validate_content(self, value):
        game = self.context["game"]
        return get_type(game.game_type).clean(value)

    def update(self, instance, validated):
        with transaction.atomic():
            locked = check_version(Question, instance, validated)
            for k, v in validated.items():
                setattr(locked, k, v)
            locked.version += 1
            locked.save()
            return locked


class GameSerializer(serializers.ModelSerializer):
    """Owner view (Game Creator)."""

    version = serializers.IntegerField(required=False, min_value=1)
    cover = serializers.ImageField(read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    max_score = serializers.IntegerField(read_only=True)
    has_attempts = serializers.SerializerMethodField()
    questions = QuestionSerializer(many=True, read_only=True)
    lesson = serializers.PrimaryKeyRelatedField(queryset=Lesson.objects.all(), allow_null=True, required=False)

    class Meta:
        model = Game
        fields = [
            "id", "title", "description", "game_type", "subject", "config", "cover", "status",
            "is_public", "lesson", "version", "question_count", "max_score", "has_attempts",
            "questions", "published_at", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "published_at", "created_at", "updated_at"]

    def get_has_attempts(self, obj) -> bool:
        return obj.attempts.exists()

    def validate_title(self, v):
        v = v.strip()
        if not v:
            raise serializers.ValidationError("Название не может быть пустым.")
        return v

    def validate_config(self, v):
        return clean_config(v)

    def validate_lesson(self, lesson):
        if lesson is not None and lesson.owner_id != self.context["request"].user.id:
            raise serializers.ValidationError("Урок не найден.")
        return lesson

    def validate(self, attrs):
        if self.instance and "game_type" in attrs and attrs["game_type"] != self.instance.game_type:
            if self.instance.questions.exists():
                raise serializers.ValidationError(
                    {"game_type": ["Нельзя менять тип игры, пока в ней есть вопросы."]}
                )
        if not self.instance:
            attrs["config"] = clean_config(attrs.get("config"))
        return attrs

    def update(self, instance, validated):
        with transaction.atomic():
            locked = check_version(Game, instance, validated)
            for k, v in validated.items():
                setattr(locked, k, v)
            locked.version += 1
            locked.save()
            return locked


class GameSummarySerializer(serializers.ModelSerializer):
    """Teacher list rows."""

    cover = serializers.ImageField(read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    max_score = serializers.IntegerField(read_only=True)

    class Meta:
        model = Game
        fields = [
            "id", "title", "description", "game_type", "subject", "cover", "status", "is_public",
            "lesson", "question_count", "max_score", "version", "updated_at",
        ]


class GameCardSerializer(serializers.ModelSerializer):
    """Student / catalog view. Never contains questions or answers."""

    cover = serializers.ImageField(read_only=True)
    owner = UserBriefSerializer(read_only=True)
    question_count = serializers.IntegerField(read_only=True)
    max_score = serializers.IntegerField(read_only=True)
    time_limit_seconds = serializers.SerializerMethodField()
    my_attempts = serializers.IntegerField(read_only=True, required=False)
    my_best_percent = serializers.IntegerField(read_only=True, required=False, allow_null=True)

    class Meta:
        model = Game
        fields = [
            "id", "title", "description", "game_type", "subject", "cover", "owner", "lesson",
            "question_count", "max_score", "time_limit_seconds", "my_attempts", "my_best_percent",
            "updated_at",
        ]

    @extend_schema_field(OpenApiTypes.INT)
    def get_time_limit_seconds(self, obj):
        return (obj.config or {}).get("time_limit_seconds")


class LessonSerializer(serializers.ModelSerializer):
    version = serializers.IntegerField(required=False, min_value=1)
    cover = serializers.ImageField(read_only=True)

    class Meta:
        model = Lesson
        fields = [
            "id", "title", "summary", "body", "subject", "cover", "status", "is_public",
            "version", "published_at", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "status", "published_at", "created_at", "updated_at"]

    def validate_title(self, v):
        v = v.strip()
        if not v:
            raise serializers.ValidationError("Название не может быть пустым.")
        return v

    def validate_body(self, v):
        if len(v) > 20000:
            raise serializers.ValidationError("Текст урока слишком длинный (макс. 20000).")
        return v

    def update(self, instance, validated):
        with transaction.atomic():
            locked = check_version(Lesson, instance, validated)
            for k, v in validated.items():
                setattr(locked, k, v)
            locked.version += 1
            locked.save()
            return locked


class LessonCardSerializer(serializers.ModelSerializer):
    cover = serializers.ImageField(read_only=True)
    owner = UserBriefSerializer(read_only=True)

    class Meta:
        model = Lesson
        fields = ["id", "title", "summary", "body", "subject", "cover", "owner", "updated_at"]


class AssignmentSerializer(serializers.ModelSerializer):
    game_title = serializers.CharField(source="game.title", read_only=True)
    game = serializers.PrimaryKeyRelatedField(queryset=Game.objects.all())

    class Meta:
        model = Assignment
        fields = ["id", "classroom", "game", "game_title", "title", "due_at", "created_at"]
        read_only_fields = ["id", "classroom", "game_title", "created_at"]

    def validate_title(self, v):
        return v.strip()[:120]


class AssignmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = ["title", "due_at"]
