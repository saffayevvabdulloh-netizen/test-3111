from rest_framework import serializers

from users.models import User
from users.serializer import UserBriefSerializer

from .models import Classroom, Enrollment


class ClassroomSerializer(serializers.ModelSerializer):
    students_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Classroom
        fields = ["id", "name", "join_code", "students_count", "created_at"]
        read_only_fields = ["id", "join_code", "students_count", "created_at"]

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Название не может быть пустым.")
        return value


class StudentClassroomSerializer(serializers.ModelSerializer):
    """What a student sees about a class they joined (no join code)."""

    teacher = UserBriefSerializer(read_only=True)

    class Meta:
        model = Classroom
        fields = ["id", "name", "teacher", "created_at"]


class EnrollmentSerializer(serializers.ModelSerializer):
    student = UserBriefSerializer(read_only=True)

    class Meta:
        model = Enrollment
        fields = ["id", "student", "joined_at"]


class JoinSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=12)

    def validate_code(self, value):
        return value.strip().upper()


class ParentChildSerializer(serializers.ModelSerializer):
    """A parent's view of a linked child: who they are and which teachers/classes they are with."""

    classes = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "first_name", "last_name", "avatar", "age", "classes"]

    def get_classes(self, obj) -> list:
        # `enrollments` is prefetched by the view (one query for all children instead of one per child)
        return [{"id": e.classroom.id, "name": e.classroom.name, "teacher": UserBriefSerializer(e.classroom.teacher).data}
                for e in obj.enrollments.all()]
