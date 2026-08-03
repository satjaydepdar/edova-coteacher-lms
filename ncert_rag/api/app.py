"""
FastAPI wrapper around the RAG pipeline (ingest / query / chat / stats).

Run with: uvicorn api.app:app --reload --port 8001

Each /query and /chat call is logged to rag_queries (the retrieval +
generation audit trail from db/migrations/20260101000013_...). No auth
layer exists yet in this app, so `user_id` is accepted as an optional
field on the request body — omit it and the log row is written with
user_id = NULL (rag_queries_insert's RLS policy explicitly allows that).
Once the main app has real auth, wire the authenticated user's id through
here instead of trusting a client-supplied value.
"""

import mimetypes
import re
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import List, Optional

import psycopg2
from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, Response
from pydantic import BaseModel

from api.routers import assessments, class_sections, curriculum, lesson_plans, memory, resources, syllabus
from config.settings import settings
from ingestion.okf_bundle_parser import OKFBundleParser
from ingestion.pipeline import IngestionPipeline
from query.engine import QueryEngine
from shared.chapter_map import to_okf_chapter
from storage.pgvector_store import PGVectorStore
from utils.pdf_utils import PDFUtils

app = FastAPI(title="Edova NCERT RAG", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.API_CORS_ORIGINS.split(",")],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Engines are process-wide singletons (each loads the embedding model into
# memory on construction — expensive to redo per-request).
_engine: Optional[QueryEngine] = None
_store: Optional[PGVectorStore] = None
_okf_parser: Optional[OKFBundleParser] = None


def get_okf_parser() -> OKFBundleParser:
    global _okf_parser
    if _okf_parser is None:
        _okf_parser = OKFBundleParser()
    return _okf_parser


def get_engine() -> QueryEngine:
    global _engine
    if _engine is None:
        _engine = QueryEngine()
    return _engine


def get_store() -> PGVectorStore:
    global _store
    if _store is None:
        _store = PGVectorStore()
    return _store


def _log_rag_query(user_id: Optional[str], query_text: str, retrieved_chunk_ids: List[str],
                    answer_text: str, model: str, latency_ms: int) -> None:
    """Best-effort audit log — a logging failure must never break the actual
    query/chat response the user is waiting on."""
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO rag_queries (user_id, query_text, retrieved_chunk_ids, answer_text, model, latency_ms)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (user_id, query_text, retrieved_chunk_ids, answer_text, model, latency_ms),
                )
            conn.commit()
        finally:
            conn.close()
    except Exception as e:
        print(f"rag_queries logging failed (non-fatal): {e}")


class IngestRequest(BaseModel):
    pdf_dir: str = "./data/pdfs"
    text_only: bool = False
    chunk_size: int = 512


class IngestOKFRequest(BaseModel):
    bundle_dir: str = "../edova-brain/OKF/math-Knowledge"
    chunk_size: int = 512
    resolve_resources: bool = True


class IngestResponse(BaseModel):
    processed: int
    failed: int
    total_chunks: int
    errors: List[str]


class QueryRequest(BaseModel):
    question: str
    top_k: int = 5
    user_id: Optional[str] = None


class Source(BaseModel):
    doc_id: str
    page: Optional[int] = None  # None for OKF concepts, which aren't paginated
    similarity: float


class QueryResponse(BaseModel):
    question: str
    answer: str
    sources: List[Source]


class ChatTurn(BaseModel):
    user: str
    assistant: str


class ChatRequest(BaseModel):
    message: str
    history: List[ChatTurn] = []
    user_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    sources: List[dict]


class StatsResponse(BaseModel):
    total_chunks: int


@app.post("/ingest", response_model=IngestResponse)
def ingest(req: IngestRequest):
    pdf_dir = Path(req.pdf_dir)
    if not pdf_dir.exists():
        raise HTTPException(status_code=400, detail=f"Directory not found: {pdf_dir}")

    pdf_files = PDFUtils.get_pdf_files(str(pdf_dir))
    if not pdf_files:
        raise HTTPException(status_code=400, detail=f"No PDF files found in {pdf_dir}")

    pipeline = IngestionPipeline()
    results = pipeline.process_and_store(
        [str(f) for f in pdf_files],
        use_vision=not req.text_only,
        chunk_size=req.chunk_size,
    )
    return IngestResponse(**results)


@app.post("/ingest-okf", response_model=IngestResponse)
def ingest_okf(req: IngestOKFRequest):
    bundle_dir = Path(req.bundle_dir)
    if not bundle_dir.exists():
        raise HTTPException(status_code=400, detail=f"OKF bundle directory not found: {bundle_dir}")

    pipeline = IngestionPipeline()
    results = pipeline.process_okf_bundle(
        str(bundle_dir),
        chunk_size=req.chunk_size,
        resolve_resources=req.resolve_resources,
    )
    return IngestResponse(**results)


_RANGE_RE = re.compile(r"bytes=(\d+)-(\d*)")


def _serve_file_with_range(path: Path, media_type: str, range_header: Optional[str]) -> Response:
    """
    Starlette 0.38's FileResponse (the version this app is pinned to) does
    NOT implement HTTP Range requests — no Accept-Ranges header, no 206
    response, always sends the whole file. That's a real gap for video: a
    browser's <video> scrubber needs range support to seek without
    re-downloading from the start. Handled manually here instead of
    assuming the framework covers it — verified via curl that the
    unranged version really did ignore a Range header before writing this.
    """
    file_size = path.stat().st_size
    match = _RANGE_RE.match(range_header) if range_header else None

    if match:
        start = int(match.group(1))
        end = int(match.group(2)) if match.group(2) else file_size - 1
        end = min(end, file_size - 1)
        if 0 <= start <= end < file_size:
            with open(path, "rb") as f:
                f.seek(start)
                data = f.read(end - start + 1)
            return Response(
                content=data,
                status_code=206,
                media_type=media_type,
                headers={
                    "Content-Range": f"bytes {start}-{end}/{file_size}",
                    "Accept-Ranges": "bytes",
                    "Content-Disposition": f'inline; filename="{path.name}"',
                },
            )

    # No range requested, or a malformed one — send the whole file, but
    # advertise range support so the client knows it can ask for one next time.
    response = FileResponse(path, media_type=media_type, filename=path.name, content_disposition_type="inline")
    response.headers["Accept-Ranges"] = "bytes"
    return response


@app.get("/okf/media/{concept_id:path}")
def okf_media(concept_id: str, request: Request):
    """
    Resolve an OKF concept's resource: field and serve it directly — for a
    "watch this video" / "view this chapter PDF" button, not for semantic
    search. concept_id is the same id used everywhere else (e.g.
    "chapters/quadratic-equations/videos/quadratic-polynomial") — the path
    within the bundle, without the .md extension.

    Local files stream back with Content-Disposition: inline (browser
    plays/displays it in place rather than downloading, matching a native
    <video>/<embed> element); external resource: URLs redirect.
    """
    parser = get_okf_parser()
    try:
        resolved = parser.resolve_concept_media(concept_id, settings.OKF_BUNDLE_DIR)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

    if resolved["kind"] == "url":
        return RedirectResponse(url=resolved["url"])

    path = resolved["path"]
    media_type = mimetypes.guess_type(str(path))[0] or "application/octet-stream"
    return _serve_file_with_range(path, media_type, request.headers.get("range"))


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    engine = get_engine()
    start = time.perf_counter()
    result = engine.query(req.question, top_k=req.top_k)
    latency_ms = int((time.perf_counter() - start) * 1000)

    _log_rag_query(
        user_id=req.user_id,
        query_text=req.question,
        retrieved_chunk_ids=result.get("chunk_ids", []),
        answer_text=result["answer"],
        model=settings.NEMOTRON_MODEL,
        latency_ms=latency_ms,
    )
    return result


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    engine = get_engine()
    history = [{"user": t.user, "assistant": t.assistant} for t in req.history]

    start = time.perf_counter()
    result = engine.chat(req.message, history)
    latency_ms = int((time.perf_counter() - start) * 1000)

    _log_rag_query(
        user_id=req.user_id,
        query_text=req.message,
        retrieved_chunk_ids=result.get("chunk_ids", []),
        answer_text=result["response"],
        model=settings.NEMOTRON_MODEL,
        latency_ms=latency_ms,
    )
    return result


@app.get("/stats", response_model=StatsResponse)
def stats():
    store = get_store()
    return StatsResponse(total_chunks=store.get_document_count())


# ---------------------------------------------------------------- uploads
# Teacher UI upload flow (Track 1): browser -> presign -> PUT direct to S3
# staging -> complete -> librarian (ingest + s3_push) shelves it canonically.
# The browser never holds AWS keys; this service only signs and orchestrates.

UPLOAD_VIDEO_EXTS = {"mp4", "webm", "mov"}
UPLOAD_DOC_EXTS = {"pdf", "ppt", "pptx", "doc", "docx", "md"}


def _check_upload_token(x_upload_token: Optional[str]) -> None:
    """Shared-secret gate until Track-2 auth lands. If UPLOAD_TOKEN is unset
    the endpoints run open (single-school dev default)."""
    if settings.UPLOAD_TOKEN and x_upload_token != settings.UPLOAD_TOKEN:
        raise HTTPException(status_code=401, detail="invalid upload token")


def _s3_client():
    try:
        import boto3
        return boto3.client("s3")
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"S3 unavailable: {exc}")


def map_chapter(subject: str, chapter: str) -> tuple:
    """Frontend chapter id -> OKF chapter id. The mapping rule itself lives
    in shared/chapter_map.py (single source of truth, shared with clerk)."""
    try:
        return to_okf_chapter(subject, chapter)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


class PresignRequest(BaseModel):
    filename: str
    content_type: str
    size_bytes: int
    teacher_id: Optional[str] = None


class PresignResponse(BaseModel):
    upload_url: str
    staging_key: str
    expires_in: int


@app.post("/uploads/presign", response_model=PresignResponse)
def presign(req: PresignRequest, x_upload_token: Optional[str] = Header(None)):
    _check_upload_token(x_upload_token)
    ext = req.filename.rsplit(".", 1)[-1].lower() if "." in req.filename else ""
    if ext not in UPLOAD_VIDEO_EXTS | UPLOAD_DOC_EXTS:
        raise HTTPException(status_code=422, detail=f"file type .{ext} not allowed")
    limit_mb = settings.UPLOAD_MAX_VIDEO_MB if ext in UPLOAD_VIDEO_EXTS else settings.UPLOAD_MAX_DOC_MB
    if req.size_bytes > limit_mb * 1024 * 1024:
        raise HTTPException(status_code=422, detail=f"file exceeds {limit_mb} MB limit")

    teacher = re.sub(r"[^a-zA-Z0-9_-]", "", req.teacher_id or "teacher") or "teacher"
    staging_key = f"{settings.S3_STAGING_PREFIX}/{teacher}/{uuid.uuid4().hex}.{ext}"
    try:
        url = _s3_client().generate_presigned_url(
            "put_object",
            Params={"Bucket": settings.S3_BUCKET, "Key": staging_key,
                    "ContentType": req.content_type},
            ExpiresIn=900)
    except Exception as exc:
        raise HTTPException(status_code=503,
                            detail=f"could not sign upload (AWS credentials configured?): {exc}")
    return PresignResponse(upload_url=url, staging_key=staging_key, expires_in=900)


class CompleteRequest(BaseModel):
    staging_key: str
    title: str
    subject: str
    chapter: str                # frontend id (sci10-ch05) or OKF id (biology-ch1)
    doc_type: str = "video"
    teacher_id: Optional[str] = None


class CompleteResponse(BaseModel):
    doc_id: str
    s3_key: str
    preview_s3_key: str


def _run_librarian(args: list, cwd: Path) -> str:
    proc = subprocess.run([sys.executable, *args], cwd=cwd,
                          capture_output=True, text=True, timeout=600)
    if proc.returncode != 0:
        raise HTTPException(status_code=502,
                            detail=f"librarian step failed ({args[0]}): {proc.stderr[-400:]}")
    return proc.stdout


@app.post("/uploads/complete", response_model=CompleteResponse)
def complete(req: CompleteRequest, x_upload_token: Optional[str] = Header(None)):
    _check_upload_token(x_upload_token)
    if not req.staging_key.startswith(f"{settings.S3_STAGING_PREFIX}/"):
        raise HTTPException(status_code=422, detail="staging_key outside staging area")
    subject, chapter_id = map_chapter(req.subject, req.chapter)

    s3 = _s3_client()
    third_brain = Path(settings.THIRD_BRAIN_DIR).resolve()
    inbox = third_brain / "inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    local = inbox / f"upload_{uuid.uuid4().hex[:8]}_{Path(req.staging_key).name}"

    try:
        s3.download_file(settings.S3_BUCKET, req.staging_key, str(local))
    except Exception:
        raise HTTPException(status_code=404, detail="staged file not found in S3")

    try:
        chapter_name = req.title
        out = _run_librarian(
            ["tools/ingest.py", subject, chapter_id, chapter_name,
             req.doc_type, str(local)], third_brain)
        m = re.search(r'"doc_id"\s*:\s*"([^"]+)"', out)
        if not m:
            raise HTTPException(status_code=502, detail="ingest did not return a doc_id")
        doc_id = m.group(1)

        _run_librarian(["tools/s3_push.py", "--upload"], third_brain)

        node_path = third_brain / "okf-bundle" / "nodes" / f"{doc_id}.md"
        # nodes/*.md: YAML frontmatter + markdown body (see tools/ingest.py in
        # third_brain, run above via _run_librarian as a subprocess).
        import yaml as _yaml
        _, front, _ = node_path.read_text(encoding="utf-8").split("---", 2)
        node = _yaml.safe_load(front) or {}
        s3_key = node.get("s3_key")
        if not s3_key:
            raise HTTPException(status_code=502, detail="shelved but node has no s3_key")

        s3.delete_object(Bucket=settings.S3_BUCKET, Key=req.staging_key)
        # getAssetUrl() percent-encodes the key itself; preview_s3_key must
        # be the literal object key (see s3_push.py's build_manifest).
        return CompleteResponse(doc_id=doc_id, s3_key=s3_key, preview_s3_key=s3_key)
    finally:
        local.unlink(missing_ok=True)


@app.delete("/collection")
def clear_collection(confirm: bool = False):
    if not confirm:
        raise HTTPException(status_code=400, detail="Pass ?confirm=true to actually clear the collection")
    store = get_store()
    store.clear_collection()
    return {"status": "cleared"}


# ------------------------------------------------------------ CRUD routers
# The embedded system-of-record CRUD API (curriculum settings, master-data
# syllabus tree, saved lesson plans, class sections + topic progress) serves
# the clerk-compatible contract edova-web already speaks — extracted into
# api/routers/ + api/repositories.py, backed by Postgres.
app.include_router(curriculum.router)
app.include_router(syllabus.router)
app.include_router(lesson_plans.router)
app.include_router(class_sections.router)
app.include_router(resources.router)
app.include_router(memory.router)
app.include_router(assessments.router)
