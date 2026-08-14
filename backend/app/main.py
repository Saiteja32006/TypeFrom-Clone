from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.api.routers import forms, public, questions, responses


@asynccontextmanager
async def lifespan(app: FastAPI):
    # create_all is sufficient for a single-developer assignment; a production app
    # would use Alembic migrations here instead.
    Base.metadata.create_all(bind=engine)

    if settings.SEED_ON_STARTUP:
        from app.db.seed import seed_if_empty

        with SessionLocal() as db:
            seed_if_empty(db)

    yield


app = FastAPI(
    title="Typeform Builder API",
    version="1.0.0",
    description="Backend for a Typeform clone: form building, publishing, and response collection.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forms.router)
app.include_router(questions.router)
app.include_router(responses.router)
app.include_router(public.router)


@app.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}
