import re
import secrets

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Form

_NON_SLUG = re.compile(r"[^a-z0-9]+")


def slugify(value: str) -> str:
    return _NON_SLUG.sub("-", value.lower()).strip("-")[:48] or "form"


def unique_slug(db: Session, title: str) -> str:
    """Readable slug plus a short random suffix.

    The suffix makes the public URL unguessable enough that unpublished-then-republished
    forms are not trivially enumerable, and removes the need for a retry loop in practice
    (the loop below is a cheap safety net).
    """
    base = slugify(title)
    for _ in range(10):
        candidate = f"{base}-{secrets.token_urlsafe(5).lower().replace('_', '').replace('-', '')[:6]}"
        exists = db.scalar(select(Form.id).where(Form.slug == candidate))
        if not exists:
            return candidate
    return f"{base}-{secrets.token_hex(8)}"
