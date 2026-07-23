import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # DeepSeek — LLM tasks (chat, semantic-search answer generation)
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
    DEEPSEEK_BASE_URL = os.getenv("BASE_URL", "https://api.deepseek.com")
    DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    # Gemini — embeddings only (see embedding/gemini_embedder.py)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2")

    # LlamaParse — PDF extraction (see extraction/llamaparse_extractor.py)
    LLAMA_CLOUD_API = os.getenv("LLAMA_CLOUD_API")

    # Database — same Postgres instance/database as the main Edova app
    # (db/), not a standalone ncert_db. knowledge_chunks is a global,
    # unscoped table there; schema is owned by db/migrations, not by this
    # app at runtime.
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/edova")

    # Embedding — 768 dims: gemini-embedding-2's recommended truncation
    # tier (Matryoshka Representation Learning; no meaningful accuracy loss
    # vs the 3072 default, ~4x smaller HNSW index). Must match the
    # vector(768) columns in db/migrations/20260101000014_gemini_768_embeddings.sql —
    # changing this without a matching migration breaks retrieval silently
    # (cosine distance between different-dimension vectors is meaningless).
    EMBEDDING_DIM = 768

    # Paths
    PDF_DIR = os.getenv("PDF_DIR", "./data/pdfs")
    # edova-third-brain (OKF librarian: ingest.py + s3_push.py live there).
    THIRD_BRAIN_DIR = os.getenv("THIRD_BRAIN_DIR", "../edova-third-brain")

    # S3 uploads (teacher UI uploads -> staging -> librarian shelves canonically)
    S3_BUCKET = os.getenv("S3_BUCKET", "innuxai-edova-coteacher")
    S3_PREFIX = os.getenv("S3_PREFIX", "Class-10/Semester-01")
    S3_STAGING_PREFIX = os.getenv("S3_STAGING_PREFIX", "uploads")
    UPLOAD_MAX_VIDEO_MB = int(os.getenv("UPLOAD_MAX_VIDEO_MB", "2048"))
    UPLOAD_MAX_DOC_MB = int(os.getenv("UPLOAD_MAX_DOC_MB", "200"))
    # Optional shared secret for the upload endpoints (X-Upload-Token header).
    # Track-2 real auth replaces this — see instructions/dedicated-backend-plan.md.
    UPLOAD_TOKEN = os.getenv("UPLOAD_TOKEN")
    # Comma-separated browser origins allowed to call this API.
    API_CORS_ORIGINS = os.getenv(
        "API_CORS_ORIGINS", "http://localhost:5173,http://localhost:5174")
    # Local directory holding an Open Knowledge Format bundle (Google Cloud's
    # markdown+YAML-frontmatter spec: github.com/GoogleCloudPlatform/knowledge-catalog).
    # "Fetching docs from OKF" means getting an OKF bundle onto disk here
    # (git clone / download) — see ingestion/okf_bundle_parser.py. Defaults
    # to the real bundle already in this repo (edova-brain/OKF/math-Knowledge,
    # sibling to ncert_rag/), not a synthetic placeholder.
    OKF_BUNDLE_DIR = os.getenv("OKF_BUNDLE_DIR", "../edova-brain/OKF/math-Knowledge")
    # edova-brain/OKF/'s resource: fields point back into this sibling
    # workspace for the substantive content (worked examples, question
    # banks) — OKF itself is a thin pointer layer. See okf_bundle_parser's
    # resolve_resources option.
    OKF_RESOLVE_RESOURCES = os.getenv("OKF_RESOLVE_RESOURCES", "true").lower() == "true"

    # Processing
    CHUNK_SIZE = 512
    CHUNK_OVERLAP = 50

settings = Settings()
