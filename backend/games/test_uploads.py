import io

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase
from PIL import Image

from .uploads import optimize


def upload(size, fmt="JPEG", ext="jpg"):
    buf = io.BytesIO()
    Image.effect_noise(size, 60).convert("RGB").save(buf, fmt, **({"quality": 95} if fmt == "JPEG" else {}))
    f = SimpleUploadedFile(f"a.{ext}", buf.getvalue())
    f.ext = ext
    return f


class OptimizeTests(SimpleTestCase):
    def test_big_photo_is_shrunk(self):
        f = upload((3000, 2000))
        out = optimize(f)
        img = Image.open(io.BytesIO(out.read()))
        self.assertEqual(max(img.size), 1280)
        self.assertLess(out.size, f.size)

    def test_small_image_is_left_alone_or_not_bigger(self):
        f = upload((200, 100))
        out = optimize(f)
        data = out.read()
        self.assertLessEqual(len(data), f.size)
        self.assertEqual(Image.open(io.BytesIO(data)).size, (200, 100))

    def test_garbage_does_not_crash(self):
        f = SimpleUploadedFile("a.png", b"not an image")
        f.ext = "png"
        self.assertIs(optimize(f), f)
