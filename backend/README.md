# Typeform Builder — Backend

FastAPI + SQLAlchemy backend for the Typeform clone. Serves the creator-facing builder API
and the public, unauthenticated respondent API.

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Tables are created and demo data is seeded on first startup. Interactive API docs at
`http://localhost:8000/docs`.

Run the end-to-end check with `python smoke_test.py`.

## Architecture

```
app/
  core/config.py        environment-driven settings
  db/       base.py     declarative base + timestamp mixin
            session.py  engine, session factory, SQLite FK pragma
            seed.py     idempotent demo data
  models/               ORM models (one module per aggregate)
  schemas/              Pydantic request/response contracts
  services/             business logic: validation, ordering, stats, slugs, serialization
  api/routers/          HTTP layer only — parse, delegate, return
```

Routers stay thin: anything with a rule in it lives in `services/`, so the logic is testable
without HTTP and reusable between the creator and public endpoints.

## Database schema

| Table | Key columns | Notes |
|---|---|---|
| `creators` | id, name, email | Auth is stubbed to one seeded creator |
| `forms` | id, creator_id →creators, title, slug (unique), status, theme, thankyou_*, published_at | `slug` is the public handle |
| `questions` | id, form_id →forms, type, title, is_required, position, settings, deleted_at | Soft-deleted; ordered by (form_id, position) |
| `options` | id, question_id →questions, label, position | Rows, not JSON |
| `responses` | id, form_id →forms, token, is_complete, started_at, submitted_at | One submission |
| `answers` | id, response_id →responses, question_id →questions, value_json, value_text | Unique (response_id, question_id) |
| `answer_options` | answer_id →answers, option_id →options | Join table for choice selections |

Three decisions worth calling out:

**Options are rows, not a JSON array.** Summary statistics become a `GROUP BY option_id`
over `answer_options` rather than JSON parsing in Python, and answers hold a genuine
foreign key to the option they selected.

**`value_json` + denormalised `value_text`.** `value_json` is canonical and typed — a number
stays a number, a multi-select stays a list — so validation and stats operate on real types.
`value_text` is the flat display string, so the responses table and CSV export never
re-serialise per row.

**Questions are soft-deleted.** Deleting a question in the builder must not destroy answers
already collected for it; a hard delete would cascade and make historical responses
unreadable. `deleted_at` hides it from the builder while the answer rows survive.

Ordering uses a plain index on `(form_id, position)` rather than a UNIQUE constraint:
reordering rewrites several rows in one transaction and soft-deleted rows keep their old
position, so uniqueness would fight both. Order is owned by `services/questions.reorder`,
which renumbers `0..n-1` atomically.

## API

### Creator (assumes the default creator)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/forms` | Dashboard list with question + response counts |
| POST | `/api/forms` | Create a form |
| GET/PATCH/DELETE | `/api/forms/{id}` | Read, rename/retheme, delete |
| POST | `/api/forms/{id}/duplicate` | Deep-copy the definition as a new draft |
| POST | `/api/forms/{id}/publish` `/unpublish` | Toggle status, mint the share URL |
| GET/POST | `/api/forms/{id}/questions` | List, add |
| PATCH | `/api/forms/{id}/questions/reorder` | Whole-list reorder in one request |
| PATCH/DELETE | `/api/forms/{id}/questions/{qid}` | Edit, soft-delete |
| GET | `/api/forms/{id}/responses` | Submission table |
| GET | `/api/forms/{id}/responses/{rid}` | One response in full |
| GET | `/api/forms/{id}/summary` | Per-question stats + completion rate |
| GET | `/api/forms/{id}/responses/export` | CSV download |

### Public (no auth)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/f/{slug}` | Published form definition only |
| POST | `/api/f/{slug}/responses` | Validate and store a submission |

Public routes live in their own namespace so a draft form can never leak through a creator
route that forgot an ownership check. Unpublished and nonexistent slugs both return the same
404, so unpublished forms aren't distinguishable from missing ones.

Validation failures return **422** with `detail.errors` as a `{question_id: message}` map, so
the respondent UI can highlight every offending question at once instead of one at a time.

## Assumptions

- Single creator, no authentication — permitted by the brief. It sits behind
  `get_current_creator`, so adding real auth touches one function.
- `Base.metadata.create_all` on startup instead of Alembic migrations, appropriate for the
  scope of this assignment.
- Editing a question's options clears the tallies for those options, since the old counts no
  longer describe the new choices.

## Deployment (Render)

Render's free filesystem is ephemeral: a SQLite file is wiped on every redeploy and cold
start. The DB layer is driven by `DATABASE_URL`, so production points at Postgres with no
code change.

- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Env: `DATABASE_URL` (Postgres URL), `CORS_ORIGINS` and `FRONTEND_URL` (the Vercel domain)

`seed_if_empty` is a no-op once any form exists, so restarts never duplicate demo data.
