from rest_framework import serializers

from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    mine = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ["id", "text", "created_at", "mine", "read"]

    read = serializers.SerializerMethodField()

    def get_mine(self, obj) -> bool:
        return obj.sender_id == self.context["me"].id

    def get_read(self, obj) -> bool:
        return obj.read_at is not None


class SendSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=2000, trim_whitespace=True)
