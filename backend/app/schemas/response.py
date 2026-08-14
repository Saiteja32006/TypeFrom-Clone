from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import QuestionType


class AnswerIn(BaseModel):
    question_id: int
    # Shape depends on the question type; validated server-side per question.
    value: Any = None


class ResponseCreate(BaseModel):
    answers: list[AnswerIn] = Field(default_factory=list)
    is_complete: bool = True


class AnswerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    question_id: int
    question_title: str
    question_type: QuestionType
    value: Any = None
    value_text: str | None = None


class ResponseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    token: str
    is_complete: bool
    started_at: datetime
    submitted_at: datetime | None
    answers: list[AnswerOut] = Field(default_factory=list)


class ResponseRowOut(BaseModel):
    """One row of the responses table: answers keyed by question id."""

    id: int
    token: str
    is_complete: bool
    #: When they began. Partial responses have no submitted_at, so this is the
    #: only timestamp the table can show for them.
    started_at: datetime
    submitted_at: datetime | None
    answers: dict[int, str | None] = Field(default_factory=dict)


class SubmitAck(BaseModel):
    token: str
    submitted_at: datetime | None
    thankyou_title: str
    thankyou_message: str | None


class QuestionSummary(BaseModel):
    question_id: int
    title: str
    type: QuestionType
    answered: int
    skipped: int
    # Choice / yes-no / rating: [{"label": "A", "count": 4, "percentage": 40.0}]
    breakdown: list[dict[str, Any]] = Field(default_factory=list)
    # Number: mean / min / max. Text: a few recent samples.
    stats: dict[str, Any] = Field(default_factory=dict)
    samples: list[str] = Field(default_factory=list)


class FormSummaryStats(BaseModel):
    form_id: int
    total_responses: int
    completed_responses: int
    completion_rate: float
    #: Mean seconds between starting and submitting, over completed responses
    #: only. None when nothing has been completed yet.
    avg_completion_seconds: float | None = None
    questions: list[QuestionSummary] = Field(default_factory=list)
