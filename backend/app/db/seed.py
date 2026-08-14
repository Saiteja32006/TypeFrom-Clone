"""Idempotent demo data.

Runs on startup so a fresh deployment is immediately usable: two published forms
with mixed question types and existing responses, plus one draft.
"""

import random
from datetime import timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import utcnow
from app.models import Answer, Creator, Form, Option, Question, Response
from app.models.enums import FormStatus, QuestionType

CUSTOMER_FEEDBACK = {
    "title": "Customer feedback",
    "description": "Help us make the product better — takes under a minute.",
    "slug": "customer-feedback-demo",
    "thankyou_title": "Thanks for the feedback!",
    "thankyou_message": "We read every single response.",
    "theme": {"accent": "#0445AF", "background": "#FFFFFF", "text": "#0B0B0B", "font": "inter"},
    "questions": [
        {"type": QuestionType.SHORT_TEXT, "title": "What's your first name?", "is_required": True,
         "settings": {"placeholder": "Type your answer here..."}},
        {"type": QuestionType.EMAIL, "title": "What's your email address?",
         "description": "We'll only use it to follow up on your feedback.", "is_required": True},
        {"type": QuestionType.RATING, "title": "How would you rate your overall experience?",
         "is_required": True, "settings": {"max_rating": 5}},
        {"type": QuestionType.MULTIPLE_CHOICE, "title": "Which features do you use most?",
         "description": "Select all that apply.", "settings": {"allow_multiple": True},
         "options": ["Form builder", "Analytics", "Integrations", "Templates"]},
        {"type": QuestionType.DROPDOWN, "title": "How did you hear about us?",
         "options": ["Search engine", "Social media", "A friend", "Advertisement", "Other"]},
        {"type": QuestionType.YES_NO, "title": "Would you recommend us to a colleague?",
         "is_required": True},
        {"type": QuestionType.LONG_TEXT, "title": "Anything else you'd like us to know?",
         "settings": {"placeholder": "Share your thoughts..."}},
    ],
}

EVENT_SIGNUP = {
    "title": "Product launch RSVP",
    "description": "Join us for the launch — reserve your spot below.",
    "slug": "product-launch-rsvp",
    "thankyou_title": "You're on the list!",
    "thankyou_message": "Check your inbox for joining details.",
    "theme": {"accent": "#E64A19", "background": "#FFF8F2", "text": "#1A1A1A", "font": "inter"},
    "questions": [
        {"type": QuestionType.SHORT_TEXT, "title": "What's your full name?", "is_required": True},
        {"type": QuestionType.EMAIL, "title": "Where should we send your ticket?", "is_required": True},
        {"type": QuestionType.NUMBER, "title": "How many guests are you bringing?",
         "settings": {"min": 0, "max": 5}},
        {"type": QuestionType.DROPDOWN, "title": "Which session will you attend?",
         "is_required": True, "options": ["Morning keynote", "Afternoon workshop", "Evening mixer"]},
        {"type": QuestionType.YES_NO, "title": "Do you have any dietary requirements?"},
    ],
}

DRAFT_SURVEY = {
    "title": "Employee pulse survey",
    "description": "A quick check-in on how the team is doing.",
    "slug": "employee-pulse-draft",
    "thankyou_title": "Thanks for checking in!",
    "thankyou_message": None,
    "theme": {"accent": "#2F855A", "background": "#FFFFFF", "text": "#0B0B0B", "font": "inter"},
    "questions": [
        {"type": QuestionType.RATING, "title": "How has your week been?",
         "is_required": True, "settings": {"max_rating": 5}},
        {"type": QuestionType.LONG_TEXT, "title": "What's blocking you right now?"},
    ],
}


def _build_form(db: Session, creator: Creator, spec: dict, status: FormStatus) -> Form:
    form = Form(
        creator_id=creator.id,
        title=spec["title"],
        description=spec["description"],
        slug=spec["slug"],
        status=status,
        theme=spec["theme"],
        thankyou_title=spec["thankyou_title"],
        thankyou_message=spec["thankyou_message"],
        published_at=utcnow() if status == FormStatus.PUBLISHED else None,
    )
    db.add(form)
    db.flush()

    for position, spec_question in enumerate(spec["questions"]):
        question = Question(
            form_id=form.id,
            type=spec_question["type"],
            title=spec_question["title"],
            description=spec_question.get("description"),
            is_required=spec_question.get("is_required", False),
            position=position,
            settings=spec_question.get("settings", {}),
        )
        question.options = [
            Option(label=label, position=index)
            for index, label in enumerate(spec_question.get("options", []))
        ]
        db.add(question)

    db.flush()
    return form


#: Sample answers keyed by question type, used to fabricate believable responses.
FIRST_NAMES = ["Aditi", "Marcus", "Leila", "Tomás", "Priya", "Jonas", "Mei", "Rahul"]
LONG_ANSWERS = [
    "The builder is genuinely fast, but I'd love keyboard shortcuts for adding questions.",
    "Loading times are great. Reporting could use more filtering options.",
    "Honestly no complaints so far — it does exactly what I need.",
    "Would be great to have conditional logic without upgrading the plan.",
]


def _fake_value(question: Question, rng: random.Random):
    """Return (value_json, value_text, options) for a generated answer."""
    if question.type == QuestionType.SHORT_TEXT:
        name = rng.choice(FIRST_NAMES)
        return name, name, []
    if question.type == QuestionType.LONG_TEXT:
        text = rng.choice(LONG_ANSWERS)
        return text, text, []
    if question.type == QuestionType.EMAIL:
        email = f"{rng.choice(FIRST_NAMES).lower()}{rng.randint(10, 99)}@example.com"
        return email, email, []
    if question.type == QuestionType.NUMBER:
        number = rng.randint(0, 4)
        return number, str(number), []
    if question.type == QuestionType.YES_NO:
        flag = rng.random() > 0.25
        return flag, "Yes" if flag else "No", []
    if question.type == QuestionType.RATING:
        score = rng.choices([5, 4, 3, 2, 1], weights=[8, 7, 3, 1, 1])[0]
        return score, str(score), []
    if question.type in {QuestionType.MULTIPLE_CHOICE, QuestionType.DROPDOWN}:
        if not question.options:
            return None, None, []
        allow_multiple = bool((question.settings or {}).get("allow_multiple"))
        if allow_multiple:
            picked = rng.sample(question.options, rng.randint(1, min(3, len(question.options))))
            return [o.id for o in picked], ", ".join(o.label for o in picked), picked
        picked_one = rng.choice(question.options)
        return picked_one.id, picked_one.label, [picked_one]
    return None, None, []


def _seed_responses(db: Session, form: Form, count: int, rng: random.Random) -> None:
    for index in range(count):
        started = utcnow() - timedelta(days=rng.randint(0, 12), hours=rng.randint(0, 23))
        # Roughly one in six respondents drops off, so completion-rate stats are non-trivial.
        complete = rng.random() > 0.17
        response = Response(
            form_id=form.id,
            is_complete=complete,
            started_at=started,
            submitted_at=started + timedelta(minutes=rng.randint(1, 6)) if complete else None,
        )
        db.add(response)
        db.flush()

        questions = form.live_questions if complete else form.live_questions[: rng.randint(1, 3)]
        for question in questions:
            if not question.is_required and rng.random() < 0.2:
                continue  # optional question genuinely skipped
            value, text, options = _fake_value(question, rng)
            if value is None:
                continue
            answer = Answer(
                response_id=response.id,
                question_id=question.id,
                value_json=value,
                value_text=text,
            )
            answer.selected_options = options
            db.add(answer)
    db.flush()


def seed_if_empty(db: Session) -> None:
    """No-op if any form already exists, so restarts never duplicate demo data."""
    if db.scalar(select(Form.id).limit(1)) is not None:
        return

    creator = db.scalar(select(Creator).where(Creator.email == settings.DEFAULT_CREATOR_EMAIL))
    if creator is None:
        creator = Creator(name=settings.DEFAULT_CREATOR_NAME, email=settings.DEFAULT_CREATOR_EMAIL)
        db.add(creator)
        db.flush()

    rng = random.Random(42)  # deterministic demo data

    feedback = _build_form(db, creator, CUSTOMER_FEEDBACK, FormStatus.PUBLISHED)
    rsvp = _build_form(db, creator, EVENT_SIGNUP, FormStatus.PUBLISHED)
    _build_form(db, creator, DRAFT_SURVEY, FormStatus.DRAFT)

    _seed_responses(db, feedback, 18, rng)
    _seed_responses(db, rsvp, 9, rng)

    db.commit()
