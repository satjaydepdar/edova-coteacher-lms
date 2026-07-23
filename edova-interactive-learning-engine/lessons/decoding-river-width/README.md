# Decoding River Width

**Status:** Reference / gold-standard lesson
**Board / Grade / Subject:** CBSE, Class 10, Mathematics
**Chapter:** Some Applications of Trigonometry (Heights and Distances)
**Duration:** 8:00 video, ~12–14 minutes total seat time with interactions

This lesson teaches how to calculate the width of a river — a distance
that cannot be measured directly — using a baseline, one measured angle,
and the tangent ratio, followed by a verification step using a second,
independent triangle.

> **This is not an AI-generated lesson.** It was manually curated as the
> gold-standard reference package. Every future AI-generated lesson should
> be compared against this lesson for structure, depth, and quality before
> being accepted.

## File Guide

| File | Purpose |
|---|---|
| `lesson.json` | Machine-readable rollup of the entire lesson — metadata, timeline/scenes, concepts, learning objectives, interactions, questions, glossary, references, settings, and analytics event list. This is what the player/runtime consumes. |
| `transcript.md` | Full narration script with sentence-level timestamps (`mm:ss`). Source of truth for spoken content. |
| `storyboard.md` | Scene-by-scene visual specification: visuals, narration, on-screen text, animation notes, learning intent, and concept mapping for every scene, including interaction scenes. |
| `lesson-outline.md` | High-level overview: lesson summary, prerequisites, learning outcomes, concept flow, duration, difficulty, and CBSE mapping. Read this first for a quick orientation. |
| `concepts.md` | The six teachable concepts, each with ID, title, description, learning intent, difficulty, importance, Bloom level, misconceptions, prerequisites, and timestamp. |
| `learning-objectives.md` | Bloom's Taxonomy objectives (Remember → Create), each mapped to the concept(s) it belongs to. |
| `interactions.md` | Interaction *mechanics only* — timestamp, concept, type, pause/resume behaviour, purpose, estimated time. No answer content lives here. |
| `questions.md` | Full question bank — concept, Bloom level, difficulty, question text, options, correct answer, explanation, hint, estimated time, tags. Covers MCQ, Prediction, Reflection, Fill Blank, Drag Drop, and Summary types. |
| `teacher-notes.md` | Teaching tips, common misconceptions, alternative explanations, discussion points, and assessment suggestions for the instructor. |
| `glossary.md` | Every technical term used in the lesson, with a definition, an in-lesson example, and a usage sentence. |
| `references.md` | Concept sources (NCERT, Survey of India), CBSE syllabus alignment, and suggested further reading. |
| `assets/` | Binary and static assets referenced by the lesson (video, diagrams, images). See `assets/README.md`. |

## How the Files Relate

`lesson-outline.md` is the entry point for a human reviewer. `concepts.md`,
`learning-objectives.md`, `interactions.md`, and `questions.md` are the
structured content pillars that `lesson.json` compiles into a single
machine-readable document. `transcript.md` and `storyboard.md` are two
views of the same timeline — transcript is narration-first, storyboard is
scene-first — and both use identical `mm:ss` timestamps and concept/
interaction IDs so they can be cross-checked against each other and
against `lesson.json`'s `timeline.scenes` array.

IDs are consistent across every file:

- Concepts: `c1`–`c6`
- Learning objectives: `lo1`–`lo11`
- Interactions: `int1`–`int6`
- Questions: `q1`–`q8`

## Lesson Lifecycle

1. **Draft** — Outline, concepts, and learning objectives are written
   first to lock the pedagogical structure before any script is written.
2. **Script & Storyboard** — `transcript.md` and `storyboard.md` are
   authored together, scene by scene, so narration and visuals never drift
   apart.
3. **Interaction & Assessment Design** — `interactions.md` (mechanics) and
   `questions.md` (content) are authored against the finished
   transcript/storyboard timestamps.
4. **Compilation** — All structured content is compiled into `lesson.json`,
   which is the single artifact the lesson player actually loads at
   runtime. The Markdown files remain the authorable, human-reviewed source
   of truth; `lesson.json` is regenerated from them whenever any source
   file changes.
5. **Production** — The explainer video in `assets/` is produced to match
   the locked storyboard and transcript timestamps exactly.
6. **Review** — Curriculum and CBSE-alignment review against
   `lesson-outline.md` and `references.md`.
7. **Publish** — `lesson.json.status` is set to `"published"` and the
   lesson becomes available in the platform.
8. **Iterate** — Any content change (a fixed misconception note, a
   clarified question) increments the version (see Versioning below) and
   is re-compiled into `lesson.json`.

## Asset Requirements

- One primary explainer video (`assets/explainer-video-*.mp4`) whose
  runtime and scene cut points match `storyboard.md` and
  `lesson.json.timeline.scenes` exactly — a storyboard timestamp must
  correspond to an actual frame boundary in the video.
- Diagram assets (`assets/diagrams/`) for the two triangle constructions
  used in scenes 5, 6, 9, and 11 (triangle ABC and triangle ADC).
- Supporting still images (`assets/images/`) for the hook shot, the
  clinometer close-up, and the four-panel recap montage.
- See `assets/README.md` for the full per-asset checklist and naming
  convention.

## Versioning

This lesson follows semantic versioning in `lesson.json` (`version`
field):

- **Patch** (`1.0.x`) — Wording fixes, hint/explanation clarifications,
  typo corrections that do not change timestamps, concepts, or correct
  answers.
- **Minor** (`1.x.0`) — New interactions or questions added, glossary
  terms added, additional Bloom-level coverage — anything that extends the
  lesson without invalidating existing timestamps or IDs.
- **Major** (`x.0.0`) — Structural changes: re-timed video, added/removed/
  reordered concepts, changed correct answers, or any change that would
  invalidate a learner's prior progress data recorded against this
  lesson's IDs.

Any version bump must update `metadata.lastUpdatedDate` in `lesson.json`
and be reflected consistently across all Markdown source files.
