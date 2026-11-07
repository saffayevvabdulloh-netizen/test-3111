from django.contrib import admin

from .models import Assignment, Attempt, AttemptAnswer, Game, Lesson, Question, UserAchievement

for m in (Lesson, Game, Question, Assignment, Attempt, AttemptAnswer, UserAchievement):
    admin.site.register(m)
