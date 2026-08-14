from fastapi import APIRouter, Depends, HTTPException, Response as HttpResponse, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import get_owned_form
from app.db.session import get_db
from app.models import Form, Question
from app.schemas.question import QuestionCreate, QuestionOut, QuestionUpdate, ReorderRequest
from app.services import questions as question_service

router = APIRouter(prefix="/api/forms/{form_id}/questions", tags=["questions"])


def _load_question(db: Session, form: Form, question_id: int) -> Question:
    question = db.scalar(
        select(Question).where(
            Question.id == question_id,
            Question.form_id == form.id,
            Question.deleted_at.is_(None),
        )
    )
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Question not found")
    return question


@router.get("", response_model=list[QuestionOut])
def list_questions(form: Form = Depends(get_owned_form)):
    return form.live_questions


@router.post("", response_model=QuestionOut, status_code=status.HTTP_201_CREATED)
def add_question(
    payload: QuestionCreate, form: Form = Depends(get_owned_form), db: Session = Depends(get_db)
):
    question = question_service.create_question(db, form.id, payload)
    db.flush()
    question_service.normalise_positions(db, form.id)
    db.commit()
    db.refresh(question)
    return question


# Declared before /{question_id} so "reorder" is never parsed as a path parameter.
@router.patch("/reorder", response_model=list[QuestionOut])
def reorder_questions(
    payload: ReorderRequest, form: Form = Depends(get_owned_form), db: Session = Depends(get_db)
):
    """Whole-list reorder in a single transaction, so a drag-and-drop drop is one request."""
    try:
        ordered = question_service.reorder(db, form.id, payload.question_ids)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
    db.commit()
    return ordered


@router.patch("/{question_id}", response_model=QuestionOut)
def update_question(
    question_id: int,
    payload: QuestionUpdate,
    form: Form = Depends(get_owned_form),
    db: Session = Depends(get_db),
):
    question = _load_question(db, form, question_id)
    question_service.apply_update(db, question, payload)
    db.commit()
    db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: int, form: Form = Depends(get_owned_form), db: Session = Depends(get_db)
):
    question = _load_question(db, form, question_id)
    question_service.soft_delete(db, question)
    db.commit()
    return HttpResponse(status_code=status.HTTP_204_NO_CONTENT)
