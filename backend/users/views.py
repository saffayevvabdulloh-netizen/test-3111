from django.contrib.auth.models import update_last_login
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import generics, serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from . import audit, services
from .models import User, VerificationCode
from .serializer import (
    ChangePasswordSerializer,
    LoginSerializer,
    LogoutSerializer,
    MeSerializer,
    PasswordResetConfirmSerializer,
    RegisterSerializer,
    TelegramLinkSerializer,
    UserBriefSerializer,
    VerifyCodeSerializer,
)
from django.conf import settings

from .throttles import AuthRateThrottle, LoginIPThrottle, LoginUserThrottle, RegisterRateThrottle, StatusRateThrottle

BAD_CODE = "Неверный или просроченный код."
BAD_CREDENTIALS = "Неверный username или password"


def _user_payload(user):
    return UserBriefSerializer(user).data


_DUMMY_HASH = None


def _check_password_or_none(username, password):
    global _DUMMY_HASH
    user = services.find_user(username)
    if user is not None and user.check_password(password):
        return user
    if user is None:
        # same work as a real check: the response time must not reveal which usernames exist
        from django.contrib.auth.hashers import check_password, make_password
        if _DUMMY_HASH is None:
            _DUMMY_HASH = make_password("dummy-password-for-timing")
        check_password(password, _DUMMY_HASH)
    return None


class PublicAuthView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [AuthRateThrottle]


@extend_schema(tags=["Auth"])
class RegisterView(PublicAuthView):
    serializer_class = RegisterSerializer
    # separate, roomier limit: a class / clinic registers many children from one IP
    throttle_classes = [RegisterRateThrottle]

    def post(self, request):
        if not settings.ALLOW_REGISTRATION:
            return Response(
                {"error": "Ro'yxatdan o'tish yopiq. Hisobni administrator ochib beradi.", "code": "registration_closed"},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {
                "message": "Регистрация успешна",
                "user": {"username": user.username, "role": user.role},
                "needs_telegram_verification": not user.is_active,
                "telegram_link": services.telegram_link_for(user),
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Auth"])
class LoginView(PublicAuthView):
    serializer_class = LoginSerializer
    throttle_classes = [LoginIPThrottle, LoginUserThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = _check_password_or_none(
            serializer.validated_data["username"], serializer.validated_data["password"]
        )
        if user is None:
            audit.record(request, "login_failed", username=serializer.validated_data["username"].strip().lower())
            return Response({"error": BAD_CREDENTIALS}, status=status.HTTP_400_BAD_REQUEST)
        if not user.is_active and not (settings.ALLOW_REGISTRATION and settings.REQUIRE_TELEGRAM_VERIFICATION):
            # admin-managed accounts: an inactive one was switched off by the administrator
            return Response(
                {"error": "Hisob o'chirilgan. Administratorga murojaat qiling.", "code": "account_disabled"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not user.is_active:
            return Response(
                {
                    "error": "Подтвердите Telegram",
                    "code": "telegram_not_verified",
                    "telegram_link": services.telegram_link_for(user),
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        update_last_login(None, user)
        audit.record(request, "login", user=user)
        refresh = RefreshToken.for_user(user)
        return Response(
            {"access": str(refresh.access_token), "refresh": str(refresh), "user": _user_payload(user)}
        )


@extend_schema(tags=["Auth"])
class TokenRefreshThrottledView(TokenRefreshView):
    throttle_classes = [AuthRateThrottle]


@extend_schema(tags=["Auth"], responses={205: OpenApiResponse(description="Refresh token revoked")})
class LogoutView(generics.GenericAPIView):
    consent_exempt = True
    serializer_class = LogoutSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            token = RefreshToken(serializer.validated_data["refresh"])
            if token.get("user_id") != str(request.user.pk) and token.get("user_id") != request.user.pk:
                return Response({"error": "Токен принадлежит другому пользователю"}, status=400)
            token.blacklist()
        except TokenError:
            return Response({"error": "Недействительный токен"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


@extend_schema(tags=["Auth"])
class VerifyCodeView(PublicAuthView):
    serializer_class = VerifyCodeSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        user = services.find_user(d["username"])
        if user is None or not services.check_code(user, VerificationCode.CodeType.REGISTER, d["code"]):
            return Response({"code": [BAD_CODE]}, status=status.HTTP_400_BAD_REQUEST)
        user.is_active = True
        # the one-time link must not be reusable after success
        import uuid
        user.telegram_token = uuid.uuid4()
        user.save(update_fields=["is_active", "telegram_token"])
        return Response({"message": "Код успешно подтверждён"}, status=status.HTTP_200_OK)


@extend_schema(
    tags=["Auth"],
    responses=inline_serializer(
        "TelegramLinkResponse",
        {"telegram_link": serializers.CharField(), "verified": serializers.BooleanField()},
    ),
)
class TelegramLinkView(PublicAuthView):
    """Re-fetch the Telegram deep link (needs the account password)."""

    serializer_class = TelegramLinkSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        user = _check_password_or_none(d["username"], d["password"])
        if user is None:
            return Response({"error": BAD_CREDENTIALS}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"telegram_link": services.telegram_link_for(user), "verified": user.is_active})


@extend_schema(tags=["Auth"])
class PasswordResetConfirmView(PublicAuthView):
    """Step 2 of reset. Step 1: send /reset to the bot from the linked Telegram."""

    serializer_class = PasswordResetConfirmSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        user = services.find_user(d["username"], is_active=True)
        if user is None or not services.check_code(user, VerificationCode.CodeType.RESET_PASSWORD, d["code"]):
            return Response({"code": [BAD_CODE]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(d["new_password"], user=user)
        except DjangoValidationError as exc:
            # code is already consumed; user asks the bot for a new one
            return Response({"new_password": list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(d["new_password"])
        user.save(update_fields=["password"])
        _revoke_all_refresh_tokens(user)
        return Response({"message": "Пароль изменён"})


def _revoke_all_refresh_tokens(user):
    for t in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=t)


@extend_schema(tags=["Profile"])
class MeView(generics.RetrieveUpdateAPIView):
    consent_exempt = True
    serializer_class = MeSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return self.request.user


@extend_schema(tags=["Profile"], responses={200: OpenApiResponse(description="Password changed")})
class ChangePasswordView(generics.GenericAPIView):
    consent_exempt = True
    serializer_class = ChangePasswordSerializer
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data
        if not request.user.check_password(d["current_password"]):
            return Response({"current_password": ["Неверный текущий пароль."]}, status=400)
        try:
            validate_password(d["new_password"], user=request.user)
        except DjangoValidationError as exc:
            return Response({"new_password": list(exc.messages)}, status=400)
        if d["new_password"] == d["current_password"]:
            return Response({"new_password": ["Yangi parol eskisidan farq qilsin."]}, status=400)
        request.user.set_password(d["new_password"])
        request.user.must_change_password = False
        request.user.save(update_fields=["password", "must_change_password"])
        _revoke_all_refresh_tokens(request.user)
        audit.record(request, "password_changed", user=request.user)
        return Response({"message": "Parol o'zgartirildi. Qaytadan kiring."})


@extend_schema(tags=["Auth"], responses={200: inline_serializer("BotStatus", {
    "required": serializers.BooleanField(), "state": serializers.CharField(), "connected": serializers.BooleanField(),
    "bot_username": serializers.CharField(), "age_seconds": serializers.IntegerField(allow_null=True)})})
class BotStatusView(PublicAuthView):
    """Is the Telegram verification bot alive? (the sign-up page shows this and explains what to do)"""

    throttle_classes = [StatusRateThrottle]

    def get(self, request):
        return Response(services.bot_status())


@extend_schema(tags=["Auth"], responses={200: inline_serializer("PublicConfig", {"registration_open": serializers.BooleanField(), "consent_version": serializers.CharField(), "age_label": serializers.CharField(), "legal": serializers.DictField()})})
class PublicConfigView(PublicAuthView):
    """What the login/landing pages need to know before anybody is signed in."""

    throttle_classes = [StatusRateThrottle]

    def get(self, request):
        resp = Response({
            "registration_open": bool(settings.ALLOW_REGISTRATION), "consent_version": settings.CONSENT_VERSION,
            "age_label": settings.AGE_LABEL, "legal": settings.LEGAL,
        })
        resp["Cache-Control"] = "public, max-age=60"
        return resp


# ---- privacy: consent, copy of my data, erase my account --------------------------------------------
class ConsentSerializer(serializers.Serializer):
    accept = serializers.BooleanField()
    version = serializers.CharField(required=False, allow_blank=True)


@extend_schema(tags=["Privacy"], request=ConsentSerializer)
class ConsentView(generics.GenericAPIView):
    """The person (for a child: the parent / guardian) accepts the current privacy policy."""

    consent_exempt = True
    serializer_class = ConsentSerializer

    def post(self, request):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        if not s.validated_data["accept"]:
            return Response({"accept": ["Davom etish uchun rozilik kerak."]}, status=400)
        if s.validated_data.get("version") not in (None, "", settings.CONSENT_VERSION):
            return Response({"version": ["Siyosat yangilangan. Sahifani yangilang."]}, status=409)
        from django.utils import timezone

        u = request.user
        u.consent_version, u.consent_at = settings.CONSENT_VERSION, timezone.now()
        u.save(update_fields=["consent_version", "consent_at"])
        audit.record(request, "consent_given", user=u, detail=settings.CONSENT_VERSION)
        return Response(MeSerializer(u).data)


@extend_schema(tags=["Privacy"], responses={200: OpenApiResponse(description="JSON file with all my data")})
class MyDataExportView(APIView):
    consent_exempt = True

    def get(self, request):
        import json

        from django.http import HttpResponse

        from .privacy import export_user

        audit.record(request, "data_export", user=request.user)
        body = json.dumps(export_user(request.user), ensure_ascii=False, indent=2)
        resp = HttpResponse(body, content_type="application/json; charset=utf-8")
        resp["Content-Disposition"] = f'attachment; filename="mening-malumotlarim-{request.user.username}.json"'
        resp["Cache-Control"] = "no-store"
        return resp


class PasswordConfirmSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True)


@extend_schema(tags=["Privacy"], request=PasswordConfirmSerializer, responses={200: OpenApiResponse(description="Account erased")})
class DeleteAccountView(generics.GenericAPIView):
    """Erase my account and my data. Children cannot do it alone: the parent / guardian (or the administrator) does."""

    consent_exempt = True
    serializer_class = PasswordConfirmSerializer
    throttle_classes = [AuthRateThrottle]

    def post(self, request):
        s = self.get_serializer(data=request.data)
        s.is_valid(raise_exception=True)
        u = request.user
        if u.role == User.Role.STUDENT:
            return Response({"error": "Bola hisobini ota-onasi yoki administrator o'chiradi."}, status=403)
        if not u.check_password(s.validated_data["password"]):
            return Response({"password": ["Parol noto'g'ri."]}, status=400)
        from .privacy import erase_user

        audit.record(request, "account_erased", user=u, username=u.username)
        return Response({"result": erase_user(u)})
