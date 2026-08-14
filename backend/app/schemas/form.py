from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import FormStatus
from app.schemas.question import QuestionCreate, QuestionOut


class FormCreate(BaseModel):
    title: str = Field(default="Untitled form", max_length=255)
    description: str | None = None
    questions: list[QuestionCreate] = Field(default_factory=list)


class FormUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    theme: dict[str, Any] | None = None
    thankyou_title: str | None = None
    thankyou_message: str | None = None


class FormSummaryOut(BaseModel):
    """Lightweight shape for the dashboard list."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    status: FormStatus
    question_count: int = 0
    #: Completed responses only -- what "responses" means on the dashboard.
    response_count: int = 0
    #: Everyone who started, including those who dropped out.
    started_count: int = 0
    #: response_count / started_count, or None when nobody has started.
    completion_rate: float | None = None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None
    share_url: str | None = None


class FormOut(BaseModel):
    """Full form definition used by the builder."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str | None
    slug: str
    status: FormStatus
    theme: dict[str, Any]
    thankyou_title: str
    thankyou_message: str | None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None
    questions: list[QuestionOut] = Field(default_factory=list)
    share_url: str | None = None


class PublicFormOut(BaseModel):
    """What an unauthenticated respondent is allowed to see. Deliberately omits
    creator, status, timestamps and internal counters."""

    model_config = ConfigDict(from_attributes=True)

    title: str
    description: str | None
    slug: str
    theme: dict[str, Any]
    thankyou_title: str
    thankyou_message: str | None
    questions: list[QuestionOut] = Field(default_factory=list)
