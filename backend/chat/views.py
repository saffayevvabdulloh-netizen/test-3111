from django.db.models import Count, Max, Q
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from users.models import User
from users.serializer import UserBriefSerializer
from users.throttles import ChatRateThrottle

from . import services
from .models import Conversation, Message
from .serializers import MessageSerializer, SendSerializer

PAGE = 100


def _pair(me, peer):
    """(teacher, parent) in the right order."""
    return (me, peer) if me.role == User.Role.TEACHER else (peer, me)


def _conversation(me, peer, create=False):
    teacher, parent = _pair(me, peer)
    if create:
        return Conversation.objects.get_or_create(teacher=teacher, parent=parent)[0]
    return Conversation.objects.filter(teacher=teacher, parent=parent).first()


class ChatMixin:
    def peer_or_404(self, peer_id):
        """The other person, only if the two of them are allowed to talk (teacher + parent of a child in the class)."""
        me = self.request.user
        peer = get_object_or_404(User, pk=peer_id, is_active=True)
        if me.role == User.Role.TEACHER and peer.role == User.Role.PARENT:
            ok = services.can_chat(me, peer)
        elif me.role == User.Role.PARENT and peer.role == User.Role.TEACHER:
            ok = services.can_chat(peer, me)
        else:
            ok = False
        if not ok:
            raise Http404
        return peer


@extend_schema(tags=["Chat"])
class ThreadListView(APIView):
    """Everybody I may write to (teacher -> parents of my pupils, parent -> teachers of my children),
    with the last message and the number of unread ones. Newest conversations first."""

    def get(self, request):
        me = request.user
        people = services.contacts(me)
        field = "parent" if me.role == User.Role.TEACHER else "teacher"
        mine = {"teacher": me} if me.role == User.Role.TEACHER else {"parent": me}
        convs = {getattr(c, f"{field}_id"): c for c in Conversation.objects.filter(**mine)}
        mids = [r["mid"] for r in Message.objects.filter(conversation__in=convs.values()).order_by().values("conversation_id").annotate(mid=Max("id"))]
        last = {m.conversation_id: m for m in Message.objects.filter(id__in=mids)}
        unread = dict(
            Message.objects.filter(conversation__in=convs.values(), read_at__isnull=True).exclude(sender=me)
            .order_by().values_list("conversation_id").annotate(n=Count("id"))
        )
        items = []
        for pid, info in people.items():
            conv = convs.get(pid)
            m = last.get(conv.id) if conv else None
            items.append({
                "peer": UserBriefSerializer(info["peer"]).data,
                "children": sorted(info["children"].values()),
                "classes": sorted(info["classes"].values()),
                "last_message": {"text": m.text[:140], "created_at": m.created_at, "mine": m.sender_id == me.id} if m else None,
                "unread": unread.get(conv.id, 0) if conv else 0,
            })
        items.sort(key=lambda i: (i["last_message"] is None, -(i["last_message"]["created_at"].timestamp() if i["last_message"] else 0), i["peer"]["first_name"], i["peer"]["username"]))
        return Response({"results": items})


@extend_schema(tags=["Chat"])
class MessagesView(ChatMixin, APIView):
    def get_throttles(self):
        return [ChatRateThrottle()] if self.request.method == "POST" else []

    @extend_schema(responses=MessageSerializer(many=True))
    def get(self, request, peer_id):
        """Messages with this person (oldest first). `?after=<id>` returns only newer ones (for polling).
        Opening the thread marks the other person's messages as read."""
        me = request.user
        peer = self.peer_or_404(peer_id)
        conv = _conversation(me, peer)
        msgs = []
        if conv:
            qs = conv.messages.all()
            after = request.query_params.get("after")
            if after and after.isdigit():
                msgs = list(qs.filter(id__gt=int(after))[:PAGE])
            else:
                msgs = list(reversed(list(qs.order_by("-id")[:PAGE])))
            conv.messages.filter(read_at__isnull=True).exclude(sender=me).update(read_at=timezone.now())
        return Response({"peer": UserBriefSerializer(peer).data, "results": MessageSerializer(msgs, many=True, context={"me": me}).data})

    @extend_schema(request=SendSerializer, responses=MessageSerializer)
    def post(self, request, peer_id):
        me = request.user
        peer = self.peer_or_404(peer_id)
        s = SendSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        text = s.validated_data["text"].strip()
        if not text:
            return Response({"text": ["Xabar bo'sh bo'lmasligi kerak."]}, status=status.HTTP_400_BAD_REQUEST)
        conv = _conversation(me, peer, create=True)
        m = Message.objects.create(conversation=conv, sender=me, text=text)
        conv.save(update_fields=["updated_at"])
        return Response(MessageSerializer(m, context={"me": me}).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Chat"])
class UnreadView(APIView):
    """Total unread messages (for the badge in the menu)."""

    def get(self, request):
        me = request.user
        if me.role == User.Role.TEACHER:
            q = Q(conversation__teacher=me)
        elif me.role == User.Role.PARENT:
            q = Q(conversation__parent=me)
        else:
            return Response({"count": 0})
        n = Message.objects.filter(q, read_at__isnull=True).exclude(sender=me).count()
        return Response({"count": n})
