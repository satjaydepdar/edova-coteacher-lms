# camel_society/tasks.py
from .agents import LessonContext, get_agents
from .grounding import format_block, retrieve_grounding


def run_society(topic: str, duration: int = 45, board: str = "CBSE",
                class_label: str = "", subject: str = "", unit: str = ""):
    """Run the lesson-planning society for ANY topic. Grounding is retrieved from
    the edova-third-brain OKF bundle (the prescribed textbook) when a matching
    chapter exists, and falls back to prompt-only grounding otherwise — nothing
    is hardcoded to a specific chapter."""
    ctx = LessonContext(
        topic=topic, duration=duration, board=board,
        class_label=class_label, subject=subject, unit=unit,
    )
    agents = get_agents(ctx)

    scope = ctx.scope_line()

    # Pull the prescribed-textbook excerpt for this topic from the OKF bundle.
    # `block` is '' when no chapter matches, so it can be appended unconditionally.
    grounding = retrieve_grounding(topic=topic, subject=subject, unit=unit)
    block = format_block(grounding)
    source = f"\n\n{block}" if block else ""

    # CAMEL 0.2.x sequential orchestration. The textbook excerpt (`source`) is
    # threaded into every generative step so curriculum context, the 5E lesson,
    # and the assessment items are all grounded in the same prescribed chapter.
    ctx_out = agents["curriculum"].step(
        f"Extract curriculum context for the topic. {scope}{source}"
    )
    curriculum_json = ctx_out.msg.content

    pedagogy_out = agents["pedagogy"].step(
        f"Curriculum context: {curriculum_json}\n{scope}\n"
        f"Design the {duration}-minute 5E lesson for this exact topic.{source}"
    )
    assessment_out = agents["assessment"].step(
        f"Curriculum context: {curriculum_json}\n{scope}\n"
        f"Write the assessment questions for this exact topic.{source}"
    )

    draft = pedagogy_out.msg.content + assessment_out.msg.content
    critique_out = agents["critique"].step(
        f"Topic under review: \"{ctx.topic}\" ({ctx.curriculum_label()}), "
        f"duration {duration} min.\nReview this draft: {draft}"
    )

    return {
        "curriculum": curriculum_json,
        "lesson": pedagogy_out.msg.content,
        "assessment": assessment_out.msg.content,
        "critique": critique_out.msg.content,
        "grounding": {
            "found": grounding.get("found", False),
            "doc_id": grounding.get("doc_id", ""),
            "chapter_name": grounding.get("chapter_name", ""),
            "subject": grounding.get("subject", ""),
            "source": grounding.get("source", ""),
            "score": grounding.get("score", 0.0),
            "excerpt_chars": len(grounding.get("excerpt", "")),
        },
    }
