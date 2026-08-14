"""Write-side helpers for questions: creation, updates and ordering."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models import Option, Question
from app.models.enums import CHOICE_TYPES, QuestionType
from app.schemas.question import QuestionCreate, QuestionUpdate


def next_position(db: Session, form_id: int) -> int:
    highest = db.scalar(
        select(func.max(Question.position)).where(
            Question.form_id == form_id, Question.deleted_at.is_(None)
        )
    )
    return 0 if highest is None else highest + 1


def create_question(db: Session, form_id: int, payload: QuestionCreate) -> Question:
    question = Question(
        form_id=form_id,
        type=payload.type,
        title=payload.title,
        description=payload.description,
        is_required=payload.is_required,
        settings=payload.settings,
        position=payload.position if payload.position is not None else next_position(db, form_id),
    )
    if payload.type in CHOICE_TYPES:
        question.options = [
            Option(label=option.label, position=index)
            for index, option in enumerate(payload.options)
        ]
    db.add(question)
    return question


#: Per-type settings applied when a question is created or switched to that type.
TYPE_DEFAULTS: dict[QuestionType, dict] = {
    QuestionType.SHORT_TEXT: {"max_length": 200},
    QuestionType.LONG_TEXT: {"max_length": 1000},
    QuestionType.MULTIPLE_CHOICE: {"allow_multiple": False},
    QuestionType.RATING: {"max_rating": 5},
}


def change_type(db: Session, question: Question, new_type: QuestionType) -> None:
    """Switch a question to another type, leaving it in a publishable state.

    Type-specific settings are replaced rather than merged -- carrying
    `max_length` onto a rating question would be meaningless, and a stale
    `max_rating` would silently constrain a number question.

    Switching *to* a choice type with no options would make the form
    unpublishable, so two placeholders are seeded. Options are kept (not
    deleted) when switching away, so switching back restores them along with
    any tallies already collected against them.
    """
    if question.type == new_type:
        return

    question.type = new_type
    question.settings = dict(TYPE_DEFAULTS.get(new_type, {}))

    if new_type in CHOICE_TYPES and not question.options:
        for index, label in enumerate(("Option 1", "Option 2")):
            db.add(Option(question_id=question.id, label=label, position=index))
        db.flush()


def apply_update(db: Session, question: Question, payload: QuestionUpdate) -> Question:
    data = payload.model_dump(exclude_unset=True)
    options = data.pop("options", None)
    new_type = data.pop("type", None)

    # Handled first: it resets settings, which an explicit `settings` in the
    # same request should then be able to override.
    if new_type is not None:
        change_type(db, question, new_type)

    for field, value in data.items():
        setattr(question, field, value)

    if options is not None:
        # Reconcile against the incoming list rather than replacing it.
        # An option carrying an id is updated in place, so renaming a choice
        # keeps its answer_options rows -- and therefore its tallies -- intact.
        # Options the creator dropped are soft-deleted, not destroyed.
        existing = {option.id: option for option in question.options}
        kept: set[int] = set()
        reconciled: list[Option] = []

        for index, incoming in enumerate(options):
            option_id = incoming.get("id")
            if option_id is not None and option_id in existing:
                option = existing[option_id]
                option.label = incoming["label"]
                option.position = index
                kept.add(option.id)
            else:
                option = Option(
                    question_id=question.id,
                    label=incoming["label"],
                    position=index,
                )
                db.add(option)
            reconciled.append(option)

        for option_id, option in existing.items():
            if option_id not in kept:
                option.deleted_at = utcnow()

        db.flush()

    return question


def soft_delete(db: Session, question: Question) -> None:
    """Mark deleted and close the gap it leaves in the ordering."""
    question.deleted_at = utcnow()
    db.flush()
    normalise_positions(db, question.form_id)


def normalise_positions(db: Session, form_id: int) -> None:
    live = db.scalars(
        select(Question)
        .where(Question.form_id == form_id, Question.deleted_at.is_(None))
        .order_by(Question.position, Question.id)
    ).all()
    for index, question in enumerate(live):
        question.position = index


def reorder(db: Session, form_id: int, question_ids: list[int]) -> list[Question]:
    """Apply a new order given the complete list of live question ids.

    Any live question missing from the payload keeps its relative order at the end,
    so a stale client cannot silently drop questions out of the sequence.
    """
    live = db.scalars(
        select(Question)
        .where(Question.form_id == form_id, Question.deleted_at.is_(None))
        .order_by(Question.position, Question.id)
    ).all()
    by_id = {question.id: question for question in live}

    unknown = [qid for qid in question_ids if qid not in by_id]
    if unknown:
        raise ValueError(f"Question ids not in this form: {unknown}")

    ordered = [by_id[qid] for qid in dict.fromkeys(question_ids)]
    ordered += [question for question in live if question not in ordered]

    for index, question in enumerate(ordered):
        question.position = index
    return ordered
