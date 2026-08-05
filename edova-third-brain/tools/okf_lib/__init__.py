"""
okf_lib — the OKF bundle persistence library for edova-third-brain.

Extracted from tools/ingest.py so the CLI (ingest.py) and the four tool
consumers (classify / s3_push / auto_ingest / generate_metadata) plus
ncert_rag/clerk import one small library instead of a CLI script. Public
surface is re-exported here; ingest.py re-exports it too for backward
compatibility (clerk's `import ingest as okf_ingest`).

Bundle shape written by ingest():

  - nodes/<doc_id>.md             one node per document (OKF frontmatter+md)
  - edges/<chapter>_to_subject_<subject>.json
  - attachments/<subject>/<chapter>/<filename>   copy of the source file
  - indexes/by_subject|by_chapter|by_type/*.json
  - indexes/fulltext.json
  - manifest/bundle.json          bundle-level summary
  - history/history.jsonl         one line per ingest event

Re-ingesting an unchanged file (same content hash) is a no-op.
Re-ingesting a changed file replaces the stale node, indexes, and attachment.
"""

import sys
import json
import re
import shutil
import hashlib
from pathlib import Path
from datetime import datetime, timezone

import yaml

# tools/okf_lib/__init__.py -> edova-third-brain/ (three levels up).
ROOT = Path(__file__).resolve().parent.parent.parent
OKF_VERSION = "1.0.0"


def load_config():
    return yaml.safe_load((ROOT / "config.yaml").read_text(encoding="utf-8"))


BARE_CHAPTER = re.compile(r"^ch\d+$", re.IGNORECASE)


def qualify_chapter_id(subject: str, chapter_id: str) -> str:
    """Prefix bare `chN` ids with the subject so chapters are unique across subjects."""
    if BARE_CHAPTER.match(chapter_id):
        return f"{subject}-{chapter_id.lower()}"
    return chapter_id


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


# Extensions with machine-readable text. Anything else (video, audio, images)
# is binary: decoding it would flood fulltext.json with garbage tokens, so
# those docs are catalogued without fulltext entries.
TEXT_SUFFIXES = {".md", ".txt", ".csv", ".json", ".yaml", ".yml", ".html", ".tex"}


def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        from pypdf import PdfReader
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if suffix in TEXT_SUFFIXES:
        return path.read_text(encoding="utf-8", errors="ignore")
    return ""


def read_json(path: Path, default):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


# nodes/ (the concept-document layer) are OKF-shaped per the Open Knowledge
# Format spec (https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md):
# one file per doc, YAML frontmatter (`type` is the spec's only required
# field) + a short markdown body, instead of the old flat JSON. Everything
# else in the bundle (edges/indexes/manifest/history) is internal
# bookkeeping, not spec concept documents, and stays plain JSON.
NODE_EXT = ".md"


def read_node(path: Path) -> dict:
    if path.suffix == ".json":  # pre-migration leftover, if one is ever found
        return json.loads(path.read_text(encoding="utf-8"))
    text = path.read_text(encoding="utf-8")
    _, front, _ = text.split("---", 2)
    return yaml.safe_load(front) or {}


def write_node(path: Path, node: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    front = {"type": node.get("doc_type", "document"), **node}
    front_text = yaml.safe_dump(front, sort_keys=False, allow_unicode=True)
    body = f"# {node.get('title', node.get('doc_id', ''))}\n"
    if node.get("chapter_name"):
        body += f"\n{node['chapter_name']} — {node.get('doc_type', 'document')} for `{node.get('subject', '')}`.\n"
    path.write_text(f"---\n{front_text}---\n\n{body}", encoding="utf-8")


def ingest(subject: str, chapter_id: str, chapter_name: str, doc_type: str, file_path: Path,
           trust: dict | None = None, topic_id: str | None = None):
    config = load_config()
    bundle = ROOT / config["paths"]["okf_bundle"]

    chapter_id = qualify_chapter_id(subject, chapter_id)
    h = file_hash(file_path)
    doc_id = f"{subject}_{chapter_id}_{doc_type}_{h[:8]}"

    node_path = bundle / "nodes" / f"{doc_id}{NODE_EXT}"

    # Dedup: same subject/chapter/type already indexed with this hash -> skip.
    # Same slot AND same title (same source file, new content) -> stale version;
    # remove it before writing. A different title in the same slot is a distinct
    # document (e.g. two videos in one chapter) and coexists.
    existing = sorted((bundle / "nodes").glob(f"{subject}_{chapter_id}_{doc_type}_*{NODE_EXT}"))
    for e in existing:
        node = read_node(e)
        if node.get("file_hash") == h:
            print(f"SKIP (duplicate, unchanged): {doc_id} already at {e.name}")
            return {"status": "skipped", "doc_id": node["doc_id"]}
        if node.get("title") == file_path.stem:
            print(f"REPLACING (content changed): {node['doc_id']}")
            remove(node["doc_id"])

    now = datetime.now(timezone.utc).isoformat()

    # 1. node
    # trust tells a consumer how this filing decision was made:
    #   unverified       - no signal at all (default; e.g. direct CLI use)
    #   auto_classified  - classify.py picked subject/chapter/type; carries
    #                      its confidence score so a low-confidence guess
    #                      can be told apart from a fairly sure one
    #   teacher_reviewed - a person confirmed it (either an app upload,
    #                      where a teacher chose subject/chapter/type
    #                      themselves, or a later explicit review)
    node = {
        "doc_id": doc_id,
        "title": file_path.stem,
        "subject": subject,
        "chapter_id": chapter_id,
        "chapter_name": chapter_name,
        "topic_id": topic_id,
        "doc_type": doc_type,
        "source_path": file_path.relative_to(ROOT).as_posix(),
        "file_hash": h,
        "ingested_at": now,
        "trust": trust or {"status": "unverified"},
    }
    write_node(node_path, node)

    # 2. edge: chapter -> subject (doc_ids tracks every doc in the chapter)
    edge_id = f"{chapter_id}_to_subject_{subject}"
    edge_path = bundle / "edges" / f"{edge_id}.json"
    edge = read_json(edge_path, {
        "edge_id": edge_id,
        "type": "belongs_to",
        "from": chapter_id,
        "to": f"subject_{subject}",
        "doc_ids": [],
    })
    if doc_id not in edge["doc_ids"]:
        edge["doc_ids"].append(doc_id)
    write_json(edge_path, edge)

    # 3. attachment copy
    attach_dir = bundle / "attachments" / subject / chapter_id
    attach_dir.mkdir(parents=True, exist_ok=True)
    shutil.copy2(file_path, attach_dir / file_path.name)

    # 4. indexes
    by_subject = bundle / "indexes" / "by_subject" / f"{subject}.json"
    ids = read_json(by_subject, [])
    if doc_id not in ids:
        ids.append(doc_id)
    write_json(by_subject, ids)

    by_chapter = bundle / "indexes" / "by_chapter" / f"{subject}_{chapter_id}.json"
    ids = read_json(by_chapter, [])
    if doc_id not in ids:
        ids.append(doc_id)
    write_json(by_chapter, ids)

    by_type = bundle / "indexes" / "by_type" / f"{doc_type}.json"
    ids = read_json(by_type, [])
    if doc_id not in ids:
        ids.append(doc_id)
    write_json(by_type, ids)

    fulltext_path = bundle / "indexes" / "fulltext.json"
    fulltext = read_json(fulltext_path, {})
    words = set(extract_text(file_path).lower().split())
    for w in words:
        w = w.strip(".,:;!?()[]\"'")
        if len(w) < 3:
            continue
        fulltext.setdefault(w, [])
        if doc_id not in fulltext[w]:
            fulltext[w].append(doc_id)
    write_json(fulltext_path, fulltext)

    # 5. manifest
    manifest_path = bundle / "manifest" / "bundle.json"
    manifest = read_json(manifest_path, {
        "okf_version": OKF_VERSION,
        "created_at": now,
        "doc_count": 0,
        "doc_ids": [],
    })
    if doc_id not in manifest["doc_ids"]:
        manifest["doc_ids"].append(doc_id)
        manifest["doc_count"] = len(manifest["doc_ids"])
    manifest["last_updated"] = now
    write_json(manifest_path, manifest)

    # 6. history
    history_path = bundle / "history" / "history.jsonl"
    history_path.parent.mkdir(parents=True, exist_ok=True)
    with history_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"action": "add", "doc_id": doc_id, "at": now}) + "\n")

    print(f"ADDED: {doc_id}")
    return {"status": "added", "doc_id": doc_id}


def remove(doc_id: str):
    config = load_config()
    bundle = ROOT / config["paths"]["okf_bundle"]

    node_path = bundle / "nodes" / f"{doc_id}{NODE_EXT}"
    if not node_path.exists():
        print(f"NOT FOUND: {doc_id}")
        return {"status": "not_found", "doc_id": doc_id}

    node = read_node(node_path)
    subject, chapter_id, doc_type = node["subject"], node["chapter_id"], node["doc_type"]

    node_path.unlink()

    for index_key, index_name in [
        (subject, "by_subject"),
        (f"{subject}_{chapter_id}", "by_chapter"),
        (doc_type, "by_type"),
    ]:
        idx_path = bundle / "indexes" / index_name / f"{index_key}.json"
        ids = read_json(idx_path, [])
        if doc_id in ids:
            ids.remove(doc_id)
        if ids:
            write_json(idx_path, ids)
        elif idx_path.exists():
            idx_path.unlink()  # no docs left for this key - drop the empty index

    fulltext_path = bundle / "indexes" / "fulltext.json"
    fulltext = read_json(fulltext_path, {})
    for word, ids in list(fulltext.items()):
        if doc_id in ids:
            ids.remove(doc_id)
        if not ids:
            del fulltext[word]
    write_json(fulltext_path, fulltext)

    # attachment
    attach_path = bundle / "attachments" / subject / chapter_id / Path(node["source_path"]).name
    if attach_path.exists():
        attach_path.unlink()
    # prune attachment dirs left empty
    for d in (attach_path.parent, attach_path.parent.parent):
        if d.is_dir() and not any(d.iterdir()):
            d.rmdir()

    # edge: drop this doc; delete the edge only when the chapter has no docs left
    edge_path = bundle / "edges" / f"{chapter_id}_to_subject_{subject}.json"
    edge = read_json(edge_path, None)
    if edge:
        if doc_id in edge.get("doc_ids", []):
            edge["doc_ids"].remove(doc_id)
        if edge["doc_ids"]:
            write_json(edge_path, edge)
        else:
            edge_path.unlink()

    # manifest
    manifest_path = bundle / "manifest" / "bundle.json"
    manifest = read_json(manifest_path, {"okf_version": OKF_VERSION, "doc_count": 0, "doc_ids": []})
    if doc_id in manifest["doc_ids"]:
        manifest["doc_ids"].remove(doc_id)
        manifest["doc_count"] = len(manifest["doc_ids"])
    now = datetime.now(timezone.utc).isoformat()
    manifest["last_updated"] = now
    write_json(manifest_path, manifest)

    # history
    history_path = bundle / "history" / "history.jsonl"
    with history_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps({"action": "remove", "doc_id": doc_id, "at": now}) + "\n")

    print(f"REMOVED: {doc_id}")
    return {"status": "removed", "doc_id": doc_id}


