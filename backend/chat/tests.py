from django.core.cache import cache
from django.test import override_settings
from rest_framework.test import APIClient, APITestCase

from school.models import Classroom, Enrollment, FamilyCode, ParentLink
from users.models import User

PW = "Str0ng!pass9"


def mk(username, role):
    return User.objects.create_user(username, password=PW, role=role, is_active=True, first_name=username.title())


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


@override_settings(ALLOW_REGISTRATION=True)
class ParentSignupAndLinkTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.child = mk("bola", "student")

    def test_parent_can_register(self):
        r = APIClient().post("/api/v1/register/", {"username": "ota1", "password": PW, "role": "parent", "first_name": "Ota"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(User.objects.get(username="ota1").role, "parent")

    def test_link_child_by_family_code(self):
        code = client_for(self.child).get("/api/v1/me/family/").data["code"]
        parent = mk("ota", "parent")
        c = client_for(parent)
        self.assertEqual(c.post("/api/v1/parent/children/", {"code": "ZZZZZZ"}, format="json").status_code, 404)
        r = c.post("/api/v1/parent/children/", {"code": code.lower()}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(c.post("/api/v1/parent/children/", {"code": code}, format="json").status_code, 200)  # idempotent
        self.assertEqual(ParentLink.objects.count(), 1)
        self.assertEqual([x["username"] for x in c.get("/api/v1/parent/children/").data["results"]], ["bola"])
        self.assertEqual([p["username"] for p in client_for(self.child).get("/api/v1/me/family/").data["parents"]], ["ota"])

    def test_roles_are_enforced(self):
        self.assertEqual(client_for(self.child).get("/api/v1/parent/children/").status_code, 403)
        self.assertEqual(client_for(mk("ota", "parent")).get("/api/v1/me/family/").status_code, 403)

    def test_regenerate_keeps_links_but_kills_old_code(self):
        sc = client_for(self.child)
        old = sc.get("/api/v1/me/family/").data["code"]
        parent = mk("ota", "parent")
        client_for(parent).post("/api/v1/parent/children/", {"code": old}, format="json")
        new = sc.post("/api/v1/me/family/").data["code"]
        self.assertNotEqual(old, new)
        self.assertEqual(client_for(mk("ota2", "parent")).post("/api/v1/parent/children/", {"code": old}, format="json").status_code, 404)
        self.assertEqual(ParentLink.objects.filter(parent=parent).count(), 1)

    def test_parent_can_unlink(self):
        ParentLink.objects.create(parent=mk("ota", "parent"), student=self.child)
        c = client_for(User.objects.get(username="ota"))
        self.assertEqual(c.delete(f"/api/v1/parent/children/{self.child.id}/").status_code, 204)
        self.assertEqual(c.delete(f"/api/v1/parent/children/{self.child.id}/").status_code, 404)


class ChatTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.teacher, self.other_teacher = mk("ustoz", "teacher"), mk("ustoz2", "teacher")
        self.parent, self.other_parent = mk("ota", "parent"), mk("ota2", "parent")
        self.child, self.stranger_child = mk("bola", "student"), mk("begona", "student")
        self.cls = Classroom.objects.create(teacher=self.teacher, name="3-A")
        Enrollment.objects.create(classroom=self.cls, student=self.child)
        ParentLink.objects.create(parent=self.parent, student=self.child)
        ParentLink.objects.create(parent=self.other_parent, student=self.stranger_child)   # not in any class
        self.t, self.p = client_for(self.teacher), client_for(self.parent)

    def url(self, peer):
        return f"/api/v1/chat/threads/{peer.id}/messages/"

    def test_contact_lists(self):
        tl = self.t.get("/api/v1/chat/threads/").data["results"]
        self.assertEqual([x["peer"]["username"] for x in tl], ["ota"])
        self.assertEqual(tl[0]["children"], ["Bola"])
        self.assertEqual(tl[0]["classes"], ["3-A"])
        pl = self.p.get("/api/v1/chat/threads/").data["results"]
        self.assertEqual([x["peer"]["username"] for x in pl], ["ustoz"])
        self.assertEqual(client_for(self.other_parent).get("/api/v1/chat/threads/").data["results"], [])
        self.assertEqual(client_for(self.other_teacher).get("/api/v1/chat/threads/").data["results"], [])
        self.assertEqual(client_for(self.child).get("/api/v1/chat/threads/").data["results"], [])

    def test_send_receive_unread_and_read(self):
        self.assertEqual(self.p.post(self.url(self.teacher), {"text": "  Salom, ustoz  "}, format="json").status_code, 201)
        self.p.post(self.url(self.teacher), {"text": "Bola kasal edi"}, format="json")
        self.assertEqual(self.t.get("/api/v1/chat/unread/").data["count"], 2)
        self.assertEqual(self.p.get("/api/v1/chat/unread/").data["count"], 0)
        th = self.t.get("/api/v1/chat/threads/").data["results"][0]
        self.assertEqual(th["unread"], 2)
        self.assertEqual(th["last_message"]["text"], "Bola kasal edi")
        r = self.t.get(self.url(self.parent))
        self.assertEqual([m["text"] for m in r.data["results"]], ["Salom, ustoz", "Bola kasal edi"])
        self.assertTrue(all(not m["mine"] for m in r.data["results"]))
        self.assertEqual(self.t.get("/api/v1/chat/unread/").data["count"], 0)
        self.t.post(self.url(self.parent), {"text": "Yaxshi, tuzalsin"}, format="json")
        mine = self.p.get(self.url(self.teacher)).data["results"]
        self.assertEqual([m["mine"] for m in mine], [True, True, False])
        self.assertTrue(mine[0]["read"])

    def test_polling_after(self):
        first = self.p.post(self.url(self.teacher), {"text": "1"}, format="json").data["id"]
        self.p.post(self.url(self.teacher), {"text": "2"}, format="json")
        r = self.t.get(self.url(self.parent) + f"?after={first}")
        self.assertEqual([m["text"] for m in r.data["results"]], ["2"])

    def test_not_allowed_pairs(self):
        for client, peer in [(self.t, self.other_parent), (client_for(self.other_teacher), self.parent),
                             (self.p, self.other_teacher), (self.p, self.parent), (self.t, self.child)]:
            self.assertEqual(client.get(self.url(peer)).status_code, 404, peer.username)
            self.assertEqual(client.post(self.url(peer), {"text": "x"}, format="json").status_code, 404, peer.username)
        self.assertEqual(client_for(self.child).get(self.url(self.teacher)).status_code, 404)

    def test_blank_and_long_messages_rejected(self):
        self.assertEqual(self.p.post(self.url(self.teacher), {"text": "   "}, format="json").status_code, 400)
        self.assertEqual(self.p.post(self.url(self.teacher), {"text": "x" * 2001}, format="json").status_code, 400)

    def test_chat_closes_when_child_leaves_class(self):
        self.p.post(self.url(self.teacher), {"text": "hi"}, format="json")
        Enrollment.objects.all().delete()
        self.assertEqual(self.p.post(self.url(self.teacher), {"text": "again"}, format="json").status_code, 404)
        self.assertEqual(self.p.get("/api/v1/chat/threads/").data["results"], [])

    def test_two_children_one_teacher_is_one_thread(self):
        c2 = mk("bola2", "student")
        Enrollment.objects.create(classroom=self.cls, student=c2)
        ParentLink.objects.create(parent=self.parent, student=c2)
        tl = self.t.get("/api/v1/chat/threads/").data["results"]
        self.assertEqual(len(tl), 1)
        self.assertEqual(tl[0]["children"], ["Bola", "Bola2"])
