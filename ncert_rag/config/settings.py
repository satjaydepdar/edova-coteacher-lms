import os
from pathlib import Path

from dotenv import load_dotenv

# Load the .env at the package root (ncert_rag/.env), independent of cwd.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

class Settings:
    # NVIDIA Nemotron (via NIM) — LLM tasks (chat, semantic-search answer generation)
    NEMOTRON_API_KEY = os.getenv("NEMOTRON_API_KEY")
    NEMOTRON_BASE_URL = os.getenv("NEMOTRON_BASE_URL", "https://integrate.api.nvidia.com/v1")
    NEMOTRON_MODEL = os.getenv("NEMOTRON_MODEL", "nvidia/llama-3.1-nemotron-70b-instruct")

    # Gemini — embeddings only (see embedding/gemini_embedder.py)
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2")

    # LlamaParse — PDF extraction (see extraction/llamaparse_extractor.py)
    LLAMA_CLOUD_API = os.getenv("LLAMA_CLOUD_API")

    # Database — same Postgres instance/database as the main Edova app
    # (db/), not a standalone ncert_db. knowledge_chunks is a global,
    # unscoped table there; schema is owned by db/migrations, not by this
    # app at runtime.
    DATABASE_URL = os.getenv("DATABASE_URL")
    if not DATABASE_URL:
        raise RuntimeError(
            "DATABASE_URL is not set. Add it to ncert_rag/.env — no "
            "credentials are defaulted in source."
        )

    # Embedding — 768 dims: gemini-embedding-2's recommended truncation
    # tier (Matryoshka Representation Learning; no meaningful accuracy loss
    # vs the 3072 default, ~4x smaller HNSW index). Must match the
    # vector(768) columns in db/migrations/20260101000014_gemini_768_embeddings.sql —
    # changing this without a matching migration breaks retrieval silently
    # (cosine distance between different-dimension vectors is meaningless).
    EMBEDDING_DIM = 768

    # Paths
    PDF_DIR = os.getenv("PDF_DIR", "./data/pdfs")
    # (S3/upload settings moved out: teacher uploads are owned by
    # ncert_rag/clerk, which reads edova-third-brain/config.yaml via
    # tools/s3conn.py.)
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
