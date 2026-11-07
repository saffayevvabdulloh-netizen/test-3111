import io
import uuid

from django.conf import settings
from django.core.files.base import ContentFile
from rest_framework import serializers

EXT = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


class ImageUploadSerializer(serializers.Serializer):
    image = serializers.ImageField()

    def validate_image(self, f):
        if f.size > settings.MAX_IMAGE_UPLOAD_BYTES:
            mb = settings.MAX_IMAGE_UPLOAD_BYTES // (1024 * 1024)
            raise serializers.ValidationError(f"Файл слишком большой (максимум {mb} МБ).")
        fmt = getattr(getattr(f, "image", None), "format", None)
        if fmt not in settings.ALLOWED_IMAGE_FORMATS:
            raise serializers.ValidationError("Допустимы только JPEG, PNG или WEBP.")
        f.ext = EXT[fmt]
        return f


def optimize(uploaded, max_side=None):
    """Phones send 3-8 MB photos: shrink to a screen-sized, re-compressed copy so pages and games open fast.
    Falls back to the original upload if Pillow cannot process it."""
    max_side = max_side or getattr(settings, "IMAGE_MAX_SIDE", 1280)
    try:
        from PIL import Image, ImageOps

        uploaded.seek(0)
        img = ImageOps.exif_transpose(Image.open(uploaded))   # honour the phone's rotation, then drop EXIF (also removes GPS data)
        fmt = (img.format or "").upper() or {"jpg": "JPEG", "png": "PNG", "webp": "WEBP"}[uploaded.ext]
        fmt = fmt if fmt in EXT else {"jpg": "JPEG", "png": "PNG", "webp": "WEBP"}[uploaded.ext]
        img.thumbnail((max_side, max_side), Image.LANCZOS)
        buf = io.BytesIO()
        if fmt == "JPEG":
            img.convert("RGB").save(buf, "JPEG", quality=85, optimize=True, progressive=True)
        elif fmt == "PNG":
            img.save(buf, "PNG", optimize=True)
        else:
            img.save(buf, "WEBP", quality=85)
        if buf.tell() < getattr(uploaded, "size", 1 << 60):
            return ContentFile(buf.getvalue())
        uploaded.seek(0)
    except Exception:  # noqa: BLE001 - never fail an upload because of optimisation
        try:
            uploaded.seek(0)
        except Exception:  # noqa: BLE001
            pass
    return uploaded


def replace_image(instance, field_name, uploaded):
    """Save uploaded image (optimised) under a random name; drop the old file."""
    field = getattr(instance, field_name)
    if field:
        field.delete(save=False)
    field.save(f"{uuid.uuid4().hex}.{uploaded.ext}", optimize(uploaded), save=False)


def copy_image(src_field, dst_instance, field_name):
    if not src_field:
        return
    ext = src_field.name.rsplit(".", 1)[-1]
    getattr(dst_instance, field_name).save(f"{uuid.uuid4().hex}.{ext}", ContentFile(src_field.read()), save=False)
