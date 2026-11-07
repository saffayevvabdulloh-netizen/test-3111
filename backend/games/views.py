import random
from datetime import datetime

from django.db import transaction
from django.db.models import Max, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_field, inline_serializer
from rest_framework import generics, serializers, status
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from school.models import Classroom, Enrollment
from users.permissions import IsStudent, IsTeacher

from . import reports, services
from .exceptions import Conflict
from .models import Assignment, Attempt, Game, Lesson, Question, Status
from .question_types import REGISTRY, get_type
from .serializers import (
    AssignmentSerializer,
    AssignmentUpdateSerializer,
    GameCardSerializer,
    GameSerializer,
    GameSummarySerializer,
    LessonCardSerializer,
    LessonSerializer,
    QuestionSerializer,
)
from .uploads import ImageUploadSerializer, copy_image, replace_image

MAX_QUESTIONS_PER_GAME = 50


# ------------------------------------------------------------------ helpers
def owner_games(user):
    return services.annotate_games(Game.objects.filter(owner=user)).prefetch_related("questions")


def owned_game_or_404(user, pk):
    return get_object_or_404(Game.objects.filter(owner=user), pk=pk)


def fresh_game_data(request, pk, context):
    return GameSerializer(owner_games(request.user).get(pk=pk), context=context).data


def touch(game):
    Game.objects.filter(pk=game.pk).update(updated_at=timezone.now())


def bump(model, obj, **fields):
    for k, v in fields.items():
        setattr(obj, k, v)
    obj.version += 1
    obj.save()


def filter_text(qs, request, *fields):
    s = request.query_params.get("search", "").strip()
    if s:
        cond = Q()
        for f in fields:
            cond |= Q(**{f"{f}__icontains": s})
        qs = qs.filter(cond)
    return qs


# ------------------------------------------------------------------ meta
@extend_schema(tags=["Games"], responses=inline_serializer("GameTypeInfo", {
    "key": serializers.CharField(), "label": serializers.CharField(), "description": serializers.CharField()}, many=True))
class GameTypesView(APIView):
    """Registry of game types (drives the Game Creator's first step)."""

    def get(self, request):
        return Response([{"key": t.key, "label": t.label, "description": t.description} for t in REGISTRY.values()])


# ------------------------------------------------------------------ games
@extend_schema(tags=["Games"], parameters=[
    OpenApiParameter("search", str), OpenApiParameter("status", str),
    OpenApiParameter("game_type", str), OpenApiParameter("subject", str), OpenApiParameter("lesson", int)])
class GameListCreateView(generics.ListCreateAPIView):
    """Teacher: my games (all statuses). Student: games I can play."""

    def get_permissions(self):
        return [IsTeacher()] if self.request.method == "POST" else [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == "POST" or getattr(self, "swagger_fake_view", False):
            return GameSerializer if self.request.method == "POST" else GameSummarySerializer
        return GameSummarySerializer if self.request.user.role == "teacher" else GameCardSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Game.objects.none()
        u, p = self.request.user, self.request.query_params
        if u.role == "teacher":
            qs = services.annotate_games(Game.objects.filter(owner=u))
            if p.get("status") in Status.values:
                qs = qs.filter(status=p["status"])
        else:
            qs = services.annotate_games(services.visible_games(u), u)
        if p.get("game_type"):
            qs = qs.filter(game_type=p["game_type"])
        if p.get("subject"):
            qs = qs.filter(subject__iexact=p["subject"])
        if p.get("lesson", "").isdigit():
            qs = qs.filter(lesson_id=int(p["lesson"]))
        return filter_text(qs, self.request, "title", "description")

    def create(self, request, *args, **kwargs):
        ctx = self.get_serializer_context()
        ser = GameSerializer(data=request.data, context=ctx)
        ser.is_valid(raise_exception=True)
        game = ser.save(owner=request.user)
        return Response(fresh_game_data(request, game.pk, ctx), status=status.HTTP_201_CREATED)


@extend_schema(tags=["Games"], parameters=[OpenApiParameter("search", str), OpenApiParameter("game_type", str)])
class GameCatalogView(generics.ListAPIView):
    serializer_class = GameCardSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Game.objects.none()
        u, p = self.request.user, self.request.query_params
        qs = services.annotate_games(services.visible_games(u), u)
        if p.get("game_type"):
            qs = qs.filter(game_type=p["game_type"])
        if p.get("subject"):
            qs = qs.filter(subject__iexact=p["subject"])
        return filter_text(qs, self.request, "title", "description")


class GameDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Owner: full Game Creator payload (with answers). Others: public card."""

    http_method_names = ["get", "patch", "delete", "head", "options"]
    is_owner = False

    def get_serializer_class(self):
        return GameSerializer if self.is_owner else GameCardSerializer

    def get_object(self):
        u, pk = self.request.user, self.kwargs["pk"]
        if u.role == "teacher":
            obj = owner_games(u).filter(pk=pk).first()
            if obj:
                self.is_owner = True
                return obj
        self.is_owner = False
        return get_object_or_404(services.annotate_games(services.visible_games(u), u), pk=pk)

    @extend_schema(tags=["Games"])
    def get(self, request, *a, **k):
        return super().get(request, *a, **k)

    @extend_schema(tags=["Games"], request=GameSerializer, responses=GameSerializer)
    def patch(self, request, *a, **k):
        return super().patch(request, *a, **k)

    @extend_schema(tags=["Games"], responses={204: None})
    def delete(self, request, *a, **k):
        return super().delete(request, *a, **k)

    def update(self, request, *args, **kwargs):
        game = self.get_object()
        if not self.is_owner:
            raise PermissionDenied("Только автор может изменять игру.")
        ctx = self.get_serializer_context()
        ser = GameSerializer(game, data=request.data, partial=True, context=ctx)
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(fresh_game_data(request, game.pk, ctx))

    def destroy(self, request, *args, **kwargs):
        game = self.get_object()
        if not self.is_owner:
            raise PermissionDenied("Только автор может удалить игру.")
        if game.attempts.exists():
            raise Conflict("game_has_attempts", "У игры есть попытки учеников — удалить нельзя. Переместите её в архив.")
        game.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


def publish_problems(game):
    qtype = get_type(game.game_type)
    qs = list(game.questions.all())
    if not qs:
        return [{"question_id": None, "errors": ["Добавьте хотя бы один вопрос."]}]
    problems = []
    for q in qs:
        try:
            qtype.clean(q.content)
        except ValidationError as exc:
            msgs = exc.detail if isinstance(exc.detail, list) else [exc.detail]
            problems.append({"question_id": q.pk, "errors": [str(m) for m in msgs]})
    return problems


class GameActionView(APIView):
    """publish / unpublish / archive / duplicate."""

    permission_classes = [IsTeacher]
    action = None

    @extend_schema(tags=["Games"], request=None, responses=GameSerializer)
    def post(self, request, pk):
        ctx = {"request": request}
        if self.action == "duplicate":
            return self.duplicate(request, pk, ctx)
        game = owned_game_or_404(request.user, pk)
        with transaction.atomic():
            game = Game.objects.select_for_update().get(pk=game.pk)
            if self.action == "publish":
                problems = publish_problems(game)
                if problems:
                    return Response(
                        {"code": "not_publishable", "detail": "Игру нельзя опубликовать — исправьте ошибки.", "problems": problems},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                bump(Game, game, status=Status.PUBLISHED, published_at=game.published_at or timezone.now())
            elif self.action == "unpublish":
                bump(Game, game, status=Status.DRAFT)
            elif self.action == "archive":
                bump(Game, game, status=Status.ARCHIVED)
        return Response(fresh_game_data(request, game.pk, ctx))

    @transaction.atomic
    def duplicate(self, request, pk, ctx):
        src = get_object_or_404(services.annotate_games(Game.objects.all()).filter(Q(owner=request.user) | Q(pk__in=services.visible_games(request.user).values("pk"))), pk=pk)
        copy = Game(
            owner=request.user,
            lesson=src.lesson if src.owner_id == request.user.id else None,
            title=f"{src.title[:100]} (копия)",
            description=src.description, game_type=src.game_type, subject=src.subject,
            config=src.config, is_public=src.is_public, status=Status.DRAFT,
        )
        copy_image(src.cover, copy, "cover")
        copy.save()
        for q in src.questions.all():
            nq = Question(game=copy, order=q.order, prompt=q.prompt, hint=q.hint, explanation=q.explanation,
                          points=q.points, content=q.content)
            copy_image(q.image, nq, "image")
            nq.save()
        return Response(fresh_game_data(request, copy.pk, ctx), status=status.HTTP_201_CREATED)


@extend_schema(tags=["Games"], request=ImageUploadSerializer, responses=GameSerializer)
class ImageUploadBase(APIView):
    permission_classes = [IsTeacher]
    parser_classes = [MultiPartParser, FormParser]


class GameCoverView(ImageUploadBase):
    def post(self, request, pk):
        game = owned_game_or_404(request.user, pk)
        ser = ImageUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        replace_image(game, "cover", ser.validated_data["image"])
        game.save(update_fields=["cover", "updated_at"])
        return Response(fresh_game_data(request, pk, {"request": request}))

    @extend_schema(tags=["Games"], request=None, responses=GameSerializer)
    def delete(self, request, pk):
        game = owned_game_or_404(request.user, pk)
        if game.cover:
            game.cover.delete(save=False)
            game.save(update_fields=["cover", "updated_at"])
        return Response(fresh_game_data(request, pk, {"request": request}))


# ------------------------------------------------------------------ questions
@extend_schema(tags=["Game Creator"])
class QuestionListCreateView(generics.ListCreateAPIView):
    serializer_class = QuestionSerializer
    permission_classes = [IsTeacher]
    pagination_class = None

    def get_game(self):
        return owned_game_or_404(self.request.user, self.kwargs["game_id"])

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if getattr(self, "swagger_fake_view", False):
            return ctx
        ctx["game"] = self.get_game()
        return ctx

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Question.objects.none()
        return self.get_game().questions.all()

    @transaction.atomic
    def perform_create(self, serializer):
        game = Game.objects.select_for_update().get(pk=self.get_game().pk)
        services.ensure_structure_editable(game)
        if game.questions.count() >= MAX_QUESTIONS_PER_GAME:
            raise ValidationError({"detail": f"Максимум {MAX_QUESTIONS_PER_GAME} вопросов в игре."})
        nxt = (game.questions.aggregate(m=Max("order"))["m"] or 0) + 1
        serializer.save(game=game, order=nxt)
        touch(game)


class QuestionBase:
    permission_classes = [IsTeacher]

    def get_question(self):
        game = owned_game_or_404(self.request.user, self.kwargs["game_id"])
        return game, get_object_or_404(Question, pk=self.kwargs["pk"], game=game)


@extend_schema(tags=["Game Creator"])
class QuestionDetailView(QuestionBase, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = QuestionSerializer
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_object(self):
        return self.get_question()[1]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        if not getattr(self, "swagger_fake_view", False):
            ctx["game"] = owned_game_or_404(self.request.user, self.kwargs["game_id"])
        return ctx

    def update(self, request, *args, **kwargs):
        game, q = self.get_question()
        services.ensure_structure_editable(game)
        ser = QuestionSerializer(q, data=request.data, partial=True, context=self.get_serializer_context())
        ser.is_valid(raise_exception=True)
        ser.save()
        touch(game)
        return Response(QuestionSerializer(Question.objects.get(pk=q.pk), context=self.get_serializer_context()).data)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        game, q = self.get_question()
        services.ensure_structure_editable(game)
        q.delete()
        for i, pk in enumerate(game.questions.values_list("pk", flat=True), 1):
            Question.objects.filter(pk=pk).update(order=i)
        touch(game)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Game Creator"], request=inline_serializer(
    "ReorderRequest", {"order": serializers.ListField(child=serializers.IntegerField())}),
    responses=QuestionSerializer(many=True))
class QuestionReorderView(APIView):
    permission_classes = [IsTeacher]

    @transaction.atomic
    def post(self, request, game_id):
        game = Game.objects.select_for_update().get(pk=owned_game_or_404(request.user, game_id).pk)
        services.ensure_structure_editable(game)
        order = request.data.get("order")
        ids = list(game.questions.values_list("pk", flat=True))
        if not isinstance(order, list) or sorted(order) != sorted(ids):
            raise ValidationError({"order": ["Передайте все id вопросов этой игры ровно по одному разу."]})
        for i, pk in enumerate(order, 1):
            Question.objects.filter(pk=pk).update(order=i)
        touch(game)
        return Response(QuestionSerializer(game.questions.all(), many=True, context={"request": request, "game": game}).data)


@extend_schema(tags=["Game Creator"], request=None, responses=QuestionSerializer)
class QuestionDuplicateView(QuestionBase, APIView):
    @transaction.atomic
    def post(self, request, game_id, pk):
        game, q = self.get_question()
        game = Game.objects.select_for_update().get(pk=game.pk)
        services.ensure_structure_editable(game)
        if game.questions.count() >= MAX_QUESTIONS_PER_GAME:
            raise ValidationError({"detail": f"Максимум {MAX_QUESTIONS_PER_GAME} вопросов в игре."})
        nq = Question(game=game, order=0, prompt=q.prompt, hint=q.hint, explanation=q.explanation,
                      points=q.points, content=q.content)
        copy_image(q.image, nq, "image")
        nq.save()
        ids = [x for x in game.questions.values_list("pk", flat=True) if x != nq.pk]
        ids.insert(ids.index(q.pk) + 1, nq.pk)  # right after the original
        for i, pk_ in enumerate(ids, 1):
            Question.objects.filter(pk=pk_).update(order=i)
        touch(game)
        return Response(QuestionSerializer(Question.objects.get(pk=nq.pk), context={"request": request, "game": game}).data,
                        status=status.HTTP_201_CREATED)


@extend_schema(tags=["Game Creator"], request=ImageUploadSerializer, responses=QuestionSerializer)
class QuestionImageView(QuestionBase, APIView):
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, game_id, pk):
        game, q = self.get_question()
        services.ensure_structure_editable(game)
        ser = ImageUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        replace_image(q, "image", ser.validated_data["image"])
        q.save(update_fields=["image", "updated_at"])
        touch(game)
        return Response(QuestionSerializer(q, context={"request": request, "game": game}).data)

    @extend_schema(tags=["Game Creator"], request=None, responses=QuestionSerializer)
    def delete(self, request, game_id, pk):
        game, q = self.get_question()
        services.ensure_structure_editable(game)
        if q.image:
            q.image.delete(save=False)
            q.save(update_fields=["image", "updated_at"])
        return Response(QuestionSerializer(q, context={"request": request, "game": game}).data)


@extend_schema(tags=["Game Creator"], responses=inline_serializer("PreviewResponse", {
    "game": serializers.DictField(), "questions": serializers.ListField(child=serializers.DictField())}))
class GamePreviewView(APIView):
    """Play a draft exactly like a student would - nothing is stored."""

    permission_classes = [IsTeacher]

    def get(self, request, pk):
        game = owned_game_or_404(request.user, pk)
        return Response(
            {
                "game": {"id": game.pk, "title": game.title, "game_type": game.game_type, "config": services.public_config(game)},
                "questions": services.play_questions(game, request, seed=random.random()),
            }
        )


class AnswerRequest(serializers.Serializer):
    question_id = serializers.IntegerField()
    answer = serializers.JSONField()


@extend_schema(tags=["Game Creator"], request=AnswerRequest)
class GamePreviewCheckView(generics.GenericAPIView):
    permission_classes = [IsTeacher]
    serializer_class = AnswerRequest

    def post(self, request, pk):
        game = owned_game_or_404(request.user, pk)
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        q = get_object_or_404(Question, pk=ser.validated_data["question_id"], game=game)
        fraction, points = services.grade(q, game, ser.validated_data["answer"])
        return Response(services.feedback(q, game, fraction, points))


@extend_schema(tags=["Teacher results"], responses=OpenApiTypes.OBJECT)
class GameStatsView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request, pk):
        return Response(reports.game_stats(owned_game_or_404(request.user, pk)))


# ------------------------------------------------------------------ playing
def attempt_play_payload(attempt, request):
    game = attempt.game
    return {
        "id": attempt.pk,
        "status": attempt.status,
        "game": {"id": game.pk, "title": game.title, "description": game.description,
                 "game_type": game.game_type, "config": services.public_config(game)},
        "assignment": attempt.assignment_id,
        "started_at": attempt.started_at,
        "deadline": services.deadline_for(attempt),
        "max_score": attempt.max_score,
        "questions": services.play_questions(game, request, seed=attempt.pk),
        "answered": [services.stored_feedback(a) for a in attempt.answers.select_related("question", "attempt__game")],
    }


class StartAttemptRequest(serializers.Serializer):
    assignment = serializers.IntegerField(required=False, allow_null=True)


@extend_schema(tags=["Play"], request=StartAttemptRequest)
class StartAttemptView(generics.GenericAPIView):
    permission_classes = [IsStudent]
    serializer_class = StartAttemptRequest

    def post(self, request, pk):
        game = get_object_or_404(services.visible_games(request.user), pk=pk)
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        assignment = None
        if ser.validated_data.get("assignment"):
            assignment = Assignment.objects.filter(
                pk=ser.validated_data["assignment"], game=game,
                classroom__enrollments__student=request.user,
            ).first()
            if assignment is None:
                raise ValidationError({"assignment": ["Такого задания для вас нет."]})
        if not game.questions.exists():
            raise ValidationError({"detail": "В этой игре пока нет вопросов."})
        attempt, created = services.start_attempt(request.user, game, assignment)
        return Response(
            attempt_play_payload(attempt, request),
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MyAttemptMixin:
    permission_classes = [IsStudent]

    def get_attempt(self, pk):
        return get_object_or_404(Attempt.objects.select_related("game"), pk=pk, user=self.request.user)


@extend_schema(tags=["Play"], responses=OpenApiTypes.OBJECT)
class AttemptDetailView(MyAttemptMixin, APIView):
    """In progress -> play payload (resume). Completed -> result."""

    def get(self, request, pk):
        attempt = self.get_attempt(pk)
        if attempt.status == Attempt.State.COMPLETED:
            return Response(services.result_payload(attempt))
        return Response(attempt_play_payload(attempt, request))


@extend_schema(tags=["Play"], request=AnswerRequest)
class AttemptAnswerView(MyAttemptMixin, generics.GenericAPIView):
    serializer_class = AnswerRequest

    def post(self, request, pk):
        attempt = self.get_attempt(pk)
        if attempt.status == Attempt.State.COMPLETED:
            raise Conflict("attempt_completed", "Эта попытка уже завершена.")
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        q = get_object_or_404(Question, pk=ser.validated_data["question_id"], game=attempt.game)
        fb, created = services.submit_answer(attempt, q, ser.validated_data["answer"])
        return Response(fb, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@extend_schema(tags=["Play"], request=None, responses=OpenApiTypes.OBJECT)
class AttemptCompleteView(MyAttemptMixin, APIView):
    def post(self, request, pk):
        attempt = self.get_attempt(pk)
        attempt, new = services.complete_attempt(attempt)
        return Response(services.result_payload(attempt, new))


class AttemptListSerializer(serializers.ModelSerializer):
    game = serializers.SerializerMethodField()

    class Meta:
        model = Attempt
        fields = ["id", "game", "assignment", "status", "score", "max_score", "percent", "started_at", "completed_at"]

    def get_game(self, obj) -> dict:
        return {"id": obj.game_id, "title": obj.game.title, "game_type": obj.game.game_type}


@extend_schema(tags=["Progress"], parameters=[OpenApiParameter("game", int), OpenApiParameter("status", str)])
class MyAttemptsView(generics.ListAPIView):
    serializer_class = AttemptListSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        qs = Attempt.objects.filter(user=self.request.user).select_related("game")
        p = self.request.query_params
        if p.get("game", "").isdigit():
            qs = qs.filter(game_id=int(p["game"]))
        if p.get("status") in Attempt.State.values:
            qs = qs.filter(status=p["status"])
        return qs


@extend_schema(tags=["Progress"], responses=OpenApiTypes.OBJECT)
class MyProgressView(APIView):
    permission_classes = [IsStudent]

    def get(self, request):
        return Response(services.progress_for(request.user))


# ------------------------------------------------------------------ assignments
def owned_class_or_404(user, pk):
    return get_object_or_404(Classroom, pk=pk, teacher=user)


@extend_schema(tags=["Assignments"])
class ClassAssignmentsView(generics.ListCreateAPIView):
    serializer_class = AssignmentSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Assignment.objects.none()
        owned_class_or_404(self.request.user, self.kwargs["pk"])
        return Assignment.objects.filter(classroom_id=self.kwargs["pk"]).select_related("game")

    def create(self, request, *args, **kwargs):
        classroom = owned_class_or_404(request.user, kwargs["pk"])
        ser = self.get_serializer(data=request.data)
        ser.is_valid(raise_exception=True)
        game = ser.validated_data["game"]
        allowed = Game.objects.filter(pk=game.pk, status=Status.PUBLISHED).filter(
            Q(owner=request.user) | Q(is_public=True)).exists()
        if not allowed:
            raise ValidationError({"game": ["Можно назначать только опубликованные игры (свои или публичные)."]})
        if ser.validated_data.get("due_at") and ser.validated_data["due_at"] < timezone.now():
            raise ValidationError({"due_at": ["Срок не может быть в прошлом."]})
        # unique(classroom, game): a double click returns the existing assignment
        obj, created = Assignment.objects.get_or_create(
            classroom=classroom, game=game,
            defaults={"created_by": request.user, "title": ser.validated_data.get("title", ""),
                      "due_at": ser.validated_data.get("due_at")},
        )
        return Response(self.get_serializer(obj).data, status=201 if created else 200)


@extend_schema(tags=["Assignments"])
class AssignmentDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsTeacher]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        return AssignmentUpdateSerializer if self.request.method == "PATCH" else AssignmentSerializer

    def get_queryset(self):
        return Assignment.objects.filter(classroom__teacher=self.request.user).select_related("game")

    def perform_update(self, serializer):
        due = serializer.validated_data.get("due_at")
        if due and due < timezone.now():
            raise ValidationError({"due_at": ["Срок не может быть в прошлом."]})
        serializer.save()


@extend_schema(tags=["Teacher results"], responses=OpenApiTypes.OBJECT)
class AssignmentResultsView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request, pk):
        a = get_object_or_404(Assignment.objects.select_related("classroom"), pk=pk, classroom__teacher=request.user)
        return Response(reports.assignment_results(a))


@extend_schema(tags=["Teacher results"], responses=OpenApiTypes.OBJECT)
class ClassResultsView(APIView):
    permission_classes = [IsTeacher]

    def get(self, request, pk):
        return Response(reports.class_results(owned_class_or_404(request.user, pk)))


class MyAssignmentSerializer(serializers.ModelSerializer):
    game = serializers.SerializerMethodField()
    classroom = serializers.SerializerMethodField()
    status = serializers.SerializerMethodField()
    best_percent = serializers.SerializerMethodField()
    attempts_completed = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = Assignment
        fields = ["id", "title", "due_at", "is_overdue", "game", "classroom", "status",
                  "best_percent", "attempts_completed", "created_at"]

    def _s(self, obj):
        return self.context["stats"].get(obj.pk, {"done": [], "open": False})

    def get_game(self, obj) -> dict:
        req = self.context["request"]
        return {"id": obj.game_id, "title": obj.game.title, "game_type": obj.game.game_type,
                "cover": req.build_absolute_uri(obj.game.cover.url) if obj.game.cover else None}

    def get_classroom(self, obj) -> dict:
        return {"id": obj.classroom_id, "name": obj.classroom.name}

    def get_status(self, obj) -> str:
        s = self._s(obj)
        return "completed" if s["done"] else ("in_progress" if s["open"] else "not_started")

    @extend_schema_field(OpenApiTypes.INT)
    def get_best_percent(self, obj):
        done = self._s(obj)["done"]
        return max(done) if done else None

    def get_attempts_completed(self, obj) -> int:
        return len(self._s(obj)["done"])

    def get_is_overdue(self, obj) -> bool:
        return bool(obj.due_at and obj.due_at < timezone.now() and not self._s(obj)["done"])


@extend_schema(tags=["Progress"])
class MyAssignmentsView(generics.ListAPIView):
    serializer_class = MyAssignmentSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return Assignment.objects.filter(
            classroom__enrollments__student=self.request.user, game__status=Status.PUBLISHED
        ).select_related("game", "classroom")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        stats = {}
        for a in Attempt.objects.filter(user=self.request.user, assignment__isnull=False):
            s = stats.setdefault(a.assignment_id, {"done": [], "open": False})
            if a.status == Attempt.State.COMPLETED:
                s["done"].append(a.percent)
            else:
                s["open"] = True
        ctx["stats"] = stats
        return ctx


# ------------------------------------------------------------------ lessons
def visible_lessons(user):
    from django.db.models import Exists, OuterRef

    qs = Lesson.objects.filter(status=Status.PUBLISHED)
    if user.role == "teacher":
        return qs.filter(Q(is_public=True) | Q(owner=user))
    teaches_me = Enrollment.objects.filter(student=user, classroom__teacher=OuterRef("owner_id"))
    return qs.filter(Q(is_public=True) | Exists(teaches_me))


@extend_schema(tags=["Lessons"], parameters=[OpenApiParameter("search", str), OpenApiParameter("status", str)])
class LessonListCreateView(generics.ListCreateAPIView):
    def get_permissions(self):
        return [IsTeacher()] if self.request.method == "POST" else [IsAuthenticated()]

    def get_serializer_class(self):
        if self.request.method == "POST" or getattr(self, "swagger_fake_view", False):
            return LessonSerializer
        return LessonSerializer if self.request.user.role == "teacher" else LessonCardSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Lesson.objects.none()
        u = self.request.user
        if u.role == "teacher":
            qs = Lesson.objects.filter(owner=u)
            if self.request.query_params.get("status") in Status.values:
                qs = qs.filter(status=self.request.query_params["status"])
        else:
            qs = visible_lessons(u).select_related("owner")
            if self.request.query_params.get("subject"):
                qs = qs.filter(subject__iexact=self.request.query_params["subject"])
        return filter_text(qs, self.request, "title", "summary")

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class LessonDetailView(generics.RetrieveUpdateDestroyAPIView):
    http_method_names = ["get", "patch", "delete", "head", "options"]
    is_owner = False

    def get_serializer_class(self):
        return LessonSerializer if self.is_owner else LessonCardSerializer

    def get_object(self):
        u, pk = self.request.user, self.kwargs["pk"]
        if u.role == "teacher":
            obj = Lesson.objects.filter(owner=u, pk=pk).first()
            if obj:
                self.is_owner = True
                return obj
        self.is_owner = False
        return get_object_or_404(visible_lessons(u).select_related("owner"), pk=pk)

    @extend_schema(tags=["Lessons"])
    def get(self, request, *a, **k):
        resp = super().get(request, *a, **k)
        if not self.is_owner:  # students also get the games attached to the lesson
            games = services.annotate_games(services.visible_games(request.user).filter(lesson_id=self.kwargs["pk"]), request.user)
            resp.data["games"] = GameCardSerializer(games, many=True, context=self.get_serializer_context()).data
        return resp

    @extend_schema(tags=["Lessons"], request=LessonSerializer, responses=LessonSerializer)
    def patch(self, request, *a, **k):
        return super().patch(request, *a, **k)

    @extend_schema(tags=["Lessons"], responses={204: None})
    def delete(self, request, *a, **k):
        return super().delete(request, *a, **k)

    def update(self, request, *args, **kwargs):
        self.get_object()
        if not self.is_owner:  # public lessons are readable by others, never writable
            raise PermissionDenied("Только автор может изменять урок.")
        ser = LessonSerializer(self.get_object(), data=request.data, partial=True, context=self.get_serializer_context())
        ser.is_valid(raise_exception=True)
        ser.save()
        return Response(LessonSerializer(Lesson.objects.get(pk=kwargs["pk"]), context=self.get_serializer_context()).data)

    def destroy(self, request, *args, **kwargs):
        obj = self.get_object()
        if not self.is_owner:
            raise PermissionDenied("Только автор может удалить урок.")
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LessonActionView(APIView):
    permission_classes = [IsTeacher]
    action = None

    @extend_schema(tags=["Lessons"], request=None, responses=LessonSerializer)
    def post(self, request, pk):
        with transaction.atomic():
            lesson = get_object_or_404(Lesson.objects.select_for_update(), pk=pk, owner=request.user)
            if self.action == "publish":
                if not lesson.body.strip() and not lesson.summary.strip():
                    raise ValidationError({"detail": "Добавьте текст урока перед публикацией."})
                bump(Lesson, lesson, status=Status.PUBLISHED, published_at=lesson.published_at or timezone.now())
            elif self.action == "unpublish":
                bump(Lesson, lesson, status=Status.DRAFT)
            else:
                bump(Lesson, lesson, status=Status.ARCHIVED)
        return Response(LessonSerializer(lesson, context={"request": request}).data)


@extend_schema(tags=["Lessons"], request=ImageUploadSerializer, responses=LessonSerializer)
class LessonCoverView(APIView):
    permission_classes = [IsTeacher]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, pk):
        lesson = get_object_or_404(Lesson, pk=pk, owner=request.user)
        ser = ImageUploadSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        replace_image(lesson, "cover", ser.validated_data["image"])
        lesson.save(update_fields=["cover", "updated_at"])
        return Response(LessonSerializer(lesson, context={"request": request}).data)

    @extend_schema(tags=["Lessons"], request=None, responses=LessonSerializer)
    def delete(self, request, pk):
        lesson = get_object_or_404(Lesson, pk=pk, owner=request.user)
        if lesson.cover:
            lesson.cover.delete(save=False)
            lesson.save(update_fields=["cover", "updated_at"])
        return Response(LessonSerializer(lesson, context={"request": request}).data)
