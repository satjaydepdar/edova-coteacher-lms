# Hybrid Query Router — Design Spec

Status: **design, not yet implemented.** Matches the "hybrid query router" element
of the target architecture diagram: one front door for finding learning material,
routing across keyword, semantic, and direct-fetch backends.

## 1. Goal

Today there are three separate ways to find content, and every caller must know
which one to use:

- **Keyword** — `edova-third-brain/okf-bundle/indexes/fulltext.json`
  (word → doc_ids). Exact terms: "Ohm's law", "Euclid".
- **Semantic** — `ncert_rag` QueryEngine (pgvector over `knowledge_chunks` +
  `resource_chunks`, DeepSeek for generated answers). Conceptual questions:
  "how do I explain why the sky is blue".
- **Catalog / direct fetch** — OKF nodes with `s3_key` (+ `manifest.json`).
  Playable/downloadable resources: "show me the biology chapter 1 video".

The router exposes ONE endpoint; callers ask in plain words (or filters) and get
one merged, ranked, deduplicated result list whose items are directly usable by
edova-web (title + `previewS3Key` for the player, snippet for context).

## 2. Non-goals (v1)

- No graph traversal ("what is the prerequisite of X") — needs the knowledge
  graph (separate work item, not this spec).
- No LLM-chosen routing strategy — v1 routing is deterministic; the LLM is only
  used (optionally) to *answer* from retrieved chunks, as `/query` already does.
- No auth — inherits the service's current state; Track 2 (see
  `instructions/dedicated-backend-plan.md`) wires real identity through.

## 3. Architecture

```
POST /router/query  { question, top_k=8, mode=auto|keyword|semantic|catalog,
                      subject?, chapter_id?, type?, answer? }
        │
        ├─ mode=auto (default): run (a) + (b) concurrently
        │
        ├─ (a) Keyword backend
        │     fulltext.json (cached, mtime-reloaded) → matching doc_ids
        │     → resolve via okf-bundle/nodes/*.json → metadata + s3_key
        │
        ├─ (b) Semantic backend
        │     existing QueryEngine → top chunks (doc_id, page, similarity, text)
        │     → map doc_id → OKF node → s3_key where the doc exists in OKF
        │
        ├─ (c) Catalog filters (always applied when subject/chapter_id/type
        │     are given): intersect BOTH backends' hits with the filter; a pure
        │     filter request (no question) lists matching resources directly.
        │
        ├─ merge + rank (§4) + dedupe by doc
        │
        └─ answer=true: pass merged top chunks to DeepSeek (existing engine),
          return generated answer with citations alongside the result list
```

Home: `ncert_rag/api/app.py` (already holds the engine singleton, CORS, and the
upload endpoints; reads the third-brain via `THIRD_BRAIN_DIR` setting).

Data access:
- `fulltext.json` + `nodes/*.json` read from disk; cached in memory and
  reloaded when file mtime changes (ingest can add docs between calls — never
  require a restart).
- S3 manifest is NOT fetched at query time; `s3_key`/`previewS3Key` are derived
  from node data (single source of truth, zero network).

## 4. Merge and ranking (deterministic)

Each candidate gets a score per backend:

- keyword: `1.0` for a doc matching any query term (word-boundary, plus
  multi-word phrase bonus ×2 when the full phrase appears)
- semantic: the chunk's cosine similarity (0–1), best chunk per doc

Combined score = keyword_score + semantic_score (a doc strong in both wins
naturally; a doc present in only one still ranks). Sort desc, stable by title.
`top_k` cuts the list. `source` per item: `"keyword"`, `"semantic"`, or `"both"`.

Chunks whose doc_id has no OKF node (e.g. NCERT corpus chunks not in the
bundle) are returned as `type: "chunk"` (text + page, no S3 key) after resource
results — still useful context, never silently dropped.

## 5. API contract

`POST /router/query`

Request:
```json
{
  "question": "how do I teach digestion in class 10",
  "top_k": 8,
  "mode": "auto",
  "subject": "science",
  "chapter_id": "biology-ch1",
  "type": "Video",
  "answer": false
}
```

Response:
```json
{
  "question": "...",
  "mode": "auto",
  "degraded": false,
  "results": [
    {
      "type": "resource",
      "doc_id": "science_biology-ch1_video_…",
      "title": "Life Processes — digestive system",
      "chapter_id": "biology-ch1",
      "chapter_name": "Life Processes",
      "doc_type": "video",
      "score": 1.83,
      "source": "both",
      "s3_key": "Class-10/Semester-01/Biology/Chapter-01/digestive system.mp4",
      "previewS3Key": "Class-10/Semester-01/Biology/Chapter-01/digestive+system.mp4"
    },
    {
      "type": "chunk",
      "doc_id": "ncert_science_ch5",
      "page": 84,
      "snippet": "…the alimentary canal…",
      "score": 0.71,
      "source": "semantic"
    }
  ],
  "answer": null
}
```

`degraded: true` + results from surviving backends when one backend fails
(e.g. pgvector down) — a backend failure must never 500 the request; the
failing backend's name goes into `degraded_reason`.

## 6. Failure and edge behavior

- Empty question + no filters → 422 with guidance.
- No hits anywhere → `200` with `results: []` (not an error).
- `fulltext.json` missing/corrupt → keyword backend degrades, semantic serves.
- pgvector unreachable → semantic degrades, keyword+catalog serve.
- `mode=keyword|semantic|catalog` forces one backend (debug + tests).

## 7. Verification plan

- Keyword: "electricity" → physics-ch3 resources rank top, `source` includes keyword.
- Semantic: "why is the sky blue" → human-eye chapter chunks/resources surface.
- Catalog: `subject=science, chapter_id=biology-ch1, type=Video` (no question)
  → exactly the digestive-system video.
- Both-backends doc outranks single-backend doc on a mixed query.
- Kill the DB → same query returns keyword results with `degraded: true`.
- Touch `fulltext.json` (re-ingest) → new term searchable without restart.

## 8. Build order

1. Fulltext/node cache loader with mtime reload + keyword scorer.
2. Semantic bridge: doc_id → OKF node resolution for engine chunks.
3. Merge/rank/dedupe + `/router/query` endpoint + filters.
4. `degraded` handling + `answer=true` passthrough.
5. Verification suite above; then point edova-web's search box at it
   (replaces the client-side seed filter; small, separate change).
