"""Who may talk to whom: a teacher and a parent may chat only while the parent's child is in the teacher's class."""
from school.models import Enrollment, ParentLink
from users.models import User


def contacts(user):
    """{peer_id: {"peer": User, "children": {id: name}, "classes": {id: name}}} for this teacher / parent."""
    out = {}

    def add(peer, student, classroom):
        c = out.setdefault(peer.id, {"peer": peer, "children": {}, "classes": {}})
        c["children"][student.id] = student.display_name
        c["classes"][classroom.id] = classroom.name

    if user.role == User.Role.TEACHER:
        enrolls = list(Enrollment.objects.filter(classroom__teacher=user).select_related("student", "classroom"))
        by_student = {}
        for e in enrolls:
            by_student.setdefault(e.student_id, []).append(e)
        for link in ParentLink.objects.filter(student_id__in=by_student).select_related("parent"):
            for e in by_student[link.student_id]:
                add(link.parent, e.student, e.classroom)
    elif user.role == User.Role.PARENT:
        children = [l.student_id for l in ParentLink.objects.filter(parent=user)]
        for e in Enrollment.objects.filter(student_id__in=children).select_related("student", "classroom__teacher"):
            add(e.classroom.teacher, e.student, e.classroom)
    return out


def can_chat(teacher, parent):
    return (
        teacher.role == User.Role.TEACHER
        and parent.role == User.Role.PARENT
        and Enrollment.objects.filter(classroom__teacher=teacher, student__parent_links__parent=parent).exists()
    )
