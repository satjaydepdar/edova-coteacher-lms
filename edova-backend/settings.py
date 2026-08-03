import os
from pathlib import Path

from dotenv import load_dotenv

# Load the .env next to this module (not cwd-dependent) so the service boots
# identically no matter where the process is started from.
load_dotenv(Path(__file__).resolve().parent / ".env")


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(
            f"{name} is not set. Copy .env.example to .env and fill it in — "
            "no credentials or secrets are defaulted in source."
        )
    return value


class Settings:
    # Same Postgres instance/database as db/ and ncert_rag — schema is owned
    # by db/migrations, not by this app. See db/README.md.
    DATABASE_URL = _required("DATABASE_URL")
    API_CORS_ORIGINS = os.getenv(
        "API_CORS_ORIGINS", "http://localhost:5173,http://localhost:5174")

    # No default: a missing JWT secret must stop boot, never silently fall
    # back to a known-in-source value.
    JWT_SECRET = _required("JWT_SECRET")
    JWT_EXPIRY_HOURS = int(os.getenv("JWT_EXPIRY_HOURS", "168"))  # 7 days


settings = Settings()
