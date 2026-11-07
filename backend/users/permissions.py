from rest_framework.permissions import BasePermission


class IsTeacher(BasePermission):
    message = "Только для учителей."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role == "teacher")


class IsStudent(BasePermission):
    message = "Только для учеников."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role == "student")


class IsParent(BasePermission):
    message = "Только для родителей."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.role == "parent")


class HasConsent(BasePermission):
    """Second line of defence for requests authenticated without a token (sessions, tests)."""

    def has_permission(self, request, view):
        from .authentication import check_consent

        u = request.user
        if u and u.is_authenticated:
            check_consent(u, view)
        return True
