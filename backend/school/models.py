import secrets

from django.conf import settings
from django.db import IntegrityError, models, transaction

# no 0/O/1/I/L - kids type these codes by hand
JOIN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
JOIN_CODE_LENGTH = 6


def generate_join_code():
    return "".join(secrets.choice(JOIN_ALPHABET) for _ in range(JOIN_CODE_LENGTH))


class Classroom(models.Model):
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="classrooms")
    name = models.CharField(max_length=100)
    join_code = models.CharField(max_length=JOIN_CODE_LENGTH, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.join_code:
            return super().save(*args, **kwargs)
        for _ in range(10):  # collision-safe: unique constraint is the arbiter
            self.join_code = generate_join_code()
            try:
                from django.db import transaction

                with transaction.atomic():
                    return super().save(*args, **kwargs)
            except IntegrityError:
                self.join_code = ""
        raise RuntimeError("Could not generate a unique join code")

    def regenerate_code(self):
        for _ in range(10):
            self.join_code = generate_join_code()
            try:
                from django.db import transaction

                with transaction.atomic():
                    self.save(update_fields=["join_code"])
                return
            except IntegrityError:
                continue
        raise RuntimeError("Could not generate a unique join code")


class Enrollment(models.Model):
    classroom = models.ForeignKey(Classroom, on_delete=models.CASCADE, related_name="enrollments")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="enrollments")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["classroom", "student"], name="uniq_enrollment")]
        ordering = ["student__first_name", "student__username"]


# ---- child well-being + mini-game progress (shown to the child's teacher) -------------------------
MOODS = ("xursand", "uyqu", "xafa", "jahl", "qorq")  # happy, tired, sad, angry, scared
NEGATIVE_MOODS = ("xafa", "jahl", "qorq")


class MoodEntry(models.Model):
    """One mood per student per day (the latest tap of the day wins)."""

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="moods")
    day = models.DateField()
    mood = models.CharField(max_length=12, choices=[(m, m) for m in MOODS])
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["student", "day"], name="uniq_mood_per_day")]
        ordering = ["-day"]

    def __str__(self):
        return f"{self.student_id} {self.day} {self.mood}"


class ActivityProgress(models.Model):
    """Best result per mini game (activity ids come from the frontend registry, e.g. "shakl")."""

    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="activity_progress")
    activity = models.CharField(max_length=40)
    best_stars = models.PositiveSmallIntegerField(default=0)
    plays = models.PositiveIntegerField(default=0)
    last_mistakes = models.PositiveSmallIntegerField(default=0)
    last_played_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["student", "activity"], name="uniq_activity_progress")]
        ordering = ["activity"]

    def __str__(self):
        return f"{self.student_id} {self.activity} {self.best_stars}*"


# ---- parents <-> children ----------------------------------------------------------------------
class FamilyCode(models.Model):
    """Secret code a child (or the child's teacher) gives to a parent so the parent can link to the child.
    Linking by username would let anyone attach themselves to any child, so a code is required."""

    student = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="family_code")
    code = models.CharField(max_length=JOIN_CODE_LENGTH, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student_id}:{self.code}"

    @classmethod
    def for_student(cls, student):
        """The student's code, created on first use."""
        obj = cls.objects.filter(student=student).first()
        if obj:
            return obj
        for _ in range(10):
            try:
                with transaction.atomic():
                    obj, _created = cls.objects.get_or_create(student=student, defaults={"code": generate_join_code()})
                return obj
            except IntegrityError:  # code collision
                continue
        raise RuntimeError("Could not generate a unique family code")

    def regenerate(self):
        for _ in range(10):
            self.code = generate_join_code()
            try:
                with transaction.atomic():
                    self.save(update_fields=["code"])
                return self
            except IntegrityError:
                continue
        raise RuntimeError("Could not generate a unique family code")


class ParentLink(models.Model):
    parent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="child_links")
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="parent_links")
    linked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["parent", "student"], name="uniq_parent_link")]
        ordering = ["student__first_name", "student__username"]

    def __str__(self):
        return f"{self.parent_id}->{self.student_id}"
