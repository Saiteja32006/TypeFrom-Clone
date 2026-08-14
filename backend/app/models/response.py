import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    String,
    Table,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow

if TYPE_CHECKING:
    from app.models.form import Form
    from app.models.option import Option
    from app.models.question import Question


#: Join table linking a choice answer to the option rows it selected.
#: Modelled as a many-to-many so a single multi-select answer stays one Answer row.
answer_options = Table(
    "answer_options",
    Base.metadata,
    Column("answer_id", ForeignKey("answers.id", ondelete="CASCADE"), primary_key=True),
    Column("option_id", ForeignKey("options.id", ondelete="CASCADE"), primary_key=True),
)


class Response(Base):
    """One submission (complete or partial) of a form by a respondent."""

    __tablename__ = "responses"

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)

    # Opaque public handle, so a respondent can be given a receipt without leaking row ids.
    token: Mapped[str] = mapped_column(
        String(36), default=lambda: str(uuid.uuid4()), unique=True, index=True
    )

    # Partial-response tracking: rows start incomplete and flip on submit.
    is_complete: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)

    form: Mapped["Form"] = relationship(back_populates="responses")
    answers: Mapped[list["Answer"]] = relationship(
        back_populates="response", cascade="all, delete-orphan"
    )


class Answer(Base):
    """A single question's answer within a response."""

    __tablename__ = "answers"
    # One answer per question per response; makes upserting a partial response trivial.
    __table_args__ = (UniqueConstraint("response_id", "question_id", name="uq_answer_per_question"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    response_id: Mapped[int] = mapped_column(
        ForeignKey("responses.id", ondelete="CASCADE"), index=True
    )
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), index=True
    )

    # Canonical typed value: a number stays a number, a multi-select stays a list.
    value_json: Mapped[Any | None] = mapped_column(JSON, nullable=True)
    # Denormalised flat rendering of the same value, so the responses table and the
    # CSV export never have to re-serialise per row.
    value_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    response: Mapped["Response"] = relationship(back_populates="answers")
    question: Mapped["Question"] = relationship()
    selected_options: Mapped[list["Option"]] = relationship(secondary=answer_options)
