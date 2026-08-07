#!/usr/bin/env python3
"""
okf_dashboard.py — a visual health map of the OKF bundle.

Reads okf-bundle/ (nodes, edges, indexes/fulltext.json, manifest/manifest.json)
and renders ONE self-contained HTML file: a subject -> chapter -> document graph
plus a per-document status matrix showing, at a glance, whether every document is

  • Shelved     — copied to the public S3 shelf (node has s3_key)
  • Searchable  — indexed in fulltext (usable by grounding / the textbook chat)
  • Listed      — present in the manifest edova-web reads

so you can eyeball "is everything updated?" after any upload. The output opens
in any browser and needs no server.

Usage:
    python tools/okf_dashboard.py                    # -> okf-bundle/okf_dashboard.html
    python tools/okf_dashboard.py --out map.html
    python tools/okf_dashboard.py --bundle okf-bundle --mode fragment  # body-only
"""
import argparse
import glob
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml


def load_json(path, default=None):
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, json.JSONDecodeError):
        return default


def load_node(path, default: dict | None = None) -> dict:
    """nodes/*.md: YAML frontmatter + markdown body (see ingest.py)."""
    default = default or {}
    try:
        with open(path, encoding="utf-8") as fh:
            _, front, _ = fh.read().split("---", 2)
        return yaml.safe_load(front) or default
    except (OSError, ValueError, yaml.YAMLError):
        return default


def collect(bundle: str) -> dict:
    nodes = [load_node(p, {}) for p in glob.glob(os.path.join(bundle, "nodes", "*.md"))]
    nodes = [n for n in nodes if n.get("doc_id")]
    edges = [load_json(p, {}) for p in glob.glob(os.path.join(bundle, "edges", "*.json"))]
    edges = [e for e in edges if e.get("from")]

    fulltext = load_json(os.path.join(bundle, "indexes", "fulltext.json"), {}) or {}
    searchable = set()
    for ids in fulltext.values():
        searchable.update(ids)

    manifest = load_json(os.path.join(bundle, "manifest", "manifest.json"), {}) or {}
    listed = {r["id"] for r in manifest.get("resources", []) if r.get("id")}

    # Text-bearing types are EXPECTED to be searchable; media types are not, so a
    # missing fulltext entry is only "needs attention" for a text document.
    TEXT_TYPES = {"chapter_content", "worksheet", "notes", "question_bank", "lesson_plan"}

    out_nodes = []
    for n in nodes:
        did = n["doc_id"]
        shelved = bool(n.get("s3_key"))
        is_searchable = did in searchable
        is_listed = did in listed
        is_text = n.get("doc_type", "") in TEXT_TYPES
        if not shelved or not is_listed:
            status = "missing"       # not on the shelf / not in the app list
        elif is_text and not is_searchable:
            status = "partial"       # shelved & listed but content not indexed
        else:
            status = "ready"         # fully updated (media needs no fulltext)
        out_nodes.append({
            "doc_id": did, "title": n.get("title", did),
            "subject": n.get("subject", ""), "chapter_id": n.get("chapter_id", ""),
            "chapter_name": n.get("chapter_name", ""), "doc_type": n.get("doc_type", "document"),
            "topic_id": n.get("topic_id") or "",
            "shelved": shelved, "searchable": is_searchable, "listed": is_listed,
            "expects_search": is_text, "status": status,
            "s3_key": n.get("s3_key", ""), "ingested_at": n.get("ingested_at", ""),
        })
    out_nodes.sort(key=lambda x: (x["subject"], x["chapter_id"], x["doc_type"], x["title"]))

    summary = {
        "total": len(out_nodes),
        "shelved": sum(n["shelved"] for n in out_nodes),
        "searchable": sum(n["searchable"] for n in out_nodes),
        "listed": sum(n["listed"] for n in out_nodes),
        "ready": sum(n["status"] == "ready" for n in out_nodes),
        "partial": sum(n["status"] == "partial" for n in out_nodes),
        "missing": sum(n["status"] == "missing" for n in out_nodes),
        "manifest_count": manifest.get("count", len(listed)),
        "chapters": len({(n["subject"], n["chapter_id"]) for n in out_nodes}),
        "subjects": len({n["subject"] for n in out_nodes}),
        "edges": len(edges),
    }
    return {
        "generated_at": datetime.now(timezone.utc).astimezone().strftime("%d %b %Y, %I:%M %p"),
        "bucket_prefix": f"{manifest.get('bucket', '')}/{manifest.get('prefix', '')}".strip("/"),
        "nodes": out_nodes, "edges": edges, "summary": summary,
    }


# --- HTML (self-contained; tokens replaced below) --------------------------

CONTENT = (Path(__file__).resolve().parent / "templates" / "okf_dashboard.html").read_text(encoding="utf-8")


STANDALONE = ('<!doctype html><html lang="en"><head><meta charset="utf-8">'
              '<meta name="viewport" content="width=device-width,initial-scale=1">'
              '<title>%%TITLE%%</title></head><body>%%BODY%%</body></html>')


def render(data: dict, fragment: bool) -> str:
    body = (CONTENT
            .replace("%%DATA%%", json.dumps(data))
            .replace("%%GENERATED%%", data["generated_at"])
            .replace("%%PREFIX%%", data["bucket_prefix"] or "—"))
    if fragment:
        return body
    return STANDALONE.replace("%%TITLE%%", "OKF Bundle Health Map").replace("%%BODY%%", body)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bundle", default="okf-bundle", help="path to the OKF bundle dir")
    ap.add_argument("--out", default=None, help="output HTML path (default: <bundle>/okf_dashboard.html)")
    ap.add_argument("--mode", choices=["standalone", "fragment"], default="standalone",
                    help="standalone = full HTML file; fragment = body-only (for embedding)")
    args = ap.parse_args()

    if not os.path.isdir(os.path.join(args.bundle, "nodes")):
        print(f"! no nodes/ under {args.bundle} — is this an OKF bundle?", file=sys.stderr)
        return 2

    data = collect(args.bundle)
    html = render(data, args.mode == "fragment")
    out = args.out or os.path.join(args.bundle, "okf_dashboard.html")
    with open(out, "w", encoding="utf-8") as fh:
        fh.write(html)

    s = data["summary"]
    print(f"OKF dashboard -> {out}")
    print(f"  {s['total']} documents · {s['shelved']} shelved · {s['searchable']} searchable · "
          f"{s['listed']} listed · {s['ready']} ready / {s['partial']} partial / {s['missing']} missing")
    return 0


if __name__ == "__main__":
    sys.exit(main())
