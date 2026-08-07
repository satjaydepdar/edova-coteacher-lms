// Teacher Home dashboard (edova-backend, :8003). One request per page load —
// the backend derives every widget server-side rather than making the browser
// fan out over classrooms × assignments the way school-store does.
//
// `null` on a metric means "no service records this yet", not zero. See the
// teacher_dashboard() docstring in edova-backend/main.py for which fields are
// unbacked today and why; the UI renders an explicit not-tracked state for
// each instead of showing a number nothing stands behind.
import { useAppStore } from "@/store/app-store"

const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL ?? "http://localhost:8003"

export interface DashboardMetrics {
  total_students: number
  pending_grading: number
  /** Mean of every scored grade. null until something has been graded. */
  class_average: number | null
  /** Share of expected submissions turned in. null when nothing is due yet. */
  submission_rate: number | null
  /** null — nothing writes the `attendance` table yet. */
  avg_attendance: number | null
  /** null — nothing reads the `schedules` table yet. */
  classes_today: number | null
}

export interface CoTeacher {
  teacher_id: string
  name: string
  initials: string
  role_type: string
  is_primary: boolean
  handoff_notes: string | null
}

export interface DashboardClass {
  classroom_id: string
  name: string
  class_level: number
  section: string | null
  subject: string
  student_count: number
  /** null when the classroom has no matching master-syllabus section. */
  taught_pct: number | null
  /** null — no planned-pacing % is derived from section_unit_pacing yet. */
  planned_pct: number | null
  /** Everyone else assigned to this classroom. */
  co_teachers: CoTeacher[]
}

export interface ClassOption {
  classroom_id: string
  label: string
}

export interface AssignmentStatus {
  assignment_id: string
  title: string
  classroom_id: string
  on_time: number
  late: number
  missing: number
}

export interface DashboardEvent {
  id: string
  title: string
  event_type: string
  start_at: string
  end_at: string | null
  is_all_day: boolean
  visibility: string
  classroom_id: string | null
}

/** A recommendation states what was observed (`finding`) and what to do
 * about it (`suggestion`) — a card without both is just a to-do item. */
export interface ActionItem {
  kind: "grading" | "overdue" | "low_scoring" | "at_risk" | "due_soon"
  severity: "high" | "medium" | "low"
  title: string
  finding: string
  suggestion: string
  cta_label: string
  cta_url: string
  count: number
  total: number
  assignment_id: string | null
  classroom_id: string | null
}

export interface Activity {
  student_name: string
  initials: string
  assignment_title: string
  assignment_id: string
  submitted_at: string
  is_late: boolean
}

export interface Intervention {
  student_id: string
  name: string
  initials: string
  classroom_name: string
  missing_count: number
  average_pct: number | null
  reason: "missed" | "failing"
}

export interface TeacherDashboard {
  teacher_name: string
  metrics: DashboardMetrics
  /** Every class the teacher holds — populates the switcher regardless of
   * which one is currently selected. */
  class_options: ClassOption[]
  classes: DashboardClass[]
  assignment_status: AssignmentStatus[]
  upcoming: DashboardEvent[]
  action_items: ActionItem[]
  interventions: Intervention[]
  recent_activity: Activity[]
  scoped_classroom_id: string | null
}

/** `classroomId` narrows every figure to one class; omit it to see the
 * teacher's whole load averaged together. */
export async function getTeacherDashboard(classroomId?: string): Promise<TeacherDashboard> {
  const token = useAppStore.getState().session?.token
  if (!token) throw new Error("not signed in")
  const qs = classroomId ? `?classroom_id=${encodeURIComponent(classroomId)}` : ""
  const res = await fetch(`${BACKEND_API_URL}/api/teachers/me/dashboard${qs}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const data = await res.json()
      if (data?.detail) detail = data.detail
    } catch { /* non-JSON error body */ }
    throw new Error(detail)
  }
  return res.json() as Promise<TeacherDashboard>
}

/** Just the activity feed — the topbar bell renders on every page and
 * shouldn't pull the whole dashboard payload for a count. */
export async function getTeacherActivity(): Promise<Activity[]> {
  const token = useAppStore.getState().session?.token
  if (!token) throw new Error("not signed in")
  const res = await fetch(`${BACKEND_API_URL}/api/teachers/me/activity`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`API ${res.status}`)
  return res.json() as Promise<Activity[]>
}
