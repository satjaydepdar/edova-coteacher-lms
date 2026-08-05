#!/usr/bin/env python3
"""
generate_metadata.py - draft metadata.yaml for chapter folders that lack one.

Topics are extracted from the chapter PDF's numbered sub-section headings
(X.Y.Z lines, e.g. "5.2.1 Autotrophic Nutrition") - these are the NCERT
section titles, which are exactly the chapter's topics.

The NCERT book chapter number is auto-detected from the PDF text: science
chapters in the NCERT book are numbered 1-12 across the whole book, which
does NOT match the school's folder numbering (physics-ch3 is book chapter 11).

Overlay-mangled heading lines (watermark repeats like "1.1 CHEMIC1.1 CHEMIC")
are skipped rather than guessed - a draft with a few missing topics beats one
with garbage topics. Chapters with < MIN_TOPICS clean topics are flagged
NEEDS REVIEW for manual editing.

Usage:
    python tools/generate_metadata.py           # dry-run: print proposed files
    python tools/generate_metadata.py --apply   # write metadata.yaml files
"""

import argparse
import re
import sys
from collections import Counter
from datetime import date
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from ingest import extract_text, load_config, read_node  # noqa: E402

MIN_TOPICS = 4
SUBJECT_TITLES = {"math": "Mathematics", "science": "Science"}


def detect_book_prefix(text: str) -> str | None:
    """Most frequent X in anchored X.Y(.Z) headings = the book's chapter number."""
    counts = Counter()
    for line in text.splitlines():
        m = re.match(r"^\s*(\d+)\.\d+(?:\.\d+)?\s+[A-Z]", line.strip())
        if m:
            counts[m.group(1)] += 1
    return counts.most_common(1)[0][0] if counts else None


def clean_title(t: str) -> str:
    t = re.sub(r"\b([B-HJ-Z]) ([a-z])", r"\1\2", t)  # 'F ormed' -> 'Formed' (keep 'A'/'I')
    t = re.sub(r"[\s\u2013\u2014-]+$", "", t)        # trailing dash artifacts
    return re.sub(r"\s+", " ", t).strip()


def extract_topics(text: str) -> tuple:
    prefix = detect_book_prefix(text)
    if prefix is None:
        return None, []
    pat = re.compile(rf"^\s*{prefix}\.(\d+)\.(\d+)\s+([A-Z][a-zA-Z].{{3,70}})$")
    topics = []
    for line in text.splitlines():
        m = pat.match(line.strip())
        if not m:
            continue
        title = clean_title(m.group(3))
        if not title or re.search(rf"{prefix}\.\d", title):
            continue  # overlay-mangled line
        if len(title) >= 5 and title not in topics:
            topics.append(title)
    return prefix, topics


def bundle_chapter_names() -> dict:
    """(subject, chapter_id) -> chapter_name from already-ingested nodes."""
    config = load_config()
    names = {}
    for p in (ROOT / config["paths"]["okf_bundle"] / "nodes").glob("*.md"):
        n = read_node(p)
        names[(n["subject"], n["chapter_id"])] = n["chapter_name"]
    return names


def build_metadata(folder: Path, names: dict) -> tuple:
    """Returns (metadata_dict, warning) or (None, reason)."""
    rel = folder.relative_to(ROOT / load_config()["paths"]["subjects"]).parts
    subject = rel[0]
    domain = None if len(rel) == 2 else rel[1]

    m = re.match(r"chapter-(\d+)-(.+)", folder.name)
    number = int(m.group(1))
    chapter_id = f"{domain or subject}-ch{number}"

    pdfs = sorted(folder.glob("*.pdf"))
    if not pdfs:
        return None, "no chapter PDF found"

    prefix, topics = extract_topics(extract_text(pdfs[0]))
    if not topics:
        return None, "no clean section headings extracted"

    title = names.get((subject, chapter_id)) \
        or " ".join(w.capitalize() for w in m.group(2).split("-"))

    meta = {
        "chapter_number": number,
        "chapter_title": title,
        "subject": SUBJECT_TITLES.get(subject, subject.capitalize()),
        **({"domain": domain} if domain else {}),
        "grade": 10,
        "curriculum": "CBSE / NCERT",
        "status": "draft (auto-generated)",
        "created": date.today().isoformat(),
        "last_updated": date.today().isoformat(),
        "topics": topics,
    }

    warning = None
    if len(topics) < MIN_TOPICS:
        warning = f"NEEDS REVIEW - only {len(topics)} topics extracted (book ch {prefix})"
    return meta, warning


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--apply", action="store_true", help="write files (default: dry-run)")
    args = ap.parse_args()

    config = load_config()
    base = ROOT / config["paths"]["subjects"]
    names = bundle_chapter_names()

    targets = [d for d in sorted(base.rglob("chapter-*"))
               if d.is_dir() and re.match(r"chapter-\d+-", d.name)
               and not (d / "metadata.yaml").exists()]
    if not targets:
        print("every chapter folder already has metadata.yaml - nothing to do")
        return 0

    print(f"{len(targets)} chapter folder(s) missing metadata.yaml\n")
    thin = 0
    for folder in targets:
        meta, note = build_metadata(folder, names)
        rel = folder.relative_to(ROOT)
        if meta is None:
            print(f"  [SKIP] {rel} - {note}")
            continue
        flag = f"  <-- {note}" if note else ""
        thin += 1 if note else 0
        print(f"  [{'WRITE' if args.apply else 'DRAFT'}] {rel}/metadata.yaml "
          f"({len(meta['topics'])} topics){flag}")
        if args.apply:
            (folder / "metadata.yaml").write_text(
                yaml.safe_dump(meta, sort_keys=False, allow_unicode=True),
                encoding="utf-8")

    print(f"\n{'written' if args.apply else 'dry-run - re-run with --apply to write'}"
          f" ({thin} file(s) flagged NEEDS REVIEW)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
