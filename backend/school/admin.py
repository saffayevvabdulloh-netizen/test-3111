from django.contrib import admin

from .models import ActivityProgress, Classroom, Enrollment, FamilyCode, MoodEntry, ParentLink

admin.site.register(Classroom)
admin.site.register(Enrollment)
admin.site.register(MoodEntry)
admin.site.register(ActivityProgress)
admin.site.register(FamilyCode)
admin.site.register(ParentLink)
