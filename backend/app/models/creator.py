from typing import TYPE_CHECKING

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.form import Form


class Creator(Base, TimestampMixin):
    """Owner of a set of forms. Authentication is stubbed: a single seeded creator is used."""

    __tablename__ = "creators"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)

    forms: Mapped[list["Form"]] = relationship(
        back_populates="creator", cascade="all, delete-orphan"
    )
