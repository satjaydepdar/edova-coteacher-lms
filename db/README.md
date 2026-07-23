# Edova database

PostgreSQL schema for the Edova co-teacher app — single-school production
(not multi-tenant SaaS). Migrations use [node-pg-migrate](https://github.com/salsita/node-pg-migrate)
with plain SQL files. See `../db-schema-design.md` and the architecture
review for the reasoning behind every deviation from the original design.

## Setup

```bash
npm install
cp .env.example .env   # edit DATABASE_URL to point at your Postgres
npm run migrate:up
```

The API server should connect as `app_role` (created by the first
migration), not as the migration-runner's superuser — Row Level Security
policies only apply to non-superuser roles. Grant `app_role` an actual
login password outside of version control (secrets manager / infra
provisioning), it's created `NOLOGIN` by default.

## Every request MUST set a session-local user id

Every RLS policy in this schema reads `current_app_user_id()`, which wraps
`current_setting('app.current_user_id')`. Your data-access layer must issue
this as the **first statement in every transaction**:

```sql
SET LOCAL app.current_user_id = '<uuid>';
```

**Never use a bare `SET`.** Under PgBouncer transaction-mode pooling (or any
connection-pooled setup), a bare `SET` can leak from one request into the
next request that happens to reuse the same backend connection — the exact
mechanism that would turn a scoping bug into a cross-user data leak. `SET
LOCAL` is scoped to the current transaction only and is always safe.

## Conventions

- **One organization, forever.** `organizations` has exactly one row,
  seeded by migration `0001`, enforced by a singleton unique index. Every
  top-level table carries `organization_id` defaulting to that row's fixed
  UUID (`00000000-0000-0000-0000-000000000001`) so the app never has to
  pass it — but there is no org-scoped RLS anywhere, since it would buy zero
  isolation with one tenant.
- **RLS is role/assignment-scoped, not org-scoped.** `is_admin()`,
  `teaches_classroom(id)`, and `teaches_student(id)` are the building
  blocks every policy composes from. `users.role` is currently restricted
  to `teacher` / `admin` — that's every role the actual frontend has today;
  extending it for student/parent logins is a one-line CHECK constraint
  change when that feature is actually built.
- **CHECK constraints on every implied enum.** Every `status`/`type`
  column that used to be "a VARCHAR with a comment listing allowed values"
  now has a real `CHECK (... IN (...))`.
- **`submissions` and `grades` are partitioned by `academic_year`**
  (composite primary key `(id, academic_year)`, since Postgres requires a
  partitioned table's key to include the partition column). Everything
  else — `messages`, `notifications`, `audit_logs` — ships unpartitioned;
  monthly/weekly partitioning was overhead this schema won't earn back for
  years at single-school volume. **Add next year's partition every spring**
  (`submissions_yYYYY` / `grades_yYYYY`, see migration `0007` for the
  pattern) — there's a `_default` partition as a safety net if you forget,
  but don't rely on it long-term.
- **One audit trail, not two.** The reviewed design had overlapping
  `activity_logs` and `audit_logs` tables; this schema keeps only
  `audit_logs`, applied via trigger to `users`, `students`, `grades`,
  `assignments`, `attendance`.
- **Deferred, not built:** generic `roles`/`user_roles`/`permissions` RBAC,
  `workflows`, `scheduled_tasks`, `webhooks`. All three are speculative
  automation/enterprise infrastructure with zero consumers in the current
  product — add them when a real feature needs one.

## Known gaps carried into later phases

- `curriculum_units` here is the reviewed design's subject-level unit
  catalog. It does **not** yet match `edova-web`'s `CurriculumUnit` type
  (a per-class, per-year pacing-guide instance with topic-level
  done/actual% tracking and a `dependsOn` predecessor). Reconciling that
  shape mismatch is Phase 3 work.
- `schedules` is a simple recurring-block model; the frontend's
  `MasterTimetableRow` is a section × day × period grid with bulk-upload
  and copy-from-previous-year operations. Also Phase 3.
- No `exams`, `academic_calendar_items`, or `guardian_relationships` yet —
  all three are explicitly scoped to Phase 3 in the architecture review.
- `students.demographics` / `medical_notes` are still on the main
  `students` row and RLS policy, not split into the narrower-access
  `student_sensitive_records` table the review calls for. Phase 3.

## Phase 2 — pgvector (done)

Migration `0013` adds `knowledge_chunks` (global reference knowledge —
NCERT textbook corpus + OKF library, HNSW index), `resource_chunks` (this
school's own uploaded material, access follows the parent `resources` row
via `can_access_resource()`), `question_bank.embedding` (semantic dedup),
and `rag_queries` (retrieval + generation audit log). None of them carry a
school-scoping column — see the architecture review for why. Migration
`0014` changes all three embedding columns from `vector(1024)` to
`vector(768)` — see below.

`ncert_rag/` now points at this database instead of its old standalone
`ncert_db`, and splits three concerns across three providers:

- **DeepSeek** — LLM tasks only: chat (`query/engine.py`), semantic-search
  answer generation, OKF doc Q&A. (Claude was tried first, then reverted
  back to DeepSeek by request — see conversation history if that matters.)
- **Gemini** (`embedding/gemini_embedder.py`) — embeddings, via
  `gemini-embedding-2` truncated to 768 dimensions (Matryoshka
  Representation Learning — no meaningful accuracy loss vs. the 3072
  default, ~4x smaller HNSW index). Uses Gemini's asymmetric retrieval
  prefixes (`task: search result | query: ...` for queries, `title: ... |
  text: ...` for documents) rather than the deprecated `task_type` param.
- **LlamaParse** (`extraction/llamaparse_extractor.py`) — PDF extraction,
  replacing the old PyMuPDF-page-image + vision-LLM pass entirely. The old
  `bge_embedder.py` (local sentence-transformers) and the PyMuPDF
  image-rendering code in `utils/pdf_utils.py` are gone along with their
  now-unused dependencies (torch, transformers, sentence-transformers,
  the three `llama-index-*` sub-packages).

New: **OKF ingestion** (`ingestion/okf_bundle_parser.py`). OKF = Google
Cloud's [Open Knowledge Format](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)
— a directory of markdown files with YAML frontmatter, one per concept.
`OKF_BUNDLE_DIR` defaults to the real bundle already in this repo,
`edova-brain/OKF/math-Knowledge` (sibling to `ncert_rag/`), not a synthetic
placeholder. Ingested concepts land in `knowledge_chunks` with
`source_type='okf_library'` and `page_number = NULL` (concepts aren't
paginated the way PDF pages are).

`edova-brain/OKF/` is itself a thin pointer layer — most concept bodies are
short, and the substantive content (worked examples, question banks) lives
in a sibling `edova-brain/math-Knowledge/` workspace, linked via each
concept's `resource:` field. `OKF_RESOLVE_RESOURCES` (default `true`)
follows those links and folds the real content into the ingested chunk.
Two things worth knowing if you touch this:
- The bundle's `resource:` paths are consistently off by one `../` level
  (a bug in the source data — verified against the actual file tree, not
  assumed). The parser doesn't hardcode a fix; it tries the path as
  authored, then retries with additional `../` prepended until something
  resolves, so it's not fragile to the specific depth of any one concept.
- `math-Knowledge/`'s raw content has data-quality issues of its own
  (chapter 1 is largely broken — empty content folders, copy-pasted
  chapter-2 metadata; a few files were found byte-identical across
  unrelated chapters). The parser detects identical content resolved
  under different chapters and flags it (`possible_duplicate_bug: true`
  in metadata, plus a console warning) rather than silently ingesting or
  silently dropping it.

Wrapped in FastAPI (`ncert_rag/api/app.py` — `/ingest`, `/ingest-okf`,
`/query`, `/chat`, `/stats`, `/collection`); `/query` and `/chat` log to
`rag_queries`. See `ncert_rag/.env.example` for the full settings list.

### Direct media serving — `GET /okf/media/{concept_id}`

Separate from RAG retrieval: a "watch this video" / "view this chapter PDF"
button doesn't want semantic search, it wants the actual file. This
endpoint resolves an OKF concept's `resource:` field (reusing the same
path-fallback resolution ingestion uses) and serves the file directly —
`Content-Disposition: inline` so it plays/displays in the browser rather
than downloading, with real HTTP Range support (a Starlette 0.38 gap —
its `FileResponse` doesn't implement Range requests at all; handled
manually here so video seeking actually works). External `resource:` URLs
redirect instead of proxying.

Path-traversal defended two ways: `concept_id` is rejected outright if it
contains `..` segments, and the resolved file is also required to stay
under the bundle's grandparent directory (the known `edova-brain/` root
both `OKF/` and `math-Knowledge/` live under) — a malicious client
supplying a crafted concept_id can't walk either boundary.

**Known gap**: no OKF concept currently points its `resource:` at a
chapter's actual textbook PDF (`math-Knowledge/chapters/chapter-N-.../chapter-N-....pdf`)
— only an external syllabus URL uses `.pdf` today. "Click a chapter to view
its PDF" won't resolve through this endpoint until OKF concept files exist
for those 7 PDFs (or a separate lookup path is added) — flagged, not
silently worked around.

## Testing

`tests/smoke-test.sql` exercises the schema end-to-end inside a
transaction that always rolls back (safe to run against a real database):
generated-column correctness, the gradebook auto-refresh trigger, partition
routing, and RLS actually restricting an unrelated teacher while allowing
the assigned one through.

```bash
psql "$DATABASE_URL" -f tests/smoke-test.sql
```

## Local development

```bash
docker run -d --name edova-pg -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=edova -p 5433:5432 pgvector/pgvector:pg16
```

Port `5433` (not the default `5432`) avoids clashing with any native
Postgres install already running on the machine — that's a local-dev
detail, not a schema decision. The `pgvector/pgvector` image is used ahead
of need so Phase 2 doesn't require re-provisioning.

## Rollback

```bash
npm run migrate:down          # undo the last migration
npx node-pg-migrate down --migrations-table schema_migrations 12   # undo all of Phase 1
```

Every `down` migration has been verified against a real database — full
rollback-then-reapply is part of how this schema was tested, not just the
`up` path.
