"""Extensible game-type registry.

GAME -> TYPE -> CONTENT -> RENDERER(front) -> ANSWER -> GRADE.

To add a new game type: subclass QuestionType, implement the 4 methods and
decorate it with @register. Nothing else in the backend needs to change.

Teacher-side `content` contains the answers; `public()` is the only thing
students ever receive.
"""
import random

from rest_framework.exceptions import ValidationError

REGISTRY = {}


def register(cls):
    REGISTRY[cls.key] = cls()
    return cls


def get_type(key):
    try:
        return REGISTRY[key]
    except KeyError:
        raise ValidationError({"game_type": [f"Неизвестный тип игры: {key}"]})


def game_type_choices():
    return [(k, t.label) for k, t in REGISTRY.items()]


def norm(s, case_sensitive=False):
    s = " ".join(str(s).split())
    return s if case_sensitive else s.casefold()


def _text(value, field, min_len=1, max_len=120):
    if not isinstance(value, str):
        raise ValidationError(f"{field}: ожидается текст.")
    value = " ".join(value.split())
    if not (min_len <= len(value) <= max_len):
        raise ValidationError(f"{field}: длина от {min_len} до {max_len} символов.")
    return value


def _dict(content):
    if not isinstance(content, dict):
        raise ValidationError("content должен быть объектом.")
    return content


def _bad_answer():
    return ValidationError({"answer": ["Некорректный формат ответа."]})


class QuestionType:
    key = ""
    label = ""
    description = ""

    def clean(self, content):  # teacher input -> normalized content (with answers)
        raise NotImplementedError

    def public(self, content, rng=None):  # what the student may see
        raise NotImplementedError

    def grade(self, content, answer):  # -> fraction 0..1, raises ValidationError if malformed
        raise NotImplementedError

    def correct_answer(self, content):  # same shape as a valid `answer`
        raise NotImplementedError


@register
class Quiz(QuestionType):
    key = "quiz"
    label = "Викторина (выбор ответа)"
    description = "2-6 вариантов, один или несколько правильных."

    def clean(self, content):
        options = _dict(content).get("options")
        if not isinstance(options, list) or not (2 <= len(options) <= 6):
            raise ValidationError("options: нужно от 2 до 6 вариантов.")
        cleaned, seen = [], set()
        for i, o in enumerate(options, 1):
            if not isinstance(o, dict):
                raise ValidationError("Каждый вариант должен быть объектом.")
            text = _text(o.get("text"), f"Вариант {i}", 1, 120)
            if norm(text) in seen:
                raise ValidationError(f"Вариант {i}: повторяется текст.")
            seen.add(norm(text))
            flag = o.get("is_correct", False)
            if not isinstance(flag, bool):
                raise ValidationError(f"Вариант {i}: is_correct должен быть true/false.")
            cleaned.append({"id": f"o{i}", "text": text, "is_correct": flag})
        if not any(o["is_correct"] for o in cleaned):
            raise ValidationError("Отметьте хотя бы один правильный вариант.")
        return {"options": cleaned}

    def public(self, content, rng=None):
        opts = [{"id": o["id"], "text": o["text"]} for o in content["options"]]
        if rng:
            rng.shuffle(opts)
        multiple = sum(o["is_correct"] for o in content["options"]) > 1
        return {"multiple": multiple, "options": opts}

    def grade(self, content, answer):
        sel = answer.get("selected") if isinstance(answer, dict) else None
        ids = {o["id"] for o in content["options"]}
        if not isinstance(sel, list) or not sel or not all(isinstance(x, str) and x in ids for x in sel):
            raise _bad_answer()
        correct = {o["id"] for o in content["options"] if o["is_correct"]}
        return 1.0 if set(sel) == correct else 0.0

    def correct_answer(self, content):
        return {"selected": [o["id"] for o in content["options"] if o["is_correct"]]}


@register
class TrueFalse(QuestionType):
    key = "true_false"
    label = "Верно / Неверно"
    description = "Утверждение в тексте вопроса, ответ — да или нет."

    def clean(self, content):
        correct = _dict(content).get("correct")
        if not isinstance(correct, bool):
            raise ValidationError("correct: укажите true или false.")
        return {"correct": correct}

    def public(self, content, rng=None):
        return {}

    def grade(self, content, answer):
        val = answer.get("value") if isinstance(answer, dict) else None
        if not isinstance(val, bool):
            raise _bad_answer()
        return 1.0 if val == content["correct"] else 0.0

    def correct_answer(self, content):
        return {"value": content["correct"]}


@register
class Matching(QuestionType):
    key = "matching"
    label = "Соедини пары"
    description = "2-8 пар; ученик соединяет левую колонку с правой. Частичный балл."

    def clean(self, content):
        pairs = _dict(content).get("pairs")
        if not isinstance(pairs, list) or not (2 <= len(pairs) <= 8):
            raise ValidationError("pairs: нужно от 2 до 8 пар.")
        cleaned, lefts, rights = [], set(), set()
        for i, p in enumerate(pairs, 1):
            if not isinstance(p, dict):
                raise ValidationError("Каждая пара должна быть объектом.")
            left = _text(p.get("left"), f"Пара {i}, слева", 1, 60)
            right = _text(p.get("right"), f"Пара {i}, справа", 1, 60)
            if norm(left) in lefts or norm(right) in rights:
                raise ValidationError(f"Пара {i}: значения не должны повторяться.")
            lefts.add(norm(left))
            rights.add(norm(right))
            cleaned.append({"left": left, "right": right})
        return {"pairs": cleaned}

    def public(self, content, rng=None):
        left = [p["left"] for p in content["pairs"]]
        right = [p["right"] for p in content["pairs"]]
        rng = rng or random.Random(1)
        shuffled = right[:]
        rng.shuffle(shuffled)
        if shuffled == right:  # never leak the answer order
            shuffled = right[1:] + right[:1]
        return {"left": left, "right": shuffled}

    def grade(self, content, answer):
        given = answer.get("pairs") if isinstance(answer, dict) else None
        if not isinstance(given, list) or not given:
            raise _bad_answer()
        truth = {norm(p["left"]): norm(p["right"]) for p in content["pairs"]}
        chosen = {}
        for g in given:
            if not isinstance(g, dict) or not isinstance(g.get("left"), str) or not isinstance(g.get("right"), str):
                raise _bad_answer()
            if norm(g["left"]) not in truth:
                raise _bad_answer()
            chosen[norm(g["left"])] = norm(g["right"])
        return sum(1 for k, v in chosen.items() if truth[k] == v) / len(truth)

    def correct_answer(self, content):
        return {"pairs": [dict(p) for p in content["pairs"]]}


@register
class FillBlank(QuestionType):
    key = "fill_blank"
    label = "Впиши ответ"
    description = "Ученик вводит ответ; можно задать несколько допустимых вариантов."

    def clean(self, content):
        c = _dict(content)
        accepted = c.get("accepted")
        if not isinstance(accepted, list) or not (1 <= len(accepted) <= 10):
            raise ValidationError("accepted: от 1 до 10 допустимых ответов.")
        cs = c.get("case_sensitive", False)
        if not isinstance(cs, bool):
            raise ValidationError("case_sensitive должен быть true/false.")
        cleaned, seen = [], set()
        for a in accepted:
            t = _text(a, "Ответ", 1, 60)
            if norm(t, cs) in seen:
                raise ValidationError("Допустимые ответы не должны повторяться.")
            seen.add(norm(t, cs))
            cleaned.append(t)
        return {"accepted": cleaned, "case_sensitive": cs}

    def public(self, content, rng=None):
        return {"max_length": 60}

    def grade(self, content, answer):
        text = answer.get("text") if isinstance(answer, dict) else None
        if not isinstance(text, str) or not text.strip() or len(text) > 200:
            raise _bad_answer()
        cs = content["case_sensitive"]
        return 1.0 if norm(text, cs) in {norm(a, cs) for a in content["accepted"]} else 0.0

    def correct_answer(self, content):
        return {"text": content["accepted"][0]}


GAME_TYPE_CHOICES = game_type_choices()

# ---------------------------------------------------------------- game config
DEFAULT_CONFIG = {
    "shuffle_questions": False,
    "shuffle_options": False,
    "reveal_answers": True,       # show the right answer after a wrong one
    "time_limit_seconds": None,   # None = no limit
}


def clean_config(raw):
    if raw in (None, ""):
        raw = {}
    if not isinstance(raw, dict):
        raise ValidationError("config должен быть объектом.")
    unknown = set(raw) - set(DEFAULT_CONFIG)
    if unknown:
        raise ValidationError(f"Неизвестные настройки: {', '.join(sorted(unknown))}")
    cfg = {**DEFAULT_CONFIG, **raw}
    for k in ("shuffle_questions", "shuffle_options", "reveal_answers"):
        if not isinstance(cfg[k], bool):
            raise ValidationError(f"{k} должен быть true/false.")
    t = cfg["time_limit_seconds"]
    if t is not None and (isinstance(t, bool) or not isinstance(t, int) or not (10 <= t <= 3600)):
        raise ValidationError("time_limit_seconds: целое от 10 до 3600 или null.")
    return cfg
