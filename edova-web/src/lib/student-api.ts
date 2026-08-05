// Real per-student assignment list + submission (edova-backend, :8003).
// Distinct from learning-api.ts (clerk :8001's gamification/wiki) -- this
// talks to the same backend school-store.ts uses for real assignments/grades.
import { useAppStore } from "@/store/app-store"

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL ?? "http://localhost:8003"

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
}

function authHeader(): HeadersInit {
  const token = useAppStore.getState().session?.token
  if (!token) throw new Error("not signed in")
  return { Authorization: `Bearer ${token}` }
}

export async function getMyAssignments(): Promise<MyAssignment[]> {
  const r = await fetch(`${BACKEND_API_URL}/api/students/me/assignments`, { headers: authHeader() })
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json()
}

export async function submitMyAssignment(assignmentId: string, textResponse: string) {
  const r = await fetch(`${BACKEND_API_URL}/api/assignments/${assignmentId}/submissions/me`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ text_response: textResponse }),
  })
  if (!r.ok) throw new Error(`API ${r.status}`)
  return r.json() as Promise<{ assignment_id: string; status: string; submitted_at: string; is_late: boolean; text_response: string }>
}
