// Learning resources — the OKF content library + catalogued files.

export interface Resource {
  id: string
  title: string
  type: string
  classId: string
  uploaded: string
}

export type OkfResourceType = "Video" | "PDF" | "Worksheet" | "PPT" | "Quiz"

// Lifecycle of a resource's renderable preview. Omitted/undefined is treated
// as "ready" — matches existing seed/OKF library content that has no S3 file
// behind it yet. "processing" covers both the simulated upload pipeline
// (Flow 2) and a real S3 upload awaiting conversion (video → HLS,
// PPT/DOCX/XLSX → PDF). "failed" lets the UI show a retry state instead of
// silently rendering a broken player.
export type OkfResourceStatus = "ready" | "processing" | "failed"

export interface OkfResource {
  id: string
  type: OkfResourceType
  title: string
  meta: string
  okf_ref: string
  /** Omitted/undefined is treated as "ready". */
  status?: OkfResourceStatus
  /** S3 key for the originally uploaded file — source of truth for Download. */
  rawS3Key?: string
  /**
   * S3 key for the renderable preview once status is "ready" — an HLS
   * manifest for video, a converted PDF for documents/slides/worksheets.
   * Resources without this (e.g. seed/demo content) fall back to a static
   * placeholder in PreviewPanel.
   */
  previewS3Key?: string
  /** True for resources a teacher uploaded directly, vs. seeded OKF library content. */
  uploadedByTeacher?: boolean
}
export interface OkfLibraryTopic {
  id: string
  title: string
  resources: OkfResource[]
}
export interface OkfLibraryChapter {
  id: string
  number: number
  title: string
  okf_ref: string
  /** CBSE syllabus unit grouping this chapter belongs to, e.g. "Unit II: The World of the Living". */
  unit?: string
  topics: OkfLibraryTopic[]
}
export interface OkfLibrary {
  subject: string
  board: string
  grade: string
  okf_version: string
  chapters: OkfLibraryChapter[]
}

// Multi-subject curriculum library — one subject can span multiple class
// levels, each with its own chapters/topics (reuses OkfLibraryChapter/Topic
// so a chapter still carries resources the same way OKF_LIBRARY's does).
// Kept separate from OKF_LIBRARY (Math-only, flat) so existing consumers
// (Syllabus Map's OKF alignment, Gradebook, OKF_QUESTION_BANK) are untouched.
export interface OkfSubjectClass {
  classLevel: number
  chapters: OkfLibraryChapter[]
  /** Official CBSE annual teaching hours allocated to this subject/class. */
  annualHours?: number
}
export interface OkfSubject {
  id: string
  name: string
  classes: OkfSubjectClass[]
}
export interface OkfCurriculumLibrary {
  subjects: OkfSubject[]
}

export interface OkfQuestion {
  id: string
  type: string
  text: string
  options?: string[]
  correctIndex?: number
  marks: number
  okf_ref: string
}
export interface OkfQuestionTopic {
  id: string
  title: string
  questions: OkfQuestion[]
}
export interface OkfQuestionChapter {
  id: string
  number: number
  title: string
  topics: OkfQuestionTopic[]
}

export interface OkfChapterPerformance {
  chapterId: string
  avgScore: number
  questionsGraded: number
}
