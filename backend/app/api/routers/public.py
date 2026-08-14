"""Unauthenticated endpoints powering the respondent flow.

Kept in a separate namespace (/api/f/...) from the creator API so that a draft form
can never leak through a route that merely forgot an ownership check.
"""

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.db.base import utcnow
from app.db.session import get_db
from app.models import Answer, Form, Question, Response
from app.models.enums import FormStatus
from app.schemas.form import PublicFormOut
from app.schemas.response import ResponseCreate, SubmitAck
from app.services.serialization import public_form_out
from app.services.validation import AnswerValidationError, validate_submission

router = APIRouter(prefix="/api/f", tags=["public"])


def get_published_form(slug: str, db: Session = Depends(get_db)) -> Form:
    form = db.scalar(
        select(Form)
        .where(Form.slug == slug, Form.status == FormStatus.PUBLISHED)
        .options(selectinload(Form.questions).selectinload(Question.options))
    )
    if form is None:
        # Same 404 for "no such form" and "not published", so unpublished slugs
        # are not distinguishable from nonexistent ones.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This form is not available")
    return form


@router.get("/{slug}", response_model=PublicFormOut)
def read_public_form(form: Form = Depends(get_published_form)):
    return public_form_out(form)


@router.post(
    "/{slug}/responses",
    response_model=SubmitAck,
    status_code=status.HTTP_201_CREATED,
    responses={
        # Override FastAPI's auto-generated HTTPValidationError schema. This route
        # raises its own 422 with a question_id -> message map, so the default
        # loc/msg shape shown in /docs would mislead any client coding against it.
        422: {
            "description": "One or more answers failed server-side validation",
            "content": {
                "application/json": {
                    "example": {
                        "detail": {
                            "message": "Some answers need attention",
                            "errors": {"8": "This question is required",
                                       "9": "Enter a valid email address"},
                        }
                    }
                }
            },
        },
        404: {"description": "No published form exists at this slug"},
    },
)
def submit_response(
    payload: ResponseCreate,
    request: Request,
    form: Form = Depends(get_published_form),
    db: Session = Depends(get_db),
):
    submitted = {answer.question_id: answer.value for answer in payload.answers}
    questions = form.live_questions

    try:
        cleaned = validate_submission(questions, submitted)
    except AnswerValidationError as exc:
        # 422 with a question_id -> message map the respondent UI can render inline.
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"message": "Some answers need attention", "errors": exc.errors},
        ) from exc

    response = Response(
        form_id=form.id,
        is_complete=payload.is_complete,
        submitted_at=utcnow() if payload.is_complete else None,
        user_agent=request.headers.get("user-agent", "")[:500] or None,
    )
    db.add(response)
    db.flush()

    for question in questions:
        value, text, options = cleaned[question.id]
        if value is None:
            # Skipped optional question: no row, so "answered" counts stay honest.
            continue
        answer = Answer(
            response_id=response.id,
            question_id=question.id,
            value_json=value,
            value_text=text,
        )
        answer.selected_options = options
        db.add(answer)

    db.commit()
    db.refresh(response)

    return SubmitAck(
        token=response.token,
        submitted_at=response.submitted_at,
        thankyou_title=form.thankyou_title,
        thankyou_message=form.thankyou_message,
    )
