#!/usr/bin/env python3
"""
classify.py - decide where a new document belongs in the subjects/ taxonomy.

Backend is pluggable:
  - CAMEL-AI ChatAgent, when the `camel` package and an LLM API key are available
  - deterministic topic-keyword classifier otherwise (zero extra dependencies)

Both backends return the same decision dict:
    {subject, chapter_id, chapter_name, doc_type, confidence, rationale, backend}

The classifier only DECIDES. Filing + ingestion happen in auto_ingest.py via
the existing, deterministic ingest.py - the classifier never mutates the bundle.

Usage:
    python tools/classify.py <file_path> [--backend auto|camel|heuristic]
"""

import json
import os
import re
import sys
import importlib.util
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
from okf_lib import extract_text, load_config  # noqa: E402

CHAPTER_DIR = re.compile(r"^chapter-(\d+)-(.+)$")
SMALL_WORDS = {"and", "of", "the", "in", "its", "a", "an", "to", "do", "how"}
STOPWORDS = {"chapter", "class", "cbse", "ncert", "notes", "worksheet", "content"}

# filename cue -> doc_type folder (the destination folder under the chapter).
# Live values come from config.yaml's taxonomy.doc_type_cues (a mapping,
# first match wins in file order); this list is the fallback when the block
# is absent — identical to the pre-config behavior.
_DEFAULT_DOC_TYPE_CUES = [
    ("worksheet", "worksheets"),
    ("lesson", "lesson-plans"),
    ("mcq", "question-bank"),
    ("question", "question-bank"),
    ("rubric", "assessments"),
    ("test", "assessments"),
    ("quiz", "assessments"),
    ("assessment", "assessments"),
    ("activit", "activities"),
    ("slide", "assets"),
    ("video", "videos"),
    ("note", "handbook"),
    ("reflection", "handbook"),
    ("handbook", "handbook"),
]
_DEFAULT_DOC_TYPE = "handbook"  # teacher-created content catch-all (see design doc)
DEFAULT_DOC_TYPE = _DEFAULT_DOC_TYPE  # public alias (auto_ingest imports it)


def _doc_type_rules() -> tuple:
    """(cues, default) from config.yaml taxonomy, falling back to defaults."""
    try:
        taxonomy = (load_config() or {}).get("taxonomy", {}) or {}
        cues = taxonomy.get("doc_type_cues")
        default = taxonomy.get("default_doc_type", _DEFAULT_DOC_TYPE)
        if cues:
            return [(str(k), str(v)) for k, v in cues.items()], default
        return _DEFAULT_DOC_TYPE_CUES, default
    except Exception:
        return _DEFAULT_DOC_TYPE_CUES, _DEFAULT_DOC_TYPE

PREVIEW_CHARS = 4000
SCORE_CHARS = 50000


def list_subjects() -> list:
    config = load_config()
    base = ROOT / config["paths"]["subjects"]
    return sorted(d.name for d in base.iterdir() if d.is_dir())


def _title_from_slug(slug: str) -> str:
    words = slug.replace("_", "-").split("-")
    return " ".join(w if w in SMALL_WORDS else w.capitalize() for w in words).capitalize()


def list_chapters() -> list:
    """Every chapter folder under subjects/, with bundle-convention chapter_id."""
    config = load_config()
    base = ROOT / config["paths"]["subjects"]
    chapters = []
    for path in sorted(base.rglob("chapter-*")):
        if not path.is_dir():
            continue
        m = CHAPTER_DIR.match(path.name)
        if not m:
            continue
        rel = path.relative_to(base).parts
        subject = rel[0]
        domain = subject if len(rel) == 2 or rel[1] == "chapters" else rel[1]
        chapter_id = f"{domain}-ch{m.group(1)}"

        meta = {}
        meta_path = path / "metadata.yaml"
        if meta_path.exists():
            meta = yaml.safe_load(meta_path.read_text(encoding="utf-8")) or {}

        chapter_name = meta.get("chapter_title") or meta.get("chapter_name") \
            or _title_from_slug(m.group(2))
        chapters.append({
            "subject": subject,
            "domain": domain,
            "chapter_id": chapter_id,
            "chapter_name": chapter_name,
            "topics": meta.get("topics") or [],
            "folder": str(path.relative_to(ROOT).as_posix()),
        })
    return chapters


def get_doc_types(chapter_folder: str) -> list:
    """Doc_type folders already present under a chapter folder."""
    path = ROOT / chapter_folder
    return sorted(d.name for d in path.iterdir() if d.is_dir()) if path.is_dir() else []


def extract_preview(file_path: Path, limit: int = PREVIEW_CHARS) -> str:
    try:
        return extract_text(Path(file_path))[:limit]
    except Exception as exc:
        return f"(could not extract text: {exc})"


# ---------------------------------------------------------------- heuristic

def _keywords(chapter: dict) -> list:
    kws = set()
    for phrase in chapter["topics"] + [chapter["chapter_name"]]:
        phrase = str(phrase).strip().lower()
        if len(phrase) >= 4:
            kws.add(phrase)
        for word in re.findall(r"[a-z]{4,}", phrase):
            if word not in STOPWORDS:
                kws.add(word)
    return sorted(kws)


def _score(text: str, keyword: str) -> int:
    hits = len(re.findall(r"\b" + re.escape(keyword) + r"\b", text))
    return hits * (1 + keyword.count(" "))  # multi-word phrases weigh more


def _guess_doc_type(filename: str) -> str:
    name = filename.lower()
    cues, default = _doc_type_rules()
    for cue, folder in cues:
        if cue in name:
            return folder
    return default


def heuristic_classify(file_path: Path) -> dict:
    file_path = Path(file_path)
    text = (extract_preview(file_path, SCORE_CHARS) + " " + file_path.stem).lower()
    chapters = list_chapters()

    scored = []
    for ch in chapters:
        kws = _keywords(ch)
        contributions = {k: _score(text, k) for k in kws}
        total = sum(contributions.values())
        matched = [k for k, v in sorted(contributions.items(), key=lambda kv: -kv[1]) if v > 0]
        scored.append((total, matched, ch))

    scored.sort(key=lambda s: -s[0])
    best_score, matched, best = scored[0] if scored else (0, [], None)
    second = scored[1][0] if len(scored) > 1 else 0

    if best is None or best_score == 0:
        return {"subject": None, "chapter_id": None, "chapter_name": None,
                "doc_type": _guess_doc_type(file_path.name), "confidence": 0.0,
                "rationale": "no taxonomy keywords matched the document content",
                "backend": "heuristic"}

    confidence = round(min(best_score / (best_score + second + 1), 0.99), 2)
    return {
        "subject": best["subject"],
        "chapter_id": best["chapter_id"],
        "chapter_name": best["chapter_name"],
        "doc_type": _guess_doc_type(file_path.name),
        "confidence": confidence,
        "rationale": "matched keywords: " + ", ".join(matched[:5])
                     + f" (score {best_score}, runner-up {second})",
        "backend": "heuristic",
    }


# ---------------------------------------------------------------- CAMEL-AI

def camel_available() -> bool:
    if importlib.util.find_spec("camel") is None:
        return False
    return any(os.environ.get(k) for k in
               ("ANTHROPIC_API_KEY", "GEMINI_API_KEY", "GOOGLE_API_KEY", "OPENAI_API_KEY"))


def camel_classify(file_path: Path) -> dict:
    """CAMEL-AI ChatAgent backend (design doc sec.4). Requires camel-ai + API key.

    The agent gets read-only taxonomy tools only; its answer is parsed into the
    same decision dict. Any failure falls back to the heuristic backend so the
    pipeline never hard-depends on LLM availability.
    """
    from camel.agents import ChatAgent  # noqa: PLC0415
    from camel.toolkits import FunctionTool  # noqa: PLC0415
    from camel.models import ModelFactory  # noqa: PLC0415
    from camel.types import ModelPlatformType  # noqa: PLC0415

    file_path = Path(file_path)
    chapters = list_chapters()
    taxonomy = json.dumps([
        {k: c[k] for k in ("subject", "chapter_id", "chapter_name", "topics")}
        for c in chapters
    ], indent=2)
    preview = extract_preview(file_path)

    system = (
        "You are a classification agent for a CBSE Class 10 curriculum knowledge base.\n"
        "Decide which existing subject/chapter a new document belongs to, and which\n"
        "doc_type folder it should be filed under.\n"
        "Rules:\n"
        "- Only choose subject/chapter_id values from the taxonomy below. Never invent\n"
        "  new ones; if nothing fits, return confidence < 0.5 and explain.\n"
        "- Match on content, not just filename.\n"
        "- doc_type must be one of: worksheets, lesson-plans, question-bank, assessments,\n"
        "  activities, handbook, assets, videos. Teacher's notes map to 'handbook'.\n"
        "- If the document plausibly fits more than one chapter, set confidence < 0.5.\n\n"
        f"Taxonomy:\n{taxonomy}\n\n"
        "Respond with ONLY a JSON object: "
        '{"subject","chapter_id","chapter_name","doc_type","confidence","rationale"}'
    )

    if os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"):
        platform = ModelPlatformType.GEMINI
    elif os.environ.get("ANTHROPIC_API_KEY"):
        platform = ModelPlatformType.ANTHROPIC
    else:
        platform = ModelPlatformType.OPENAI

    model = ModelFactory.create(model_platform=platform, model_type=None)
    agent = ChatAgent(system_message=system, model=model,
                      tools=[FunctionTool(get_doc_types)])
    response = agent.step(f"File: {file_path.name}\n\nContent preview:\n{preview}")

    text = response.msgs[0].content if response.msgs else ""
    m = re.search(r"\{.*\}", text, re.DOTALL)
    decision = json.loads(m.group(0)) if m else {}
    valid_ids = {c["chapter_id"] for c in chapters}
    if decision.get("chapter_id") not in valid_ids:
        decision["confidence"] = 0.0
        decision["rationale"] = (decision.get("rationale") or "") \
            + " [rejected: chapter_id not in taxonomy]"
    decision["backend"] = "camel"
    decision.setdefault("doc_type", _doc_type_rules()[1])
    return decision


# ---------------------------------------------------------------- dispatch

def classify(file_path, backend: str = "auto") -> dict:
    if backend == "heuristic":
        return heuristic_classify(file_path)
    if backend == "camel":
        return camel_classify(file_path) if camel_available() else _unavailable()
    # auto: prefer CAMEL, fall back to heuristic on any failure
    if camel_available():
        try:
            return camel_classify(file_path)
        except Exception as exc:
            print(f"  ! CAMEL backend failed ({exc}); using heuristic", file=sys.stderr)
    return heuristic_classify(file_path)


def _unavailable() -> dict:
    return {"subject": None, "chapter_id": None, "chapter_name": None,
            "doc_type": _doc_type_rules()[1], "confidence": 0.0,
            "rationale": "camel-ai not installed or no API key set", "backend": "camel"}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    backend = "auto"
    for a in sys.argv[1:]:
        if a.startswith("--backend="):
            backend = a.split("=", 1)[1]
    if not args:
        print(__doc__)
        return 1
    decision = classify(args[0], backend=backend)
    print(json.dumps(decision, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
