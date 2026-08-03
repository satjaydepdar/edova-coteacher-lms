# camel_society/agents.py
import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

from camel.agents import ChatAgent
from camel.messages import BaseMessage
from camel.models import ModelFactory
from camel.types import ModelPlatformType

# Load .env from the repo root (edova-coteacher-v2/.env)
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


# Response schemas passed as `response_format` to each agent's .step() call
# (camel_society/tasks.py). Gemini enforces these at the API level, so the
# agent's reply is always valid JSON in this exact shape — the prompt's
# "Output JSON with keys: ..." instruction is a human-readable description
# of the same contract, kept as a backup for models/paths that don't honor
# response_format.
class CurriculumOutput(BaseModel):
    section_ref: str
    definition: str
    learning_outcomes: list[str]
    misconceptions: list[str]


class PedagogyPhase(BaseModel):
    phase: str
    duration_min: int
    teacher_does: str
    student_does: str


class PedagogyOutput(BaseModel):
    title: str
    objective: str
    flow: list[PedagogyPhase]


class AssessmentQuestion(BaseModel):
    question_type: str
    bloom_level: str
    question: str
    options: list[str]  # empty for non-MCQ question types
    correct_answer: str


class AssessmentOutput(BaseModel):
    exit_ticket: list[AssessmentQuestion]


class CritiqueOutput(BaseModel):
    # "pass" is a Python keyword, so the field is named `passed` instead —
    # nothing downstream parses this JSON by key, so no alias is needed.
    passed: bool
    issues: list[str]
    compliance_score: float

# Hardcoded model id — the factory default, overridable per build_model() call.
DEFAULT_MODEL_TYPE = "gemini-2.5-flash"

_model = None


def build_model(model_type: str = DEFAULT_MODEL_TYPE):
    """
    Build the shared Gemini model every agent runs on — lazily, on first use,
    then cached for the process lifetime (the first call's model_type wins).

    Importing this module no longer requires GEMINI_API_KEY; the key is only
    needed here. Still fails fast with a clear message instead of a confusing
    auth error on the first lesson-plan request.
    """
    global _model
    if _model is not None:
        return _model
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GEMINI_API_KEY is not set. Add it to edova-coteacher-v2/.env "
            "(or the environment) before starting edova-camel."
        )
    # Use Google Gemini via CAMEL's native Gemini platform.
    _model = ModelFactory.create(
        model_platform=ModelPlatformType.GEMINI,
        model_type=model_type,
        api_key=api_key,
        model_config_dict={"temperature": 0.3, "max_tokens": 8192}
    )
    return _model


class LessonContext:
    """The teaching context a lesson request carries. Every agent prompt is
    built from this — nothing about the subject/board/topic is hardcoded, so
    the society works for any topic, not one fixed chapter."""

    def __init__(self, topic, duration=45, board="CBSE", class_label="",
                 subject="", unit="", nep_concepts=None):
        self.topic = (topic or "").strip()
        self.duration = duration
        self.board = (board or "CBSE").strip()
        self.class_label = (class_label or "").strip()
        self.subject = (subject or "").strip()
        self.unit = (unit or "").strip()
        self.nep_concepts = [c.strip() for c in (nep_concepts or []) if c and c.strip()]

    def nep_line(self) -> str:
        """Instruction to ground the objective/questions in the teacher's
        selected NEP 2020 concepts. '' when none were picked."""
        if not self.nep_concepts:
            return ""
        return (
            f"NEP 2020 FOCUS — the teacher selected: {', '.join(self.nep_concepts)}. "
            f"Ground the objective and at least one assessment question in each of "
            f"these concepts (e.g. a 'Case Study' pick means one question must be a "
            f"case-study scenario; 'Critical thinking' means one question must require "
            f"reasoning, not recall)."
        )

    def curriculum_label(self) -> str:
        """e.g. 'CBSE Class 10 Mathematics' — omits parts that weren't given."""
        parts = [self.board]
        if self.class_label:
            parts.append(self.class_label)
        if self.subject:
            parts.append(self.subject)
        return " ".join(parts).strip() or self.board

    def scope_line(self) -> str:
        """Human-readable one-liner describing exactly what to plan for."""
        bits = [f'Topic: "{self.topic}"']
        if self.unit:
            bits.append(f'Unit: "{self.unit}"')
        bits.append(f"Curriculum: {self.curriculum_label()}")
        bits.append(f"Duration: {self.duration} minutes")
        return " | ".join(bits)


def build_society(ctx: LessonContext):
    """Create the four ChatAgents for one lesson request, all sharing the
    lazily-built model from build_model() — so the GEMINI_API_KEY requirement
    only materializes on first use, never at import time."""
    model = build_model()
    curriculum = ctx.curriculum_label()

    # Shared rules injected into every agent: stay grounded to the prescribed
    # textbook/chapter, no open-web references, and keep the language simple.
    grounding = (
        f"GROUNDING & STYLE RULES (follow strictly):\n"
        f"- When a 'PRESCRIBED TEXTBOOK SOURCE' excerpt is included in the message, "
        f"treat it as the authoritative source: base definitions, examples, and "
        f"wording on it and do not contradict it. If no excerpt is provided, rely on "
        f"the prescribed {ctx.board} textbook for {curriculum}.\n"
        f"- Use ONLY the prescribed {ctx.board} textbook for {curriculum} and the "
        f"curriculum context provided for this topic. Stay within this chapter/unit.\n"
        f"- Do NOT reference or cite websites, URLs, YouTube, blogs, Wikipedia, or "
        f"any external online resource. No links.\n"
        f"- Write in simple, clear language a teacher can skim: short sentences, "
        f"plain words, no jargon."
    )

    # AGENT 1: Curriculum Agent — grounds in the requested curriculum/topic,
    # whatever it is. No fixed chapter, no fixed section map.
    curriculum_sys_msg = BaseMessage.make_assistant_message(
        role_name=f"{ctx.board} Curriculum Specialist",
        content=f"""
        You are the Curriculum Agent for {curriculum}.
        {grounding}

        Ground everything in the official {curriculum} syllabus and its prescribed
        textbook. Work ONLY on the topic and unit you are given — do not substitute
        a different chapter or topic.

        For the given topic, produce:
        - section_ref: the syllabus unit/chapter/section this topic belongs to
        - definition: the key definition(s)/theorem statement(s), quoted from the
          prescribed textbook wording where possible
        - learning_outcomes: 3-4 short, concrete "student can ___" statements
          (max ~12 words each) — not a paragraph
        - misconceptions: common student errors specific to THIS topic

        Output strictly JSON with keys: section_ref, definition, learning_outcomes,
        misconceptions. Never invent content outside the {curriculum} syllabus, and
        never drift to an unrelated topic.
        """
    )

    # AGENT 2: Pedagogy Agent — generic 5E designer, duration-driven.
    pedagogy_sys_msg = BaseMessage.make_assistant_message(
        role_name="Master Teacher",
        content=f"""
        You are the Pedagogy Agent. You receive curriculum context JSON for the topic
        "{ctx.topic}" ({curriculum}). Design a 5E lesson grounded in that context.
        {grounding}

        Phases, in order, using EXACTLY these names: Engage, Explore, Explain,
        Elaborate, Evaluate. The five durations MUST sum to {ctx.duration} minutes.
        Use real-world examples from the students' own context (India / {ctx.board}).
        Keep every teacher_does / student_does under 25 words, as one plain sentence.
        Every phase must be about "{ctx.topic}" — do not reuse examples from other topics.
        {ctx.nep_line()}

        Output JSON with keys:
          title (a short, engaging lesson title for "{ctx.topic}", 6-12 words),
          objective (one measurable objective for this topic),
          flow (array of {{phase, duration_min, teacher_does, student_does}}).
        """
    )

    # AGENT 3: Assessment Agent — board-pattern items for the given topic.
    assessment_sys_msg = BaseMessage.make_assistant_message(
        role_name=f"{ctx.board} Paper Setter",
        content=f"""
        You are the Assessment Agent. Create 4 {ctx.board} exam-pattern questions that
        assess the topic "{ctx.topic}" ({curriculum}): 1 MCQ, 1 Assertion-Reasoning,
        1 Case/Competency-Based, and 1 short-answer question. Keep every question strictly
        on "{ctx.topic}".
        {grounding}
        {ctx.nep_line()}

        SELF-CONTAINED RULE (critical): every question must stand entirely on its own.
        - You have NO access to any student's work, answer sheet, or prior submission —
          never write "Based on the student's work", "the student wrote", "the passage
          above", "the figure/diagram shown", or refer to anything not written inside the
          question itself.
        - For the Case/Competency-Based question, write the FULL scenario text inside the
          "question" field, then ask about it. Do not reference an external or unseen case.

        Keep each question short and clear. Output JSON with key: exit_ticket (array),
        where each item has ONLY these keys: question_type, bloom_level, question,
        options (array, for MCQ only), correct_answer. Do NOT include long
        justifications or explanations.
        """
    )

    # AGENT 4: Critique Agent — topic/board fit, not a fixed-chapter checklist.
    critique_sys_msg = BaseMessage.make_assistant_message(
        role_name="HOD / Principal",
        content=f"""
        You are the Critique Agent. Reject weak or off-target plans.
        FAIL if any of the following are true:
          1) content references standards/curricula from a board or country other than
             {ctx.board},
          2) the lesson or questions drift away from the topic "{ctx.topic}",
          3) definitions/theorems are not aligned to the {curriculum} syllabus,
          4) the phase durations do not sum to {ctx.duration} minutes.

        Output JSON with keys: passed (bool), issues (array), compliance_score.
        If passed is false, the society will loop.
        """
    )

    return {
        "curriculum": ChatAgent(system_message=curriculum_sys_msg, model=model),
        "pedagogy": ChatAgent(system_message=pedagogy_sys_msg, model=model),
        "assessment": ChatAgent(system_message=assessment_sys_msg, model=model),
        "critique": ChatAgent(system_message=critique_sys_msg, model=model),
    }


def get_agents(ctx: LessonContext):
    """Kept name for the society factory — camel_society.tasks imports it."""
    return build_society(ctx)
