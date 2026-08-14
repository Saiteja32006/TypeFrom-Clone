from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import QuestionType


class OptionBase(BaseModel):
    label: str = Field(min_length=1, max_length=500)


class OptionCreate(OptionBase):
    # Present when editing an existing option, absent when adding a new one.
    # Sending the id is what lets a rename preserve the option's collected tallies.
    id: int | None = None


class OptionOut(OptionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int


class QuestionBase(BaseModel):
    type: QuestionType
    title: str = ""
    description: str | None = None
    is_required: bool = False
    settings: dict[str, Any] = Field(default_factory=dict)


class QuestionCreate(QuestionBase):
    options: list[OptionCreate] = Field(default_factory=list)
    # Optional insert index; defaults to appending at the end of the form.
    position: int | None = None


class QuestionUpdate(BaseModel):
    """Every field optional: the builder PATCHes one attribute at a time."""

    type: QuestionType | None = None
    title: str | None = None
    description: str | None = None
    is_required: bool | None = None
    settings: dict[str, Any] | None = None
    # When present, replaces the whole option list for the question.
    options: list[OptionCreate] | None = None


class QuestionOut(QuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int
    options: list[OptionOut] = Field(default_factory=list)


class ReorderRequest(BaseModel):
    """Ordered list of question ids defining the new sequence."""

    question_ids: list[int] = Field(min_length=1)
