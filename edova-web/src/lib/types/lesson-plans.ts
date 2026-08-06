// Lesson plans — generator drafts + the persisted library (API-backed).

export interface SavedLessonPlan {
  id: string
  topic: string
  className: string
  subject: string
  duration: string
  savedOn: string
}
// A persisted lesson plan: the full generated body (so it can be re-opened)
// plus its server id and save date. Backs the Lesson Planner library once a
// plan has been saved to the API (see /api/lesson-plans).
export interface SavedLessonPlanRecord {
  id: string
  savedOn: string
  curriculumSubjectId: string | null
  // Kept separate from plan.className (a merged display string) so a
  // reopened plan can restore the actual Class/Section dropdown values.
  classLabel: string
  section: string | null
  plan: LessonPlan
}
export interface LessonPlan {
  topic: string
  title: string
  className: string
  subject: string
  duration: string
  standards: string[]
  objective: string
  materials: string[]
  outcomes: string[]
  warmup: string
  instruction: string
  activity: string
  assessment: string
  homework: string
}
export interface StandardOption {
  code: string
  label: string
}

// ---- lesson-plan API DTOs (ragApi :8000, clerk-compatible wire shapes) ----

// POST /api/lesson-plans body — snake_case, full plan body.
export interface NewLessonPlan {
  topic: string
  title: string
  class_label: string
  section: string | null
  subject: string
  curriculum_subject_id: string | null
  duration_minutes: number
  standards: string[]
  objective: string
  materials?: string[]
  outcomes: string[]
  warmup: string
  instruction: string
  activity: string
  assessment: string
  homework: string
  // Bloom's Taxonomy pills picked at generation time — persisted, not used
  // anywhere yet.
  bloom_levels: string[]
}

// Wire shape returned by GET/POST /api/lesson-plans — snake_case, full body.
export interface ApiSavedPlan extends NewLessonPlan {
  id: string
  created_at: string
}

// POST {aiApi}/api/lesson-plan response — the CAMEL society's generated
// draft (`raw` agent outputs are debug-only and intentionally untyped here).
export interface AiGeneratedPlan {
  plan: {
    topic: string
    title: string
    duration: string
    objective: string
    outcomes: string[]
    warmup: string
    instruction: string
    activity: string
    assessment: string
    homework: string
  }
}
