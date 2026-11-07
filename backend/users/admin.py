import secrets

from django import forms
from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import AdminUserCreationForm

from school.models import Enrollment, ParentLink

from .models import AuditLog, User, VerificationCode

PW_ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789"   # no look-alike characters


def make_password(n=8):
    return "".join(secrets.choice(PW_ALPHABET) for _ in range(n))


class AccountCreationForm(AdminUserCreationForm):
    """Admin "add account" page: who is it (role + name) and a password. The account is active at once."""

    class Meta(AdminUserCreationForm.Meta):
        model = User
        fields = ("username", "role", "first_name", "last_name", "is_staff", "is_superuser")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["role"].required = False      # an administrator needs no learner role
        self.fields["role"].help_text = "Admin uchun bo'sh qoldiring va pastdagi «Admin» belgilarini qo'ying."
        self.fields.get("is_staff") and setattr(self.fields["is_staff"], "help_text", "Admin panelga kira oladi (huquqlarni keyin «Guruhlar/Ruxsatlar» da bering).")
        self.fields.get("is_superuser") and setattr(self.fields["is_superuser"], "help_text", "To'liq admin: hamma narsani qila oladi, boshqa adminlarni yaratadi va huquq beradi.")
        self.fields["role"].choices = [("", "---------")] + list(User.Role.choices)

    def clean(self):
        data = super().clean()
        if not data.get("role"):
            if data.get("is_staff") or data.get("is_superuser"):
                data["role"] = User.Role.TEACHER     # stored value only; the admin panel is what matters
                self.instance.role = User.Role.TEACHER
            else:
                self.add_error("role", "Rolni tanlang (yoki admin belgisini qo'ying).")
        if data.get("is_superuser"):
            data["is_staff"] = True
        return data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.username = user.username.strip().lower()
        user.is_active = True
        user.must_change_password = True      # the administrator knows this password: the person replaces it at the first login
        if commit:
            user.save()
        return user


class ParentsOfStudentInline(admin.TabularInline):
    """On a child's page: which parents are linked to this child."""
    model = ParentLink
    fk_name = "student"
    extra = 0
    autocomplete_fields = ["parent"]
    verbose_name = verbose_name_plural = "Ota-onalar (shu bolaning)"


class ChildrenOfParentInline(admin.TabularInline):
    """On a parent's page: which children this parent has."""
    model = ParentLink
    fk_name = "parent"
    extra = 0
    autocomplete_fields = ["student"]
    verbose_name = verbose_name_plural = "Bolalari (shu ota-onaning)"


class EnrollmentInline(admin.TabularInline):
    model = Enrollment
    fk_name = "student"
    extra = 0
    verbose_name = verbose_name_plural = "Sinflari"


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    add_form = AccountCreationForm
    list_display = ("username", "full_name", "role", "is_active", "last_login", "created_at")
    list_filter = ("role", "is_active")
    search_fields = ("username", "first_name", "last_name")
    ordering = ("role", "first_name", "username")
    list_per_page = 50
    actions = ["new_passwords", "deactivate", "activate", "mark_consent", "export_json"]
    fieldsets = UserAdmin.fieldsets + (("Platform", {"fields": ("role", "avatar", "age", "telegram_id", "must_change_password", "consent_version", "consent_at")}),)
    add_fieldsets = (
        (None, {"classes": ("wide",), "fields": ("role", "first_name", "last_name", "username", "usable_password", "password1", "password2", "is_staff", "is_superuser")}),
    )

    def save_model(self, request, obj, form, change):
        if not request.user.is_superuser:          # only a full administrator can create other administrators
            if change:
                old = User.objects.get(pk=obj.pk)
                obj.is_staff, obj.is_superuser = old.is_staff, old.is_superuser
            else:
                obj.is_staff = obj.is_superuser = False
        super().save_model(request, obj, form, change)

    @admin.display(description="Ism")
    def full_name(self, obj):
        return obj.get_full_name()

    def get_inlines(self, request, obj):
        if obj is None:
            return []
        if obj.role == User.Role.STUDENT:
            return [EnrollmentInline, ParentsOfStudentInline]
        if obj.role == User.Role.PARENT:
            return [ChildrenOfParentInline]
        return []

    # --- bulk helpers ---------------------------------------------------------------------------------
    @admin.action(description="Yangi parol yaratish (ekranda bir marta ko'rsatiladi)")
    def new_passwords(self, request, queryset):
        lines = []
        for u in queryset[:200]:
            pw = make_password()
            u.set_password(pw)
            u.must_change_password = True
            u.save(update_fields=["password", "must_change_password"])
            lines.append(f"{u.username}: {pw}")
        self.message_user(request, "Yangi parollar (saqlab qo'ying, qayta ko'rsatilmaydi) → " + "  |  ".join(lines), messages.WARNING)

    @admin.action(description="Hisobni o'chirish (kira olmaydi)")
    def deactivate(self, request, queryset):
        n = queryset.exclude(pk=request.user.pk).update(is_active=False)
        self.message_user(request, f"{n} ta hisob o'chirildi.")

    @admin.action(description="Qog'ozdagi (yozma) rozilik olingan deb belgilash")
    def mark_consent(self, request, queryset):
        from django.conf import settings
        from django.utils import timezone

        n = queryset.update(consent_version=settings.CONSENT_VERSION, consent_at=timezone.now())
        self.message_user(request, f"{n} ta hisob uchun rozilik belgilandi. Rozilik qog'ozini saqlab qo'ying.")

    @admin.action(description="Tanlangan hisoblar ma'lumotini JSON qilib yuklab olish (subyekt so'rovi)")
    def export_json(self, request, queryset):
        import json

        from django.http import HttpResponse

        from .privacy import export_user

        data = [export_user(u) for u in queryset[:50]]
        resp = HttpResponse(json.dumps(data, ensure_ascii=False, indent=2), content_type="application/json; charset=utf-8")
        resp["Content-Disposition"] = 'attachment; filename="ma-lumotlar.json"'
        return resp

    @admin.action(description="Hisobni yoqish")
    def activate(self, request, queryset):
        self.message_user(request, f"{queryset.update(is_active=True)} ta hisob yoqildi.")


@admin.register(VerificationCode)
class VerificationCodeAdmin(admin.ModelAdmin):
    list_display = ("user", "code_type", "is_used", "attempts", "created_at", "expires_at")
    list_filter = ("code_type", "is_used")
    readonly_fields = ("code",)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """Read-only security journal."""

    list_display = ("created_at", "action", "username", "ip", "detail")
    list_filter = ("action",)
    search_fields = ("username", "ip", "detail")
    date_hierarchy = "created_at"
    list_per_page = 100

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser


def _only_superuser_edits_rights(model_admin_cls):
    """Helper-less guard: a plain staff member (not superuser) must not grant themselves or others admin rights."""
    orig = model_admin_cls.get_readonly_fields

    def get_readonly_fields(self, request, obj=None):
        ro = list(orig(self, request, obj))
        if obj is not None and not request.user.is_superuser:
            ro += ["is_superuser", "is_staff", "groups", "user_permissions"]
        return ro

    model_admin_cls.get_readonly_fields = get_readonly_fields


_only_superuser_edits_rights(CustomUserAdmin)
