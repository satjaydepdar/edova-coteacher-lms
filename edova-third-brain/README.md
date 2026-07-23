# edova-third-brain

Level 1 layout:

- `config.yaml` — top-level config: paths to `subjects/`, `okf-bundle/`, `logs/`
- `subjects/` — per-subject knowledge content
- `okf-bundle/` — generated OKF bundle output
- `logs/` — runtime logs

## Tools

Setup: `pip install -r requirements.txt`

- `tools/ingest.py <subject> <chapter_id> <chapter_name> <doc_type> <file>` — add a document.
  Bare `chN` chapter ids are auto-qualified with the subject (`math` + `ch1` → `math-ch1`).
  Re-ingesting an unchanged file is a no-op; re-ingesting a changed file replaces the old version.
  `doc_type` is the document's role and its dedup slot: one live version per
  subject/chapter/doc_type. Use one doc_type per file (e.g. `chapter_content`, `worksheet`,
  `worksheet_hots`, `lesson_plan`); a second worksheet for the same chapter needs its own doc_type
  or it replaces the first.
- `tools/ingest.py remove <doc_id>` — remove a document and all its traces.
- `tools/check_okf.py [--deep]` — structure smoke test; `--deep` also cross-checks manifest,
  nodes, indexes, edges, fulltext, and attachments for consistency.
- `tools/visualize_okf.py [--cdn] [--out FILE]` — render the bundle as an interactive HTML graph.

## Auto-ingestion (inbox)

Drop files into `inbox/`, then run `python tools/auto_ingest.py`. Each file is classified
against the existing taxonomy (subject/chapter/doc_type), filed, ingested, and verified
with `--deep`; the report line per file shows the verdict. Low-confidence files go to
`review/` with a `.decision.json` — edit it (set `approved: true`, fix fields), then
`python tools/auto_ingest.py --apply-reviews`. The classifier never mutates the bundle
itself; it uses CAMEL-AI when `camel-ai` + an API key are installed, otherwise a
zero-dependency keyword classifier. Threshold: `--threshold` (default 0.8).

Classification quality depends on each chapter's `metadata.yaml` topics list.
`python tools/generate_metadata.py [--apply]` drafts missing `metadata.yaml` files
from the chapter PDF's NCERT section headings (dry-run by default; chapters with
few extractable headings are flagged NEEDS REVIEW for manual editing).

## Cloud shelf (S3)

`python tools/s3_push.py` (dry-run by default) shows the shelving plan: every
catalogued document's S3 key as `Class-10/Semester-01/<Subject>/Chapter-XX/<file>`.
`python tools/s3_push.py --upload` PUTs the files to the bucket (needs AWS
credentials), writes `s3_key` back into each OKF node, and publishes
`okf-bundle/manifest/manifest.json` (also to `<prefix>/manifest.json`) — the
runtime list edova-web reads. Re-runs are idempotent: already-shelved docs skip.
