// Curriculum — the in-app syllabus-progress view models plus the course-CRUD
// API DTOs (served by the Postgres RAG app :8000 under the clerk-compatible
// wire contract; see lib/curriculum-api.ts).
import type { OkfResourceType } from "./resources"

export interface CurriculumTopic {
  id: string
  name: string
  done: boolean
}
export interface CurriculumUnit {
  id: string
  subject: string
  classId: string
  academicYear: string
  // Scheduling fields are absent on API-hydrated units (the syllabus tree
  // carries no term/dates/periods data) — the mapper omits them rather than
  // fabricating values; consumers render the same fallbacks the fabricated
  // values used to produce. Units created via the Settings modal / CSV
  // import always carry them.
  term?: string
  unit: string
  plannedStart?: string
  plannedEnd?: string
  periods?: number
  textbookRef: string
  weightage: string
  planned?: number
  actual: number
  okfChapterId?: string
  // Extra fields the Settings curriculum modal tracks (mockup extras);
  // written onto stored units, absent on hydrated/quick-created ones.
  difficulty?: string
  dependsOn?: string
  topics: CurriculumTopic[]
}

// ---- course-CRUD API DTOs (ragApi :8000, clerk-compatible wire shapes) ----

export interface AcademicYearOut {
  id: string
  s_no: number
  year_label: string
}

// One subject row on a curriculum card (GET /api/curriculums).
export interface CurriculumSubjectOut {
  id: string
  s_no: number
  subject_code: string
  subject_name: string
  subject_type: "Core" | "Elective"
  credits: number
  total_marks: number | null
  total_chapters: number | null
  syllabus_json: Record<string, number>
}

export interface CurriculumOut {
  id: string
  year_label: string
  board: string
  class_label: string
  updated_at: string
  subjects: CurriculumSubjectOut[]
}

// POST /api/curriculums/{id}/subjects body.
export interface NewSubjectBody {
  subject_code: string
  subject_name: string
  subject_type: "Core" | "Elective"
  credits: number
  total_marks: number | null
  total_chapters: number | null
  syllabus_json: Record<string, number>
}

// Master-syllabus tree (GET /api/curriculum-subjects/{id}/syllabus) — units
// carry chapters carry topics.
export interface SyllabusTopicOut {
  id: string
  s_no: number
  title: string
}
export interface SyllabusChapterOut {
  id: string
  s_no: number
  number: number | null
  name: string
  topics: SyllabusTopicOut[]
}
export interface SyllabusUnitOut {
  id: string
  s_no: number
  number: number | null
  name: string
  marks: number | null
  chapters: SyllabusChapterOut[]
}
export interface SyllabusOut {
  subject_id: string
  subject_name: string
  units: SyllabusUnitOut[]
}

// PUT /api/curriculum-subjects/{id}/syllabus body — the whole tree, replaced
// atomically (topics arrive as plain title strings; the API assigns ids).
export interface SyllabusChapterIn {
  number: number | null
  name: string
  topics: string[]
}
export interface SyllabusUnitIn {
  number: number | null
  name: string
  marks: number | null
  chapters: SyllabusChapterIn[]
}

// Catalogued resource file (GET /api/curriculum-subjects/{id}/resources) —
// third-brain pipeline + teacher uploads, matched to real chapters by
// chapter number. Served by clerk (:8001), which keeps the resources catalog.
export interface CatalogResource {
  id: string
  title: string
  type: OkfResourceType
  doc_type?: string
  chapter_number: number
  topic_id?: string | null
  s3_key?: string
  preview_s3_key?: string
  status: string
}

// Get-or-create class-section response (GET /api/class-sections) — one
// section studying one subject ("Class 10 — Section A · Mathematics").
export interface ClassSectionOut {
  id: string
  section: string
  subject_id: string
  subject_name: string
  class_label: string
  year_label: string
}

export interface DoneTopicOut {
  topic_id: string
  taught_on: string | null
}
export interface SectionProgressOut {
  section_id: string
  subject_id: string
  done_topics: DoneTopicOut[]
}
export interface TopicTickOut {
  section_id: string
  topic_id: string
  done: boolean
}

export interface TopicOption {
  id: string
  label: string
}
export interface BankQuestionV2 {
  id: number
  text: string
  difficulty: "Easy" | "Medium" | "Hard"
  options: string[]
  correct: number[]
}
