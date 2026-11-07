from datetime import timedelta

from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from users.models import User

from .models import ActivityProgress, Classroom, Enrollment, MoodEntry

PW = "Str0ng!pass9"


def mk(username, role):
    return User.objects.create_user(username, password=PW, role=role, is_active=True)


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


class WellbeingTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.teacher, self.other_teacher = mk("ustoz", "teacher"), mk("ustoz2", "teacher")
        self.ali, self.vali, self.outsider = mk("ali", "student"), mk("vali", "student"), mk("tashqi", "student")
        self.cls = Classroom.objects.create(teacher=self.teacher, name="3-A")
        Enrollment.objects.create(classroom=self.cls, student=self.ali)
        Enrollment.objects.create(classroom=self.cls, student=self.vali)
        self.today = timezone.localdate()

    # ---- mood -------------------------------------------------------------------------------
    def test_mood_created_then_updated_same_day(self):
        c = client_for(self.ali)
        r = c.post("/api/v1/me/mood/", {"mood": "xafa"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["day"], self.today.isoformat())
        r = c.post("/api/v1/me/mood/", {"mood": "xursand"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(MoodEntry.objects.filter(student=self.ali).count(), 1)
        self.assertEqual(MoodEntry.objects.get(student=self.ali).mood, "xursand")

    def test_mood_validation(self):
        c = client_for(self.ali)
        self.assertEqual(c.post("/api/v1/me/mood/", {"mood": "dahshat"}, format="json").status_code, 400)
        for bad in (self.today - timedelta(days=8), self.today + timedelta(days=2)):
            r = c.post("/api/v1/me/mood/", {"mood": "xafa", "day": bad.isoformat()}, format="json")
            self.assertEqual(r.status_code, 400, bad)
        for good in (self.today - timedelta(days=7), self.today - timedelta(days=1), self.today + timedelta(days=1)):
            r = c.post("/api/v1/me/mood/", {"mood": "xafa", "day": good.isoformat()}, format="json")
            self.assertEqual(r.status_code, 201, good)

    def test_mood_list_is_only_my_own(self):
        MoodEntry.objects.create(student=self.vali, day=self.today, mood="jahl")
        client_for(self.ali).post("/api/v1/me/mood/", {"mood": "uyqu"}, format="json")
        r = client_for(self.ali).get("/api/v1/me/mood/?days=7")
        self.assertEqual([x["mood"] for x in r.data], ["uyqu"])

    def test_only_students_write_and_login_is_required(self):
        self.assertEqual(client_for(self.teacher).post("/api/v1/me/mood/", {"mood": "xafa"}, format="json").status_code, 403)
        self.assertIn(APIClient().post("/api/v1/me/mood/", {"mood": "xafa"}, format="json").status_code, (401, 403))

    # ---- activities -------------------------------------------------------------------------
    def test_activity_keeps_best_stars_and_counts_plays(self):
        c = client_for(self.ali)
        r = c.post("/api/v1/me/activities/", {"activity": "shakl", "stars": 2, "mistakes": 1}, format="json")
        self.assertEqual((r.status_code, r.data["best_stars"], r.data["plays"]), (201, 2, 1))
        r = c.post("/api/v1/me/activities/", {"activity": "shakl", "stars": 1, "mistakes": 4}, format="json")
        self.assertEqual((r.status_code, r.data["best_stars"], r.data["plays"]), (200, 2, 2))
        r = c.post("/api/v1/me/activities/", {"activity": "shakl", "stars": 3}, format="json")
        self.assertEqual((r.data["best_stars"], r.data["plays"]), (3, 3))
        self.assertEqual(ActivityProgress.objects.filter(student=self.ali).count(), 1)
        self.assertEqual(len(c.get("/api/v1/me/activities/").data), 1)

    def test_activity_validation(self):
        c = client_for(self.ali)
        for bad in ({"activity": "SHAKL!", "stars": 2}, {"activity": "shakl", "stars": 0}, {"activity": "shakl", "stars": 4},
                    {"activity": "", "stars": 1}, {"stars": 1}):
            self.assertEqual(c.post("/api/v1/me/activities/", bad, format="json").status_code, 400, bad)

    # ---- teacher view -----------------------------------------------------------------------
    def test_teacher_sees_only_own_class_students(self):
        MoodEntry.objects.create(student=self.ali, day=self.today, mood="xafa")
        MoodEntry.objects.create(student=self.outsider, day=self.today, mood="jahl")
        ActivityProgress.objects.create(student=self.ali, activity="shakl", best_stars=3, plays=2)
        ActivityProgress.objects.create(student=self.ali, activity="meva", best_stars=2, plays=1)
        r = client_for(self.teacher).get(f"/api/v1/classes/{self.cls.pk}/wellbeing/")
        self.assertEqual(r.status_code, 200)
        names = sorted(s["student"]["username"] for s in r.data["students"])
        self.assertEqual(names, ["ali", "vali"])  # the outsider never appears
        ali = next(s for s in r.data["students"] if s["student"]["username"] == "ali")
        self.assertEqual((ali["today_mood"], ali["stars_total"], ali["activities_played"]), ("xafa", 5, 2))
        vali = next(s for s in r.data["students"] if s["student"]["username"] == "vali")
        self.assertEqual((vali["today_mood"], vali["stars_total"], vali["moods"]), (None, 0, []))

    def test_other_teacher_and_students_are_blocked(self):
        url = f"/api/v1/classes/{self.cls.pk}/wellbeing/"
        self.assertEqual(client_for(self.other_teacher).get(url).status_code, 404)
        self.assertEqual(client_for(self.ali).get(url).status_code, 403)
        self.assertIn(APIClient().get(url).status_code, (401, 403))

    def test_negative_mood_counter_and_day_window(self):
        for back, mood in ((0, "xafa"), (1, "jahl"), (2, "xursand"), (3, "qorq"), (10, "xafa")):
            MoodEntry.objects.create(student=self.ali, day=self.today - timedelta(days=back), mood=mood)
        r = client_for(self.teacher).get(f"/api/v1/classes/{self.cls.pk}/wellbeing/?days=14")
        ali = next(s for s in r.data["students"] if s["student"]["username"] == "ali")
        self.assertEqual(ali["negative_last_7"], 3)  # the 10-day-old one is outside the 7-day window
        self.assertEqual(len(ali["moods"]), 5)
        r = client_for(self.teacher).get(f"/api/v1/classes/{self.cls.pk}/wellbeing/?days=3")
        ali = next(s for s in r.data["students"] if s["student"]["username"] == "ali")
        self.assertEqual(len(ali["moods"]), 3)

    def test_deleting_student_removes_their_data(self):
        MoodEntry.objects.create(student=self.ali, day=self.today, mood="xafa")
        ActivityProgress.objects.create(student=self.ali, activity="shakl", best_stars=1, plays=1)
        self.ali.delete()
        self.assertEqual(MoodEntry.objects.count() + ActivityProgress.objects.count(), 0)
