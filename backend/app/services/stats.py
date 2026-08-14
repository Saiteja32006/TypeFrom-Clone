"""Per-question summary statistics for the results view."""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Answer, Form, Option, Response, answer_options
from app.models.enums import CHOICE_TYPES, QuestionType
from app.schemas.response import FormSummaryStats, QuestionSummary

TEXT_TYPES = {QuestionType.SHORT_TEXT, QuestionType.LONG_TEXT, QuestionType.EMAIL}


def _percentage(count: int, total: int) -> float:
    return round(count / total * 100, 1) if total else 0.0


def _choice_breakdown(db: Session, question_id: int, option_rows: list[Option]) -> tuple[list[dict[str, Any]], int]:
    """Counts per option, computed in SQL over the answer_options join table."""
    counts = dict(
        db.execute(
            select(answer_options.c.option_id, func.count())
            .join(Answer, Answer.id == answer_options.c.answer_id)
            .where(Answer.question_id == question_id)
            .group_by(answer_options.c.option_id)
        ).all()
    )
    total = sum(counts.values())
    breakdown = [
        {
            "label": option.label,
            "option_id": option.id,
            "count": counts.get(option.id, 0),
            "percentage": _percentage(counts.get(option.id, 0), total),
        }
        for option in option_rows
    ]
    return breakdown, total


def build_form_summary(db: Session, form: Form) -> FormSummaryStats:
    total_responses = db.scalar(
        select(func.count()).select_from(Response).where(Response.form_id == form.id)
    ) or 0
    completed = db.scalar(
        select(func.count())
        .select_from(Response)
        .where(Response.form_id == form.id, Response.is_complete.is_(True))
    ) or 0

    # Average time to complete, from the timestamps already on each response.
    durations = [
        (r.submitted_at - r.started_at).total_seconds()
        for r in db.scalars(
            select(Response).where(
                Response.form_id == form.id,
                Response.is_complete.is_(True),
                Response.submitted_at.is_not(None),
            )
        ).all()
        if r.submitted_at and r.started_at
    ]
    avg_completion_seconds = round(sum(durations) / len(durations), 1) if durations else None

    summaries: list[QuestionSummary] = []

    for question in form.live_questions:
        answers = db.scalars(
            select(Answer).where(
                Answer.question_id == question.id, Answer.value_json.is_not(None)
            )
        ).all()
        answered = len(answers)
        summary = QuestionSummary(
            question_id=question.id,
            title=question.title,
            type=question.type,
            answered=answered,
            skipped=max(total_responses - answered, 0),
        )

        if question.type in CHOICE_TYPES:
            # Includes soft-deleted options, so a removed choice keeps showing
            # the votes it already collected.
            every_option = db.scalars(
                select(Option)
                .where(Option.question_id == question.id)
                .order_by(Option.position)
            ).all()
            summary.breakdown, _ = _choice_breakdown(db, question.id, every_option)

        elif question.type == QuestionType.YES_NO:
            yes = sum(1 for answer in answers if answer.value_json is True)
            no = answered - yes
            summary.breakdown = [
                {"label": "Yes", "count": yes, "percentage": _percentage(yes, answered)},
                {"label": "No", "count": no, "percentage": _percentage(no, answered)},
            ]

        elif question.type == QuestionType.RATING:
            max_rating = int((question.settings or {}).get("max_rating", 5))
            scores = [int(answer.value_json) for answer in answers]
            summary.breakdown = [
                {
                    "label": str(score),
                    "count": scores.count(score),
                    "percentage": _percentage(scores.count(score), answered),
                }
                for score in range(1, max_rating + 1)
            ]
            if scores:
                summary.stats = {"average": round(sum(scores) / len(scores), 2), "max_rating": max_rating}

        elif question.type == QuestionType.NUMBER:
            values = [float(answer.value_json) for answer in answers]
            if values:
                summary.stats = {
                    "average": round(sum(values) / len(values), 2),
                    "min": min(values),
                    "max": max(values),
                }

        elif question.type in TEXT_TYPES:
            summary.samples = [answer.value_text for answer in answers[-5:] if answer.value_text]

        summaries.append(summary)

    return FormSummaryStats(
        form_id=form.id,
        total_responses=total_responses,
        completed_responses=completed,
        completion_rate=_percentage(completed, total_responses),
        avg_completion_seconds=avg_completion_seconds,
        questions=summaries,
    )
