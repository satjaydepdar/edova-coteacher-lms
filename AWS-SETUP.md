# AWS / S3 Setup

Everything about the cloud shelf in one page.

## What lives where

| Thing | Value | Where it's set |
|---|---|---|
| Bucket | `innuxai-edova-coteacher` | `edova-third-brain/config.yaml` → `s3:` block |
| Region | `ap-south-1` | same |
| Canonical prefix | `Class-10/Semester-01` | same |
| Staging prefix | `staging/` (browser PUTs land here, then `/uploads/complete` shelves them) | same |
| Website asset URL | `VITE_S3_BUCKET_URL` | `edova-web/.env` (separate app, needs its own copy) |

**`edova-third-brain/config.yaml` is the single source of truth.** Every Python
service reads it via `edova-third-brain/tools/s3conn.py` — never hardcode
bucket names in code. To move buckets someday: edit that one YAML block +
`edova-web/.env`.

## Who owns what

- **Teacher uploads** (presign → browser PUT → complete): `ncert_rag/clerk/api.py`
  on port **8001** — the only upload service. The browser never sees AWS keys.
- **Librarian shelving** (batch ingest): `edova-third-brain/tools/s3_push.py --upload`.
- The RAG app (`ncert_rag/api`, port 8000) deliberately has **no** upload
  endpoints; a contract test (`tests/contract/test_rag_app.py`) keeps it that way.

## Credentials (never in this repo)

Keys come from AWS IAM, account `769456251104`:

- Group **`edova-developers`** has the `edova-coteacher-s3-access` policy:
  read/write/delete objects in the bucket, nothing else.
- Each developer gets their **own IAM user** in that group. To add someone:
  create user → add to group → create access key → send it privately
  (never in git, never in a group chat).
- To revoke: remove the user from the group (or delete their key). Nothing
  else to clean up.
- The `edova-admin-user` key (AdministratorAccess) is the owner's master key —
  account management only, not daily use, never shared.

## Developer one-time setup (5 min)

1. Install the AWS CLI: https://aws.amazon.com/cli/
2. Run `aws configure`, paste the Access Key ID + Secret you were given,
   region `ap-south-1`, output format: Enter.
3. Verify: `aws sts get-caller-identity` should show your IAM username.
4. Restart the clerk (`python -m uvicorn api:app --port 8001` from
   `ncert_rag/clerk/`). Uploads work.

The clerk checks credentials at startup: you'll see
`[s3] AWS credentials OK` or a loud warning telling you uploads will fail.
