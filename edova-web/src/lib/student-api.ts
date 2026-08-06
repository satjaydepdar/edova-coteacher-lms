// Real per-student assignment list + submission (edova-backend, :8003).
// Distinct from learning-api.ts (clerk :8001's gamification/wiki) -- this
// talks to the same backend school-store.ts uses for real assignments/grades.
import { backendApi } from "./api-client"
import type { AssessmentSection } from "./types"

export type MySubmissionStatus = "not_started" | "submitted" | "late" | "graded"

export interface MyAssignment {
  id: string
  title: string
  description: string
  due_date: string | null
  points_possible: number
  submission_type: string
  classroom_name: string
  submission_status: MySubmissionStatus
  submitted_at: string | null
  text_response: string | null
  points_earned: number | null
  feedback: string | null
  // Question sections from the saved assessment (MCQ runner) + the chapter
  // tag for memory events + this student's stored answers for review mode.
  sections: AssessmentSection[]
  topic_label: string
  answers: McqAnswer[]
}

export interface McqAnswer {
  question_id: string
  selected: string
}

export interface QuizResultItem {
  question_id: string
  correct: boolean
  correct_answer: string
  explanation: string
}

export interface QuizSubmitResult {
  assignment_id: string
  status: string
  submitted_at: string
  is_late: boolean
  score: number | null
  max_score: number | null
  results: QuizResultItem[]
}

function requireSession(): void {
  if (!backendApi.token) throw new Error("not signed in")
}

export async function getMyAssignments(): Promise<MyAssignment[]> {
  requireSession()
  return backendApi.get<MyAssignment[]>("/api/students/me/assignments")
}

export async function submitMyAssignment(assignmentId: string, textResponse: string) {
  requireSession()
  return backendApi.put<{ assignment_id: string; status: string; submitted_at: string; is_late: boolean; text_response: string }>(
    `/api/assignments/${assignmentId}/submissions/me`,
    { text_response: textResponse },
  )
}

// MCQ quiz submit — the SERVER scores against the stored correct answers and
// auto-records the grade (teacher's tracker shows it without manual work).
export async function submitQuiz(assignmentId: string, answers: McqAnswer[]) {
  requireSession()
  return backendApi.put<QuizSubmitResult>(
    `/api/assignments/${assignmentId}/submissions/me`,
    { answers },
  )
}
