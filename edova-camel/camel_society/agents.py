# camel_society/agents.py
import os
from pathlib import Path

from dotenv import load_dotenv

from camel.agents import ChatAgent
from camel.messages import BaseMessage
from camel.models import ModelFactory
from camel.types import ModelPlatformType

# Load .env from the repo root (edova-coteacher-v2/.env)
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# Fail fast with a clear message instead of a confusing auth error on the first
# lesson-plan request. The model is built at import time, so this guard runs
# when the API server starts.
_GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not _GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. Add it to edova-coteacher-v2/.env "
        "(or the environment) before starting edova-camel."
    )

# Use Google Gemini via CAMEL's native Gemini platform.
model = ModelFactory.create(
    model_platform=ModelPlatformType.GEMINI,
    model_type="gemini-2.5-flash",
    api_key=_GEMINI_API_KEY,
    model_config_dict={"temperature": 0.3, "max_tokens": 8192}
)


class LessonContext:
    """The teaching context a lesson request carries. Every agent prompt is
    built from this — nothing about the subject/board/topic is hardcoded, so
    the society works for any topic, not one fixed chapter."""

    def __init__(self, topic, duration=45, board="CBSE", class_label="",
                 subject="", unit=""):
        self.topic = (topic or "").strip()
        self.duration = duration
        self.board = (board or "CBSE").strip()
        self.class_label = (class_label or "").strip()
        self.subject = (subject or "").strip()
        self.unit = (unit or "").strip()

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


def get_agents(ctx: LessonContext):
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
        - learning_outcomes: what a student should be able to do after the lesson
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

        Output JSON with keys:
          objective (one measurable objective for this topic),
          materials (array of strings),
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

        Output JSON with keys: pass (bool), issues (array), compliance_score.
        If pass is false, the society will loop.
        """
    )

    return {
        "curriculum": ChatAgent(system_message=curriculum_sys_msg, model=model),
        "pedagogy": ChatAgent(system_message=pedagogy_sys_msg, model=model),
        "assessment": ChatAgent(system_message=assessment_sys_msg, model=model),
        "critique": ChatAgent(system_message=critique_sys_msg, model=model),
    }
