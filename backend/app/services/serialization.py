"""Helpers converting ORM rows into the API's response shapes."""

from app.core.config import settings
from app.models import Answer, Form, Response
from app.schemas.form import FormOut, FormSummaryOut, PublicFormOut
from app.schemas.question import QuestionOut
from app.schemas.response import AnswerOut, ResponseOut


def share_url(form: Form) -> str | None:
    return f"{settings.FRONTEND_URL.rstrip('/')}/f/{form.slug}" if form.is_published else None


def question_out(question) -> QuestionOut:
    return QuestionOut.model_validate(question)


def form_out(form: Form) -> FormOut:
    payload = FormOut.model_validate(form)
    payload.questions = [question_out(q) for q in form.live_questions]
    payload.share_url = share_url(form)
    return payload


def public_form_out(form: Form) -> PublicFormOut:
    payload = PublicFormOut.model_validate(form)
    payload.questions = [question_out(q) for q in form.live_questions]
    return payload


def form_summary_out(
    form: Form,
    question_count: int,
    response_count: int,
    started_count: int = 0,
) -> FormSummaryOut:
    payload = FormSummaryOut.model_validate(form)
    payload.question_count = question_count
    payload.response_count = response_count
    payload.started_count = started_count
    # Share of people who reached the end. Zero starts means no rate to report,
    # which is different from a rate of 0%.
    payload.completion_rate = (
        round(response_count * 100 / started_count, 1) if started_count else None
    )
    payload.share_url = share_url(form)
    return payload


def answer_out(answer: Answer) -> AnswerOut:
    return AnswerOut(
        question_id=answer.question_id,
        question_title=answer.question.title,
        question_type=answer.question.type,
        value=answer.value_json,
        value_text=answer.value_text,
    )


def response_out(response: Response) -> ResponseOut:
    return ResponseOut(
        id=response.id,
        token=response.token,
        is_complete=response.is_complete,
        started_at=response.started_at,
        submitted_at=response.submitted_at,
        # Sorted by the question's display position so the detail view always
        # reads in form order, rather than relying on insertion order.
        answers=[
            answer_out(answer)
            for answer in sorted(response.answers, key=lambda a: a.question.position)
        ],
    )
