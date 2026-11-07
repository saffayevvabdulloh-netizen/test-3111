from rest_framework import status
from rest_framework.exceptions import APIException


class Conflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "Конфликт состояния."
    default_code = "conflict"

    def __init__(self, code, detail, extra=None):
        super().__init__(detail=detail, code=code)
        self.code = code
        self.extra = extra or {}
        self.detail = {"code": code, "detail": str(detail), **self.extra}
