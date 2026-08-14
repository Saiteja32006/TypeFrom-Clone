from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.question import Question  # noqa: F401  (ensures mapper registration order)

if TYPE_CHECKING:
    pass


class Option(Base):
    """A selectable choice belonging to a multiple-choice or dropdown question.

    Stored as rows rather than a JSON blob so that summary statistics are a
    GROUP BY over answer_options, and so answers hold a real foreign key.
    """

    __tablename__ = "options"
    __table_args__ = (Index("ix_options_question_position", "question_id", "position"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    question_id: Mapped[int] = mapped_column(
        ForeignKey("questions.id", ondelete="CASCADE"), index=True
    )
    label: Mapped[str] = mapped_column(String(500))
    position: Mapped[int] = mapped_column(default=0)
    # Soft delete, mirroring Question. A removed choice keeps its row so the
    # answer_options tallies already collected against it still resolve.
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, index=True)

    question: Mapped["Question"] = relationship(back_populates="options")
