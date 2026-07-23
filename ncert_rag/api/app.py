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
import json
import re
import subprocess
import sys
import time
import uuid
from pathlib import Path
from typing import List, Optional

import psycopg2
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, Response
from pydantic import BaseModel

from config.settings import settings
from ingestion.okf_bundle_parser import OKFBundleParser
from ingestion.pipeline import IngestionPipeline
from query.engine import QueryEngine
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
        model=settings.DEEPSEEK_MODEL,
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
        model=settings.DEEPSEEK_MODEL,
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
    """Frontend chapter id -> OKF chapter id.
    OKF form (biology-ch1) passes through. Class-10 NCERT science book:
    ch1-4 chemistry, 5-8 biology, 9-13 physics. Math: chNN -> math-chN."""
    if re.fullmatch(r"[a-z]+-ch\d+", chapter):
        return subject, chapter
    m = re.fullmatch(r"(?:sci10-|math10-)?ch(\d+)", chapter)
    if not m:
        raise HTTPException(status_code=422,
                            detail=f"cannot map chapter '{chapter}' - pass OKF chapter_id")
    n = int(m.group(1))
    if subject == "science":
        if n <= 4:
            return subject, f"chemistry-ch{n}"
        if n <= 8:
            return subject, f"biology-ch{n - 4}"
        return subject, f"physics-ch{n - 8}"
    return subject, f"math-ch{n}"


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

        node_path = third_brain / "okf-bundle" / "nodes" / f"{doc_id}.json"
        import json as _json
        node = _json.loads(node_path.read_text(encoding="utf-8"))
        s3_key = node.get("s3_key")
        if not s3_key:
            raise HTTPException(status_code=502, detail="shelved but node has no s3_key")

        s3.delete_object(Bucket=settings.S3_BUCKET, Key=req.staging_key)
        preview = "/".join(seg.replace(" ", "+") for seg in s3_key.split("/"))
        return CompleteResponse(doc_id=doc_id, s3_key=s3_key, preview_s3_key=preview)
    finally:
        local.unlink(missing_ok=True)


@app.delete("/collection")
def clear_collection(confirm: bool = False):
    if not confirm:
        raise HTTPException(status_code=400, detail="Pass ?confirm=true to actually clear the collection")
    store = get_store()
    store.clear_collection()
    return {"status": "cleared"}


# ============================================================
# CURRICULUM SETTINGS — Settings > Curriculum tab (edova-web)
# ============================================================

class AcademicYearOut(BaseModel):
    id: str
    year_label: str
    is_active: bool


class CurriculumSubjectOut(BaseModel):
    id: str
    s_no: int
    subject_code: str
    subject_name: str
    subject_type: str
    credits: int
    total_marks: Optional[int] = None
    total_chapters: Optional[int] = None
    syllabus_json: dict


class CurriculumOut(BaseModel):
    id: str
    year_label: str
    board: str
    class_label: str
    updated_at: str
    subjects: List[CurriculumSubjectOut]


class SubjectCreateRequest(BaseModel):
    subject_code: str
    subject_name: str
    subject_type: str = "Core"
    credits: int = 0
    total_marks: Optional[int] = None
    total_chapters: Optional[int] = None
    syllabus_json: dict = {}


def _curriculum_subject_row(r) -> CurriculumSubjectOut:
    return CurriculumSubjectOut(
        id=str(r[0]), s_no=r[1], subject_code=r[2], subject_name=r[3],
        subject_type=r[4], credits=r[5], total_marks=r[6],
        total_chapters=r[7], syllabus_json=r[8] or {},
    )


@app.get("/api/academic-years", response_model=List[AcademicYearOut])
def list_academic_years():
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, year_label, is_active FROM academic_years WHERE is_active ORDER BY year_label"
            )
            return [AcademicYearOut(id=str(r[0]), year_label=r[1], is_active=r[2]) for r in cur.fetchall()]
    finally:
        conn.close()


@app.get("/api/curriculums", response_model=CurriculumOut)
def get_curriculum(year: str, board: str, class_label: str = Query(alias="class")):
    """Get-or-create the curriculum card for a year/board/class combo — the
    Settings page always shows the card, so a missing combo is an empty
    curriculum, not an error."""
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM academic_years WHERE year_label = %s", (year,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail=f"unknown academic year '{year}'")
            year_id = row[0]

            cur.execute(
                """
                INSERT INTO curriculums (academic_year_id, board, class_label)
                VALUES (%s, %s, %s)
                ON CONFLICT ON CONSTRAINT uq_curriculums_year_board_class DO NOTHING
                RETURNING id, updated_at
                """,
                (year_id, board, class_label),
            )
            created = cur.fetchone()
            if created:
                curriculum_id, updated_at = created
            else:
                cur.execute(
                    "SELECT id, updated_at FROM curriculums WHERE academic_year_id = %s AND board = %s AND class_label = %s",
                    (year_id, board, class_label),
                )
                curriculum_id, updated_at = cur.fetchone()

            cur.execute(
                """
                SELECT id, s_no, subject_code, subject_name, subject_type, credits,
                       total_marks, total_chapters, syllabus_json
                FROM curriculum_subjects WHERE curriculum_id = %s ORDER BY s_no
                """,
                (curriculum_id,),
            )
            subjects = [_curriculum_subject_row(r) for r in cur.fetchall()]
        conn.commit()
        return CurriculumOut(
            id=str(curriculum_id), year_label=year, board=board,
            class_label=class_label, updated_at=updated_at.isoformat(),
            subjects=subjects,
        )
    finally:
        conn.close()


@app.delete("/api/curriculums/{curriculum_id}/subjects/{subject_id}", status_code=204)
def delete_curriculum_subject(curriculum_id: str, subject_id: str):
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM curriculum_subjects WHERE id = %s AND curriculum_id = %s",
                (subject_id, curriculum_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="subject not found in this curriculum")
        conn.commit()
    finally:
        conn.close()


@app.post("/api/curriculums/{curriculum_id}/subjects", response_model=CurriculumSubjectOut, status_code=201)
def add_curriculum_subject(curriculum_id: str, req: SubjectCreateRequest):
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO curriculum_subjects
                    (curriculum_id, subject_code, subject_name, subject_type,
                     credits, total_marks, total_chapters, syllabus_json)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING id, s_no, subject_code, subject_name, subject_type,
                          credits, total_marks, total_chapters, syllabus_json
                """,
                (
                    curriculum_id, req.subject_code, req.subject_name, req.subject_type,
                    req.credits, req.total_marks, req.total_chapters,
                    json.dumps(req.syllabus_json),
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return _curriculum_subject_row(row)
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail=f"subject code '{req.subject_code}' already exists in this curriculum")
    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        raise HTTPException(status_code=404, detail=f"unknown curriculum '{curriculum_id}'")
    finally:
        conn.close()


# ============================================================
# MASTER DATA — Settings > Master Data tab (edova-web)
# Per-subject syllabus detail tree: units (marks) → chapters → topics,
# stored in syllabus_units / syllabus_chapters / syllabus_topics
# (migration 0017). One PUT replaces the whole tree atomically — the UI
# edits client-side and saves — then the flat curriculum_subjects
# summary (syllabus_json, total_chapters) is recomputed from the tree so
# the Curriculum tab never drifts from the detail.
# ============================================================

class SyllabusChapterIn(BaseModel):
    number: Optional[int] = None
    name: str
    topics: List[str] = []


class SyllabusUnitIn(BaseModel):
    name: str
    marks: Optional[int] = None
    chapters: List[SyllabusChapterIn] = []


class SyllabusPutRequest(BaseModel):
    units: List[SyllabusUnitIn] = []


class SyllabusTopicOut(BaseModel):
    id: str
    s_no: int
    title: str


class SyllabusChapterOut(BaseModel):
    id: str
    s_no: int
    number: Optional[int] = None
    name: str
    topics: List[SyllabusTopicOut]


class SyllabusUnitOut(BaseModel):
    id: str
    s_no: int
    name: str
    marks: Optional[int] = None
    chapters: List[SyllabusChapterOut]


class SyllabusOut(BaseModel):
    subject_id: str
    subject_name: str
    units: List[SyllabusUnitOut]


def _load_syllabus_tree(cur, subject_id: str) -> SyllabusOut:
    cur.execute(
        "SELECT subject_name FROM curriculum_subjects WHERE id = %s", (subject_id,)
    )
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="subject not found")
    subject_name = row[0]

    cur.execute(
        "SELECT id, s_no, name, marks FROM syllabus_units "
        "WHERE curriculum_subject_id = %s ORDER BY s_no",
        (subject_id,),
    )
    unit_rows = cur.fetchall()
    unit_ids = [str(r[0]) for r in unit_rows]

    chapter_rows = []
    if unit_ids:
        cur.execute(
            "SELECT id, unit_id, s_no, number, name FROM syllabus_chapters "
            "WHERE unit_id = ANY(%s::uuid[]) ORDER BY s_no",
            (unit_ids,),
        )
        chapter_rows = cur.fetchall()
    chapter_ids = [str(r[0]) for r in chapter_rows]

    topic_rows = []
    if chapter_ids:
        cur.execute(
            "SELECT id, chapter_id, s_no, title FROM syllabus_topics "
            "WHERE chapter_id = ANY(%s::uuid[]) ORDER BY s_no",
            (chapter_ids,),
        )
        topic_rows = cur.fetchall()

    topics_by_chapter: dict = {}
    for r in topic_rows:
        topics_by_chapter.setdefault(str(r[1]), []).append(
            SyllabusTopicOut(id=str(r[0]), s_no=r[2], title=r[3])
        )
    chapters_by_unit: dict = {}
    for r in chapter_rows:
        cid = str(r[0])
        chapters_by_unit.setdefault(str(r[1]), []).append(
            SyllabusChapterOut(
                id=cid, s_no=r[2], number=r[3], name=r[4],
                topics=topics_by_chapter.get(cid, []),
            )
        )
    units = [
        SyllabusUnitOut(
            id=str(r[0]), s_no=r[1], name=r[2], marks=r[3],
            chapters=chapters_by_unit.get(str(r[0]), []),
        )
        for r in unit_rows
    ]
    return SyllabusOut(subject_id=subject_id, subject_name=subject_name, units=units)


@app.get("/api/curriculum-subjects/{subject_id}/syllabus", response_model=SyllabusOut)
def get_subject_syllabus(subject_id: str):
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            return _load_syllabus_tree(cur, subject_id)
    finally:
        conn.close()


@app.put("/api/curriculum-subjects/{subject_id}/syllabus", response_model=SyllabusOut)
def put_subject_syllabus(subject_id: str, req: SyllabusPutRequest):
    """Replace the subject's whole syllabus tree in one transaction, then
    recompute the Curriculum-tab summary (syllabus_json unit→marks map and
    total_chapters) from the tree so summary and detail can't drift."""
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id FROM curriculum_subjects WHERE id = %s", (subject_id,)
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="subject not found")

            cur.execute(
                "DELETE FROM syllabus_units WHERE curriculum_subject_id = %s",
                (subject_id,),
            )
            for ui, unit in enumerate(req.units, start=1):
                cur.execute(
                    "INSERT INTO syllabus_units (curriculum_subject_id, s_no, name, marks) "
                    "VALUES (%s, %s, %s, %s) RETURNING id",
                    (subject_id, ui, unit.name.strip(), unit.marks),
                )
                unit_id = cur.fetchone()[0]
                for ci, ch in enumerate(unit.chapters, start=1):
                    cur.execute(
                        "INSERT INTO syllabus_chapters (unit_id, s_no, number, name) "
                        "VALUES (%s, %s, %s, %s) RETURNING id",
                        (unit_id, ci, ch.number, ch.name.strip()),
                    )
                    chapter_id = cur.fetchone()[0]
                    for ti, title in enumerate(ch.topics, start=1):
                        if title.strip():
                            cur.execute(
                                "INSERT INTO syllabus_topics (chapter_id, s_no, title) "
                                "VALUES (%s, %s, %s)",
                                (chapter_id, ti, title.strip()),
                            )

            syllabus_json = {u.name.strip(): (u.marks or 0) for u in req.units}
            total_chapters = sum(len(u.chapters) for u in req.units)
            cur.execute(
                "UPDATE curriculum_subjects SET syllabus_json = %s, total_chapters = %s "
                "WHERE id = %s",
                (json.dumps(syllabus_json), total_chapters, subject_id),
            )
            tree = _load_syllabus_tree(cur, subject_id)
        conn.commit()
        return tree
    finally:
        conn.close()


# ============================================================
# SAVED LESSON PLANS — Lesson Planner > AI Generator > "Save to My Plans"
# (edova-web). Persists the full generated draft so the teacher's library
# survives reload and a saved plan can be re-opened in full (migration 0018).
# Authless like the rest of this API today — plans are not yet scoped to a
# teacher; that waits on the auth layer (see module docstring).
# ============================================================

class SavedLessonPlanIn(BaseModel):
    topic: str
    class_label: str
    section: Optional[str] = None
    subject: str
    curriculum_subject_id: Optional[str] = None
    duration_minutes: int = 45
    standards: List[str] = []
    objective: str = ""
    materials: List[str] = []
    warmup: str = ""
    instruction: str = ""
    activity: str = ""
    assessment: str = ""
    homework: str = ""


class SavedLessonPlanOut(SavedLessonPlanIn):
    id: str
    created_at: str


# Column order shared by the INSERT ... RETURNING and the list SELECT so the
# row-tuple unpacking in _saved_lesson_plan_row stays in lockstep with both.
_SLP_COLUMNS = (
    "id, topic, class_label, section, subject, curriculum_subject_id, "
    "duration_minutes, standards, materials, objective, warmup, instruction, "
    "activity, assessment, homework, created_at"
)


def _saved_lesson_plan_row(r) -> SavedLessonPlanOut:
    return SavedLessonPlanOut(
        id=str(r[0]), topic=r[1], class_label=r[2], section=r[3], subject=r[4],
        curriculum_subject_id=str(r[5]) if r[5] else None,
        duration_minutes=r[6], standards=r[7] or [], materials=r[8] or [],
        objective=r[9], warmup=r[10], instruction=r[11], activity=r[12],
        assessment=r[13], homework=r[14], created_at=r[15].isoformat(),
    )


@app.get("/api/lesson-plans", response_model=List[SavedLessonPlanOut])
def list_saved_lesson_plans():
    """Newest first. Returns the full plan body (not just metadata) so the
    library can re-open a plan after reload without a second round-trip."""
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"SELECT {_SLP_COLUMNS} FROM saved_lesson_plans "
                "WHERE deleted_at IS NULL ORDER BY created_at DESC"
            )
            return [_saved_lesson_plan_row(r) for r in cur.fetchall()]
    finally:
        conn.close()


@app.post("/api/lesson-plans", response_model=SavedLessonPlanOut, status_code=201)
def save_lesson_plan(req: SavedLessonPlanIn):
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO saved_lesson_plans
                    (topic, class_label, section, subject, curriculum_subject_id,
                     duration_minutes, standards, materials, objective, warmup,
                     instruction, activity, assessment, homework)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING {_SLP_COLUMNS}
                """,
                (
                    req.topic.strip(), req.class_label, req.section, req.subject,
                    req.curriculum_subject_id or None, req.duration_minutes,
                    json.dumps(req.standards), json.dumps(req.materials),
                    req.objective, req.warmup, req.instruction, req.activity,
                    req.assessment, req.homework,
                ),
            )
            row = cur.fetchone()
        conn.commit()
        return _saved_lesson_plan_row(row)
    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        raise HTTPException(status_code=404, detail="unknown curriculum_subject_id")
    finally:
        conn.close()


@app.delete("/api/lesson-plans/{plan_id}", status_code=204)
def delete_saved_lesson_plan(plan_id: str):
    """Soft-delete (deleted_at), matching the schema's convention — a removed
    plan stays recoverable and out of the library list."""
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE saved_lesson_plans SET deleted_at = NOW() "
                "WHERE id = %s AND deleted_at IS NULL",
                (plan_id,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="lesson plan not found")
        conn.commit()
    finally:
        conn.close()


# ============================================================
# CLASS SECTIONS + PER-SECTION PACING (edova-web: Lesson Planner "This Week",
# Syllabus Map, Course Progress). Migration 0019.
#
# A section (e.g. "Class 8 — Section A · Mathematics") hangs off a
# curriculum_subject and tracks its OWN progress against the shared master
# syllabus tree. Ticking a topic here is what drives Actual %. Authless for
# now — no per-teacher scoping (see module docstring).
# ============================================================

# --- SELECT that resolves a section's display labels via the curriculum join.
_SECTION_SELECT = """
    SELECT cs.id, cs.curriculum_subject_id, cs.section, cs.teacher,
           ay.year_label, cu.board, cu.class_label, csub.subject_name
    FROM class_sections cs
    JOIN curriculum_subjects csub ON csub.id = cs.curriculum_subject_id
    JOIN curriculums cu ON cu.id = csub.curriculum_id
    JOIN academic_years ay ON ay.id = cu.academic_year_id
    WHERE cs.deleted_at IS NULL
"""


class SectionOut(BaseModel):
    id: str
    curriculum_subject_id: str
    section: str
    teacher: Optional[str] = None
    year_label: str
    board: str
    class_label: str
    subject_name: str


class SectionCreateRequest(BaseModel):
    curriculum_subject_id: str
    section: str
    teacher: Optional[str] = None


class PacingTopicOut(BaseModel):
    id: str
    title: str
    done: bool


class PacingChapterOut(BaseModel):
    id: str
    number: Optional[int] = None
    name: str
    topics: List[PacingTopicOut]


class PacingUnitOut(BaseModel):
    id: str
    name: str
    marks: Optional[int] = None
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    periods: Optional[int] = None
    weightage: Optional[str] = None
    actual: int            # % of this unit's topics marked done for this section
    chapters: List[PacingChapterOut]


class SectionPacingOut(SectionOut):
    units: List[PacingUnitOut]


class TopicToggleRequest(BaseModel):
    done: bool


class UnitPacingRequest(BaseModel):
    planned_start: Optional[str] = None
    planned_end: Optional[str] = None
    periods: Optional[int] = None
    weightage: Optional[str] = None


def _section_row(r) -> SectionOut:
    return SectionOut(
        id=str(r[0]), curriculum_subject_id=str(r[1]), section=r[2], teacher=r[3],
        year_label=r[4], board=r[5], class_label=r[6], subject_name=r[7],
    )


def _iso(d) -> Optional[str]:
    return d.isoformat() if d is not None else None


def _load_section_pacing(cur, section_id: str) -> SectionPacingOut:
    cur.execute(_SECTION_SELECT + " AND cs.id = %s", (section_id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="section not found")
    base = _section_row(row)
    cs_id = base.curriculum_subject_id

    # Units with this section's pacing overlay.
    cur.execute(
        """
        SELECT su.id, su.name, su.marks,
               p.planned_start, p.planned_end, p.periods, p.weightage
        FROM syllabus_units su
        LEFT JOIN section_unit_pacing p
          ON p.syllabus_unit_id = su.id AND p.section_id = %s
        WHERE su.curriculum_subject_id = %s
        ORDER BY su.s_no
        """,
        (section_id, cs_id),
    )
    unit_rows = cur.fetchall()
    unit_ids = [str(r[0]) for r in unit_rows]

    chapters_by_unit: dict = {}
    topics_by_chapter: dict = {}
    if unit_ids:
        cur.execute(
            "SELECT id, unit_id, s_no, number, name FROM syllabus_chapters "
            "WHERE unit_id = ANY(%s::uuid[]) ORDER BY s_no",
            (unit_ids,),
        )
        chapter_rows = cur.fetchall()
        chapter_ids = [str(r[0]) for r in chapter_rows]
        for cr in chapter_rows:
            chapters_by_unit.setdefault(str(cr[1]), []).append(cr)

        if chapter_ids:
            cur.execute(
                """
                SELECT t.id, t.chapter_id, t.title,
                       (tp.id IS NOT NULL AND tp.done) AS done
                FROM syllabus_topics t
                LEFT JOIN section_topic_progress tp
                  ON tp.syllabus_topic_id = t.id AND tp.section_id = %s
                WHERE t.chapter_id = ANY(%s::uuid[]) ORDER BY t.s_no
                """,
                (section_id, chapter_ids),
            )
            for tr in cur.fetchall():
                topics_by_chapter.setdefault(str(tr[1]), []).append(tr)

    units = []
    for u in unit_rows:
        uid = str(u[0])
        chapters = []
        done_ct = total_ct = 0
        for cr in chapters_by_unit.get(uid, []):
            cid = str(cr[0])
            topics = []
            for tr in topics_by_chapter.get(cid, []):
                is_done = bool(tr[3])
                total_ct += 1
                done_ct += 1 if is_done else 0
                topics.append(PacingTopicOut(id=str(tr[0]), title=tr[2], done=is_done))
            chapters.append(PacingChapterOut(id=cid, number=cr[3], name=cr[4], topics=topics))
        actual = round(done_ct / total_ct * 100) if total_ct else 0
        units.append(PacingUnitOut(
            id=uid, name=u[1], marks=u[2],
            planned_start=_iso(u[3]), planned_end=_iso(u[4]), periods=u[5], weightage=u[6],
            actual=actual, chapters=chapters,
        ))

    return SectionPacingOut(**base.model_dump(), units=units)


@app.get("/api/sections", response_model=List[SectionOut])
def list_sections(year: Optional[str] = None, board: Optional[str] = None,
                  class_label: Optional[str] = Query(None, alias="class")):
    clauses, params = [], []
    if year:
        clauses.append("ay.year_label = %s"); params.append(year)
    if board:
        clauses.append("cu.board = %s"); params.append(board)
    if class_label:
        clauses.append("cu.class_label = %s"); params.append(class_label)
    sql = _SECTION_SELECT + "".join(f" AND {c}" for c in clauses) + \
        " ORDER BY cu.class_label, cs.section, csub.subject_name"
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            return [_section_row(r) for r in cur.fetchall()]
    finally:
        conn.close()


@app.post("/api/sections", response_model=SectionOut, status_code=201)
def create_section(req: SectionCreateRequest):
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO class_sections (curriculum_subject_id, section, teacher) "
                "VALUES (%s, %s, %s) RETURNING id",
                (req.curriculum_subject_id, req.section.strip(), (req.teacher or "").strip() or None),
            )
            new_id = cur.fetchone()[0]
            cur.execute(_SECTION_SELECT + " AND cs.id = %s", (new_id,))
            out = _section_row(cur.fetchone())
        conn.commit()
        return out
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=409, detail="section already exists for this subject")
    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        raise HTTPException(status_code=404, detail="unknown curriculum_subject_id")
    finally:
        conn.close()


@app.delete("/api/sections/{section_id}", status_code=204)
def delete_section(section_id: str):
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE class_sections SET deleted_at = NOW() "
                "WHERE id = %s AND deleted_at IS NULL",
                (section_id,),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="section not found")
        conn.commit()
    finally:
        conn.close()


@app.get("/api/sections/{section_id}/pacing", response_model=SectionPacingOut)
def get_section_pacing(section_id: str):
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            return _load_section_pacing(cur, section_id)
    finally:
        conn.close()


class TopicToggleResult(BaseModel):
    section_id: str
    syllabus_topic_id: str
    done: bool
    unit_id: Optional[str] = None
    unit_actual: int


@app.put("/api/sections/{section_id}/topics/{topic_id}", response_model=TopicToggleResult)
def toggle_section_topic(section_id: str, topic_id: str, req: TopicToggleRequest):
    """Mark a topic taught/untaught for this section, then return the unit's
    recomputed Actual % so the UI can update without a full reload."""
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM class_sections WHERE id = %s AND deleted_at IS NULL", (section_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="section not found")

            # Resolve the topic's unit (also validates the topic exists).
            cur.execute(
                "SELECT c.unit_id FROM syllabus_topics t "
                "JOIN syllabus_chapters c ON c.id = t.chapter_id WHERE t.id = %s",
                (topic_id,),
            )
            urow = cur.fetchone()
            if not urow:
                raise HTTPException(status_code=404, detail="topic not found")
            unit_id = str(urow[0])

            if req.done:
                cur.execute(
                    """
                    INSERT INTO section_topic_progress (section_id, syllabus_topic_id, done, taught_on)
                    VALUES (%s, %s, TRUE, CURRENT_DATE)
                    ON CONFLICT (section_id, syllabus_topic_id)
                    DO UPDATE SET done = TRUE, taught_on = CURRENT_DATE
                    """,
                    (section_id, topic_id),
                )
            else:
                cur.execute(
                    "DELETE FROM section_topic_progress "
                    "WHERE section_id = %s AND syllabus_topic_id = %s",
                    (section_id, topic_id),
                )

            # Recompute the unit's Actual %.
            cur.execute(
                """
                SELECT COUNT(*) FILTER (WHERE tp.id IS NOT NULL AND tp.done), COUNT(*)
                FROM syllabus_topics t
                JOIN syllabus_chapters c ON c.id = t.chapter_id
                LEFT JOIN section_topic_progress tp
                  ON tp.syllabus_topic_id = t.id AND tp.section_id = %s
                WHERE c.unit_id = %s
                """,
                (section_id, unit_id),
            )
            done_ct, total_ct = cur.fetchone()
            actual = round(done_ct / total_ct * 100) if total_ct else 0
        conn.commit()
        return TopicToggleResult(
            section_id=section_id, syllabus_topic_id=topic_id,
            done=req.done, unit_id=unit_id, unit_actual=actual,
        )
    finally:
        conn.close()


@app.put("/api/sections/{section_id}/units/{unit_id}/pacing", status_code=204)
def set_unit_pacing(section_id: str, unit_id: str, req: UnitPacingRequest):
    conn = psycopg2.connect(settings.DATABASE_URL)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM class_sections WHERE id = %s AND deleted_at IS NULL", (section_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="section not found")
            cur.execute(
                """
                INSERT INTO section_unit_pacing
                    (section_id, syllabus_unit_id, planned_start, planned_end, periods, weightage)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (section_id, syllabus_unit_id) DO UPDATE SET
                    planned_start = EXCLUDED.planned_start,
                    planned_end   = EXCLUDED.planned_end,
                    periods       = EXCLUDED.periods,
                    weightage     = EXCLUDED.weightage
                """,
                (section_id, unit_id, req.planned_start or None, req.planned_end or None,
                 req.periods, (req.weightage or "").strip() or None),
            )
        conn.commit()
    except psycopg2.errors.ForeignKeyViolation:
        conn.rollback()
        raise HTTPException(status_code=404, detail="unknown syllabus unit for this section")
    finally:
        conn.close()
