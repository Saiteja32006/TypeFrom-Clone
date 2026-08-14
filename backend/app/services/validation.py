"""Server-side answer validation.

The frontend validates too, for immediate feedback, but this module is the
authority: the public submit endpoint is unauthenticated and must never trust
the client's shape or its required-field enforcement.
"""

import re
from typing import Any

from app.models import Option, Question
from app.models.enums import CHOICE_TYPES, QuestionType

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[a-zA-Z]{2,}$")


class AnswerValidationError(Exception):
    """Raised with a per-question map of human-readable messages."""

    def __init__(self, errors: dict[int, str]) -> None:
        self.errors = errors
        super().__init__("Answer validation failed")


def _is_blank(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and not value.strip():
        return True
    if isinstance(value, (list, dict)) and len(value) == 0:
        return True
    return False


def validate_answer(question: Question, value: Any) -> tuple[Any, str | None, list[Option]]:
    """Validate and normalise one answer.

    Returns (canonical_value, display_text, selected_option_rows).
    Raises ValueError with a message describing the first problem found.
    """
    settings = question.settings or {}

    if _is_blank(value):
        if question.is_required:
            raise ValueError("This question is required")
        return None, None, []

    qtype = question.type

    if qtype in {QuestionType.SHORT_TEXT, QuestionType.LONG_TEXT}:
        text = str(value).strip()
        max_len = settings.get("max_length")
        if max_len and len(text) > int(max_len):
            raise ValueError(f"Must be {max_len} characters or fewer")
        return text, text, []

    if qtype == QuestionType.EMAIL:
        text = str(value).strip()
        if not EMAIL_RE.match(text):
            raise ValueError("Enter a valid email address")
        return text, text, []

    if qtype == QuestionType.NUMBER:
        try:
            number = float(value)
        except (TypeError, ValueError):
            raise ValueError("Enter a number") from None
        if number.is_integer():
            number = int(number)
        minimum, maximum = settings.get("min"), settings.get("max")
        if minimum is not None and number < float(minimum):
            raise ValueError(f"Must be at least {minimum}")
        if maximum is not None and number > float(maximum):
            raise ValueError(f"Must be at most {maximum}")
        return number, str(number), []

    if qtype == QuestionType.YES_NO:
        if isinstance(value, bool):
            flag = value
        elif str(value).strip().lower() in {"true", "yes", "y", "1"}:
            flag = True
        elif str(value).strip().lower() in {"false", "no", "n", "0"}:
            flag = False
        else:
            raise ValueError("Choose Yes or No")
        return flag, "Yes" if flag else "No", []

    if qtype == QuestionType.RATING:
        max_rating = int(settings.get("max_rating", 5))
        try:
            score = int(value)
        except (TypeError, ValueError):
            raise ValueError("Choose a rating") from None
        if not 1 <= score <= max_rating:
            raise ValueError(f"Choose a rating between 1 and {max_rating}")
        return score, str(score), []

    if qtype in CHOICE_TYPES:
        allow_multiple = bool(settings.get("allow_multiple")) and qtype == QuestionType.MULTIPLE_CHOICE
        raw_ids = value if isinstance(value, list) else [value]

        if not allow_multiple and len(raw_ids) > 1:
            raise ValueError("Choose a single option")

        by_id = {option.id: option for option in question.options}
        chosen: list[Option] = []
        for raw in raw_ids:
            try:
                option_id = int(raw)
            except (TypeError, ValueError):
                raise ValueError("Invalid option") from None
            option = by_id.get(option_id)
            if option is None:
                raise ValueError("Invalid option for this question")
            chosen.append(option)

        ids = [option.id for option in chosen]
        text = ", ".join(option.label for option in chosen)
        return (ids if allow_multiple else ids[0]), text, chosen

    raise ValueError("Unsupported question type")


def validate_submission(
    questions: list[Question], submitted: dict[int, Any]
) -> dict[int, tuple[Any, str | None, list[Option]]]:
    """Validate a whole submission, collecting every error rather than failing fast,
    so the respondent UI can highlight all offending questions at once."""
    cleaned: dict[int, tuple[Any, str | None, list[Option]]] = {}
    errors: dict[int, str] = {}

    for question in questions:
        try:
            cleaned[question.id] = validate_answer(question, submitted.get(question.id))
        except ValueError as exc:
            errors[question.id] = str(exc)

    unknown = set(submitted) - {q.id for q in questions}
    for question_id in unknown:
        errors[question_id] = "Unknown question for this form"

    if errors:
        raise AnswerValidationError(errors)
    return cleaned
