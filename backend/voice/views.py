from django.conf import settings
from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from users.throttles import TTSRateThrottle

from . import services


class TTSRequestSerializer(serializers.Serializer):
    text = serializers.CharField(trim_whitespace=True)

    def validate_text(self, value):
        value = services.normalize(value)
        if not value:
            raise serializers.ValidationError("Matn bo'sh bo'lmasligi kerak.")
        if len(value) > settings.TTS_MAX_CHARS:
            raise serializers.ValidationError(f"Matn juda uzun (ko'pi bilan {settings.TTS_MAX_CHARS} belgi).")
        return value


class TextToSpeechView(APIView):
    """POST {"text": "..."} -> audio/mpeg (Adam, ElevenLabs). Logged-in users only, rate limited."""

    throttle_classes = [TTSRateThrottle]

    @extend_schema(request=TTSRequestSerializer, responses={(200, "audio/mpeg"): OpenApiTypes.BINARY})
    def post(self, request):
        ser = TTSRequestSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        if not services.is_allowed(ser.validated_data["text"]):
            return Response({"error": "Bu matnni ovozga aylantirish mumkin emas.", "code": "tts_not_allowed"}, status=403)
        try:
            audio = services.synthesize(ser.validated_data["text"])
        except services.TTSError as e:
            return Response({"error": e.message, "code": e.code}, status=e.status)
        res = HttpResponse(audio, content_type="audio/mpeg")
        res["Cache-Control"] = "private, no-store"
        return res
