# camel_society/grounding.py
"""
OKF-bundle retriever — grounds the CAMEL lesson society in the real prescribed
textbook content produced by edova-third-brain.

The bundle stores chapter text only inside the source attachments (PDF / MD) plus
an inverted index (indexes/fulltext.json: word -> [doc_ids]). Given a lesson
topic we:
  1. rank chapters by an idf-weighted overlap between the topic/unit terms and
     the inverted index (optionally filtered to the subject),
  2. extract text from the winning chapter's attachment,
  3. return the passages most relevant to the topic, capped to a char budget.

Everything degrades gracefully: if the bundle is missing, pypdf is unavailable,
or nothing matches, `retrieve_grounding` returns {"found": False} and the society
falls back to its existing prompt-only grounding.
"""
import json
import math
import os
import re
from collections import Counter
from functools import lru_cache
from pathlib import Path

# Bundle lives in the sibling edova-third-brain checkout by default; override with
# OKF_BUNDLE_PATH for other layouts.
_DEFAULT_BUNDLE = (
    Path(__file__).resolve().parents[2] / "edova-third-brain" / "okf-bundle"
)

_WORD_RE = re.compile(r"[a-z0-9]+")

# Small stopword set so common words ('the', 'which', 'of') don't dominate the
# overlap. Discriminative terms ('arithmetic', 'gauss') carry the match.
_STOP = {
    "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with", "is",
    "are", "be", "by", "as", "at", "it", "this", "that", "these", "those",
    "which", "what", "how", "why", "when", "from", "into", "about", "using",
    "use", "used", "its", "their", "them", "we", "you", "your", "can", "will",
    "class", "chapter", "topic", "unit", "lesson", "cbse", "ncert",
}


def _bundle_path() -> Path:
    return Path(os.environ.get("OKF_BUNDLE_PATH", str(_DEFAULT_BUNDLE)))


def _tokens(text: str) -> list[str]:
    return [t for t in _WORD_RE.findall((text or "").lower()) if t not in _STOP]


def _normalize_subject(subject: str) -> str:
    """Map a free-form request subject ('Mathematics', 'Physics') onto the
    bundle's subject folders (math / science). Returns '' when unknown so the
    caller does not over-filter."""
    s = (subject or "").lower()
    if not s:
        return ""
    if "math" in s:
        return "math"
    if any(k in s for k in ("scien", "physic", "chem", "bio")):
        return "science"
    return ""


@lru_cache(maxsize=1)
def _load_fulltext() -> dict:
    p = _bundle_path() / "indexes" / "fulltext.json"
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}


def _load_subject_docs(subject: str) -> set | None:
    if not subject:
        return None
    p = _bundle_path() / "indexes" / "by_subject" / f"{subject}.json"
    try:
        return set(json.loads(p.read_text(encoding="utf-8")))
    except (OSError, json.JSONDecodeError):
        return None


def _load_node(doc_id: str) -> dict | None:
    """nodes/*.md: YAML frontmatter + markdown body (see edova-third-brain's
    ingest.py). Parsed with a minimal flat key: value reader — no PyYAML
    dependency here — since every field this module reads (subject,
    chapter_id, title, chapter_name, source_path) is a top-level scalar."""
    p = _bundle_path() / "nodes" / f"{doc_id}.md"
    try:
        text = p.read_text(encoding="utf-8")
        _, front, _ = text.split("---", 2)
    except (OSError, ValueError):
        return None
    node = {}
    for line in front.splitlines():
        if ":" not in line or line.startswith((" ", "\t")):
            continue  # blank or a nested block (e.g. under `trust:`) — flat scalars only
        key, _, value = line.partition(":")
        value = value.strip().strip("\"'")
        if value and value != "null":
            node[key.strip()] = value
    return node


def _idf(query_terms: list[str]) -> dict[str, float]:
    """Inverse document frequency per query term: a term in few chapters is more
    discriminative than one in every chapter."""
    index = _load_fulltext()
    if not index:
        return {}
    total_docs = len({d for postings in index.values() for d in postings}) or 1
    idf: dict[str, float] = {}
    for term in set(query_terms):
        postings = index.get(term)
        if postings:
            idf[term] = math.log(1 + total_docs / len(postings))
    return idf


def _prefilter(idf: dict[str, float], allowed: set | None) -> list[str]:
    """Cheap candidate list from the inverted index: any chapter containing at
    least one query term (subject-filtered), ranked by idf overlap. This only
    narrows the set; final ranking uses real term frequency (see _rank_by_tfidf)."""
    index = _load_fulltext()
    overlap: dict[str, float] = {}
    for term, weight in idf.items():
        for doc_id in index.get(term, []):
            if allowed is not None and doc_id not in allowed:
                continue
            overlap[doc_id] = overlap.get(doc_id, 0.0) + weight
    return [d for d, _ in sorted(overlap.items(), key=lambda kv: kv[1], reverse=True)]


def _rank_by_tfidf(candidates: list[str], idf: dict[str, float]):
    """Score each candidate by TF-IDF over its actual chapter text — how often the
    query terms really occur, weighted by how discriminative they are. A boolean
    index alone can't tell a chapter that is *about* the topic from one that
    mentions a query word once; term frequency can. Returns (doc_id, score) best
    first, each paired with its raw term-frequency total for the presence floor."""
    ranked = []
    for doc_id in candidates:
        counts = Counter(_WORD_RE.findall(_extract_text(doc_id).lower()))
        tf_total = sum(counts[t] for t in idf)
        score = sum(counts[t] * weight for t, weight in idf.items())
        ranked.append((doc_id, score, tf_total))
    ranked.sort(key=lambda x: x[1], reverse=True)
    return ranked


def _extract_from_file(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError:
            return ""
        try:
            reader = PdfReader(str(path))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return ""
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except OSError:
        return ""


@lru_cache(maxsize=64)
def _extract_text(doc_id: str) -> str:
    """Full text of a chapter's attachment. Parsed once, then persisted to
    okf-bundle/cache/text/<doc_id>.txt so subsequent requests (and process
    restarts) skip the slow PDF parse. In-memory lru_cache sits on top for the
    hot path. Returns '' if the file or parser is unavailable."""
    node = _load_node(doc_id)
    if not node:
        return ""

    cache_file = _bundle_path() / "cache" / "text" / f"{doc_id}.txt"
    try:
        if cache_file.is_file():
            return cache_file.read_text(encoding="utf-8")
    except OSError:
        pass

    adir = _bundle_path() / "attachments" / node.get("subject", "") / node.get("chapter_id", "")
    title = node.get("title", "")
    # Prefer the file whose stem matches the node title; else take the first
    # attachment in the chapter dir.
    candidates = sorted(adir.glob(f"{title}.*")) if title else []
    if not candidates and adir.is_dir():
        candidates = sorted(p for p in adir.iterdir() if p.is_file())
    if not candidates:
        return ""

    text = _extract_from_file(candidates[0])
    if text:
        try:
            cache_file.parent.mkdir(parents=True, exist_ok=True)
            cache_file.write_text(text, encoding="utf-8")
        except OSError:
            pass  # cache is best-effort; extraction still succeeded
    return text


_WINDOW = 700  # target chars per scoring window


def _windows(text: str) -> list[str]:
    """Split text into ~_WINDOW-char windows on paragraph/line/space boundaries.
    PDF-extracted text often has no blank lines, so a size cap — not just blank
    lines — is what guarantees granular, budget-able passages."""
    text = text.strip()
    out: list[str] = []
    i, n = 0, len(text)
    while i < n:
        end = min(i + _WINDOW, n)
        if end < n:
            # Prefer to cut at a paragraph break, else a newline, else a space,
            # searching back a little so windows end on a natural boundary.
            window = text[i:end]
            for sep in ("\n\n", "\n", " "):
                cut = window.rfind(sep)
                if cut > _WINDOW // 2:
                    end = i + cut + len(sep)
                    break
        chunk = text[i:end].strip()
        if chunk:
            out.append(chunk)
        i = end
    return out


def _best_excerpt(text: str, query_terms: list[str], max_chars: int) -> str:
    """Return the passages richest in the query terms, in reading order, capped
    to max_chars. Falls back to the chapter head when nothing matches."""
    if not text:
        return ""
    windows = _windows(text)
    if not windows:
        return text[:max_chars].strip()

    qset = set(query_terms)
    scored = []
    for i, w in enumerate(windows):
        wt = _WORD_RE.findall(w.lower())
        hits = sum(1 for t in wt if t in qset)
        scored.append((hits, i, w))

    if not any(h for h, _, _ in scored):
        return text[:max_chars].strip()

    chosen: list[tuple[int, str]] = []
    used = 0
    for hits, i, w in sorted(scored, key=lambda x: (-x[0], x[1])):
        if hits == 0 or used >= max_chars:
            break
        chosen.append((i, w))
        used += len(w) + 2  # + separator
    chosen.sort(key=lambda x: x[0])  # restore reading order
    return "\n\n".join(w for _, w in chosen).strip()[:max_chars]


def retrieve_grounding(topic: str, subject: str = "", unit: str = "",
                       max_chars: int = 5000) -> dict:
    """Find the prescribed chapter for `topic` and return grounding material.

    Returns a dict:
      found:        bool — whether a chapter matched
      doc_id, chapter_name, subject, source: identify the matched chapter
      excerpt:      textbook passages most relevant to the topic ('' if the
                    attachment could not be read)
      score:        ranking score (debug)
    """
    query_terms = _tokens(topic) + _tokens(unit)
    empty = {"found": False, "doc_id": "", "chapter_name": "", "subject": "",
             "source": "", "excerpt": "", "score": 0.0}
    if not query_terms:
        return empty

    idf = _idf(query_terms)
    if not idf:
        return empty

    allowed = _load_subject_docs(_normalize_subject(subject))
    candidates = _prefilter(idf, allowed)
    if not candidates and allowed is not None:
        # Subject filter may have been wrong/too strict — retry unfiltered.
        candidates = _prefilter(idf, None)
    if not candidates:
        return empty

    # Re-rank the top few candidates by real TF-IDF over their chapter text. The
    # idf prefilter is usually right about the chapter, so a small window keeps
    # per-request text extraction bounded.
    ranked = _rank_by_tfidf(candidates[:4], idf)
    doc_id, score, tf_total = ranked[0]

    # Relevance floors against grounding on an off-syllabus topic (which misleads
    # the agents more than no grounding at all): the topic terms must actually
    # recur in the chapter (tf), and the TF-IDF score must clear a floor set well
    # below where genuine chapter matches cluster. A stray common word ("world" in
    # an off-syllabus "World War 2" query) recurs enough to pass tf but scores far
    # below a real match, so the score floor catches it. Both env-tunable.
    min_tf = int(os.environ.get("OKF_MIN_TF", "6"))
    min_score = float(os.environ.get("OKF_MIN_SCORE", "15"))
    if tf_total < min_tf or score < min_score:
        return empty

    node = _load_node(doc_id) or {}
    excerpt = _best_excerpt(_extract_text(doc_id), query_terms, max_chars)
    return {
        "found": True,
        "doc_id": doc_id,
        "chapter_name": node.get("chapter_name", ""),
        "subject": node.get("subject", ""),
        "source": node.get("source_path", ""),
        "excerpt": excerpt,
        "score": round(score, 3),
    }


def format_block(grounding: dict) -> str:
    """Render grounding into a prompt-ready block. Empty string when nothing was
    found, so callers can append it unconditionally."""
    if not grounding or not grounding.get("found"):
        return ""
    header = (
        f"PRESCRIBED TEXTBOOK SOURCE — chapter "
        f"\"{grounding.get('chapter_name') or grounding.get('doc_id')}\". "
        f"Ground your answer in the excerpt below; quote its wording where possible "
        f"and do not contradict it."
    )
    excerpt = grounding.get("excerpt") or ""
    if not excerpt:
        return header + "\n(No machine-readable text was available for this chapter.)"
    return f"{header}\n\"\"\"\n{excerpt}\n\"\"\""
