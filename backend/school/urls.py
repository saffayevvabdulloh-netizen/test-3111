from django.urls import path

from . import views, wellbeing

urlpatterns = [
    path("classes/", views.ClassroomListCreateView.as_view(), name="class-list"),
    path("classes/join/", views.JoinClassView.as_view(), name="class-join"),
    path("classes/<int:pk>/", views.ClassroomDetailView.as_view(), name="class-detail"),
    path("classes/<int:pk>/regenerate-code/", views.RegenerateCodeView.as_view(), name="class-regenerate"),
    path("classes/<int:pk>/students/", views.ClassStudentsView.as_view(), name="class-students"),
    path("classes/<int:pk>/students/<int:student_id>/", views.ClassStudentRemoveView.as_view(), name="class-student-remove"),
    path("classes/<int:pk>/wellbeing/", wellbeing.ClassWellbeingView.as_view(), name="class-wellbeing"),
    path("me/mood/", wellbeing.MyMoodView.as_view(), name="my-mood"),
    path("me/activities/", wellbeing.MyActivitiesView.as_view(), name="my-activities"),
    path("me/family/", views.MyFamilyView.as_view(), name="my-family"),
    path("me/family/parents/<int:parent_id>/", views.MyParentRemoveView.as_view(), name="my-family-parent-remove"),
    path("parent/children/", views.ParentChildrenView.as_view(), name="parent-children"),
    path("parent/children/<int:student_id>/", views.ParentChildRemoveView.as_view(), name="parent-child-remove"),
    path("parent/children/<int:student_id>/export/", views.ParentChildExportView.as_view(), name="parent-child-export"),
    path("parent/children/<int:student_id>/erase/", views.ParentChildEraseView.as_view(), name="parent-child-erase"),
    path("me/classes/", views.MyClassesView.as_view(), name="my-classes"),
    path("me/classes/<int:pk>/", views.LeaveClassView.as_view(), name="my-class-leave"),
]
