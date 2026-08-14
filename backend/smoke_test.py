"""End-to-end exercise of every endpoint against a throwaway database.

The DATABASE_URL override below must run BEFORE `app` is imported: settings are
read at import time, so setting it afterwards would be too late and the test
would scribble seed-breaking rows into the development database.
"""
import os
import tempfile

_tmp_db = os.path.join(tempfile.mkdtemp(prefix="typeform-smoke-"), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp_db}"

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

ok = lambda label, cond: print(f"{'PASS' if cond else 'FAIL'}  {label}")

with TestClient(app) as c:
    forms = c.get("/api/forms").json()
    ok(f"seed created {len(forms)} forms", len(forms) == 3)
    pub = [f for f in forms if f["status"] == "published"]
    ok("two published + counts", len(pub) == 2 and all(f["response_count"] > 0 for f in pub))
    ok("draft has no share_url", all(f["share_url"] is None for f in forms if f["status"] == "draft"))

    # --- builder CRUD ---
    fid = c.post("/api/forms", json={"title": "My new form"}).json()["id"]
    q1 = c.post(f"/api/forms/{fid}/questions", json={"type": "short_text", "title": "Name?", "is_required": True}).json()
    q2 = c.post(f"/api/forms/{fid}/questions", json={"type": "email", "title": "Email?", "is_required": True}).json()
    q3 = c.post(f"/api/forms/{fid}/questions", json={"type": "multiple_choice", "title": "Colour?",
         "settings": {"allow_multiple": True}, "options": [{"label": "Red"}, {"label": "Blue"}]}).json()
    ok("positions 0,1,2", [q1["position"], q2["position"], q3["position"]] == [0, 1, 2])

    order = c.patch(f"/api/forms/{fid}/questions/reorder", json={"question_ids": [q3["id"], q1["id"], q2["id"]]}).json()
    ok("reorder applied", [q["id"] for q in order] == [q3["id"], q1["id"], q2["id"]])
    ok("reorder renumbered", [q["position"] for q in order] == [0, 1, 2])

    upd = c.patch(f"/api/forms/{fid}/questions/{q1['id']}", json={"title": "Your name?"}).json()
    ok("question patched", upd["title"] == "Your name?" and upd["type"] == "short_text")

    # publish gate
    empty = c.post("/api/forms", json={"title": "Empty"}).json()
    ok("publish blocked w/o questions", c.post(f"/api/forms/{empty['id']}/publish").status_code == 400)

    slug = c.post(f"/api/forms/{fid}/publish").json()["slug"]
    ok("publish returns share_url", c.get(f"/api/forms/{fid}").json()["share_url"].endswith(slug))

    # --- public respondent flow ---
    ok("draft not publicly readable", c.get("/api/f/employee-pulse-draft").status_code == 404)
    pf = c.get(f"/api/f/{slug}").json()
    ok("public payload hides status/id", "status" not in pf and "id" not in pf)

    bad = c.post(f"/api/f/{slug}/responses", json={"answers": [
        {"question_id": q1["id"], "value": "  "}, {"question_id": q2["id"], "value": "not-an-email"}]})
    errs = bad.json()["detail"]["errors"]
    ok("422 on required + bad email", bad.status_code == 422 and len(errs) == 2)

    sub = c.post(f"/api/f/{slug}/responses", json={"answers": [
        {"question_id": q1["id"], "value": "Aditi"},
        {"question_id": q2["id"], "value": "aditi@example.com"},
        {"question_id": q3["id"], "value": [o["id"] for o in q3["options"]]}]})
    ok("submit 201 + thank-you copy", sub.status_code == 201 and sub.json()["thankyou_title"])

    ok("rejects foreign option id", c.post(f"/api/f/{slug}/responses", json={"answers": [
        {"question_id": q1["id"], "value": "X"}, {"question_id": q2["id"], "value": "x@y.co"},
        {"question_id": q3["id"], "value": [99999]}]}).status_code == 422)

    # --- results ---
    rows = c.get(f"/api/forms/{fid}/responses").json()
    ok("response row rendered", len(rows) == 1 and rows[0]["answers"][str(q3["id"])] == "Red, Blue")
    detail = c.get(f"/api/forms/{fid}/responses/{rows[0]['id']}").json()
    by_q = {a["question_id"]: a for a in detail["answers"]}
    ok("detail has typed values", by_q[q3["id"]]["value"] == [o["id"] for o in q3["options"]])
    ok("detail sorted by position", [a["question_id"] for a in detail["answers"]] == [q3["id"], q1["id"], q2["id"]])

    s = c.get("/api/forms/1/summary").json()
    rating = next(q for q in s["questions"] if q["type"] == "rating")
    mc = next(q for q in s["questions"] if q["type"] == "multiple_choice")
    ok("summary counts responses", s["total_responses"] == 18 and 0 < s["completion_rate"] <= 100)
    ok("rating breakdown + average", len(rating["breakdown"]) == 5 and rating["stats"]["average"] > 0)
    ok("choice breakdown from SQL join", sum(b["count"] for b in mc["breakdown"]) > 0)

    csv_r = c.get("/api/forms/1/responses/export")
    ok("csv export", csv_r.status_code == 200 and "attachment" in csv_r.headers["content-disposition"])

    # --- soft delete preserves history ---
    c.delete(f"/api/forms/{fid}/questions/{q1['id']}")
    left = c.get(f"/api/forms/{fid}/questions").json()
    ok("soft-deleted question hidden", len(left) == 2 and [q["position"] for q in left] == [0, 1])
    ok("historical answer survives", len(c.get(f"/api/forms/{fid}/responses/{rows[0]['id']}").json()["answers"]) == 3)

    dup = c.post(f"/api/forms/{fid}/duplicate").json()
    ok("duplicate is draft, no responses", dup["status"] == "draft" and len(dup["questions"]) == 2)
    ok("duplicate got new slug", dup["slug"] != slug)

    c.post(f"/api/forms/{fid}/unpublish")
    ok("unpublish kills public link", c.get(f"/api/f/{slug}").status_code == 404)
    ok("delete form", c.delete(f"/api/forms/{fid}").status_code == 204)

    # --- editing choices must not destroy collected tallies ---
    ef = c.post("/api/forms", json={"title": "Choice edit"}).json()["id"]
    eq = c.post(f"/api/forms/{ef}/questions", json={"type": "multiple_choice", "title": "Fav?",
         "is_required": True, "options": [{"label": "Analitics"}, {"label": "Builder"}]}).json()
    o1, o2 = eq["options"][0]["id"], eq["options"][1]["id"]
    eslug = c.post(f"/api/forms/{ef}/publish").json()["slug"]
    for _ in range(3):
        c.post(f"/api/f/{eslug}/responses", json={"answers": [{"question_id": eq["id"], "value": o1}]})

    tally = lambda: {b["label"]: b["count"] for b in c.get(f"/api/forms/{ef}/summary").json()["questions"][0]["breakdown"]}
    ok("votes recorded", tally().get("Analitics") == 3)

    c.patch(f"/api/forms/{ef}/questions/{eq['id']}",
            json={"options": [{"id": o1, "label": "Analytics"}, {"id": o2, "label": "Builder"}]})
    ok("rename keeps tallies", tally().get("Analytics") == 3)

    c.patch(f"/api/forms/{ef}/questions/{eq['id']}", json={"options": [{"id": o2, "label": "Builder"}]})
    live_opts = c.get(f"/api/forms/{ef}/questions").json()[0]["options"]
    ok("removed choice hidden from builder", [o["label"] for o in live_opts] == ["Builder"])
    ok("removed choice keeps history", tally().get("Analytics") == 3)
