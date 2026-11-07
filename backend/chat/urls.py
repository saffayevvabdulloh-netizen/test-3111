from django.urls import path

from . import views

urlpatterns = [
    path("chat/threads/", views.ThreadListView.as_view(), name="chat-threads"),
    path("chat/threads/<int:peer_id>/messages/", views.MessagesView.as_view(), name="chat-messages"),
    path("chat/unread/", views.UnreadView.as_view(), name="chat-unread"),
]
