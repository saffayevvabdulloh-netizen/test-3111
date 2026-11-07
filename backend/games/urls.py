from django.urls import path

from . import views as v

urlpatterns = [
    path("game-types/", v.GameTypesView.as_view(), name="game-types"),
    # games / Game Creator
    path("games/", v.GameListCreateView.as_view(), name="game-list"),
    path("games/catalog/", v.GameCatalogView.as_view(), name="game-catalog"),
    path("games/<int:pk>/", v.GameDetailView.as_view(), name="game-detail"),
    path("games/<int:pk>/publish/", v.GameActionView.as_view(action="publish"), name="game-publish"),
    path("games/<int:pk>/unpublish/", v.GameActionView.as_view(action="unpublish"), name="game-unpublish"),
    path("games/<int:pk>/archive/", v.GameActionView.as_view(action="archive"), name="game-archive"),
    path("games/<int:pk>/duplicate/", v.GameActionView.as_view(action="duplicate"), name="game-duplicate"),
    path("games/<int:pk>/cover/", v.GameCoverView.as_view(), name="game-cover"),
    path("games/<int:pk>/preview/", v.GamePreviewView.as_view(), name="game-preview"),
    path("games/<int:pk>/preview/check/", v.GamePreviewCheckView.as_view(), name="game-preview-check"),
    path("games/<int:pk>/stats/", v.GameStatsView.as_view(), name="game-stats"),
    path("games/<int:game_id>/questions/", v.QuestionListCreateView.as_view(), name="question-list"),
    path("games/<int:game_id>/questions/reorder/", v.QuestionReorderView.as_view(), name="question-reorder"),
    path("games/<int:game_id>/questions/<int:pk>/", v.QuestionDetailView.as_view(), name="question-detail"),
    path("games/<int:game_id>/questions/<int:pk>/duplicate/", v.QuestionDuplicateView.as_view(), name="question-duplicate"),
    path("games/<int:game_id>/questions/<int:pk>/image/", v.QuestionImageView.as_view(), name="question-image"),
    # playing
    path("games/<int:pk>/attempts/", v.StartAttemptView.as_view(), name="attempt-start"),
    path("attempts/<int:pk>/", v.AttemptDetailView.as_view(), name="attempt-detail"),
    path("attempts/<int:pk>/answers/", v.AttemptAnswerView.as_view(), name="attempt-answer"),
    path("attempts/<int:pk>/complete/", v.AttemptCompleteView.as_view(), name="attempt-complete"),
    # student progress
    path("me/attempts/", v.MyAttemptsView.as_view(), name="my-attempts"),
    path("me/progress/", v.MyProgressView.as_view(), name="my-progress"),
    path("me/assignments/", v.MyAssignmentsView.as_view(), name="my-assignments"),
    # assignments + results
    path("classes/<int:pk>/assignments/", v.ClassAssignmentsView.as_view(), name="class-assignments"),
    path("classes/<int:pk>/results/", v.ClassResultsView.as_view(), name="class-results"),
    path("assignments/<int:pk>/", v.AssignmentDetailView.as_view(), name="assignment-detail"),
    path("assignments/<int:pk>/results/", v.AssignmentResultsView.as_view(), name="assignment-results"),
    # lessons
    path("lessons/", v.LessonListCreateView.as_view(), name="lesson-list"),
    path("lessons/<int:pk>/", v.LessonDetailView.as_view(), name="lesson-detail"),
    path("lessons/<int:pk>/publish/", v.LessonActionView.as_view(action="publish"), name="lesson-publish"),
    path("lessons/<int:pk>/unpublish/", v.LessonActionView.as_view(action="unpublish"), name="lesson-unpublish"),
    path("lessons/<int:pk>/archive/", v.LessonActionView.as_view(action="archive"), name="lesson-archive"),
    path("lessons/<int:pk>/cover/", v.LessonCoverView.as_view(), name="lesson-cover"),
]
