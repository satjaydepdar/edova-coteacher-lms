# CAMEL-AI OKF Auto-Ingestion — Design Prompt

Status: **design draft, not yet implemented.** Use this file as the prompt/spec when you're
ready to build it (paste it into a fresh session, or hand it to an agent, as-is).

## 1. Goal

> **Implementation note (v1, built):** `tools/classify.py` and `tools/auto_ingest.py` now
> exist per this design. One deviation: the LLM backend is pluggable — CAMEL-AI is used
> when the `camel` package and an API key are present; otherwise a deterministic
> topic-keyword classifier runs instead (same decision shape, same confidence gate), so
> the pipeline works with zero external dependencies. Everything else — agent decides,
> script acts, confidence gate, review queue, no bundle-shape changes — is as designed
> below.

Today, adding a document to `edova-third-brain/` is manual: a human picks the subject,
chapter folder, and doc_type, then runs `tools/ingest.py <subject> <chapter_id>
<chapter_name> <doc_type> <file_path>` by hand.

Target: drop a file into an **inbox** folder (e.g. "Teacher's Notes — Digestive System.docx"),
and a CAMEL-AI agent:

1. Reads/extracts the file's content.
2. Classifies it against the **existing** taxonomy: `subject → chapter → doc_type`.
3. Moves it into the correct `subjects/<subject>/<domain>/<chapter-id>/<doc_type>/` folder.
4. Calls the existing `ingest.py` logic to update `okf-bundle/` (nodes, edges, attachments,
   indexes, manifest, history) — no changes to the OKF bundle shape itself.
5. Verifies every auto-filed document with `check_okf.py --deep`; the deep-check exit code
   is the ONLY source of the success/failure verdict — the agent phrases the report but
   never certifies its own work.
6. Low-confidence or novel cases (new chapter, new subject, ambiguous topic) are **not**
   auto-filed — they go to a review queue for a human to confirm once.

This slots into Step 2–4 of `OKF_steps.md` ("watcher → converter → OKF"): the watcher stays
dumb (file-system event), and the CAMEL-AI agent *is* the smart part of the converter that
decides *where* the file belongs before the existing `ingest.py` "OKF-izes" it.

## 2. Grounding: what the agent must already know

The current taxonomy is 100% derivable from the repo — the agent must be grounded on it via
tool calls, **not** hardcoded into the prompt (it will go stale otherwise):

- **Subjects present:** `math`, `science` (with sub-domains `physics`, `chemistry`, `biology`),
  plus `history`, `geography`, `english` (folders exist under `subjects/` but are currently
  empty — no chapters ingested yet, so any file classified into these must always fall into
  the "new chapter" review path, never auto-filed).
- **Chapters per subject/domain:** each chapter folder has a `metadata.yaml` with
  `chapter_number`, `chapter_title`/`chapter_name`, and (for math) a `topics:` list — this is
  the single best signal for topic-level classification (e.g. "digestive system" → biology
  chapter 1, "Life Processes", which covers digestion, respiration, transportation, excretion).
- **chapter_id conventions** (already fixed by the existing bundle, must not be reinvented):
  - `math`: `math-ch1`..`math-ch7`
  - `science` biology: `biology-ch1`..`biology-ch4`
  - `science` chemistry: `chemistry-ch1`..`chemistry-ch4`
  - `science` physics: `physics-ch1`..`physics-ch3`
  - Pattern: `<domain>-ch<N>` for every subject/domain — no exceptions. `ingest.py`
    auto-qualifies a bare `ch<N>` to `<subject>-ch<N>`, so `math ch1 ...` is still accepted
    on the CLI, but the bundle always stores the qualified form. Any new subject added
    later must follow `<domain>-ch<N>` if it has sub-domains, else `<subject>-ch<N>`.
- **doc_type taxonomy** (subfolder names already in use under each chapter):
  `chapter_content` (the chapter PDF/content.md itself — one per chapter, the "primary" doc),
  `activities`, `assessments`, `assets`, `handbook`, `lesson-plans`, `question-bank`,
  `videos`, `worksheets`. Loose top-level files also appear (`glossary.md`, `references.md`,
  `README.md`, `index.md`) — these are chapter-scoped metadata, not learner-facing content,
  and should be **excluded from agent auto-filing** (out of scope for this automation).
  "Teacher's notes" is not yet a formal doc_type folder anywhere — the agent should map it to
  `handbook` (closest existing match: chapter-1-real-numbers has a `handbook/` dir and a loose
  `CBSE_Class_10_Real_Numbers_Teacher_Notes.md`) rather than invent a new doc_type. Confirm
  this mapping once, then keep it fixed in the tool description.

## 3. Architecture

```
inbox/                          (new — filesystem-watched drop folder)
   └── Teachers Notes - Digestive System.docx
        │
        ▼
[1] Watcher (existing pattern from OKF_steps.md, Step 2)
    - watchdog (Python) on inbox/, or a manual "run once" scan for v1
    - on new file: hand path to the CAMEL-AI Router agent
        │
        ▼
[2] CAMEL-AI Router Agent  ← the new piece this design adds
    - ChatAgent with tools (see §4)
    - Extracts text preview (pypdf / python-docx / plain read, mirrors ingest.py's
      extract_text) to ground the classification in actual content, not just filename
    - Calls list_subjects() / list_chapters(subject) / get_chapter_topics(subject, chapter_id)
      to see the real taxonomy
    - Produces a structured decision:
        { subject, chapter_id, chapter_name, doc_type, confidence, rationale }
        │
        ▼
[3] Confidence Gate
    - confidence >= threshold (e.g. 0.8) AND chapter_id already exists in that subject
        → auto-file: move file into subjects/<subject>/.../<chapter_id>/<doc_type>/,
          then call ingest.py (or its Python functions directly) to update okf-bundle/
    - otherwise
        → move file into review/<timestamp>_<original_name>/, write a
          review/<timestamp>_<original_name>.decision.json with the agent's best-guess
          classification + rationale, and stop (no bundle mutation)
        │
        ▼
[4] Human review (only for gated items)
    - human edits/approves the .decision.json (or just moves the file + reruns), then a
      second pass ("apply approved reviews") does the same file+ingest step as [3]'s auto-file
      branch
        │
        ▼
[5] okf-bundle/ updated — nodes/edges/attachments/indexes/manifest/history all in sync,
    exactly as tools/ingest.py already guarantees today.
```

Nothing in `okf-bundle/`'s shape changes. This design only adds a decision-making layer in
front of the existing, already-working `ingest.py`.

## 4. CAMEL-AI agent design

### 4.1 Agent type
A single CAMEL `ChatAgent` (not a multi-agent society) is enough for v1 — this is a
classification + tool-call task, not a negotiation or multi-perspective task. Model choice:
whatever CAMEL model backend the project already standardizes on elsewhere (no existing CAMEL
usage found in this repo as of this writing — pick a Claude model via CAMEL's Anthropic
backend to stay consistent with the rest of this project's tooling, unless you have a reason
to test a different provider).

### 4.2 Tools (functions the agent can call)

| Tool | Signature | Purpose |
|---|---|---|
| `list_subjects()` | `-> list[str]` | Reads `subjects/*` dir names. |
| `list_chapters(subject)` | `-> list[{chapter_id, chapter_name, topics, domain}]` | Reads every `metadata.yaml` under that subject (walks sub-domains for science). |
| `get_doc_types(subject, chapter_id)` | `-> list[str]` | Lists subfolders already present for that chapter (the allowed doc_type set for it). |
| `extract_preview(file_path)` | `-> str` | Same extraction as `ingest.py:extract_text`, truncated to ~4000 chars — gives the agent real content, not just a filename guess. |
| `propose_classification(subject, chapter_id, chapter_name, doc_type, confidence, rationale)` | *(structured output — the agent's final answer, not a side-effecting tool)* | Terminates the agent turn with its decision. |

Deliberately **not** given: a `move_file` or `run_ingest` tool. Filing and ingestion are
mechanical once the classification exists — keep them in a deterministic Python function
(§3 step 3), not behind agent tool-calls, so a hallucinated tool call can never mutate
`subjects/` or `okf-bundle/` directly. The agent's only job is to *decide*; a plain script
*acts* on that decision after the confidence gate.

### 4.3 System prompt sketch

```
You are a classification agent for a CBSE Class 10 curriculum knowledge base.

Given a new document (filename + extracted text preview), decide which existing
subject and chapter it belongs to, and which document-type folder it should be filed
under.

Rules:
- You MUST only choose subject/chapter/doc_type values returned by your tools
  (list_subjects, list_chapters, get_doc_types). Never invent a new chapter_id,
  subject, or doc_type — if nothing fits well, say so via low confidence instead.
- Match on content (topics, terminology), not just filename.
- chapter_id must follow existing convention exactly (e.g. "biology-ch1", not
  "ch1-biology" or "Biology Chapter 1").
- If the document could plausibly belong to more than one chapter, or the subject
  has no chapters yet (history/geography/english today), or you are not
  confident, set confidence low (< 0.5) and explain why in rationale — a human
  will review it rather than you guessing.
- "Teacher's notes" style content maps to doc_type "handbook" unless the chapter
  already has a more specific existing folder that fits better.

Return your answer only via propose_classification(...).
```

### 4.4 Worked example (the case from your message)

Input: `Teachers Notes - Digestive System.docx`, extracted text mentions digestion, enzymes,
small intestine, peristalsis.

- `list_subjects()` → `["math", "science", "history", "geography", "english"]`
- `list_chapters("science")` → includes `{chapter_id: "biology-ch1", chapter_name: "Life
  Processes", topics: [...digestion, nutrition, respiration...]}`
- `get_doc_types("science", "biology-ch1")` → `["chapter_content", "handbook", ...]` (whatever
  actually exists there)
- Agent proposes: `{subject: "science", chapter_id: "biology-ch1", chapter_name: "Life
  Processes", doc_type: "handbook", confidence: 0.92, rationale: "Content covers digestion,
  enzymes, and the alimentary canal, which is core to the 'Life Processes' chapter's nutrition
  sub-topic."}`
- Confidence ≥ 0.8 and `biology-ch1` already exists → auto-file: copy to
  `subjects/science/biology/chapter-1-life-processes/handbook/Teachers Notes - Digestive
  System.docx`, then
  `python tools/ingest.py science biology-ch1 "Life Processes" handbook "<path>"`.

## 5. Implementation plan (when you're ready to build)

1. `pip install camel-ai` (+ whatever LLM backend extra it needs) into the third-brain tool
   environment; do **not** add it to the main app's dependencies — this is a back-office
   ingestion tool, keep it isolated (its own `requirements.txt` under
   `edova-third-brain/tools/`).
2. Add `edova-third-brain/tools/classify.py`:
   - the tool functions from §4.2, all pure filesystem reads (no network calls, deterministic)
   - a `classify(file_path) -> dict` function wrapping the CAMEL `ChatAgent` call
3. Add `edova-third-brain/tools/auto_ingest.py`:
   - confidence gate + auto-file / review-queue split (§3, steps 3–4)
   - the auto-file branch shells out to (or imports) the existing `ingest()` function from
     `tools/ingest.py` unchanged
4. Add `edova-third-brain/inbox/` and `edova-third-brain/review/` to the repo (empty, with
   `.gitkeep`), and document them in `config.yaml` under `paths:`.
5. v1 watcher: a manual `python tools/auto_ingest.py --scan-inbox` you run after dropping
   files (skip `watchdog`/background-daemon complexity until the manual flow is proven).
6. Only after the manual flow has classified a few dozen real documents correctly, consider
   wiring a real background watcher (`watchdog` library) per `OKF_steps.md` Step 2.
7. Log every decision (auto-filed or gated) to `okf-bundle/history/history.jsonl` alongside
   the existing `add`/`remove` events, so classification decisions are auditable the same way
   ingestion already is.

## 6. Open questions to settle before building

- **Confidence threshold** — 0.8 is a starting guess; tune after seeing real agent output on
  a sample of existing docs (re-classify already-ingested files as a dry-run test set, since
  you know their correct answers).
- **LLM backend/cost** — which model CAMEL should call, and whether that's a per-file API
  cost you're OK with at your expected upload volume.
- **"handbook" as the catch-all for teacher notes** — confirm this is really what you want,
  or whether teacher-facing notes deserve their own doc_type folder going forward.
- **New-chapter/new-subject handling** — right now those always route to review by design
  (§2). If you later want the agent to *create* a new chapter folder + `metadata.yaml`
  automatically, that's a bigger, separate design (higher blast radius — a bad auto-created
  chapter is harder to notice than a misfiled document).
