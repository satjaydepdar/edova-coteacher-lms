"""
okf_search.py — BM25 search across every level of the OKF knowledge graph.

One ranked list over subjects, chapters, syllabus topics, and documents, so
edova-web's Knowledge Graph page can run a single non-cascading search box:
type anything, matches at any level come back, the visible subtree filters to
the union of matches.

Documents are indexed by title, type, chapter, markdown body AND their terms
in indexes/fulltext.json (the extracted-content inverted index), so a concept
query ("euclid", "digestion") finds chapter PDFs whose titles never mention
it. Term frequencies are presence-only (the inverted index stores doc lists),
which BM25 tolerates: tf saturates quickly with k1 = 1.5.

Only the clerk imports this module; the bundle tooling stays unaware of it.
"""
import glob
import json
import math
import os
import re
import psycopg2
from psycopg2.extras import RealDictCursor

import yaml
import sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent))
from config.settings import settings

from okf_dashboard import collect

TOKEN_RE = re.compile(r"[a-z0-9]+")

# clerk.db subjects.subject_name -> OKF subject slug used in node frontmatter.
SUBJECT_SLUGS = {"mathematics": "math", "math": "math", "science": "science"}

# Label-match boosts added on top of the BM25 body score.
EXACT_BOOST = 10.0
PREFIX_BOOST = 5.0
ALL_TERMS_BOOST = 2.0


def _tokens(text):
    return TOKEN_RE.findall((text or "").lower())


def _norm(text):
    return " ".join(_tokens(text))


class _BM25:
    """Small in-memory Okapi BM25 over entity token bags. The corpus is a
    few dozen entities, so a per-query rebuild costs microseconds and keeps
    search always consistent with the bundle — no stale index."""

    def __init__(self, corpus, k1=1.5, b=0.75):
        self.k1, self.b = k1, b
        self.tf = []
        self.dl = []
        df = {}
        for tokens in corpus:
            counts = {}
            for t in tokens:
                counts[t] = counts.get(t, 0) + 1
            self.tf.append(counts)
            self.dl.append(len(tokens))
            for t in counts:
                df[t] = df.get(t, 0) + 1
        self.n = len(corpus)
        self.avgdl = sum(self.dl) / self.n if self.n else 0.0
        self.idf = {t: math.log(1 + (self.n - f + 0.5) / (f + 0.5)) for t, f in df.items()}

    def score(self, query_terms, i):
        tf, dl = self.tf[i], self.dl[i]
        norm = self.k1 * (1 - self.b + self.b * dl / self.avgdl) if self.avgdl else 0.0
        total = 0.0
        for t in query_terms:
            f = tf.get(t)
            if not f:
                continue
            total += self.idf.get(t, 0.0) * (f * (self.k1 + 1)) / (f + norm)
        return total


def _load_json(path, default):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError):
        return default


def _node_bodies(bundle):
    """doc_id -> markdown body text (the part after the YAML frontmatter)."""
    bodies = {}
    for path in glob.glob(os.path.join(bundle, "nodes", "*.md")):
        try:
            with open(path, encoding="utf-8") as fh:
                parts = fh.read().split("---", 2)
            if len(parts) < 3:
                continue
            front = yaml.safe_load(parts[1]) or {}
            if front.get("doc_id"):
                bodies[front["doc_id"]] = parts[2]
        except (OSError, ValueError, yaml.YAMLError):
            continue
    return bodies


def syllabus_topics(okf_chapters):
    """Syllabus topics joined to the OKF chapter they belong to, matched by
    normalized chapter name inside the same subject.
    """
    by_name = {}
    for (subject, chapter_id), chapter_name in okf_chapters.items():
        by_name[(subject, _norm(chapter_name))] = chapter_id
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT t.id AS topic_id, t.title AS title,
                       c.name AS chapter_name, s.subject_name AS subject_name
                FROM syllabus_topics t
                JOIN syllabus_chapters c ON c.id = t.chapter_id
                JOIN syllabus_units u ON u.id = c.unit_id
                JOIN curriculum_subjects s ON s.id = u.curriculum_subject_id
                """
            )
            rows = cur.fetchall()
    finally:
        conn.close()
    topics = []
    for r in rows:
        subject = SUBJECT_SLUGS.get((r["subject_name"] or "").lower())
        if not subject:
            continue  # English / Hindi / Social Science have no OKF shelf
        topics.append({
            "topic_id": r["topic_id"],
            "title": r["title"],
            "subject": subject,
            "chapter_id": by_name.get((subject, _norm(r["chapter_name"])), ""),
        })
    return topics


def search(bundle, query, limit=12):
    """Ranked matches across all four entity levels for one query string."""
    query_terms = _tokens(query)
    if len(query.strip()) < 2 or not query_terms:
        return []

    data = collect(bundle)
    docs = data["nodes"]
    chapters = {(d["subject"], d["chapter_id"]): d["chapter_name"] for d in docs}
    topics = syllabus_topics(chapters)

    fulltext = _load_json(os.path.join(bundle, "indexes", "fulltext.json"), {}) or {}
    doc_terms = {}
    for term, ids in fulltext.items():
        for doc_id in ids:
            doc_terms.setdefault(doc_id, []).append(term)
    bodies = _node_bodies(bundle)

    entities = []
    for subject in sorted({d["subject"] for d in docs}):
        label = {"math": "Mathematics", "science": "Science"}.get(subject, subject.title())
        entities.append({"type": "subject", "id": subject, "label": label,
                         "subject": subject, "chapter_id": "", "topic_id": "",
                         "text": f"{label} {subject}"})
    for (subject, chapter_id), chapter_name in sorted(chapters.items()):
        entities.append({"type": "chapter", "id": chapter_id, "label": chapter_name,
                         "subject": subject, "chapter_id": chapter_id, "topic_id": "",
                         "text": f"{chapter_name} {subject} chapter"})
    for t in topics:
        entities.append({"type": "topic", "id": t["topic_id"], "label": t["title"],
                         "subject": t["subject"], "chapter_id": t["chapter_id"],
                         "topic_id": t["topic_id"],
                         "text": f"{t['title']} topic"})
    for d in docs:
        text = " ".join([
            d["title"], d["doc_type"].replace("_", " "), d["chapter_name"],
            bodies.get(d["doc_id"], ""), " ".join(doc_terms.get(d["doc_id"], [])),
        ])
        entities.append({"type": "document", "id": d["doc_id"], "label": d["title"],
                         "subject": d["subject"], "chapter_id": d["chapter_id"],
                         "topic_id": d.get("topic_id") or "", "text": text})

    bm25 = _BM25([_tokens(e["text"]) for e in entities])
    qn = _norm(query)
    scored = []
    for i, e in enumerate(entities):
        s = bm25.score(query_terms, i)
        label_n = _norm(e["label"])
        label_terms = set(label_n.split())
        if label_n == qn:
            s += EXACT_BOOST
        elif label_n.startswith(qn):
            s += PREFIX_BOOST
        elif query_terms and all(t in label_terms for t in query_terms):
            s += ALL_TERMS_BOOST
        if s > 0:
            scored.append((s, e))
    scored.sort(key=lambda x: (-x[0], x[1]["type"], x[1]["label"]))

    return [
        {"type": e["type"], "id": e["id"], "label": e["label"],
         "subject": e["subject"], "chapter_id": e["chapter_id"],
         "topic_id": e["topic_id"], "score": round(s, 3)}
        for s, e in scored[:limit]
    ]
