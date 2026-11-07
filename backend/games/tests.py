import io
import json
import shutil
import tempfile
from datetime import timedelta

from django.core.cache import cache
from django.test import override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient, APITestCase

from games.models import Attempt, Game
from users.models import User

PW = "Str0ng!pass9"
QUIZ_Q = {"prompt": "2 + 2 = ?", "hint": "Count on fingers", "explanation": "Two pairs make four",
          "points": 10, "content": {"options": [{"text": "3"}, {"text": "4", "is_correct": True}, {"text": "5"}]}}


def mk(username, role):
    return User.objects.create_user(username, password=PW, role=role, is_active=True)


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


def new_game(c, game_type="quiz", **extra):
    r = c.post("/api/v1/games/", {"title": "My game", "game_type": game_type, **extra}, format="json")
    assert r.status_code == 201, r.data
    return r.data


def add_q(c, gid, payload):
    r = c.post(f"/api/v1/games/{gid}/questions/", payload, format="json")
    assert r.status_code == 201, r.data
    return r.data


def published_quiz(c, n=2):
    g = new_game(c)
    for _ in range(n):
        add_q(c, g["id"], QUIZ_Q)
    r = c.post(f"/api/v1/games/{g['id']}/publish/")
    assert r.status_code == 200, r.data
    return r.data


def correct_option(question):
    return [o["id"] for o in question["content"]["options"] if o["is_correct"]]


class Base(APITestCase):
    def setUp(self):
        cache.clear()
        self.teacher = mk("teach", "teacher")
        self.teacher2 = mk("teach2", "teacher")
        self.student = mk("kid", "student")
        self.student2 = mk("kid2", "student")
        self.t = client_for(self.teacher)
        self.t2 = client_for(self.teacher2)
        self.s = client_for(self.student)
        self.s2 = client_for(self.student2)


class GameCreatorTests(Base):
    def test_game_types_registry(self):
        r = self.t.get("/api/v1/game-types/")
        self.assertEqual({x["key"] for x in r.data}, {"quiz", "true_false", "matching", "fill_blank"})

    def test_only_teachers_create(self):
        r = self.s.post("/api/v1/games/", {"title": "x", "game_type": "quiz"}, format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(self.client.post("/api/v1/games/", {}, format="json").status_code, 401)

    def test_create_validates_type_and_config(self):
        self.assertEqual(self.t.post("/api/v1/games/", {"title": "x", "game_type": "nope"}, format="json").status_code, 400)
        self.assertEqual(self.t.post("/api/v1/games/", {"title": "  ", "game_type": "quiz"}, format="json").status_code, 400)
        bad = self.t.post("/api/v1/games/", {"title": "x", "game_type": "quiz", "config": {"time_limit_seconds": 1}}, format="json")
        self.assertEqual(bad.status_code, 400)
        bad = self.t.post("/api/v1/games/", {"title": "x", "game_type": "quiz", "config": {"hax": 1}}, format="json")
        self.assertEqual(bad.status_code, 400)
        g = new_game(self.t)
        self.assertEqual(g["status"], "draft")
        self.assertEqual(g["config"]["reveal_answers"], True)  # defaults filled
        self.assertEqual((g["question_count"], g["max_score"]), (0, 0))

    def test_question_validation_per_type(self):
        quiz = new_game(self.t)["id"]
        url = f"/api/v1/games/{quiz}/questions/"
        def post(content, **kw):
            return self.t.post(url, {"prompt": "Q?", "content": content, **kw}, format="json").status_code
        self.assertEqual(post({"options": [{"text": "a", "is_correct": True}]}), 400)                    # <2 options
        self.assertEqual(post({"options": [{"text": "a"}, {"text": "b"}]}), 400)                          # none correct
        self.assertEqual(post({"options": [{"text": "a", "is_correct": True}, {"text": "A"}]}), 400)      # duplicate
        self.assertEqual(post({"options": [{"text": "a", "is_correct": True}, {"text": "b"}]}, points=0), 400)
        self.assertEqual(post({"options": [{"text": "a", "is_correct": True}, {"text": "b"}]}), 201)

        tf = new_game(self.t, "true_false")["id"]
        self.assertEqual(self.t.post(f"/api/v1/games/{tf}/questions/", {"prompt": "Sky is blue", "content": {"correct": "yes"}}, format="json").status_code, 400)
        self.assertEqual(self.t.post(f"/api/v1/games/{tf}/questions/", {"prompt": "Sky is blue", "content": {"correct": True}}, format="json").status_code, 201)

        m = new_game(self.t, "matching")["id"]
        self.assertEqual(self.t.post(f"/api/v1/games/{m}/questions/", {"prompt": "Match", "content": {"pairs": [{"left": "a", "right": "1"}]}}, format="json").status_code, 400)
        self.assertEqual(self.t.post(f"/api/v1/games/{m}/questions/", {"prompt": "Match", "content": {"pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "1"}]}}, format="json").status_code, 400)
        self.assertEqual(self.t.post(f"/api/v1/games/{m}/questions/", {"prompt": "Match", "content": {"pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "2"}]}}, format="json").status_code, 201)

        f = new_game(self.t, "fill_blank")["id"]
        self.assertEqual(self.t.post(f"/api/v1/games/{f}/questions/", {"prompt": "Capital?", "content": {"accepted": []}}, format="json").status_code, 400)
        self.assertEqual(self.t.post(f"/api/v1/games/{f}/questions/", {"prompt": "Capital?", "content": {"accepted": ["Tashkent", "Toshkent"]}}, format="json").status_code, 201)

    def test_publish_rules_and_unpublish(self):
        g = new_game(self.t)
        r = self.t.post(f"/api/v1/games/{g['id']}/publish/")
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.data["code"], "not_publishable")
        add_q(self.t, g["id"], QUIZ_Q)
        r = self.t.post(f"/api/v1/games/{g['id']}/publish/")
        self.assertEqual((r.status_code, r.data["status"]), (200, "published"))
        self.assertIsNotNone(r.data["published_at"])
        r = self.t.post(f"/api/v1/games/{g['id']}/unpublish/")
        self.assertEqual(r.data["status"], "draft")
        self.assertEqual(self.t2.post(f"/api/v1/games/{g['id']}/publish/").status_code, 404)  # not yours

    def test_ownership_is_enforced(self):
        g = new_game(self.t)
        self.assertEqual(self.t2.get(f"/api/v1/games/{g['id']}/").status_code, 404)           # draft of someone else
        self.assertEqual(self.t2.patch(f"/api/v1/games/{g['id']}/", {"title": "x"}, format="json").status_code, 404)
        self.assertEqual(self.t2.get(f"/api/v1/games/{g['id']}/questions/").status_code, 404)
        self.assertEqual(self.t2.delete(f"/api/v1/games/{g['id']}/").status_code, 404)
        self.assertEqual(self.t2.get("/api/v1/games/").data["count"], 0)

    def test_published_public_game_readable_but_not_editable_by_other_teacher(self):
        g = published_quiz(self.t)
        r = self.t2.get(f"/api/v1/games/{g['id']}/")
        self.assertEqual(r.status_code, 200)
        self.assertNotIn("questions", r.data)
        self.assertEqual(self.t2.patch(f"/api/v1/games/{g['id']}/", {"title": "x"}, format="json").status_code, 403)

    def test_optimistic_locking_prevents_stale_overwrite(self):
        g = new_game(self.t)
        ok = self.t.patch(f"/api/v1/games/{g['id']}/", {"title": "A", "version": g["version"]}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.data["version"], g["version"] + 1)
        stale = self.t.patch(f"/api/v1/games/{g['id']}/", {"title": "B", "version": g["version"]}, format="json")
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.data["code"], "version_conflict")
        self.assertEqual(Game.objects.get(pk=g["id"]).title, "A")  # stale save did not clobber
        q = add_q(self.t, g["id"], QUIZ_Q)
        url = f"/api/v1/games/{g['id']}/questions/{q['id']}/"
        self.assertEqual(self.t.patch(url, {"prompt": "new", "version": q["version"]}, format="json").status_code, 200)
        self.assertEqual(self.t.patch(url, {"prompt": "old", "version": q["version"]}, format="json").status_code, 409)

    def test_cannot_change_type_with_questions(self):
        g = new_game(self.t)
        add_q(self.t, g["id"], QUIZ_Q)
        r = self.t.patch(f"/api/v1/games/{g['id']}/", {"game_type": "true_false"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_reorder_and_delete_resequences(self):
        g = new_game(self.t)
        ids = [add_q(self.t, g["id"], {**QUIZ_Q, "prompt": f"Q{i}"})["id"] for i in range(3)]
        r = self.t.post(f"/api/v1/games/{g['id']}/questions/reorder/", {"order": ids[::-1]}, format="json")
        self.assertEqual([q["id"] for q in r.data], ids[::-1])
        bad = self.t.post(f"/api/v1/games/{g['id']}/questions/reorder/", {"order": ids[:2]}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.t.delete(f"/api/v1/games/{g['id']}/questions/{ids[0]}/")
        qs = self.t.get(f"/api/v1/games/{g['id']}/questions/").data
        self.assertEqual([q["order"] for q in qs], [1, 2])

    def test_duplicate_question_goes_right_after_original(self):
        g = new_game(self.t)
        a, b = [add_q(self.t, g["id"], {**QUIZ_Q, "prompt": p})["id"] for p in ("A", "B")]
        r = self.t.post(f"/api/v1/games/{g['id']}/questions/{a}/duplicate/")
        self.assertEqual(r.status_code, 201)
        prompts = [q["prompt"] for q in self.t.get(f"/api/v1/games/{g['id']}/questions/").data]
        self.assertEqual(prompts, ["A", "A", "B"])

    def test_duplicate_game_is_independent_draft(self):
        g = published_quiz(self.t, 2)
        r = self.t2.post(f"/api/v1/games/{g['id']}/duplicate/")  # remix a public game
        self.assertEqual(r.status_code, 201)
        self.assertEqual((r.data["status"], r.data["question_count"], r.data["title"].endswith("(копия)")), ("draft", 2, True))
        self.assertEqual(Game.objects.get(pk=r.data["id"]).owner, self.teacher2)

    def test_preview_checks_without_storing(self):
        g = new_game(self.t)
        q = add_q(self.t, g["id"], QUIZ_Q)
        p = self.t.get(f"/api/v1/games/{g['id']}/preview/")
        self.assertEqual(p.status_code, 200)
        self.assertNotIn("is_correct", p.content.decode())
        r = self.t.post(f"/api/v1/games/{g['id']}/preview/check/", {"question_id": q["id"], "answer": {"selected": correct_option(q)}}, format="json")
        self.assertTrue(r.data["is_correct"])
        self.assertEqual(Attempt.objects.count(), 0)
        self.assertEqual(self.s.get(f"/api/v1/games/{g['id']}/preview/").status_code, 403)

    def test_delete_game_without_attempts(self):
        g = new_game(self.t)
        self.assertEqual(self.t.delete(f"/api/v1/games/{g['id']}/").status_code, 204)

    def test_list_filters(self):
        new_game(self.t, "quiz", title="Alpha")
        new_game(self.t, "true_false", title="Beta")
        self.assertEqual(self.t.get("/api/v1/games/?game_type=quiz").data["count"], 1)
        self.assertEqual(self.t.get("/api/v1/games/?search=bet").data["count"], 1)
        self.assertEqual(self.t.get("/api/v1/games/?status=published").data["count"], 0)


class PlayTests(Base):
    def setUp(self):
        super().setUp()
        self.game = published_quiz(self.t, 2)
        self.qs = self.t.get(f"/api/v1/games/{self.game['id']}/questions/").data

    def start(self, c=None, gid=None):
        return (c or self.s).post(f"/api/v1/games/{gid or self.game['id']}/attempts/", {}, format="json")

    def test_student_never_receives_answers(self):
        r = self.start()
        raw = r.content.decode()
        self.assertEqual(r.status_code, 201)
        self.assertNotIn("is_correct", raw)
        self.assertNotIn("hint", raw)
        self.assertNotIn("explanation", raw)
        detail = self.s.get(f"/api/v1/games/{self.game['id']}/")
        self.assertNotIn("questions", detail.data)
        self.assertNotIn("is_correct", self.s.get("/api/v1/games/").content.decode())

    def test_hidden_answers_for_every_type(self):
        tf = new_game(self.t, "true_false"); add_q(self.t, tf["id"], {"prompt": "Sky blue", "content": {"correct": True}}); self.t.post(f"/api/v1/games/{tf['id']}/publish/")
        fb = new_game(self.t, "fill_blank"); add_q(self.t, fb["id"], {"prompt": "Capital", "content": {"accepted": ["Tashkent"]}}); self.t.post(f"/api/v1/games/{fb['id']}/publish/")
        mt = new_game(self.t, "matching")
        add_q(self.t, mt["id"], {"prompt": "m", "content": {"pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "2"}, {"left": "c", "right": "3"}]}})
        self.t.post(f"/api/v1/games/{mt['id']}/publish/")
        for g in (tf, fb, mt):
            r = self.start(gid=g["id"])
            self.assertEqual(r.status_code, 201, r.data)
            raw = r.content.decode()
            self.assertNotIn('"correct"', raw)
            self.assertNotIn("Tashkent", raw)
            self.assertNotIn("accepted", raw)
        m = self.start(gid=mt["id"]).data["questions"][0]["content"]
        self.assertEqual(sorted(m["right"]), ["1", "2", "3"])
        self.assertNotEqual(m["right"], ["1", "2", "3"])  # order must not leak pairing

    def test_start_is_idempotent_against_double_click(self):
        a = self.start()
        b = self.start()
        self.assertEqual((a.status_code, b.status_code), (201, 200))
        self.assertEqual(a.data["id"], b.data["id"])
        self.assertEqual(Attempt.objects.count(), 1)

    def test_full_flow_scoring_feedback_and_achievements(self):
        att = self.start().data
        q1, q2 = self.qs
        right = {"selected": correct_option(q1)}
        wrong_id = next(o["id"] for o in q2["content"]["options"] if not o["is_correct"])
        url = f"/api/v1/attempts/{att['id']}/answers/"

        r = self.s.post(url, {"question_id": q1["id"], "answer": right}, format="json")
        self.assertEqual((r.status_code, r.data["is_correct"], r.data["points_awarded"]), (201, True, 10))
        self.assertEqual(r.data["hint"], "")                       # no hint when right
        r = self.s.post(url, {"question_id": q2["id"], "answer": {"selected": [wrong_id]}}, format="json")
        self.assertEqual((r.data["is_correct"], r.data["points_awarded"]), (False, 0))
        self.assertEqual(r.data["hint"], "Count on fingers")       # wrong answers GUIDE
        self.assertEqual(r.data["explanation"], "Two pairs make four")
        self.assertIsNotNone(r.data["correct_answer"])

        # re-submitting the same question never re-grades (no cheating / double click)
        again = self.s.post(url, {"question_id": q2["id"], "answer": {"selected": correct_option(q2)}}, format="json")
        self.assertEqual((again.status_code, again.data["is_correct"], again.data["already_answered"]), (200, False, True))

        # resume shows what was answered
        resume = self.s.get(f"/api/v1/attempts/{att['id']}/")
        self.assertEqual(len(resume.data["answered"]), 2)

        done = self.s.post(f"/api/v1/attempts/{att['id']}/complete/")
        self.assertEqual((done.data["score"], done.data["max_score"], done.data["percent"]), (10, 20, 50))
        self.assertEqual(done.data["correct_count"], 1)
        self.assertEqual([a["key"] for a in done.data["new_achievements"]], ["first_game"])
        again = self.s.post(f"/api/v1/attempts/{att['id']}/complete/")      # idempotent
        self.assertEqual(again.data["score"], 10)
        self.assertEqual(again.data["new_achievements"], [])

        late = self.s.post(url, {"question_id": q1["id"], "answer": right}, format="json")
        self.assertEqual(late.status_code, 409)

    def test_perfect_score_and_progress(self):
        att = self.start().data
        for q in self.qs:
            self.s.post(f"/api/v1/attempts/{att['id']}/answers/", {"question_id": q["id"], "answer": {"selected": correct_option(q)}}, format="json")
        done = self.s.post(f"/api/v1/attempts/{att['id']}/complete/").data
        self.assertEqual(done["percent"], 100)
        self.assertEqual({a["key"] for a in done["new_achievements"]}, {"first_game", "perfect_score"})
        p = self.s.get("/api/v1/me/progress/").data
        self.assertEqual((p["completed_attempts"], p["games_played"], p["total_points"], p["average_percent"], p["perfect_scores"]), (1, 1, 20, 100, 1))
        earned = {a["key"]: a["earned"] for a in p["achievements"]}
        self.assertEqual(earned, {"first_game": True, "perfect_score": True, "five_games": False, "ten_games": False})
        self.assertEqual(self.s.get("/api/v1/me/attempts/").data["count"], 1)
        # a brand new student has real zeros, not fake data
        z = self.s2.get("/api/v1/me/progress/").data
        self.assertEqual((z["completed_attempts"], z["total_points"], z["average_percent"], z["recent"]), (0, 0, None, []))

    def test_incomplete_attempt_counts_unanswered_as_zero(self):
        att = self.start().data
        done = self.s.post(f"/api/v1/attempts/{att['id']}/complete/").data
        self.assertEqual((done["score"], done["percent"], done["total_questions"]), (0, 0, 2))

    def test_malformed_answers_rejected(self):
        att = self.start().data
        url = f"/api/v1/attempts/{att['id']}/answers/"
        q = self.qs[0]
        for bad in ({}, {"selected": []}, {"selected": ["zzz"]}, {"selected": "o1"}, "text", None):
            r = self.s.post(url, {"question_id": q["id"], "answer": bad}, format="json")
            self.assertEqual(r.status_code, 400, bad)
        self.assertEqual(self.s.post(url, {"question_id": 99999, "answer": {"selected": ["o1"]}}, format="json").status_code, 404)
        self.assertEqual(Attempt.objects.get(pk=att["id"]).answers.count(), 0)

    def test_attempts_are_private(self):
        att = self.start().data
        self.assertEqual(self.s2.get(f"/api/v1/attempts/{att['id']}/").status_code, 404)
        self.assertEqual(self.s2.post(f"/api/v1/attempts/{att['id']}/complete/").status_code, 404)
        self.assertEqual(self.t.get(f"/api/v1/attempts/{att['id']}/").status_code, 403)

    def test_teachers_cannot_play(self):
        self.assertEqual(self.t2.post(f"/api/v1/games/{self.game['id']}/attempts/", {}, format="json").status_code, 403)

    def test_draft_and_archived_games_not_playable(self):
        g = new_game(self.t); add_q(self.t, g["id"], QUIZ_Q)
        self.assertEqual(self.start(gid=g["id"]).status_code, 404)
        self.t.post(f"/api/v1/games/{self.game['id']}/archive/")
        self.assertEqual(self.start(gid=self.game["id"]).status_code, 404)
        self.assertEqual(self.s.get("/api/v1/games/").data["count"], 0)

    def test_matching_gives_partial_credit_and_fill_blank_is_forgiving(self):
        mt = new_game(self.t, "matching")
        add_q(self.t, mt["id"], {"prompt": "m", "points": 30, "content": {"pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "2"}, {"left": "c", "right": "3"}]}})
        self.t.post(f"/api/v1/games/{mt['id']}/publish/")
        att = self.start(gid=mt["id"]).data
        qid = att["questions"][0]["id"]
        ans = {"pairs": [{"left": "a", "right": "1"}, {"left": "b", "right": "3"}, {"left": "c", "right": "2"}]}
        r = self.s.post(f"/api/v1/attempts/{att['id']}/answers/", {"question_id": qid, "answer": ans}, format="json")
        self.assertEqual((r.data["is_correct"], r.data["partial"], r.data["points_awarded"]), (False, True, 10))

        fb = new_game(self.t, "fill_blank")
        add_q(self.t, fb["id"], {"prompt": "Capital of Uzbekistan?", "content": {"accepted": ["Tashkent", "Toshkent"]}})
        self.t.post(f"/api/v1/games/{fb['id']}/publish/")
        att = self.start(gid=fb["id"]).data
        qid = att["questions"][0]["id"]
        r = self.s.post(f"/api/v1/attempts/{att['id']}/answers/", {"question_id": qid, "answer": {"text": "  tOSHkent "}}, format="json")
        self.assertTrue(r.data["is_correct"])

    def test_time_limit_enforced_server_side(self):
        g = new_game(self.t, config={"time_limit_seconds": 10}); add_q(self.t, g["id"], QUIZ_Q)
        self.t.post(f"/api/v1/games/{g['id']}/publish/")
        att = self.start(gid=g["id"]).data
        self.assertIsNotNone(att["deadline"])
        Attempt.objects.filter(pk=att["id"]).update(started_at=timezone.now() - timedelta(seconds=60))
        q = self.t.get(f"/api/v1/games/{g['id']}/questions/").data[0]
        r = self.s.post(f"/api/v1/attempts/{att['id']}/answers/", {"question_id": q["id"], "answer": {"selected": correct_option(q)}}, format="json")
        self.assertEqual((r.status_code, r.data["code"]), (409, "time_over"))
        self.assertEqual(self.s.post(f"/api/v1/attempts/{att['id']}/complete/").status_code, 200)

    def test_shuffle_is_stable_across_refresh(self):
        g = new_game(self.t, config={"shuffle_questions": True, "shuffle_options": True})
        for i in range(6):
            add_q(self.t, g["id"], {**QUIZ_Q, "prompt": f"Q{i}"})
        self.t.post(f"/api/v1/games/{g['id']}/publish/")
        a = self.start(gid=g["id"]).data
        b = self.s.get(f"/api/v1/attempts/{a['id']}/").data
        self.assertEqual(a["questions"], b["questions"])

    def test_structure_locked_after_first_attempt(self):
        self.start()
        base = f"/api/v1/games/{self.game['id']}"
        self.assertEqual(self.t.post(f"{base}/questions/", QUIZ_Q, format="json").status_code, 409)
        self.assertEqual(self.t.patch(f"{base}/questions/{self.qs[0]['id']}/", {"prompt": "changed"}, format="json").status_code, 409)
        self.assertEqual(self.t.delete(f"{base}/questions/{self.qs[0]['id']}/").status_code, 409)
        self.assertEqual(self.t.delete(f"{base}/").status_code, 409)
        self.assertEqual(self.t.patch(f"{base}/", {"title": "Renamed"}, format="json").status_code, 200)  # metadata still ok
        dup = self.t.post(f"{base}/duplicate/")                                                            # escape hatch
        self.assertEqual(dup.status_code, 201)
        self.assertEqual(self.t.post(f"/api/v1/games/{dup.data['id']}/questions/", QUIZ_Q, format="json").status_code, 201)

    def test_private_games_visible_only_to_own_students(self):
        g = new_game(self.t, is_public=False, title="Private")
        add_q(self.t, g["id"], QUIZ_Q)
        self.t.post(f"/api/v1/games/{g['id']}/publish/")
        titles = lambda c: [x["title"] for x in c.get("/api/v1/games/catalog/").data["results"]]
        self.assertNotIn("Private", titles(self.s))
        self.assertEqual(self.start(gid=g["id"]).status_code, 404)
        cls = self.t.post("/api/v1/classes/", {"name": "5A"}, format="json").data
        self.s.post("/api/v1/classes/join/", {"code": cls["join_code"]}, format="json")
        self.assertIn("Private", titles(self.s))
        self.assertEqual(self.start(gid=g["id"]).status_code, 201)
        self.assertNotIn("Private", titles(self.s2))

    def test_card_shows_my_stats(self):
        att = self.start().data
        for q in self.qs:
            self.s.post(f"/api/v1/attempts/{att['id']}/answers/", {"question_id": q["id"], "answer": {"selected": correct_option(q)}}, format="json")
        self.s.post(f"/api/v1/attempts/{att['id']}/complete/")
        card = self.s.get(f"/api/v1/games/{self.game['id']}/").data
        self.assertEqual((card["my_attempts"], card["my_best_percent"], card["question_count"], card["max_score"]), (1, 100, 2, 20))

    def test_teacher_stats(self):
        att = self.start().data
        q1, q2 = self.qs
        self.s.post(f"/api/v1/attempts/{att['id']}/answers/", {"question_id": q1["id"], "answer": {"selected": correct_option(q1)}}, format="json")
        wrong = next(o["id"] for o in q2["content"]["options"] if not o["is_correct"])
        self.s.post(f"/api/v1/attempts/{att['id']}/answers/", {"question_id": q2["id"], "answer": {"selected": [wrong]}}, format="json")
        self.s.post(f"/api/v1/attempts/{att['id']}/complete/")
        st = self.t.get(f"/api/v1/games/{self.game['id']}/stats/").data
        self.assertEqual((st["attempts_total"], st["attempts_completed"], st["unique_students"], st["average_percent"]), (1, 1, 1, 50))
        self.assertEqual([p["correct_rate"] for p in st["per_question"]], [100, 0])
        self.assertEqual(self.t2.get(f"/api/v1/games/{self.game['id']}/stats/").status_code, 404)

    def test_five_distinct_games_unlock_achievement(self):
        for i in range(5):
            g = published_quiz(self.t, 1) if i else self.game
            att = self.start(gid=g["id"]).data
            self.s.post(f"/api/v1/attempts/{att['id']}/complete/")
        keys = {a["key"] for a in self.s.get("/api/v1/me/progress/").data["achievements"] if a["earned"]}
        self.assertIn("five_games", keys)
        self.assertNotIn("ten_games", keys)


class ClassAndAssignmentTests(Base):
    def make_class(self, c=None):
        return (c or self.t).post("/api/v1/classes/", {"name": "5A"}, format="json").data

    def test_class_lifecycle_and_join(self):
        cls = self.make_class()
        self.assertEqual(len(cls["join_code"]), 6)
        self.assertEqual(self.s.post("/api/v1/classes/", {"name": "x"}, format="json").status_code, 403)
        wrong = self.s.post("/api/v1/classes/join/", {"code": "ZZZZZZ"}, format="json")
        self.assertEqual(wrong.status_code, 404)
        a = self.s.post("/api/v1/classes/join/", {"code": cls["join_code"].lower()}, format="json")   # case-insensitive
        b = self.s.post("/api/v1/classes/join/", {"code": cls["join_code"]}, format="json")           # double click
        self.assertEqual((a.status_code, b.status_code), (201, 200))
        self.assertEqual(self.t.get("/api/v1/classes/").data["results"][0]["students_count"], 1)
        self.assertEqual(self.t.post("/api/v1/classes/join/", {"code": cls["join_code"]}, format="json").status_code, 403)
        self.assertNotIn("join_code", self.s.get("/api/v1/me/classes/").content.decode())   # students never see the code
        # other teacher: invisible
        self.assertEqual(self.t2.get(f"/api/v1/classes/{cls['id']}/").status_code, 404)
        self.assertEqual(self.t2.get(f"/api/v1/classes/{cls['id']}/students/").status_code, 404)
        # regenerate invalidates the old code
        new = self.t.post(f"/api/v1/classes/{cls['id']}/regenerate-code/").data
        self.assertNotEqual(new["join_code"], cls["join_code"])
        self.assertEqual(self.s2.post("/api/v1/classes/join/", {"code": cls["join_code"]}, format="json").status_code, 404)
        # remove student / leave
        self.assertEqual(self.t.delete(f"/api/v1/classes/{cls['id']}/students/{self.student.id}/").status_code, 204)
        self.assertEqual(self.t.delete(f"/api/v1/classes/{cls['id']}/students/{self.student.id}/").status_code, 404)
        self.s2.post("/api/v1/classes/join/", {"code": new["join_code"]}, format="json")
        self.assertEqual(self.s2.delete(f"/api/v1/me/classes/{cls['id']}/").status_code, 204)

    def test_join_is_throttled(self):
        statuses = [self.s.post("/api/v1/classes/join/", {"code": "AAAAAA"}, format="json").status_code for _ in range(35)]
        self.assertIn(429, statuses)

    def test_assignment_flow_and_results(self):
        cls = self.make_class()
        self.s.post("/api/v1/classes/join/", {"code": cls["join_code"]}, format="json")
        self.s2.post("/api/v1/classes/join/", {"code": cls["join_code"]}, format="json")
        game = published_quiz(self.t, 2)
        qs = self.t.get(f"/api/v1/games/{game['id']}/questions/").data
        url = f"/api/v1/classes/{cls['id']}/assignments/"

        due = (timezone.now() + timedelta(days=3)).isoformat()
        a = self.t.post(url, {"game": game["id"], "due_at": due}, format="json")
        again = self.t.post(url, {"game": game["id"]}, format="json")                  # double click
        self.assertEqual((a.status_code, again.status_code, a.data["id"]), (201, 200, again.data["id"]))
        self.assertEqual(self.t.post(url, {"game": game["id"], "due_at": "2020-01-01T00:00:00Z"}, format="json").status_code, 400)  # past deadline
        draft = new_game(self.t)
        self.assertEqual(self.t.post(url, {"game": draft["id"]}, format="json").status_code, 400)  # unpublished
        self.assertEqual(self.t2.post(url, {"game": game["id"]}, format="json").status_code, 404)  # not their class

        mine = self.s.get("/api/v1/me/assignments/").data["results"]
        self.assertEqual((len(mine), mine[0]["status"], mine[0]["best_percent"], mine[0]["is_overdue"]), (1, "not_started", None, False))

        att = self.s.post(f"/api/v1/games/{game['id']}/attempts/", {"assignment": a.data["id"]}, format="json")
        self.assertEqual(att.status_code, 201)
        self.assertEqual(self.s.get("/api/v1/me/assignments/").data["results"][0]["status"], "in_progress")
        for q in qs:
            self.s.post(f"/api/v1/attempts/{att.data['id']}/answers/", {"question_id": q["id"], "answer": {"selected": correct_option(q)}}, format="json")
        self.s.post(f"/api/v1/attempts/{att.data['id']}/complete/")
        self.assertEqual(self.s.get("/api/v1/me/assignments/").data["results"][0]["status"], "completed")

        res = self.t.get(f"/api/v1/assignments/{a.data['id']}/results/").data
        self.assertEqual(res["summary"], {"enrolled": 2, "completed": 1, "in_progress": 0, "not_started": 1, "average_best_percent": 100})
        by = {r["student"]["username"]: r for r in res["students"]}
        self.assertEqual((by["kid"]["status"], by["kid"]["best_percent"]), ("completed", 100))
        self.assertEqual((by["kid2"]["status"], by["kid2"]["best_percent"]), ("not_started", None))

        cr = self.t.get(f"/api/v1/classes/{cls['id']}/results/").data
        self.assertEqual(cr["assignments_total"], 1)
        row = {r["student"]["username"]: r for r in cr["students"]}
        self.assertEqual((row["kid"]["assignments_completed"], row["kid"]["average_percent"]), (1, 100))
        self.assertEqual((row["kid2"]["assignments_completed"], row["kid2"]["average_percent"]), (0, None))
        self.assertEqual(self.t2.get(f"/api/v1/assignments/{a.data['id']}/results/").status_code, 404)
        self.assertEqual(self.s.get(f"/api/v1/assignments/{a.data['id']}/results/").status_code, 403)

    def test_cannot_start_with_foreign_assignment(self):
        cls = self.make_class()
        game = published_quiz(self.t, 1)
        a = self.t.post(f"/api/v1/classes/{cls['id']}/assignments/", {"game": game["id"]}, format="json").data
        r = self.s.post(f"/api/v1/games/{game['id']}/attempts/", {"assignment": a["id"]}, format="json")   # not enrolled
        self.assertEqual(r.status_code, 400)

    def test_assignment_update_delete(self):
        cls = self.make_class()
        game = published_quiz(self.t, 1)
        a = self.t.post(f"/api/v1/classes/{cls['id']}/assignments/", {"game": game["id"]}, format="json").data
        r = self.t.patch(f"/api/v1/assignments/{a['id']}/", {"title": "Homework"}, format="json")
        self.assertEqual(r.data["title"], "Homework")
        self.assertEqual(self.t2.delete(f"/api/v1/assignments/{a['id']}/").status_code, 404)
        self.assertEqual(self.t.delete(f"/api/v1/assignments/{a['id']}/").status_code, 204)

    def test_overdue_flag(self):
        cls = self.make_class()
        self.s.post("/api/v1/classes/join/", {"code": cls["join_code"]}, format="json")
        game = published_quiz(self.t, 1)
        a = self.t.post(f"/api/v1/classes/{cls['id']}/assignments/", {"game": game["id"], "due_at": (timezone.now() + timedelta(hours=1)).isoformat()}, format="json").data
        from games.models import Assignment
        Assignment.objects.filter(pk=a["id"]).update(due_at=timezone.now() - timedelta(hours=1))
        self.assertTrue(self.s.get("/api/v1/me/assignments/").data["results"][0]["is_overdue"])


class LessonTests(Base):
    def test_lesson_lifecycle_and_student_visibility(self):
        r = self.t.post("/api/v1/lessons/", {"title": "Fractions", "body": "Half is 1/2", "subject": "math"}, format="json")
        self.assertEqual(r.status_code, 201)
        lid = r.data["id"]
        self.assertEqual(self.s.get("/api/v1/lessons/").data["count"], 0)          # draft hidden
        self.assertEqual(self.s.post("/api/v1/lessons/", {"title": "x"}, format="json").status_code, 403)
        self.assertEqual(self.t.post(f"/api/v1/lessons/{lid}/publish/").data["status"], "published")
        g = new_game(self.t, lesson=lid); add_q(self.t, g["id"], QUIZ_Q); self.t.post(f"/api/v1/games/{g['id']}/publish/")
        self.assertEqual(self.s.get("/api/v1/lessons/").data["count"], 1)
        d = self.s.get(f"/api/v1/lessons/{lid}/")
        self.assertEqual([x["id"] for x in d.data["games"]], [g["id"]])
        self.assertEqual(self.s.patch(f"/api/v1/lessons/{lid}/", {"title": "x"}, format="json").status_code, 403)
        self.assertEqual(self.t2.patch(f"/api/v1/lessons/{lid}/", {"title": "hacked"}, format="json").status_code, 403)
        self.assertEqual(self.t2.delete(f"/api/v1/lessons/{lid}/").status_code, 403)
        self.assertEqual(self.t.get(f"/api/v1/lessons/{lid}/").data["title"], "Fractions")
        self.assertEqual(self.t2.post("/api/v1/games/", {"title": "steal", "game_type": "quiz", "lesson": lid}, format="json").status_code, 400)

    def test_cannot_publish_empty_lesson(self):
        lid = self.t.post("/api/v1/lessons/", {"title": "Empty"}, format="json").data["id"]
        self.assertEqual(self.t.post(f"/api/v1/lessons/{lid}/publish/").status_code, 400)


def png_bytes(size=(20, 20), fmt="PNG"):
    buf = io.BytesIO()
    Image.new("RGB", size, "red").save(buf, fmt)
    buf.seek(0)
    return buf


class UploadTests(Base):
    def setUp(self):
        super().setUp()
        self.tmp = tempfile.mkdtemp()
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)

    def up(self, c, url, data, name="a.png", ctype="image/png"):
        from django.core.files.uploadedfile import SimpleUploadedFile
        return c.post(url, {"image": SimpleUploadedFile(name, data, content_type=ctype)}, format="multipart")

    def test_cover_and_question_image(self):
        with override_settings(MEDIA_ROOT=self.tmp):
            g = new_game(self.t)
            q = add_q(self.t, g["id"], QUIZ_Q)
            r = self.up(self.t, f"/api/v1/games/{g['id']}/cover/", png_bytes().read())
            self.assertEqual(r.status_code, 200, r.data)
            self.assertRegex(r.data["cover"], r"/media/games/[0-9a-f]{32}\.png$")     # random name, original name dropped
            r = self.up(self.t, f"/api/v1/games/{g['id']}/questions/{q['id']}/image/", png_bytes(fmt="JPEG").read(), "evil.php.jpg", "image/jpeg")
            self.assertEqual(r.status_code, 200)
            self.assertRegex(r.data["image"], r"\.jpg$")
            self.assertEqual(self.t.delete(f"/api/v1/games/{g['id']}/cover/").data["cover"], None)

    def test_rejects_non_images_and_oversized(self):
        with override_settings(MEDIA_ROOT=self.tmp):
            g = new_game(self.t)
            self.assertEqual(self.up(self.t, f"/api/v1/games/{g['id']}/cover/", b"<?php echo 1; ?>", "x.png").status_code, 400)
            self.assertEqual(self.up(self.t, f"/api/v1/games/{g['id']}/cover/", png_bytes(fmt="GIF").read(), "x.gif", "image/gif").status_code, 400)
            with override_settings(MAX_IMAGE_UPLOAD_BYTES=100):
                self.assertEqual(self.up(self.t, f"/api/v1/games/{g['id']}/cover/", png_bytes((300, 300)).read()).status_code, 400)
            self.assertEqual(self.up(self.t2, f"/api/v1/games/{g['id']}/cover/", png_bytes().read()).status_code, 404)
            self.assertEqual(self.up(self.s, f"/api/v1/games/{g['id']}/cover/", png_bytes().read()).status_code, 403)
