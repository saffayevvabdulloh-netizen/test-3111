import re

from django.conf import settings
from django.db import IntegrityError, transaction
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    class Meta:
        model = User
        fields = ["username", "password", "role", "first_name", "last_name"]
        extra_kwargs = {
            "first_name": {"required": False},
            "last_name": {"required": False},
        }

    def validate_username(self, value):
        # One canonical form: no outer spaces, lower case. "Ali" and "ali" are the same person.
        value = value.strip().lower()
        if len(value) < 3:
            raise serializers.ValidationError("Foydalanuvchi nomi kamida 3 ta belgidan iborat bo'lsin.")
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("Этот username уже занят.")
        return value

    def validate(self, attrs):
        probe = User(
            username=attrs.get("username", ""),
            first_name=attrs.get("first_name", ""),
            last_name=attrs.get("last_name", ""),
        )
        try:
            validate_password(attrs["password"], user=probe)
        except Exception as exc:  # DjangoValidationError
            raise serializers.ValidationError({"password": list(getattr(exc, "messages", [str(exc)]))})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        try:
            # Password is HASHED by create_user (the old code stored plain text).
            with transaction.atomic():
                return User.objects.create_user(
                    password=password,
                    is_active=not settings.REQUIRE_TELEGRAM_VERIFICATION,
                    **validated_data,
                )
        except IntegrityError:  # two requests with the same username raced past validate_username
            raise serializers.ValidationError({"username": ["Этот username уже занят."]})


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class VerifyCodeSerializer(serializers.Serializer):
    username = serializers.CharField()
    code = serializers.RegexField(r"^\d{6}$", max_length=6, min_length=6)


class TelegramLinkSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class PasswordResetConfirmSerializer(serializers.Serializer):
    username = serializers.CharField()
    code = serializers.RegexField(r"^\d{6}$", max_length=6, min_length=6)
    new_password = serializers.CharField(write_only=True, style={"input_type": "password"})


class LogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True)


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "role", "first_name", "last_name", "avatar"]


class MeSerializer(serializers.ModelSerializer):
    telegram_connected = serializers.SerializerMethodField()
    needs_consent = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "role", "first_name", "last_name", "avatar", "age",
            "telegram_connected", "created_at", "must_change_password", "needs_consent", "consent_at",
        ]
        read_only_fields = ["id", "username", "role", "created_at", "must_change_password", "needs_consent", "consent_at"]

    def get_needs_consent(self, obj) -> bool:
        return obj.consent_version != settings.CONSENT_VERSION

    def get_telegram_connected(self, obj) -> bool:
        return obj.telegram_id is not None

    def validate_age(self, value):
        if value is not None and not (3 <= value <= 100):
            raise serializers.ValidationError("Yosh 3 dan 100 gacha bo'lishi kerak.")
        return value

    def validate_avatar(self, value):
        if value and not re.fullmatch(r"[a-z0-9_-]{1,32}", value):
            raise serializers.ValidationError("Допустимы a-z, 0-9, _ и -, до 32 символов.")
        return value
