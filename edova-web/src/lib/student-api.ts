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

export async function getMyAssignments(): Promise<MyAssignment[]> {
  // Path A: Logged-in student — the backend returns personalised assignments
  // with submission status, grades, and answers already joined.
  if (backendApi.token) {
    try {
      return await backendApi.get<MyAssignment[]>("/api/students/me/assignments")
    } catch {
      // Student endpoint failed (teacher token, expired session, etc.)
      // — fall through to the classroom-based fallback below.
    }
  }

  // Path B: Teacher preview / guest mode — dynamically discover real
  // classrooms and fetch each one's published assignments so that
  // teacher-published work always appears on the student pages.
  try {
    const classrooms = await backendApi.get<
      { id: string; class_level: number; section: string | null; subject: string }[]
    >("/api/classrooms")

    if (!classrooms || classrooms.length === 0) return []

    const allAssignments: MyAssignment[] = []

    await Promise.all(
      classrooms.map(async (cls) => {
        try {
          const rows = await backendApi.get<any[]>(
            `/api/classrooms/${cls.id}/assignments`
          )
          for (const row of rows) {
            allAssignments.push({
              id: row.id,
              title: row.title,
              description: row.description || "",
              due_date: row.due_date,
              points_possible: row.points_possible,
              submission_type: row.submission_type || "written",
              classroom_name: `Class ${cls.class_level} — ${cls.section || "A"} · ${cls.subject}`,
              submission_status: "not_started" as MySubmissionStatus,
              submitted_at: null,
              text_response: null,
              points_earned: null,
              feedback: null,
              sections: row.sections || [],
              topic_label: row.topic_label || cls.subject,
              answers: [],
            })
          }
        } catch {
          // Individual classroom fetch failed — skip it silently.
        }
      })
    )

    // Sort by due date (earliest first), then by creation recency.
    allAssignments.sort((a, b) => {
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      if (a.due_date) return -1
      if (b.due_date) return 1
      return 0
    })

    return allAssignments
  } catch {
    return []
  }
}

/** Submit a written assignment (text response). Returns a structured error
 *  string on auth problems so the caller can show user feedback instead of
 *  silently failing. */
export async function submitMyAssignment(assignmentId: string, textResponse: string) {
  if (!backendApi.token) {
    throw new Error("Please log in as a student to submit assignments.")
  }
  return backendApi.put<{ assignment_id: string; status: string; submitted_at: string; is_late: boolean; text_response: string }>(
    `/api/assignments/${assignmentId}/submissions/me`,
    { text_response: textResponse },
  )
}

// MCQ quiz submit — the SERVER scores against the stored correct answers and
// auto-records the grade (teacher's tracker shows it without manual work).
export async function submitQuiz(assignmentId: string, answers: McqAnswer[]) {
  if (!backendApi.token) {
    throw new Error("Please log in as a student to submit quizzes.")
  }
  return backendApi.put<QuizSubmitResult>(
    `/api/assignments/${assignmentId}/submissions/me`,
    { answers },
  )
}
