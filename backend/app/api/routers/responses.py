import csv
import io

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_owned_form
from app.db.session import get_db
from app.models import Answer, Form, Response
from app.schemas.response import FormSummaryStats, ResponseOut, ResponseRowOut
from app.services.serialization import response_out
from app.services.stats import build_form_summary

router = APIRouter(prefix="/api/forms/{form_id}", tags=["responses"])


def _load_responses(db: Session, form: Form) -> list[Response]:
    return db.scalars(
        select(Response)
        .where(Response.form_id == form.id)
        .options(selectinload(Response.answers).selectinload(Answer.question))
        .order_by(Response.started_at.desc())
    ).all()


@router.get("/responses", response_model=list[ResponseRowOut])
def list_responses(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    """Table view: one row per submission, answers keyed by question id."""
    return [
        ResponseRowOut(
            id=response.id,
            token=response.token,
            is_complete=response.is_complete,
            started_at=response.started_at,
            submitted_at=response.submitted_at,
            answers={answer.question_id: answer.value_text for answer in response.answers},
        )
        for response in _load_responses(db, form)
    ]


@router.get("/summary", response_model=FormSummaryStats)
def form_summary(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    return build_form_summary(db, form)


@router.get("/responses/export")
def export_csv(form: Form = Depends(get_owned_form), db: Session = Depends(get_db)):
    """CSV export: one column per live question, plus submission metadata."""
    live = form.live_questions
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["Response ID", "Submitted at", "Complete"] + [q.title or "Untitled" for q in live])

    for response in reversed(_load_responses(db, form)):
        by_question = {answer.question_id: answer.value_text or "" for answer in response.answers}
        writer.writerow(
            [
                response.token,
                response.submitted_at.isoformat() if response.submitted_at else "",
                "yes" if response.is_complete else "no",
            ]
            + [by_question.get(question.id, "") for question in live]
        )

    buffer.seek(0)
    filename = f"{form.slug}-responses.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/responses/{response_id}", response_model=ResponseOut)
def get_response(
    response_id: int, form: Form = Depends(get_owned_form), db: Session = Depends(get_db)
):
    response = db.scalar(
        select(Response)
        .where(Response.id == response_id, Response.form_id == form.id)
        .options(selectinload(Response.answers).selectinload(Answer.question))
    )
    if response is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Response not found")
    return response_out(response)
