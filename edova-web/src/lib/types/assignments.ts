// Assignments + Assessment Builder content. A Section is a group of
// questions of one type (multiple_choice, matching, essay, ...) with a
// shared difficulty mix; a BuiltQuestion is one question within a section.
// Shared between AssessmentBankItem and Assignment so built content
// survives save/assign.

export type SubmissionStatus =
  | "not_started"
  | "submitted"
  | "late"
  | "missing"
export interface Submission {
  studentId: string
  status: SubmissionStatus
  submittedOn: string
  score: number | null
  feedback: string
}
export type AssignmentStatus = "active" | "closed" | "graded"

// Submission-method the teacher picks in the Assign wizard's first screen.
// Purely descriptive today — every type renders the same generic evaluation
// viewer — but kept distinct so the wizard/dashboard/evaluate views can label
// and icon each assignment correctly.
export type AssignmentType = "written" | "pdf" | "mcq" | "media" | "coding"

export interface AssignmentAttachment {
  name: string
  size: string
  // Present when attached from the real Learning Resources library instead
  // of the (still-fake) local file upload tab — lets the attachment chip
  // link to the actual video/PDF via getResourceUrl().
  s3Key?: string | null
  externalUrl?: string | null
}

export interface QOption {
  label: string
  text: string
  correct: boolean
}
export interface QPair {
  left: string
  right: string
}
export interface QSub {
  text: string
  answer: string
}
export interface Demand {
  name: string
  easy: number
  medium: number
  hard: number
}
export interface BuiltQuestion {
  id: string
  text: string
  difficulty: string
  options?: QOption[]
  pairs?: QPair[]
  correctAnswer?: string
  rubric?: string
  modelAnswer?: string
  subQuestions?: QSub[]
  scenarioText?: string
  explanation?: string
  okfRef?: string
  marks?: number
  videoThumbnail?: string
  videoDuration?: string
  hasOptions: boolean
  hasPairs: boolean
  hasAnswer: boolean
  hasRubric: boolean
  hasModel: boolean
  hasSubQ: boolean
  hasScenario: boolean
  hasVideo: boolean
}
export interface AssessmentSection {
  id: string
  type: string
  label: string
  count: number
  pointsPer: number
  demand: Demand
  questions: BuiltQuestion[]
}

export interface Assignment {
  id: string
  title: string
  classId: string
  subject: string
  term: string
  academicYear: string
  due: string
  totalPoints: number
  status: AssignmentStatus
  sourceAssessmentId: string | null
  publishedToStudents: boolean
  createdOn: string
  submissions: Submission[]
  // Submission-method the teacher picked in the Assign wizard. Required —
  // the "written" default is applied at construction (seed rows,
  // quick-create, Assessment Builder assign), so readers never fall back.
  type: AssignmentType
  description?: string
  attachments?: AssignmentAttachment[]
  // Present when this assignment originated from Assessment Builder content
  // (either saved-then-assigned, or assigned directly). Absent for
  // freeform/quick-created assignments (e.g. Assignments.tsx's "+ New
  // Assignment"), which have no question content behind them.
  sections?: AssessmentSection[]
  // Chapter/topic tag carried from the saved assessment — feeds the memory
  // layer when students make mistakes on this assignment.
  topicLabel?: string
}

export interface AssessmentBankItem {
  id: string
  title: string
  classId: string
  subject: string
  term: string
  academicYear: string
  totalPoints: number
  sectionCount: number
  questionCount: number
  createdOn: string
  sections: AssessmentSection[]
  // Stored so View/Edit can restore the full Step-1 context (added with the
  // re-open feature; absent on entries saved before it).
  objective?: string
  topicLabel?: string
}

export interface DemandPreset {
  key: string
  name: string
  easy: number
  medium: number
  hard: number
}
export interface PaletteType {
  type: string
  label: string
  icon: string
  bg: string
  color: string
}
