import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Same Postgres instance/database as db/ and ncert_rag — schema is owned
    # by db/migrations, not by this app. See db/README.md.
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/edova")
    API_CORS_ORIGINS = os.getenv(
        "API_CORS_ORIGINS", "http://localhost:5173,http://localhost:5174")


settings = Settings()
