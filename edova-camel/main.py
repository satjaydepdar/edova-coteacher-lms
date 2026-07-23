# main.py
import json
from fastapi import FastAPI
from pydantic import BaseModel
from openai import OpenAI
import os

# Kimi 3 API is OpenAI-compatible
client = OpenAI(
    api_key=os.getenv("KIMI_API_KEY"),
    base_url="https://api.moonshot.cn/v1" # Kimi endpoint
)

app = FastAPI(title="Edova Lesson Planner - Ch6 Triangles")

class LessonRequest(BaseModel):
    topic: str # e.g., "Basic Proportionality Theorem"
    class_id: str = "Class 10 - A"
    duration: int = 45
    subject: str = "Mathematics"

SYSTEM_PROMPTS = {
    "curriculum": open("prompts/curriculum_agent.txt").read(),
    "pedagogy": open("prompts/pedagogy_agent.txt").read(),
    "assessment": open("prompts/assessment_agent.txt").read(),
    "critique": open("prompts/critique_agent.txt").read()
}

from camel_society.tasks import run_ch6_society

@app.post("/api/v1/generate-lesson-plan/ch6")
async def generate(req: LessonRequest):
    result = run_ch6_society(req.topic, req.duration)
    # result already contains JSON strings - parse and return as before
    return result

@app.post("/api/v1/generate-lesson-plan/ch6")
async def generate(req: LessonRequest):
    # PHASE 1: Curriculum Retrieval
    curriculum_ctx = call_kimi(
        SYSTEM_PROMPTS["curriculum"],
        f"Topic: {req.topic} from Chapter 6 Triangles. Extract context."
    )

    # PHASE 2: Parallel Pedagogy + Assessment
    pedagogy_input = f"Context: {json.dumps(curriculum_ctx)} | Topic: {req.topic} | Duration: {req.duration} min"

    pedagogy_draft = call_kimi(SYSTEM_PROMPTS["pedagogy"], pedagogy_input)
    assessment_draft = call_kimi(SYSTEM_PROMPTS["assessment"], pedagogy_input)

    merged_draft = {**pedagogy_draft, **assessment_draft, "curriculum": curriculum_ctx}

    # PHASE 3: Critique Loop (CAMEL self-correction)
    critique = call_kimi(SYSTEM_PROMPTS["critique"], json.dumps(merged_draft))

    if not critique.get("pass"):
        # Auto-regenerate once with feedback - This is CAMEL orchestration
        fix_prompt = f"Fix these issues: {critique['issues']}. Original: {json.dumps(merged_draft)}"
        pedagogy_draft = call_kimi(SYSTEM_PROMPTS["pedagogy"], fix_prompt)
        merged_draft.update(pedagogy_draft)

    # PHASE 4: Final Assembly for Frontend
    final_plan = {
        "title": f"Ch 6 - {req.topic}",
        "meta": f"{req.duration} min - {req.subject} - {req.class_id}",
        "objective": merged_draft["objective"],
        "materials": merged_draft["materials"],
        "flow": merged_draft["flow"],
        "assessment": merged_draft["exit_ticket"],
        "differentiation": merged_draft.get("differentiation", {}),
        "syllabus_link": {
            "board": "CBSE",
            "class": 10,
            "chapter": 6,
            "unit": curriculum_ctx.get("section_ref"),
            "ncert_figs": ["Fig 6.10", "Fig 6.22", "Fig 6.23"] # for this chapter
        },
        "critique_score": critique.get("compliance_score")
    }

    return final_plan

# For Phase 4 Evaluation
@app.post("/api/v1/evaluate/ch6")
async def evaluate_plan(plan_id: str, student_scores: list):
    # Logic to measure success of Phase 1-3
    # e.g., avg exit ticket score > 80%? objective met
    return {"plan_id": plan_id, "objective_achieved": sum(student_scores)/len(student_scores) >= 80}