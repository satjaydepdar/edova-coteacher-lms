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

from camel_society import agents
from camel_society.tasks import run_society

app = FastAPI(title="Edova CAMEL Lesson Society", version="0.1.0")

_model = None


def _ensure_model():
    """Build the shared Gemini model on first request and cache it. Importing
    this module (i.e. starting the server) no longer requires GEMINI_API_KEY —
    a missing key surfaces here, on the first lesson-plan request."""
    global _model
    if _model is None:
        _model = agents.build_model()
    return _model

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
    # Teacher-picked NEP 2020 concepts (e.g. "Case Study", "Critical thinking")
    # the objective and assessment questions must be grounded in.
    nep_concepts: list[str] = []


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
        "title": "",
        "duration": str(duration),
        "objective": "",
        "outcomes": [],
        "warmup": "",
        "instruction": "",
        "activity": "",
        "assessment": "",
        "homework": "",
    }

    curriculum = _parse_json(result.get("curriculum", ""))
    if curriculum:
        outcomes = curriculum.get("learning_outcomes", [])
        plan["outcomes"] = [str(o) for o in outcomes] if isinstance(outcomes, list) else [str(outcomes)]

    pedagogy = _parse_json(result.get("lesson", ""))
    if pedagogy:
        plan["title"] = str(pedagogy.get("title", "")) or topic
        plan["objective"] = str(pedagogy.get("objective", ""))
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

    plan["title"] = plan["title"] or topic

    return plan


@app.post("/api/lesson-plan")
def lesson_plan(req: LessonPlanRequest):
    topic = req.topic.strip()
    if not topic:
        raise HTTPException(status_code=400, detail="topic is required")
    try:
        _ensure_model()
        result = run_society(
            topic=topic,
            duration=req.duration,
            board=req.board or "CBSE",
            class_label=req.class_label or "",
            subject=req.subject or "",
            unit=req.unit or "",
            nep_concepts=req.nep_concepts,
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


# ============================================================
# Quiz blueprint (Skill 1: exam-blueprint) — single agent, not the
# 4-agent society: question generation is one well-specified task.
# Rules come from instructions/skills/exam-blueprint-skill.md:
#   30/50/20 easy/medium/hard spread, every item tagged sub-topic +
#   difficulty, plausible distractors from real student mistakes,
#   full answer key with a one-line "why", blueprint table derived
#   server-side so it can never disagree with the questions.
# ============================================================

from camel.agents import ChatAgent
from camel.messages import BaseMessage


class QuizRequest(BaseModel):
    class_label: str                      # 'Class 10'
    subject: str                          # 'Mathematics'
    chapter: str                          # '2. Polynomials'
    topics: list[str] = []                # sub-topics to cover; empty = whole chapter
    count: int = 10
    emphasis: str = "balanced"            # 'recall' | 'balanced' | 'application'
    common_mistakes: list[str] = []       # real wrong answers from the memory layer


_QUIZ_SYSTEM = """
You are an expert CBSE assessment designer. Generate a balanced practice
assessment. Rules you MUST follow:

COVERAGE & DIFFICULTY
- Cover every requested sub-topic; no sub-topic may dominate by accident.
- Difficulty spread: ~30% easy (recall), ~50% medium (apply one idea),
  ~20% hard (combine ideas or transfer to a new case).
- Tag every item with its sub_topic and difficulty.

ITEM QUALITY
- mcq: exactly 4 options, one unambiguously correct. Distractors must be
  plausible and reflect common student mistakes. No "all of the above",
  no joke options, no answer given away by the phrasing.
- short_answer: one clear expected response; the "answer" field states what
  a full-credit answer contains.
- application: a scenario requiring steps; "answer" allots points per step.
- Never write a question whose answer is revealed by another question.
- Every question stands alone: no references to figures, passages, or
  "the above" that are not written inside the question itself.
- Language a Class-level student understands; stay strictly inside the
  prescribed chapter.

OUTPUT — strictly this JSON shape, nothing else:
{
  "questions": [
    {
      "n": 1,
      "type": "mcq" | "short_answer" | "application",
      "sub_topic": "...",
      "difficulty": "easy" | "medium" | "hard",
      "points": 2,
      "question": "...",
      "options": ["...", "...", "...", "..."],   // mcq only
      "answer": "...",                            // correct option text for mcq
      "why": "one line: why the answer is right"
    }
  ]
}
""".strip()

_EMPHASIS_LINE = {
    "recall": "Emphasis: RECALL — lean toward definitions, facts, direct results (mostly easy/medium).",
    "balanced": "Emphasis: BALANCED — even mix of recall and application.",
    "application": "Emphasis: APPLICATION — lean toward using ideas in new situations (mostly medium/hard).",
}


def _quiz_user_prompt(req: "QuizRequest", retry_note: str = "") -> str:
    scope = ", ".join(req.topics) if req.topics else f"the whole chapter {req.chapter}"
    mistakes = ""
    if req.common_mistakes:
        mistakes = (
            "\nReal mistakes students in this class actually made on this chapter "
            "(turn the most instructive ones into MCQ distractors):\n- "
            + "\n- ".join(req.common_mistakes[:5])
        )
    return (
        f"Board: CBSE | {req.class_label} | Subject: {req.subject} | Chapter: {req.chapter}\n"
        f"Sub-topics to cover: {scope}\n"
        f"Generate exactly {req.count} questions. "
        f"Mix of types: mostly mcq, at least 2 short_answer, at least 1 application.\n"
        f"{_EMPHASIS_LINE.get(req.emphasis, _EMPHASIS_LINE['balanced'])}"
        f"{mistakes}"
        f"{retry_note}"
    )


def _difficulty_targets(count: int):
    easy = round(count * 0.3)
    medium = round(count * 0.5)
    return easy, medium, count - easy - medium


def _validate_quiz(items: list, count: int) -> tuple:
    """Return (ok, problem). Structural checks + the 30/50/20 spread (±1 each)."""
    if not isinstance(items, list) or not items:
        return False, "no questions generated"
    seen_diffs = {"easy": 0, "medium": 0, "hard": 0}
    for i, q in enumerate(items, start=1):
        if not isinstance(q, dict):
            return False, f"item {i} is not an object"
        if not q.get("question") or not q.get("answer"):
            return False, f"item {i} missing question/answer"
        # The answer key must explain, not just state — every item needs a why.
        if not str(q.get("why", "")).strip():
            return False, f"item {i} missing the one-line why"
        d = str(q.get("difficulty", "")).lower()
        if d not in seen_diffs:
            return False, f"item {i} bad difficulty '{d}'"
        seen_diffs[d] += 1
        t = str(q.get("type", "")).lower()
        if t not in ("mcq", "short_answer", "application"):
            return False, f"item {i} bad type '{t}'"
        if t == "mcq":
            opts = q.get("options")
            if not isinstance(opts, list) or len(opts) != 4:
                return False, f"item {i} mcq needs exactly 4 options"
    te, tm, th = _difficulty_targets(count)
    for d, target in (("easy", te), ("medium", tm), ("hard", th)):
        if abs(seen_diffs[d] - target) > 1:
            return False, f"difficulty spread off: {seen_diffs}, want ~{te}/{tm}/{th}"
    return True, ""


def _normalize_quiz(items: list) -> list:
    """Fill defaults + renumber, so the frontend gets a clean, complete list."""
    out = []
    for i, q in enumerate(items, start=1):
        item = {
            "n": i,
            "type": str(q.get("type", "mcq")).lower(),
            "sub_topic": str(q.get("sub_topic", "")).strip() or "General",
            "difficulty": str(q.get("difficulty", "medium")).lower(),
            "points": q.get("points") if isinstance(q.get("points"), int) and 1 <= q["points"] <= 10 else 2,
            "question": str(q.get("question", "")).strip(),
            "answer": str(q.get("answer", "")).strip(),
            "why": str(q.get("why", "")).strip(),
        }
        if item["type"] == "mcq":
            item["options"] = [str(o) for o in q.get("options", [])][:4]
        out.append(item)
    return out


@app.post("/api/quiz-blueprint")
def quiz_blueprint(req: QuizRequest):
    if not req.chapter.strip():
        raise HTTPException(status_code=400, detail="chapter is required")
    count = max(4, min(30, req.count))
    agent = ChatAgent(
        system_message=BaseMessage.make_assistant_message(
            role_name="CBSE Assessment Designer", content=_QUIZ_SYSTEM
        ),
        model=_ensure_model(),
    )

    items, warning = [], None
    retry_note = ""
    for attempt in (1, 2):
        try:
            resp = agent.step(
                BaseMessage.make_user_message(
                    role_name="Teacher", content=_quiz_user_prompt(req, retry_note)
                )
            )
        except Exception as exc:
            raise HTTPException(status_code=502, detail=f"quiz agent failed: {exc}")
        parsed = _parse_json(resp.msg.content if resp.msg else "")
        items = parsed.get("questions", []) if parsed else []
        ok, problem = _validate_quiz(items, count)
        if ok:
            warning = None
            break
        warning = problem
        retry_note = (
            f"\nYour previous attempt was rejected: {problem}. "
            f"Regenerate the FULL set and fix exactly this."
        )

    questions = _normalize_quiz(items)
    te, tm, th = _difficulty_targets(count)
    actual = {"easy": 0, "medium": 0, "hard": 0}
    for q in questions:
        actual[q["difficulty"]] += 1
    return {
        "questions": questions,
        # Blueprint table derived server-side — guaranteed to match the questions.
        "blueprint": [
            {"n": q["n"], "sub_topic": q["sub_topic"], "difficulty": q["difficulty"],
             "type": q["type"], "points": q["points"]}
            for q in questions
        ],
        "meta": {
            "requested": req.count,
            "generated": len(questions),
            "target_spread": {"easy": te, "medium": tm, "hard": th},
            "actual_spread": actual,
            # Set when the one allowed retry still didn't validate — the UI
            # shows a warning but the teacher can still review and use the draft.
            "balance_warning": warning,
        },
    }
