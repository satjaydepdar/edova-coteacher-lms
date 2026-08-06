"""
Edova dedicated backend — identity + real app data, per
instructions/dedicated-backend-plan.md. Owns the db/ Postgres schema
(classrooms, students, enrollments, ...); ncert_rag/api and ncert_rag/clerk
keep their own concerns (RAG/OKF media, syllabus/resources) untouched.

Run with: uvicorn main:app --reload --port 8003
"""

import psycopg2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from routers.assignments import router as assignments_router
from routers.auth import router as auth_router
from routers.calendar import router as calendar_router
from routers.classrooms import router as classrooms_router
from settings import settings

app = FastAPI(title="Edova Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.API_CORS_ORIGINS.split(",")],
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    try:
        conn = psycopg2.connect(settings.DATABASE_URL)
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                cur.fetchone()
        finally:
            conn.close()
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"database unreachable: {e}")
    return {"status": "ok"}


app.include_router(auth_router)
app.include_router(classrooms_router)
app.include_router(assignments_router)
app.include_router(calendar_router)
