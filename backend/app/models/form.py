from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin
from app.models.enums import FormStatus

if TYPE_CHECKING:
    from app.models.creator import Creator
    from app.models.question import Question
    from app.models.response import Response

DEFAULT_THEME: dict[str, Any] = {
    "accent": "#0445AF",
    "background": "#FFFFFF",
    "text": "#0B0B0B",
    "font": "inter",
}


class Form(Base, TimestampMixin):
    __tablename__ = "forms"

    id: Mapped[int] = mapped_column(primary_key=True)
    creator_id: Mapped[int] = mapped_column(
        ForeignKey("creators.id", ondelete="CASCADE"), index=True
    )

    title: Mapped[str] = mapped_column(String(255), default="Untitled form")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Public identifier used in the shareable URL (/f/{slug}); never exposes the numeric id.
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)

    status: Mapped[FormStatus] = mapped_column(
        Enum(FormStatus, native_enum=False, values_callable=lambda e: [m.value for m in e]),
        default=FormStatus.DRAFT,
        index=True,
    )

    # Free-form presentation settings (colours, font). JSON keeps theming iterable
    # without a migration every time the frontend adds a knob.
    theme: Mapped[dict[str, Any]] = mapped_column(JSON, default=lambda: dict(DEFAULT_THEME))

    thankyou_title: Mapped[str] = mapped_column(String(255), default="Thanks for completing this typeform!")
    thankyou_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    published_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    creator: Mapped["Creator"] = relationship(back_populates="forms")
    questions: Mapped[list["Question"]] = relationship(
        back_populates="form",
        cascade="all, delete-orphan",
        order_by="Question.position",
    )
    responses: Mapped[list["Response"]] = relationship(
        back_populates="form", cascade="all, delete-orphan"
    )

    @property
    def is_published(self) -> bool:
        return self.status == FormStatus.PUBLISHED

    @property
    def live_questions(self) -> list["Question"]:
        """Questions excluding soft-deleted ones, in display order."""
        return [q for q in self.questions if q.deleted_at is None]
