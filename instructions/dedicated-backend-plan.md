# Edova Dedicated Backend — Track 2 Plan

Status: **plan, not started.** Track 1 (upload signing) lives in `ncert_rag/api`
until this backend exists; nothing built there is thrown away.

## Why this backend exists

edova-web is frontend-only: every page runs on `src/data/seed.ts` (demo data baked
at build time). A real school needs the app to know *who is asking* (teacher
identity), *real data* (classes, students, assignments, attendance from the
PostgreSQL schema in `db/`), and *rules* (permissions + audit). That is a server
that belongs to the edova-coteacher app itself — not something to bolt onto the
RAG service, whose job is retrieval and media.

## Principles (no technical debt)

- **The schema already exists.** `db/` migrations are the contract; the backend
  serves them, never reinvents them. Known shape gaps (curriculum units,
  schedules) are Phase-3 items in `db/README.md` — reconcile there, not in API code.
- **One concern per service.** `ncert_rag/api` keeps RAG + OKF media. The new
  backend owns identity, app data, and upload signing. They talk over HTTP.
- **Thin controllers, fat domain.** Every page that reads seed today gets an API
  later; migrate page by page, keeping each page shippable.
- **Auth is the first feature, not the last.** Upload signing, assignments, and
  grades all depend on knowing which teacher is asking.

## Phases

**Phase 1 — Identity (foundation, ~1 week)**
- Teacher login (school email + password or SSO), session tokens, `/me`.
- Roles from `db` users table: teacher / admin. RLS policies already in the
  schema stay the enforcement layer; the API passes identity down, never
  re-implements permissions in ad-hoc `if`s.
- Move `/uploads/presign` + `/uploads/complete` here (~30 lines, from
  `ncert_rag/api/app.py`); teacher_id comes from the session, not a form field.
  The interim `UPLOAD_TOKEN` shared secret is retired the same day.

**Phase 2 — Core data, page by page (~2–4 weeks, each page shippable)**
- Read models first (assignments, attendance, calendar, announcements) — the
  app reads from the API while writes still go through existing flows.
- Write paths next: assignment create/evaluate, attendance marking.
- Learning Resources: resource taxonomy + uploaded-resource records move to
  `resources` tables; `manifest.json` stays the public read path for previews.

**Phase 3 — Reconciliation + hardening**
- Curriculum units / schedules shape gaps (see `db/README.md` "Known gaps").
- Deployment: same host as the database to start (single-school scale); add
  rate limits on upload signing, structured logs, and a staging bucket separate
  from production content.
- CloudFront + signed URLs replace public-read S3 when content protection
  becomes a requirement; `VITE_S3_BUCKET_URL` is the single seam to change.

## Explicit non-goals (for now)

- No microservices split, no message queue, no generic RBAC/workflows engine —
  `db/README.md` already deferred these; the backend inherits that deferral.
- No migration of the OKF librarian (it stays in `edova-third-brain`, driven by
  the backend over subprocess/HTTP exactly as today).
