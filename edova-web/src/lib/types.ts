// Domain types — mirror the mockup's seed data shapes (_decomp/app.js).

export type ViewKey =
  | "home"
  | "calendar"
  | "settings"
  | "knowledgeGraph"
  | "lessonPlanner"
  | "curriculumMap"
  | "assignmentTracker"
  | "assessmentBuilder"
  | "attendance"
  | "resources"
  | "announcements"
  | "parentCommunication"
  | "reports"
  | "learning"
  | "wiki"

export type Role = "teacher" | "admin" | "student"

export interface NavItem {
  key: ViewKey
  label: string
  icon: string
  path: string
}
export interface NavGroup {
  label: string
  adminOnly?: boolean
  items: NavItem[]
}

export interface Klass {
  id: string
  name: string
  subject: string
  room: string
  students: number
  schedule: string
  sectionId: string
}

export type StudentStatus = "on-track" | "at-risk"
export interface Student {
  id: string
  name: string
  rollNo: string
  classId: string
  attendance: number
  avgGrade: string
  status: StudentStatus
}

export type SubmissionStatus =
  | "not_started"
  | "submitted"
  | "late"
  | "missing"
  | "graded"
export interface Submission {
  studentId: string
  status: SubmissionStatus
  submittedOn: string
  score: number | null
  feedback: string
  textResponse?: string
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

// Assessment Builder content types — a Section is a group of questions of
// one type (multiple_choice, matching, essay, ...) with a shared difficulty
// mix; a BuiltQuestion is one question within a section. Shared between
// AssessmentBankItem and Assignment so built content survives save/assign.
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
  due: string           // display label e.g. "Aug 10"
  dueIso?: string       // precise ISO timestamp from the date+time picker
  scheduleIso?: string  // precise ISO timestamp for scheduled assignments
  totalPoints: number
  status: AssignmentStatus
  sourceAssessmentId: string | null
  publishedToStudents: boolean
  createdOn: string
  submissions: Submission[]
  // Present on assignments created via the Assign/Evaluate wizard; absent
  // (defaults to "written") for older seed/quick-created assignments.
  type?: AssignmentType
  description?: string
  attachments?: AssignmentAttachment[]
  // Present when this assignment originated from Assessment Builder content
  // (either saved-then-assigned, or assigned directly). Absent for
  // freeform/quick-created assignments (e.g. Assignments.tsx's "+ New
  // Assignment"), which have no question content behind them.
  sections?: AssessmentSection[]
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
}

export interface Announcement {
  id: string
  title: string
  body: string
  date: string
  audience: string
}

export type Priority = "high" | "medium" | "low"
export interface Task {
  id: string
  title: string
  due: string
  priority: Priority
  done: boolean
}

export type BehaviorType = "positive" | "incident"
export interface BehaviorNote {
  student: string
  classId: string
  type: BehaviorType
  note: string
  date: string
}

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

export interface Report {
  name: string
  type: string
  generated: string
}

export type ExamType = "Quiz" | "Unit Test" | "Exam" | "Final"
export interface Exam {
  id: string
  title: string
  classId: string
  date: string
  type: string
  weight: string
  duration: number
  coverageUnitIds: string[]
  revisionAllocated: number
  revisionUsed: number
  /** Owning teacher; "all" = school-wide. */
  teacherId: string
}

export type CalendarEventType =
  | "exam"
  | "meeting"
  | "class"
  | "deadline"
  | "holiday"
export interface CalendarEvent {
  date: string
  day: string
  title: string
  type: CalendarEventType
  time: string
  /** Owning teacher; "all" = school-wide, shown on every teacher's calendar. */
  teacherId: string
}

export interface AcademicCalendarItem {
  id: string
  date: string
  label: string
  type: "Holiday" | "Event"
}

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
  term: string
  unit: string
  plannedStart: string
  plannedEnd: string
  periods: number
  textbookRef: string
  weightage: string
  planned: number
  actual: number
  okfChapterId?: string
  topics: CurriculumTopic[]
}

export interface ParentMessage {
  parent: string
  student: string
  last: string
  date: string
  unread: boolean
}

export interface TimetableEntry {
  id: string
  day: string
  time: string
  classId: string
}
export interface MasterTimetableRow {
  id: string
  sectionId: string
  academicYear: string
  day: string
  period: number
  subject: string
  teacher: string
  room: string
}
export interface Section {
  id: string
  label: string
  grade: number
  section: string
}

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
  plan: LessonPlan
}
export interface LessonPlan {
  topic: string
  className: string
  subject: string
  duration: string
  standards: string[]
  objective: string
  materials: string[]
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

export interface TeacherAdmin {
  name: string
  subject: string
  classes: number
  avgAttendance: number
  rating: number
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

// ---- Chat assistant ----
export interface ChatRootChip {
  id: string
  label: string
}
export interface ChatTopic {
  title: string
  grade: string
  subject: string
  standard: string
  duration: string
  count: number
  byLevel: { remedial: string; onlevel: string; gifted: string }
}
export interface ChatExitTicket {
  title: string
  className: string
  questions: string[]
}
export interface ChatPolicyAnswer {
  answer: string
  source: { name: string; snippet: string; updated: string }
}
export interface ChatEmail {
  subject: string
  bodyByTone: { casual: string; professional: string; formal: string }
}

// ---- Student Learning Hub ----
// One auto-journaled wrong answer (from video quizzes, labs, …). id/date are
// stamped by the clerk API ("mis_…" / YYYY-MM-DD); optimistic local rows get
// a "local_<ts>" id until the server row replaces them. Components submit the
// rest.
export interface Mistake {
  id: string
  q: string
  yourAns: string
  correct: string
  chapter: string
  date: string
  solution: string
}
export type NewMistake = Omit<Mistake, "id" | "date">

// One video-quiz question — the shape of the clerk /api/learning/quiz payload
// and of VideoPlayerWithQuiz's built-in fallback set.
export interface QuizQuestion {
  q: string
  opts: string[]
  ans: number
  exp: string
}
