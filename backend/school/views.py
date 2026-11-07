from django.db import IntegrityError
from django.db.models import Count
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User
from users.serializer import UserBriefSerializer
from users.permissions import IsParent, IsStudent, IsTeacher
from users.throttles import JoinRateThrottle

from .models import Classroom, Enrollment, FamilyCode, ParentLink
from .serializers import (
    ClassroomSerializer,
    EnrollmentSerializer,
    JoinSerializer,
    ParentChildSerializer,
    StudentClassroomSerializer,
)


def teacher_classes(user):
    return (
        Classroom.objects.filter(teacher=user)
        .annotate(students_count=Count("enrollments"))
        .order_by("-created_at", "-id")  # aggregate queries drop Meta.ordering
    )


@extend_schema(tags=["Classes"])
class ClassroomListCreateView(generics.ListCreateAPIView):
    serializer_class = ClassroomSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        return teacher_classes(self.request.user)

    def perform_create(self, serializer):
        serializer.save(teacher=self.request.user)


@extend_schema(tags=["Classes"])
class ClassroomDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ClassroomSerializer
    permission_classes = [IsTeacher]
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_queryset(self):
        return teacher_classes(self.request.user)


@extend_schema(tags=["Classes"], request=None, responses=ClassroomSerializer)
class RegenerateCodeView(APIView):
    permission_classes = [IsTeacher]

    def post(self, request, pk):
        classroom = get_object_or_404(Classroom, pk=pk, teacher=request.user)
        classroom.regenerate_code()
        return Response(ClassroomSerializer(teacher_classes(request.user).get(pk=pk)).data)


@extend_schema(tags=["Classes"])
class ClassStudentsView(generics.ListAPIView):
    serializer_class = EnrollmentSerializer
    permission_classes = [IsTeacher]

    def get_queryset(self):
        get_object_or_404(Classroom, pk=self.kwargs["pk"], teacher=self.request.user)
        return Enrollment.objects.filter(classroom_id=self.kwargs["pk"]).select_related("student")


@extend_schema(tags=["Classes"], responses={204: None})
class ClassStudentRemoveView(APIView):
    permission_classes = [IsTeacher]

    def delete(self, request, pk, student_id):
        get_object_or_404(Classroom, pk=pk, teacher=request.user)
        deleted, _ = Enrollment.objects.filter(classroom_id=pk, student_id=student_id).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema(tags=["Student classes"], request=JoinSerializer, responses=StudentClassroomSerializer)
class JoinClassView(generics.GenericAPIView):
    serializer_class = JoinSerializer
    permission_classes = [IsStudent]
    throttle_classes = [JoinRateThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        classroom = Classroom.objects.filter(join_code=serializer.validated_data["code"]).select_related("teacher").first()
        if classroom is None:
            return Response({"code": ["Класс с таким кодом не найден."]}, status=status.HTTP_404_NOT_FOUND)
        try:
            _, created = Enrollment.objects.get_or_create(classroom=classroom, student=request.user)
        except IntegrityError:  # double click race: already enrolled
            created = False
        return Response(
            StudentClassroomSerializer(classroom).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


@extend_schema(tags=["Student classes"])
class MyClassesView(generics.ListAPIView):
    serializer_class = StudentClassroomSerializer
    permission_classes = [IsStudent]

    def get_queryset(self):
        return Classroom.objects.filter(enrollments__student=self.request.user).select_related("teacher")


@extend_schema(tags=["Student classes"], responses={204: None})
class LeaveClassView(APIView):
    permission_classes = [IsStudent]

    def delete(self, request, pk):
        deleted, _ = Enrollment.objects.filter(classroom_id=pk, student=request.user).delete()
        if not deleted:
            return Response(status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


# ---- parents <-> children ----------------------------------------------------------------------
@extend_schema(tags=["Family"])
class MyFamilyView(APIView):
    """Student: my family code (give it to a parent) and the parents already linked to me."""

    permission_classes = [IsStudent]

    def _payload(self, user):
        code = FamilyCode.for_student(user)
        parents = [l.parent for l in ParentLink.objects.filter(student=user).select_related("parent")]
        return {"code": code.code, "parents": UserBriefSerializer(parents, many=True).data}

    def get(self, request):
        return Response(self._payload(request.user))

    @extend_schema(request=None)
    def post(self, request):
        """New code (the old one stops working; already linked parents stay linked)."""
        FamilyCode.for_student(request.user).regenerate()
        return Response(self._payload(request.user))


@extend_schema(tags=["Family"], responses={204: None})
class MyParentRemoveView(APIView):
    permission_classes = [IsStudent]

    def delete(self, request, parent_id):
        deleted, _ = ParentLink.objects.filter(student=request.user, parent_id=parent_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT if deleted else status.HTTP_404_NOT_FOUND)


def parent_children(parent):
    from django.db.models import Prefetch

    return list(
        User.objects.filter(parent_links__parent=parent)
        .prefetch_related(Prefetch("enrollments", queryset=Enrollment.objects.select_related("classroom__teacher")))
        .order_by("first_name", "username")
    )


@extend_schema(tags=["Family"])
class ParentChildrenView(generics.GenericAPIView):
    """Parent: list my children / link a child with its family code."""

    permission_classes = [IsParent]
    serializer_class = JoinSerializer
    pagination_class = None

    def get_throttles(self):
        return [JoinRateThrottle()] if self.request.method == "POST" else []

    @extend_schema(responses=ParentChildSerializer(many=True))
    def get(self, request):
        return Response({"results": ParentChildSerializer(parent_children(request.user), many=True).data})

    @extend_schema(request=JoinSerializer, responses=ParentChildSerializer)
    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        fc = FamilyCode.objects.filter(code=serializer.validated_data["code"]).select_related("student").first()
        if fc is None or not fc.student.is_active:
            return Response({"code": ["Bunday kodli bola topilmadi."]}, status=status.HTTP_404_NOT_FOUND)
        try:
            _, created = ParentLink.objects.get_or_create(parent=request.user, student=fc.student)
        except IntegrityError:  # double click race
            created = False
        return Response(ParentChildSerializer(fc.student).data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@extend_schema(tags=["Family"], responses={204: None})
class ParentChildRemoveView(APIView):
    permission_classes = [IsParent]

    def delete(self, request, student_id):
        deleted, _ = ParentLink.objects.filter(parent=request.user, student_id=student_id).delete()
        return Response(status=status.HTTP_204_NO_CONTENT if deleted else status.HTTP_404_NOT_FOUND)


class _ParentChildPasswordSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)


@extend_schema(tags=["Family"], responses={200: None})
class ParentChildExportView(APIView):
    """The parent / guardian may get a copy of everything stored about his child."""

    permission_classes = [IsParent]

    def get(self, request, student_id):
        import json

        from django.http import HttpResponse

        from users import audit
        from users.privacy import export_user

        link = get_object_or_404(ParentLink.objects.select_related("student"), parent=request.user, student_id=student_id)
        audit.record(request, "child_data_export", user=request.user, detail=f"child={link.student.username}")
        resp = HttpResponse(json.dumps(export_user(link.student), ensure_ascii=False, indent=2), content_type="application/json; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="bola-malumotlari-{link.student.username}.json"'
        resp["Cache-Control"] = "no-store"
        return resp


@extend_schema(tags=["Family"], request=_ParentChildPasswordSerializer, responses={200: None})
class ParentChildEraseView(generics.GenericAPIView):
    """The parent / guardian may have his child's account and all its data erased (confirmed with the parent's password)."""

    permission_classes = [IsParent]
    serializer_class = _ParentChildPasswordSerializer
    throttle_classes = [JoinRateThrottle]

    def post(self, request, student_id):
        from users import audit
        from users.privacy import erase_user

        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        if not request.user.check_password(s.validated_data["password"]):
            return Response({"password": ["Parol noto'g'ri."]}, status=status.HTTP_400_BAD_REQUEST)
        link = get_object_or_404(ParentLink.objects.select_related("student"), parent=request.user, student_id=student_id)
        audit.record(request, "child_account_erased", user=request.user, detail=f"child={link.student.username}")
        return Response({"result": erase_user(link.student)})
