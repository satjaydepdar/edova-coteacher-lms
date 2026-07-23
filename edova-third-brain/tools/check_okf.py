#!/usr/bin/env python3
"""
OKF structure smoke test for edova-third-brain.

Checks:
  1. config.yaml parses as valid YAML and has the expected top-level keys.
  2. Each path in config.yaml['paths'] resolves to a real directory.
  3. okf-bundle/ matches the expected manifest/nodes/edges/attachments/indexes/history shape.
  4. subjects/ has the expected Level2/Level3 subject folders.

With --deep, also cross-checks bundle integrity:
  5. manifest doc_ids match the node files on disk (no orphans, no missing).
  6. by_subject / by_chapter / by_type indexes agree with node metadata.
  7. fulltext postings and edges reference only live doc_ids.
  8. every node has its attachment on disk and a portable (posix) source_path.

Usage:
    python tools/check_okf.py [third_brain_root] [--deep]
"""

import argparse
import json
import sys
import yaml
from pathlib import Path

REQUIRED_CONFIG_KEYS = {"paths", "subjects", "document_types"}
REQUIRED_PATH_KEYS = {"subjects", "okf_bundle", "logs", "inbox", "review"}

OKF_BUNDLE_DIRS = ["manifest", "nodes", "edges", "attachments", "indexes", "history"]
OKF_INDEX_SUBDIRS = ["by_subject", "by_chapter", "by_type"]

EXPECTED_SUBJECTS = ["math", "science", "history", "geography", "english"]
EXPECTED_SCIENCE_SUBDIRS = ["physics", "chemistry", "biology"]


def check(label, condition, errors):
    status = "OK" if condition else "FAIL"
    print(f"  [{status}] {label}")
    if not condition:
        errors.append(label)
    return condition


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("root", nargs="?", default=None,
                    help="third-brain root (default: parent of this tools/ dir)")
    ap.add_argument("--deep", action="store_true",
                    help="also cross-check manifest, nodes, indexes, edges, attachments")
    args = ap.parse_args()

    root = Path(args.root).resolve() if args.root else Path(__file__).resolve().parent.parent
    errors = []

    print(f"Checking OKF structure at: {root}\n")

    config_path = root / "config.yaml"
    print("config.yaml")
    if not check("config.yaml exists", config_path.exists(), errors):
        print_summary(errors)
        return 1

    try:
        config = yaml.safe_load(config_path.read_text(encoding="utf-8"))
        check("config.yaml parses as valid YAML", True, errors)
    except yaml.YAMLError as e:
        check(f"config.yaml parses as valid YAML ({e})", False, errors)
        print_summary(errors)
        return 1

    check(
        f"top-level keys present {sorted(REQUIRED_CONFIG_KEYS)}",
        REQUIRED_CONFIG_KEYS.issubset(config.keys()),
        errors,
    )

    paths = config.get("paths", {})
    check(
        f"paths section has keys {sorted(REQUIRED_PATH_KEYS)}",
        REQUIRED_PATH_KEYS.issubset(paths.keys()),
        errors,
    )

    print("\npaths resolve to real directories")
    for key in REQUIRED_PATH_KEYS:
        rel = paths.get(key)
        resolved = (root / rel).resolve() if rel else None
        check(f"paths.{key} -> {rel} exists", bool(resolved and resolved.is_dir()), errors)

    print("\nokf-bundle/ structure")
    bundle = (root / paths.get("okf_bundle", "okf-bundle")).resolve()
    for d in OKF_BUNDLE_DIRS:
        check(f"okf-bundle/{d}/ exists", (bundle / d).is_dir(), errors)
    for d in OKF_INDEX_SUBDIRS:
        check(f"okf-bundle/indexes/{d}/ exists", (bundle / "indexes" / d).is_dir(), errors)

    print("\nsubjects/ structure")
    subjects = root / "subjects"
    for s in EXPECTED_SUBJECTS:
        check(f"subjects/{s}/ exists", (subjects / s).is_dir(), errors)
    check("subjects/math/chapters/ exists", (subjects / "math" / "chapters").is_dir(), errors)
    for s in EXPECTED_SCIENCE_SUBDIRS:
        check(f"subjects/science/{s}/ exists", (subjects / "science" / s).is_dir(), errors)

    if args.deep:
        deep_check(bundle, errors)

    return print_summary(errors)


def deep_check(bundle, errors):
    print("\ndeep integrity checks")

    nodes = {}
    for p in sorted((bundle / "nodes").glob("*.json")):
        try:
            n = json.loads(p.read_text(encoding="utf-8"))
            nodes[n["doc_id"]] = n
        except (json.JSONDecodeError, KeyError) as e:
            check(f"nodes/{p.name} parses with doc_id ({e})", False, errors)

    manifest = json.loads((bundle / "manifest" / "bundle.json").read_text(encoding="utf-8"))
    manifest_ids = set(manifest.get("doc_ids", []))
    node_ids = set(nodes)
    check(f"manifest doc_ids == node files ({len(manifest_ids)} vs {len(node_ids)})",
          manifest_ids == node_ids, errors)
    check("manifest doc_count matches doc_ids length",
          manifest.get("doc_count") == len(manifest_ids), errors)

    def load_index(name, key):
        p = bundle / "indexes" / name / f"{key}.json"
        return set(json.loads(p.read_text(encoding="utf-8"))) if p.exists() else set()

    for doc_id, n in sorted(nodes.items()):
        check(f"by_subject/{n['subject']} contains {doc_id}",
              doc_id in load_index("by_subject", n["subject"]), errors)
        check(f"by_chapter/{n['subject']}_{n['chapter_id']} contains {doc_id}",
              doc_id in load_index("by_chapter", f"{n['subject']}_{n['chapter_id']}"), errors)
        check(f"by_type/{n['doc_type']} contains {doc_id}",
              doc_id in load_index("by_type", n["doc_type"]), errors)

    # No index entry may point at a missing node
    for idx_name in ("by_subject", "by_chapter", "by_type"):
        for p in sorted((bundle / "indexes" / idx_name).glob("*.json")):
            stale = set(json.loads(p.read_text(encoding="utf-8"))) - node_ids
            check(f"indexes/{idx_name}/{p.name} has no stale entries", not stale, errors)

    # Fulltext postings reference only live docs
    ft_path = bundle / "indexes" / "fulltext.json"
    if ft_path.exists():
        fulltext = json.loads(ft_path.read_text(encoding="utf-8"))
        dangling = {doc_id for ids in fulltext.values() for doc_id in ids} - node_ids
        check("fulltext postings reference only live doc_ids", not dangling, errors)

    # Edges reference only live docs and mirror the by_chapter index
    for p in sorted((bundle / "edges").glob("*.json")):
        e = json.loads(p.read_text(encoding="utf-8"))
        edge_docs = set(e.get("doc_ids", []))
        check(f"edges/{p.name} references only live docs", edge_docs <= node_ids, errors)
        subject = str(e.get("to", "")).removeprefix("subject_")
        chapter_docs = load_index("by_chapter", f"{subject}_{e.get('from')}")
        check(f"edges/{p.name} doc_ids match by_chapter index", edge_docs == chapter_docs, errors)

    # Attachments exist and source_path is portable
    for doc_id, n in sorted(nodes.items()):
        src = n.get("source_path", "")
        check(f"{doc_id} source_path is posix-style", "\\" not in src, errors)
        attach = bundle / "attachments" / n["subject"] / n["chapter_id"] / Path(src).name
        check(f"{doc_id} attachment exists", attach.is_file(), errors)


def print_summary(errors):
    print(f"\n{'=' * 40}")
    if errors:
        print(f"{len(errors)} check(s) FAILED:")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("All checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
