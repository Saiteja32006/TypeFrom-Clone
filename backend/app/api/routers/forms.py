from fastapi import APIRouter, Depends, HTTPException, Response as HttpResponse, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_creator, get_owned_form
from app.db.base import utcnow
from app.db.session import get_db
from app.models import Creator, Form, Option, Question, Response
from app.models.enums import CHOICE_TYPES, FormStatus
from app.schemas.form import FormCreate, FormOut, FormSummaryOut, FormUpdate
from app.services import questions as question_service
from app.services.serialization import form_out, form_summary_out
from app.services.slugs import unique_slug

router = APIRouter(prefix="/api/forms", tags=["forms"])


@router.get("", response_model=list[FormSummaryOut])
def list_forms(db: Session = Depends(get_db), creator: Creator = Depends(get_current_creator)):
    """Dashboard list, with question and response counts computed in SQL."""
    question_counts = dict(
        db.execute(
            select(Question.form_id, func.count())
            .where(Question.deleted_at.is_(None))
            .group_by(Question.form_id)
        ).all()
    )
    response_counts = dict(
        db.execute(
            select(Response.form_id, func.count())
            .where(Response.is_complete.is_(True))
            .group_by(Response.form_id)
        ).all()
    )
    # Every response, complete or not. The dashboard needs both numbers to show
    # a completion rate; response_count alone cannot distinguish "no responses"
    # from "all responses abandoned".
    started_counts = dict(
        db.execute(select(Response.form_id, func.count()).group_by(Response.form_id)).all()
    )
    forms = db.scalars(
        select(Form).where(Form.creator_id == creator.id).order_by(Form.updated_at.desc())
    ).all()
    return [
        form_summary_out(
            form,
            question_counts.get(form.id, 0),
            response_counts.get(form.id, 0),
            started_counts.get(form.id, 0),
        )
        for form in forms
    ]


@router.post("", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def create_form(
    payload: FormCreate,
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    form = Form(
        creator_id=creator.id,
        title=payload.title,
        description=payload.description,
        slug=unique_slug(db, payload.title),
    )
    db.add(form)
    db.flush()

    for index, question in enumerate(payload.questions):
        question.position = index
        question_service.create_question(db, form.id, question)

    db.commit()
    db.refresh(form)
    return form_out(form)


@router.get("/{form_id}", response_model=FormOut)
def get_form(form: Form = Depends(get_owned_form)):
    return form_out(form)


@router.patch("/{form_id}", response_model=FormOut)
def update_form(
    payload: FormUpdate, form: Form = Depends(get_owned_form), db: Session = Depends(get_db)
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(form, field, value)
    db.commit()
    db.refresh(form)
    return form_out(form)


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    db.delete(form)
    db.commit()
    return HttpResponse(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{form_id}/duplicate", response_model=FormOut, status_code=status.HTTP_201_CREATED)
def duplicate_form(
    form: Form = Depends(get_owned_form),
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
):
    """Deep-copy definition only. Responses belong to the original form and are not copied,
    and the copy always starts as a draft with a fresh slug."""
    copy = Form(
        creator_id=creator.id,
        title=f"{form.title} (copy)",
        description=form.description,
        slug=unique_slug(db, form.title),
        theme=dict(form.theme or {}),
        thankyou_title=form.thankyou_title,
        thankyou_message=form.thankyou_message,
        status=FormStatus.DRAFT,
    )
    db.add(copy)
    db.flush()

    for question in form.live_questions:
        clone = Question(
            form_id=copy.id,
            type=question.type,
            title=question.title,
            description=question.description,
            is_required=question.is_required,
            position=question.position,
            settings=dict(question.settings or {}),
        )
        if question.type in CHOICE_TYPES:
            clone.options = [
                Option(label=option.label, position=option.position) for option in question.options
            ]
        db.add(clone)

    db.commit()
    db.refresh(copy)
    return form_out(copy)


@router.post("/{form_id}/publish", response_model=FormOut)
def publish_form(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    if not form.live_questions:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Add at least one question before publishing"
        )
    form.status = FormStatus.PUBLISHED
    form.published_at = form.published_at or utcnow()
    db.commit()
    db.refresh(form)
    return form_out(form)


@router.post("/{form_id}/unpublish", response_model=FormOut)
def unpublish_form(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    form.status = FormStatus.DRAFT
    db.commit()
    db.refresh(form)
    return form_out(form)
