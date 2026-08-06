"""
FastAPI wrapper around the CAMEL lesson-planning society.

Run from the edova-camel directory:
    uvicorn api:app --port 8002

POST /api/lesson-plan  {"topic": "...", "duration": 45}
Returns the LessonPlan shape expected by edova-web's LessonPlanner page,
plus the raw agent outputs for debugging. `raw.grounding` reports which
edova-third-brain OKF chapter (if any) the plan was grounded in.
"""

import json
import re
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from camel_society.tasks import run_society

app = FastAPI(title="Edova CAMEL Lesson Society", version="0.1.0")

# Allow the Vite dev server on any localhost port — it picks 5174, 5175, …
# when 5173 is taken, so a fixed list breaks the moment the port shifts.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class LessonPlanRequest(BaseModel):
    topic: str
    duration: int = 45
    # Optional teaching context — used to ground the society dynamically.
    # Omitted fields simply narrow the grounding; nothing is hardcoded.
    board: str = "CBSE"
    class_label: Optional[str] = None
    subject: Optional[str] = None
    unit: Optional[str] = None


def _repair_truncated(s: str) -> str:
    """Close a JSON document cut off mid-stream by the token limit."""
    in_str = esc = False
    stack: list = []
    last_good = -1
    for i, ch in enumerate(s):
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch in "{[":
                stack.append(ch)
            elif ch in "}]":
                if stack:
                    stack.pop()
                last_good = i
            elif ch.isdigit() or ch in "-.truefalsn":
                last_good = i
    if last_good < 0:
        return s
    s = s[: last_good + 1].rstrip()
    while s and s[-1] in ",:":
        s = s[:-1].rstrip()
    if s.count('"') % 2 == 1:  # unterminated key/value string
        s = s[: s.rfind('"')].rstrip()
        while s and s[-1] in ",:":
            s = s[:-1].rstrip()
    stack = []
    in_str = esc = False
    for ch in s:
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch in "{[":
                stack.append(ch)
            elif ch in "}]" and stack:
                stack.pop()
    closers = {"{": "}", "[": "]"}
    return s + "".join(closers[c] for c in reversed(stack))


def _parse_json(text: str) -> dict:
    """Best-effort JSON extraction from an agent reply (fenced, maybe truncated)."""
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.MULTILINE)
    candidates = [cleaned]
    match = re.search(r"\{.*", cleaned, flags=re.DOTALL)
    if match:
        candidates.append(match.group(0))
    for candidate in candidates:
        for variant in (candidate, _repair_truncated(candidate)):
            try:
                parsed = json.loads(variant)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                continue
    return {}


# 5E phase -> LessonPlan section
_PHASE_MAP = {
    "engage": "warmup",
    "explain": "instruction",
    "explore": "activity",
    "evaluate": "assessment",
    "elaborate": "homework",
}


def _format_question(idx: int, q) -> str:
    """One assessment question as a compact, readable block — never a raw
    key:value JSON dump."""
    if not isinstance(q, dict):
        return f"{idx}. {q}"
    qtype = q.get("question_type") or q.get("type") or ""
    bloom = q.get("bloom_level") or q.get("bloom") or ""
    text = q.get("question") or q.get("text") or ""
    tag = " · ".join(str(x) for x in (qtype, bloom) if x)
    lines = [f"{idx}. " + (f"[{tag}] " if tag else "") + str(text)]
    opts = q.get("options")
    if isinstance(opts, list) and opts:
        lines += [f"   - {o}" for o in opts]
    ans = q.get("correct_answer") or q.get("answer")
    if ans:
        lines.append(f"   Answer: {ans}")
    return "\n".join(lines)


def _map_to_lesson_plan(topic: str, duration: int, result: dict) -> dict:
    plan = {
        "topic": topic,
        "duration": str(duration),
        "objective": "",
        "materials": [],
        "warmup": "",
        "instruction": "",
        "activity": "",
        "assessment": "",
        "homework": "",
    }

    pedagogy = _parse_json(result.get("lesson", ""))
    if pedagogy:
        plan["objective"] = str(pedagogy.get("objective", ""))
        materials = pedagogy.get("materials", [])
        plan["materials"] = [str(m) for m in materials] if isinstance(materials, list) else [str(materials)]
        for step in pedagogy.get("flow", []) or []:
            if not isinstance(step, dict):
                continue
            phase = str(step.get("phase", "")).lower()
            key = next((v for k, v in _PHASE_MAP.items() if k in phase), None)
            if not key:
                continue
            mins = step.get("duration_min", "?")
            teacher = step.get("teacher_does", "")
            student = step.get("student_does", "")
            # Bullet lines (one per actor) so the UI can render it readably
            # instead of a single run-on sentence.
            plan[key] = f"{mins} min\n• Teacher: {teacher}\n• Students: {student}"

    assessment = _parse_json(result.get("assessment", ""))
    ticket = assessment.get("exit_ticket") if assessment else None
    if ticket:
        blocks = [_format_question(i, q) for i, q in enumerate(ticket, start=1)]
        suffix = "\n\nAssessment questions:\n" + "\n".join(blocks)
        plan["assessment"] = (plan["assessment"] + suffix).strip()

    if not plan["objective"]:
        # Agent did not return parseable JSON; surface raw text so the
        # teacher still sees something useful.
        plan["instruction"] = plan["instruction"] or result.get("lesson", "")

    return plan


@app.post("/api/lesson-plan")
def lesson_plan(req: LessonPlanRequest):
    topic = req.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="topic is required")
    try:
        result = run_society(
            topic=topic,
            duration=req.duration,
            board=req.board or "CBSE",
            class_label=req.class_label or "",
            subject=req.subject or "",
            unit=req.unit or "",
        )
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"society run failed: {exc}")
    return {
        "plan": _map_to_lesson_plan(topic, req.duration, result),
        "raw": result,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
