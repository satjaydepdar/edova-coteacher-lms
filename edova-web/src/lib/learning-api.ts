// Clerk (ncert_rag, :8001) helpers for the Student Learning Hub: gamification
// (XP/streak/mistakes/flags), the per-topic quiz, and the content tree
// (subjects → syllabus units/chapters/topics → chapter resources) behind the
// breadcrumb dropdowns. Field names follow the clerk API exactly
// (subject_name, chapter_number, s3_key, …).
import { useAppStore } from "@/store/app-store"
import type { Mistake, NewMistake, QuizQuestion } from "@/lib/types"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8001"

// Fixed demo student — used for Guest mode / no real student session.
export const STUDENT_ID = "stu_demo"

// A real logged-in student gets their own gamification/wiki data (keyed on
// their real edova-backend id) instead of everyone sharing the one demo
// student above. `name` is passed to the clerk API so it can lazy-create
// the student's row there on first touch (clerk's local "students" table
// only ever had the one seeded demo row) — undefined for Guest/demo, which
// keeps get_gamification/get_wiki 404ing on any other unknown id.
function currentStudent(): { id: string; name?: string } {
  const user = useAppStore.getState().session?.user
  return user?.role === "student" ? { id: user.id, name: user.name } : { id: STUDENT_ID }
}

// For callers that need to detect a student switch (e.g. learning-store's
// hydration guard) without pulling in the name-resolution logic above.
export function currentStudentId(): string {
  return currentStudent().id
}

export interface Gamification {
  student_id: string
  xp: number
  streak: number
  mistakes: Mistake[]
}

export interface LearningSubject {
  id: string
  subject_name: string
}

export interface SyllabusTopic {
  id: string
  title: string
}

export interface SyllabusChapter {
  id: string
  number: number | null
  name: string
  topics: SyllabusTopic[]
}

export interface SyllabusUnit {
  id: string
  name: string
  chapters: SyllabusChapter[]
}

// How a resource's subject/chapter/type filing was decided:
//   unverified       - no signal (resources catalogued before trust existed)
//   auto_classified  - the classify.py pipeline guessed; carries its confidence (0-1)
//   teacher_reviewed - a person confirmed it (a direct app upload, or an
//                      explicit review via verifyResource())
export interface ResourceTrust {
  status: "unverified" | "auto_classified" | "teacher_reviewed"
  confidence?: number | null
  reviewed_at?: string
}

export interface LearningResource {
  id: string
  title: string
  type: string
  doc_type: string | null
  chapter_number: number | null
  topic_id?: string | null
  s3_key: string | null
  status: string
  /** Set for a YouTube/podcast/external-reference resource instead of s3_key. */
  external_url?: string | null
  trust?: ResourceTrust
}

async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`)
  if (!r.ok) return Promise.reject(r.status)
  return (await r.json()) as T
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!r.ok) return Promise.reject(r.status)
  return (await r.json()) as T
}

// ---- Gamification ----

export function getGamification(studentId: string = currentStudent().id) {
  const name = studentId === currentStudent().id ? currentStudent().name : undefined
  const q = name ? `?name=${encodeURIComponent(name)}` : ""
  return apiGet<Gamification>(`/api/students/${studentId}/gamification${q}`)
}

export function postXP(delta: number, studentId: string = currentStudent().id) {
  return apiPost<{ xp: number; streak: number }>(`/api/students/${studentId}/xp`, { delta })
}

export function postMistake(m: NewMistake & { topic_id?: string | null }, studentId: string = currentStudent().id) {
  return apiPost<Mistake>(`/api/students/${studentId}/mistakes`, {
    topic_id: m.topic_id ?? null,
    q: m.q,
    yourAns: m.yourAns,
    correct: m.correct,
    chapter: m.chapter,
    solution: m.solution,
  })
}

export function postFlag(context: string, studentId: string = currentStudent().id) {
  return apiPost<{ status: string }>(`/api/students/${studentId}/flags`, { context })
}

// ---- Learning content ----

// Empty questions (not an error) means the topic has no quiz — the player
// hides its quiz card then.
export function getQuiz(topicId: string) {
  return apiGet<{ topic_id: string; questions: QuizQuestion[] }>(
    `/api/learning/quiz?topic_id=${encodeURIComponent(topicId)}`,
  )
}

export function getSubjects(year = "2026-2027", board = "CBSE", classLabel = "Class 10") {
  return apiGet<{ subjects: LearningSubject[] }>(
    `/api/curriculums?year=${encodeURIComponent(year)}&board=${encodeURIComponent(board)}&class=${encodeURIComponent(classLabel)}`,
  )
}

export function getSyllabus(subjectId: string) {
  return apiGet<{ units: SyllabusUnit[] }>(`/api/curriculum-subjects/${subjectId}/syllabus`)
}

export function getResources(subjectId: string) {
  return apiGet<LearningResource[]>(`/api/curriculum-subjects/${subjectId}/resources`)
}

export function verifyResource(resourceId: string) {
  return apiPost<{ doc_id: string; trust: ResourceTrust }>(`/api/resources/${resourceId}/verify`, {})
}

// ---- Personal wiki ----

// Mirrors MAX_NOTE_CHARS in ncert_rag/clerk/api.py — used client-side only
// to word the "trimmed" toast, the server remains the source of truth.
export const MAX_NOTE_CHARS = 1000

export interface WikiPage {
  slug: string
  title: string
  content_markdown: string
  updated_at: string
  /** Only present on a save response — true when note_text was clipped to the server's 1000-char limit. */
  truncated?: boolean
}

export function getWiki(studentId: string = currentStudent().id) {
  const name = studentId === currentStudent().id ? currentStudent().name : undefined
  const q = name ? `?name=${encodeURIComponent(name)}` : ""
  return apiGet<WikiPage>(`/api/students/${studentId}/wiki${q}`)
}

export function saveWikiNote(
  note: { chapter_number: number | null; chapter_name: string; note_text: string },
  studentId: string = currentStudent().id,
) {
  return apiPost<WikiPage>(`/api/students/${studentId}/wiki/notes`, note)
}
