#!/usr/bin/env python3
"""
auto_ingest.py - inbox-driven auto-classification + ingestion for edova-third-brain.

Drop files into inbox/. For each file:
  1. classify.py decides subject / chapter / doc_type (agent decides; it never mutates)
  2. confidence >= threshold  -> file into subjects/ and ingest into okf-bundle/
  3. confidence <  threshold  -> move to review/ with a .decision.json for a human

Every filed document is verified with check_okf.py --deep; the deep-check exit code
is the success/failure verdict, not the classifier's say-so.

Edit a review/*.decision.json (set "approved": true, fix any field), then
--apply-reviews files it with your corrections.

Usage:
    python tools/auto_ingest.py [--scan-inbox] [--threshold 0.8] [--backend auto]
    python tools/auto_ingest.py --apply-reviews

Exit code: 0 when nothing failed, 1 if any file failed ingest or verification.
"""

import argparse
import contextlib
import io
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
from okf_lib import ingest, load_config, read_node  # noqa: E402
from classify import classify, list_chapters, DEFAULT_DOC_TYPE  # noqa: E402

# doc_type folder -> ingest doc_type name (one live version per subject/chapter/doc_type)
DOC_TYPE_NAMES = {
    "worksheets": "worksheet",
    "lesson-plans": "lesson_plan",
    "question-bank": "question_bank",
    "assessments": "assessment",
    "activities": "activity",
    "handbook": "handbook",
    "assets": "asset",
    "videos": "video",
}


def resolve_doc_type(bundle, subject, chapter_id, base, filename):
    """Collision rule: if the slot is taken by a DIFFERENT file, use the filename slug."""
    occupants = sorted((bundle / "nodes").glob(f"{subject}_{chapter_id}_{base}_*.md"))
    if not occupants:
        return base
    for p in occupants:
        node = read_node(p)
        if Path(node.get("source_path", "")).name == filename:
            return base  # same file re-dropped -> normal dedup/replace flow
    slug = re.sub(r"[^a-z0-9]+", "_", Path(filename).stem.lower()).strip("_")
    return slug if slug.startswith(base) else f"{base}_{slug}"


def log_event(bundle, event):
    event.setdefault("at", datetime.now(timezone.utc).isoformat())
    history = bundle / "history" / "history.jsonl"
    history.parent.mkdir(parents=True, exist_ok=True)
    with history.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event) + "\n")


def run_deep_check(root):
    rc = subprocess.run(
        [sys.executable, str(root / "tools" / "check_okf.py"), "--deep"],
        capture_output=True,
    ).returncode
    return rc == 0


def file_document(decision, src: Path, chapters_by_id, bundle):
    """Copy src into the subjects tree and ingest it. Returns (result, doc_type, dest)."""
    key = (decision.get("subject"), decision.get("chapter_id"))
    chapter = chapters_by_id.get(key)
    if chapter is None:
        return {"status": "error", "error": f"unknown chapter: {key}"}, None, None

    folder = decision.get("doc_type") or DEFAULT_DOC_TYPE
    base = DOC_TYPE_NAMES.get(folder, folder)
    doc_type = resolve_doc_type(bundle, decision["subject"], decision["chapter_id"],
                                base, src.name)

    dest_dir = ROOT / chapter["folder"] / folder
    dest_dir.mkdir(parents=True, exist_ok=True)
    dest = dest_dir / src.name
    shutil.copy2(src, dest)

    with contextlib.redirect_stdout(io.StringIO()):
        result = ingest(decision["subject"], decision["chapter_id"],
                        chapter["chapter_name"], doc_type, dest,
                        trust={"status": "auto_classified", "confidence": decision.get("confidence")})
    return result, doc_type, dest


def report_filed(src, decision, result, doc_type, deep_ok):
    verdict = "OK" if result.get("status") in ("added", "skipped") and deep_ok else "FAIL"
    print(f"  [{verdict}] {src.name} -> {decision['subject']}/{decision['chapter_id']}/"
          f"{decision.get('doc_type')} (conf {decision.get('confidence')}, "
          f"{decision.get('backend')}) - ingest: {result.get('status')} - "
          f"deep check: {'PASS' if deep_ok else 'FAIL'}")
    return verdict == "OK"


def scan_inbox(config, threshold, backend):
    inbox = ROOT / config["paths"]["inbox"]
    review = ROOT / config["paths"]["review"]
    bundle = ROOT / config["paths"]["okf_bundle"]
    review.mkdir(parents=True, exist_ok=True)
    chapters_by_id = {(c["subject"], c["chapter_id"]): c for c in list_chapters()}

    files = [p for p in sorted(inbox.iterdir())
             if p.is_file() and not p.name.startswith(".")]
    if not files:
        print("inbox is empty - nothing to do")
        return 0

    print(f"scanning {len(files)} file(s) in {inbox}\n")
    failures = 0
    for src in files:
        decision = classify(src, backend=backend)
        conf = decision.get("confidence") or 0.0
        if conf >= threshold and decision.get("chapter_id"):
            result, doc_type, _ = file_document(decision, src, chapters_by_id, bundle)
            deep_ok = run_deep_check(ROOT)
            ok = report_filed(src, decision, result, doc_type, deep_ok)
            failures += 0 if ok else 1
            log_event(bundle, {"action": "auto_file", "file": src.name,
                               "decision": decision, "ingest": result,
                               "deep_check": deep_ok})
            if result.get("status") in ("added", "skipped"):
                src.unlink()  # filed: copy now lives in subjects/
        else:
            dest = review / src.name
            if dest.exists():
                dest = review / f"{datetime.now(timezone.utc):%Y%m%dT%H%M%S}_{src.name}"
            shutil.move(str(src), dest)
            payload = {"approved": False, "file": dest.name, **decision}
            (review / f"{dest.name}.decision.json").write_text(
                json.dumps(payload, indent=2), encoding="utf-8")
            print(f"  [REVIEW] {src.name} - conf {conf} < {threshold} "
                  f"(best guess: {decision.get('subject')}/{decision.get('chapter_id')}) "
                  f"-> review/{dest.name}")
            log_event(bundle, {"action": "review", "file": src.name, "decision": decision})

    return 1 if failures else 0


def apply_reviews(config):
    review = ROOT / config["paths"]["review"]
    bundle = ROOT / config["paths"]["okf_bundle"]
    chapters_by_id = {(c["subject"], c["chapter_id"]): c for c in list_chapters()}

    pending = sorted(review.glob("*.decision.json"))
    if not pending:
        print("no review items")
        return 0

    failures = 0
    for dj in pending:
        decision = json.loads(dj.read_text(encoding="utf-8"))
        src = review / decision.get("file", "")
        if not decision.get("approved"):
            print(f"  [PENDING] {src.name} - not approved yet")
            continue
        if not src.exists():
            print(f"  [FAIL] {dj.name} - file {decision.get('file')} missing from review/")
            failures += 1
            continue
        result, doc_type, _ = file_document(decision, src, chapters_by_id, bundle)
        deep_ok = run_deep_check(ROOT)
        ok = report_filed(src, decision, result, doc_type, deep_ok)
        failures += 0 if ok else 1
        log_event(bundle, {"action": "review_applied", "file": src.name,
                           "decision": decision, "ingest": result, "deep_check": deep_ok})
        if ok:
            src.unlink()
            dj.unlink()

    return 1 if failures else 0


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--scan-inbox", action="store_true", help="process inbox/ (default)")
    ap.add_argument("--apply-reviews", action="store_true",
                    help="file review items whose .decision.json has approved: true")
    ap.add_argument("--threshold", type=float, default=0.8,
                    help="confidence needed to auto-file (default 0.8)")
    ap.add_argument("--backend", default="auto", choices=["auto", "camel", "heuristic"],
                    help="classifier backend (default: auto)")
    args = ap.parse_args()

    config = load_config()
    rc = 0
    if args.apply_reviews:
        rc |= apply_reviews(config)
    else:  # --scan-inbox is the default
        rc |= scan_inbox(config, args.threshold, args.backend)
    return rc


if __name__ == "__main__":
    sys.exit(main())
