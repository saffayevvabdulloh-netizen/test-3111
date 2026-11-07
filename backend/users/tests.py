import io
from datetime import timedelta

from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from users import services
from users.models import BotHeartbeat, User, VerificationCode

PW = "Str0ng!pass9"


def register(client, username="ali", role="student", password=PW, **extra):
    return client.post("/api/v1/register/", {"username": username, "password": password, "role": role, **extra}, format="json")


def activate_via_bot(client, username="ali"):
    """Simulates: user opens bot link -> bot issues code -> user submits it."""
    user = User.objects.get(username=username)
    status, code = services.link_telegram_and_issue_code(str(user.telegram_token), 1000 + user.pk)
    assert status == services.TELEGRAM_OK
    return code


@override_settings(ALLOW_REGISTRATION=True)
class AuthFlowTests(APITestCase):
    def setUp(self):
        cache.clear()

    def test_register_hashes_password_and_requires_telegram(self):
        r = register(self.client)
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.data["needs_telegram_verification"])
        self.assertIn("t.me/", r.data["telegram_link"])
        u = User.objects.get(username="ali")
        self.assertFalse(u.is_active)
        self.assertIn("$", u.password, "password must be a real hash")
        self.assertTrue(u.check_password(PW))
        self.assertNotIn(PW, u.password)

    def test_weak_password_and_duplicate_username_rejected(self):
        self.assertEqual(register(self.client, password="x").status_code, 400)
        self.assertEqual(register(self.client, password="12345678").status_code, 400)
        self.assertEqual(register(self.client).status_code, 201)
        self.assertEqual(register(self.client, username="ALI").status_code, 400)  # case-insensitive
        self.assertEqual(register(self.client, role="admin", username="z").status_code, 400)

    def test_username_is_normalized_and_login_is_case_insensitive(self):
        self.assertEqual(register(self.client, username="  Ali_K ").status_code, 201)
        u = User.objects.get(username="ali_k")  # stored lower-case, trimmed
        u.is_active = True
        u.save()
        r = self.client.post("/api/v1/login/", {"username": "ALI_K", "password": PW}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(register(self.client, username="Ali_K").status_code, 400)

    def test_too_short_username_rejected(self):
        r = register(self.client, username="ab")
        self.assertEqual(r.status_code, 400)
        self.assertIn("username", r.data)

    def test_register_race_on_username_is_a_clean_400(self):
        from unittest import mock

        from django.db import IntegrityError

        with mock.patch("users.serializer.User.objects.create_user", side_effect=IntegrityError):
            r = register(self.client, username="racer")
        self.assertEqual(r.status_code, 400)
        self.assertIn("username", r.data)

    def test_register_has_its_own_roomy_throttle(self):
        # 25 sign-ups in a minute from one IP must not hit the strict login limit
        codes = [register(self.client, username=f"kid{i:02d}").status_code for i in range(25)]
        self.assertNotIn(429, codes)

    def test_cannot_register_privileged_flags(self):
        register(self.client, username="evil", is_staff=True, is_superuser=True)
        u = User.objects.get(username="evil")
        self.assertFalse(u.is_staff or u.is_superuser)

    def test_login_blocked_until_verified_then_works(self):
        register(self.client)
        r = self.client.post("/api/v1/login/", {"username": "ali", "password": PW}, format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(r.data["code"], "telegram_not_verified")
        code = activate_via_bot(self.client)
        v = self.client.post("/api/v1/verify-code/", {"username": "ali", "code": code}, format="json")
        self.assertEqual(v.status_code, 200)
        r = self.client.post("/api/v1/login/", {"username": "ali", "password": PW}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["access"] and r.data["refresh"])
        self.assertEqual(r.data["user"]["role"], "student")

    def test_wrong_password_is_generic_400(self):
        register(self.client)
        r = self.client.post("/api/v1/login/", {"username": "ali", "password": "nope"}, format="json")
        self.assertEqual(r.status_code, 400)
        r = self.client.post("/api/v1/login/", {"username": "ghost", "password": "nope"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_verify_code_is_bound_to_user_and_bruteforce_burns_code(self):
        register(self.client, "ali")
        register(self.client, "bob")
        code = activate_via_bot(self.client, "ali")
        # another user's name + ali's code must fail
        r = self.client.post("/api/v1/verify-code/", {"username": "bob", "code": code}, format="json")
        self.assertEqual(r.status_code, 400)
        wrong = "000000" if code != "000000" else "111111"
        for _ in range(5):
            self.client.post("/api/v1/verify-code/", {"username": "ali", "code": wrong}, format="json")
        # code is burned after 5 wrong guesses, even the right one fails now
        r = self.client.post("/api/v1/verify-code/", {"username": "ali", "code": code}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertFalse(User.objects.get(username="ali").is_active)

    def test_expired_code_rejected(self):
        register(self.client)
        code = activate_via_bot(self.client)
        VerificationCode.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        r = self.client.post("/api/v1/verify-code/", {"username": "ali", "code": code}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_link_rotates_after_verification(self):
        register(self.client)
        old = User.objects.get(username="ali").telegram_token
        code = activate_via_bot(self.client)
        self.client.post("/api/v1/verify-code/", {"username": "ali", "code": code}, format="json")
        u = User.objects.get(username="ali")
        self.assertNotEqual(u.telegram_token, old)
        st, _ = services.link_telegram_and_issue_code(str(old), 555)
        self.assertEqual(st, services.TELEGRAM_INVALID)

    def test_verify_requires_username_and_six_digits(self):
        self.assertEqual(self.client.post("/api/v1/verify-code/", {"code": "123456"}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/v1/verify-code/", {"username": "a", "code": "12ab56"}, format="json").status_code, 400)

    @override_settings(REQUIRE_TELEGRAM_VERIFICATION=False)
    def test_dev_mode_without_telegram(self):
        r = register(self.client)
        self.assertFalse(r.data["needs_telegram_verification"])
        r = self.client.post("/api/v1/login/", {"username": "ali", "password": PW}, format="json")
        self.assertEqual(r.status_code, 200)

    def test_telegram_link_endpoint_needs_password(self):
        register(self.client)
        bad = self.client.post("/api/v1/telegram-link/", {"username": "ali", "password": "x"}, format="json")
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post("/api/v1/telegram-link/", {"username": "ali", "password": PW}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertFalse(ok.data["verified"])


class TelegramServiceTests(APITestCase):
    def test_bot_edge_cases(self):
        self.assertEqual(services.link_telegram_and_issue_code("not-a-uuid", 1)[0], services.TELEGRAM_INVALID)
        a = User.objects.create_user("a", password=PW, role="student", is_active=False)
        b = User.objects.create_user("b", password=PW, role="student", is_active=False)
        self.assertEqual(services.link_telegram_and_issue_code(str(a.telegram_token), 77)[0], services.TELEGRAM_OK)
        # same Telegram account cannot hijack a second user (used to crash with IntegrityError)
        self.assertEqual(services.link_telegram_and_issue_code(str(b.telegram_token), 77)[0], services.TELEGRAM_TAKEN)
        # re-requesting invalidates the previous code
        services.link_telegram_and_issue_code(str(a.telegram_token), 77)
        self.assertEqual(VerificationCode.objects.filter(user=a, is_used=False).count(), 1)

    def test_codes_are_six_digits(self):
        u = User.objects.create_user("c", password=PW, role="student")
        for _ in range(30):
            c = services.issue_code(u, "register")
            self.assertRegex(c, r"^[1-9]\d{5}$")


@override_settings(ALLOW_REGISTRATION=True)
class SessionAndProfileTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user("kid", password=PW, role="student", is_active=True)

    def login(self):
        r = self.client.post("/api/v1/login/", {"username": "kid", "password": PW}, format="json")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
        return r.data

    def test_refresh_and_logout_blacklist(self):
        tokens = self.login()
        r = self.client.post("/api/v1/token/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertIn("access", r.data)
        out = self.client.post("/api/v1/logout/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(out.status_code, 205)
        again = self.client.post("/api/v1/token/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(again.status_code, 401)

    def test_logout_rejects_foreign_token(self):
        other = User.objects.create_user("other", password=PW, role="student")
        from rest_framework_simplejwt.tokens import RefreshToken
        foreign = str(RefreshToken.for_user(other))
        self.login()
        r = self.client.post("/api/v1/logout/", {"refresh": foreign}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_me_requires_auth_and_can_be_edited(self):
        self.assertEqual(self.client.get("/api/v1/me/").status_code, 401)
        self.login()
        r = self.client.patch("/api/v1/me/", {"first_name": "Ali", "avatar": "fox-1", "role": "teacher", "username": "hack"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual((self.user.first_name, self.user.avatar), ("Ali", "fox-1"))
        self.assertEqual((self.user.role, self.user.username), ("student", "kid"))  # immutable
        self.assertEqual(self.client.patch("/api/v1/me/", {"avatar": "../../x"}, format="json").status_code, 400)

    def test_change_password_revokes_refresh_tokens(self):
        tokens = self.login()
        bad = self.client.post("/api/v1/me/change-password/", {"current_password": "no", "new_password": "N3w!password77"}, format="json")
        self.assertEqual(bad.status_code, 400)
        weak = self.client.post("/api/v1/me/change-password/", {"current_password": PW, "new_password": "1234"}, format="json")
        self.assertEqual(weak.status_code, 400)
        ok = self.client.post("/api/v1/me/change-password/", {"current_password": PW, "new_password": "N3w!password77"}, format="json")
        self.assertEqual(ok.status_code, 200)
        r = self.client.post("/api/v1/token/refresh/", {"refresh": tokens["refresh"]}, format="json")
        self.assertEqual(r.status_code, 401)
        self.client.credentials()
        r = self.client.post("/api/v1/login/", {"username": "kid", "password": "N3w!password77"}, format="json")
        self.assertEqual(r.status_code, 200)

    def test_password_reset_via_telegram_code(self):
        self.user.telegram_id = 4242
        self.user.save()
        code = services.issue_reset_code_for_telegram(4242)
        self.assertIsNotNone(code)
        self.assertIsNone(services.issue_reset_code_for_telegram(9999))
        r = self.client.post("/api/v1/password-reset/confirm/", {"username": "kid", "code": code, "new_password": "R3set!password"}, format="json")
        self.assertEqual(r.status_code, 200)
        r = self.client.post("/api/v1/login/", {"username": "kid", "password": "R3set!password"}, format="json")
        self.assertEqual(r.status_code, 200)
        # code is single use
        r = self.client.post("/api/v1/password-reset/confirm/", {"username": "kid", "code": code, "new_password": "An0ther!pass99"}, format="json")
        self.assertEqual(r.status_code, 400)

    def test_login_is_rate_limited(self):
        statuses = [self.client.post("/api/v1/login/", {"username": "kid", "password": "bad"}, format="json").status_code for _ in range(25)]
        self.assertIn(429, statuses)


@override_settings(ALLOW_REGISTRATION=True)
class RepairCommandTests(APITestCase):
    def test_fix_plaintext_passwords(self):
        broken = User.objects.create(username="legacy", role="student", is_active=True, password="plain123")
        good = User.objects.create_user("fine", password=PW, role="student")
        before = good.password
        call_command("fix_plaintext_passwords", "--dry-run", stdout=io.StringIO())
        broken.refresh_from_db()
        self.assertEqual(broken.password, "plain123")  # dry run changes nothing
        call_command("fix_plaintext_passwords", stdout=io.StringIO())
        broken.refresh_from_db(); good.refresh_from_db()
        self.assertTrue(broken.check_password("plain123"))
        self.assertEqual(good.password, before)


@override_settings(ALLOW_REGISTRATION=True)
class BotStatusTests(APITestCase):
    """The sign-up page asks /bot-status/ whether the Telegram bot is alive."""

    def setUp(self):
        cache.clear()

    def status(self):
        r = self.client.get("/api/v1/bot-status/")
        self.assertEqual(r.status_code, 200)
        return r.data

    @override_settings(REQUIRE_TELEGRAM_VERIFICATION=False)
    def test_disabled_when_verification_is_off(self):
        self.assertEqual(self.status()["state"], "disabled")

    @override_settings(REQUIRE_TELEGRAM_VERIFICATION=True, TELEGRAM_BOT_TOKEN="")
    def test_no_token(self):
        self.assertEqual(self.status()["state"], "no_token")

    @override_settings(REQUIRE_TELEGRAM_VERIFICATION=True, TELEGRAM_BOT_TOKEN="1:abc")
    def test_token_but_nothing_running(self):
        self.assertEqual(self.status()["state"], "not_running")
        self.assertFalse(self.status()["connected"])

    @override_settings(REQUIRE_TELEGRAM_VERIFICATION=True, TELEGRAM_BOT_TOKEN="1:abc")
    def test_fresh_heartbeat_is_connected_and_never_leaks_details(self):
        services.record_bot_heartbeat(True, "ok", "", "real_bot")
        d = self.status()
        self.assertEqual((d["state"], d["connected"], d["bot_username"]), ("ok", True, "real_bot"))
        services.record_bot_heartbeat(False, "unreachable", "Cannot connect to host api.telegram.org:443 secret-proxy.local")
        d = self.status()
        self.assertEqual((d["state"], d["connected"]), ("unreachable", False))
        self.assertNotIn("secret-proxy", str(d))  # technical text stays in logs/admin

    @override_settings(REQUIRE_TELEGRAM_VERIFICATION=True, TELEGRAM_BOT_TOKEN="1:abc", BOT_HEARTBEAT_STALE_SECONDS=90)
    def test_stale_heartbeat_means_the_bot_stopped(self):
        from django.utils import timezone

        services.record_bot_heartbeat(True, "ok", "", "real_bot")
        BotHeartbeat.objects.update(updated_at=timezone.now() - timedelta(minutes=10))
        self.assertEqual(self.status()["state"], "not_running")

    @override_settings(REQUIRE_TELEGRAM_VERIFICATION=True, TELEGRAM_BOT_TOKEN="1:abc", TELEGRAM_BOT_USERNAME="wrong_guess_bot")
    def test_register_link_uses_the_real_bot_username(self):
        services.record_bot_heartbeat(True, "ok", "", "real_bot")
        r = register(self.client, username="linkkid")
        self.assertEqual(r.status_code, 201)
        self.assertIn("https://t.me/real_bot?start=", r.data["telegram_link"])
        BotHeartbeat.objects.all().delete()  # bot not running: fall back to the configured name
        r = register(self.client, username="linkkid2")
        self.assertIn("https://t.me/wrong_guess_bot?start=", r.data["telegram_link"])


@override_settings(ALLOW_REGISTRATION=True)
class ProfileAgeTests(APITestCase):
    def setUp(self):
        cache.clear()
        register(self.client)
        u = User.objects.get(username="ali")
        u.is_active = True
        u.save()
        self.client.force_authenticate(u)

    def test_age_is_empty_then_can_be_set_changed_and_cleared(self):
        self.assertIsNone(self.client.get("/api/v1/me/").data["age"])
        r = self.client.patch("/api/v1/me/", {"age": 8}, format="json")
        self.assertEqual((r.status_code, r.data["age"]), (200, 8))
        self.assertEqual(self.client.get("/api/v1/me/").data["age"], 8)
        self.assertEqual(self.client.patch("/api/v1/me/", {"age": 9}, format="json").data["age"], 9)
        self.assertIsNone(self.client.patch("/api/v1/me/", {"age": None}, format="json").data["age"])

    def test_age_range_and_type_are_validated(self):
        for bad in (0, 2, 101, -5, "abc", 8.5):
            r = self.client.patch("/api/v1/me/", {"age": bad}, format="json")
            self.assertEqual(r.status_code, 400, bad)
            self.assertIn("age", r.data)
        self.assertEqual(self.client.patch("/api/v1/me/", {"age": 3}, format="json").status_code, 200)
        self.assertEqual(self.client.patch("/api/v1/me/", {"age": 100}, format="json").status_code, 200)
