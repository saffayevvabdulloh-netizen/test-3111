from django.urls import path

from .views import (
    BotStatusView,
    ChangePasswordView,
    LoginView,
    LogoutView,
    ConsentView,
    DeleteAccountView,
    MeView,
    MyDataExportView,
    PublicConfigView,
    PasswordResetConfirmView,
    RegisterView,
    TelegramLinkView,
    TokenRefreshThrottledView,
    VerifyCodeView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("config/", PublicConfigView.as_view(), name="public-config"),
    path("bot-status/", BotStatusView.as_view(), name="bot-status"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("token/refresh/", TokenRefreshThrottledView.as_view(), name="token-refresh"),
    path("verify-code/", VerifyCodeView.as_view(), name="verify-code"),
    path("telegram-link/", TelegramLinkView.as_view(), name="telegram-link"),
    path("password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("me/", MeView.as_view(), name="me"),
    path("me/consent/", ConsentView.as_view(), name="consent"),
    path("me/export/", MyDataExportView.as_view(), name="my-export"),
    path("me/delete/", DeleteAccountView.as_view(), name="my-delete"),
    path("me/change-password/", ChangePasswordView.as_view(), name="change-password"),
]
