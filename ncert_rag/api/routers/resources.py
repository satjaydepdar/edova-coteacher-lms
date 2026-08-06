"""Learning-resources catalog by subject — moved from clerk (its SQLite
subject ids are retired; the frontend now passes Postgres curriculum_subjects
UUIDs). Same response shape as the retired clerk endpoint: manifest resources
annotated with the real global chapter number via shared/chapter_map.py.
"""
import json
import re
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException

from api.repositories import CurriculumRepo, get_curriculum_repo
from shared.chapter_map import to_global_chapter_ref

router = APIRouter()

THIRD_BRAIN = Path(__file__).resolve().parents[3] / "edova-third-brain"


def _read_manifest() -> list[dict]:
    manifest_path = THIRD_BRAIN / "okf-bundle" / "manifest" / "manifest.json"
    if not manifest_path.exists():
        return []
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8")).get("resources", [])
    except (json.JSONDecodeError, OSError):
        return []


@router.get("/api/curriculum-subjects/{subject_id}/resources")
def get_subject_resources(subject_id: str, repo: CurriculumRepo = Depends(get_curriculum_repo)):
    subject_name = repo.get_subject_name(subject_id)
    if subject_name is None:
        raise HTTPException(status_code=404, detail="subject not found")
    out = []
    for r in _read_manifest():
        ref = to_global_chapter_ref(r.get("chapter_id", ""))
        if not ref or ref[0] != subject_name:
            continue
        raw_title = r.get("title", "")
        clean_title = re.sub(r"\s*—\s*(?:upload_[a-f0-9_]+|chapter-\d+-[a-z0-9-]+|test-[a-z0-9-]+|worksheet-[a-z0-9-]+).*", "", raw_title, flags=re.IGNORECASE).strip()
        if " — " in clean_title:
            parts = clean_title.split(" — ")
            if parts[0].strip().lower() == parts[1].strip().lower():
                clean_title = parts[0].strip()
            elif parts[1].strip().lower().startswith("upload_"):
                clean_title = parts[0].strip()
        out.append({
            "id": r["id"], "title": clean_title, "type": r["type"],
            "doc_type": r.get("doc_type"), "chapter_number": ref[1],
            "topic_id": r.get("topic_id"),
            "s3_key": r.get("s3_key"), "preview_s3_key": r.get("previewS3Key"),
            "s3_uploaded_at": r.get("s3_uploaded_at"),
            "status": r.get("status", "ready"),
            "external_url": r.get("external_url"),
            "trust": r.get("trust", {"status": "unverified"}),
        })
    return out
