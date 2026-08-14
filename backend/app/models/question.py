from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, Boolean, DateTime, Enum, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import QuestionType

if TYPE_CHECKING:
    from app.models.form import Form
    from app.models.option import Option


class Question(Base, TimestampMixin):
    __tablename__ = "questions"
    # Ordering is (form_id, position). Deliberately a plain index rather than a UNIQUE
    # constraint: reordering rewrites several rows in one transaction, and soft-deleted
    # rows keep their old position, so uniqueness would fight both. Order is owned by
    # the reorder service, which renumbers 0..n-1 atomically.
    __table_args__ = (Index("ix_questions_form_position", "form_id", "position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    form_id: Mapped[int] = mapped_column(ForeignKey("forms.id", ondelete="CASCADE"), index=True)

    type: Mapped[QuestionType] = mapped_column(
        Enum(QuestionType, native_enum=False, values_callable=lambda e: [m.value for m in e])
    )
    title: Mapped[str] = mapped_column(Text, default="")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    position: Mapped[int] = mapped_column(default=0)

    # Type-specific configuration, e.g. {"max_rating": 5}, {"min": 0, "max": 100},
    # {"allow_multiple": true}, {"placeholder": "..."}.
    settings: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    # Soft delete: removing a question from the builder must not destroy the answers
    # already collected for it, otherwise historical responses become unreadable.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)

    form: Mapped["Form"] = relationship(back_populates="questions")
    # Only live options. Soft-deleted ones stay in the table for historical
    # tallies but must never appear in the builder or the respondent flow.
    options: Mapped[list["Option"]] = relationship(
        back_populates="question",
        primaryjoin=(
            "and_(Question.id == Option.question_id, Option.deleted_at.is_(None))"
        ),
        # The extra condition in primaryjoin stops SQLAlchemy inferring the FK,
        # so it has to be named explicitly for appends to populate question_id.
        foreign_keys="Option.question_id",
        order_by="Option.position",
        # "all, delete" deliberately WITHOUT delete-orphan: deleting a question
        # deletes its options, but an option that drops out of this filtered
        # collection because it was soft-deleted must survive.
        cascade="all, delete",
        passive_deletes=True,
        viewonly=False,
    )
