"""
One LLM call: extracted content in, {title, description, tags} out. This
is deliberately NOT an agent — a single structured-output call, not a
reasoning loop. See the architecture discussion this was built from: the
only two places an LLM call is justified in this pipeline are here
(writing a good description is a real NL generation task) and, optionally,
chapter classification for content with no folder-based routing signal.
"""

import json
from typing import Dict, List

from openai import OpenAI

from config.settings import settings

_client = None

_SYSTEM_PROMPT = (
    "You generate metadata for an educational knowledge base (Open Knowledge Format). "
    "Given extracted content from a teacher's uploaded document, respond with ONLY a JSON object: "
    '{"title": "...", "description": "...", "tags": ["...", "..."]}. '
    "title: concise, human-readable (max ~8 words). "
    "description: one sentence, factual, no marketing language. "
    "tags: 3-6 short lowercase-hyphenated tags (subject, topic, grade level if inferable)."
)


def generate_metadata(text_content: str, filename_hint: str = "", chapter_hint: str = "") -> Dict:
    """
    Returns {"title": str, "description": str, "tags": List[str]}. Falls
    back to filename-derived values (not a fabricated guess) if the LLM
    call fails or returns unparseable JSON — a broken metadata call
    shouldn't block the whole ingestion pipeline.
    """
    global _client
    if _client is None:
        _client = OpenAI(api_key=settings.DEEPSEEK_API_KEY, base_url=settings.DEEPSEEK_BASE_URL)

    context = f"Filename: {filename_hint}\n" if filename_hint else ""
    context += f"Chapter: {chapter_hint}\n" if chapter_hint else ""
    # Cap input — this only needs enough content to describe the document,
    # not the whole thing (a 93MB video's "content" is just a filename
    # stub anyway; a long PDF extraction could be tens of thousands of chars).
    truncated = text_content[:6000]

    try:
        response = _client.chat.completions.create(
            model=settings.DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": f"{context}\nContent:\n{truncated}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=500,
        )
        data = json.loads(response.choices[0].message.content)
        return {
            "title": str(data.get("title") or filename_hint or "Untitled")[:200],
            "description": str(data.get("description") or "")[:500],
            "tags": [str(t) for t in data.get("tags", [])][:8],
        }
    except Exception as e:
        print(f"[metadata_generator] LLM call failed, falling back to filename-derived metadata: {e}")
        return _fallback_metadata(filename_hint)


def _fallback_metadata(filename_hint: str) -> Dict:
    title = filename_hint.rsplit(".", 1)[0].replace("-", " ").replace("_", " ").strip().title() or "Untitled"
    return {"title": title, "description": "", "tags": []}
