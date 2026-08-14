from fastapi import Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.db.session import get_db
from app.models import Creator, Form, Question


def get_current_creator(db: Session = Depends(get_db)) -> Creator:
    """Stand-in for authentication.

    The assignment allows a single assumed creator. Keeping it behind a dependency
    means swapping in real auth later touches exactly one function.
    """
    creator = db.scalar(select(Creator).where(Creator.email == settings.DEFAULT_CREATOR_EMAIL))
    if creator is None:
        creator = Creator(name=settings.DEFAULT_CREATOR_NAME, email=settings.DEFAULT_CREATOR_EMAIL)
        db.add(creator)
        db.commit()
        db.refresh(creator)
    return creator


def get_owned_form(
    form_id: int = Path(..., ge=1),
    db: Session = Depends(get_db),
    creator: Creator = Depends(get_current_creator),
) -> Form:
    """Load a form and assert the current creator owns it."""
    form = db.scalar(
        select(Form)
        .where(Form.id == form_id)
        .options(selectinload(Form.questions).selectinload(Question.options))
    )
    if form is None or form.creator_id != creator.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Form not found")
    return form
