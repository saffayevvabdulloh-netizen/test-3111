from django.conf import settings
from django.db import models


class Conversation(models.Model):
    """One private thread between a teacher and a parent (a parent may have many children in the class)."""

    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chats_as_teacher")
    parent = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chats_as_parent")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["teacher", "parent"], name="uniq_chat_pair")]

    def __str__(self):
        return f"{self.teacher_id}<->{self.parent_id}"


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="chat_messages")
    text = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)  # when the OTHER side opened it

    class Meta:
        ordering = ["id"]
        indexes = [models.Index(fields=["conversation", "id"]), models.Index(fields=["conversation", "read_at"])]

    def __str__(self):
        return f"{self.sender_id}: {self.text[:30]}"
