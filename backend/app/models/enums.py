import enum


class FormStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"


class QuestionType(str, enum.Enum):
    SHORT_TEXT = "short_text"
    LONG_TEXT = "long_text"
    MULTIPLE_CHOICE = "multiple_choice"
    DROPDOWN = "dropdown"
    EMAIL = "email"
    NUMBER = "number"
    YES_NO = "yes_no"
    RATING = "rating"


#: Question types whose answers reference rows in the `options` table.
CHOICE_TYPES = {QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN}
