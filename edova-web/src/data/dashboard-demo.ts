/**
 * Placeholder data for the three Home dashboard panels that have no backend
 * source yet: Avg Attendance, Today's Schedule, and the Topic Mastery
 * Heatmap. Everything else on that page is real, server-derived data.
 *
 * This file exists as its own module (rather than living in seed.ts or
 * inline in the page) so the demo/real boundary stays obvious and the
 * cleanup is mechanical: when a real endpoint lands for one of these, delete
 * its export here and the compiler points at the single usage to replace.
 *
 * What each one is waiting on:
 *   Avg Attendance   -> nothing writes/reads `attendance` (db/migrations 0008)
 *   Today's Schedule -> nothing reads `schedules` (same migration)
 *   Topic Mastery    -> grades are stored per assignment, not per syllabus
 *                       topic; the assignment -> topic mapping doesn't exist
 */
import { STUDENTS } from "@/data/seed"

/** Averaged from seed.ts's per-student attendance so the headline figure and
 * the Attendance page can't contradict each other. */
export const DEMO_AVG_ATTENDANCE = Math.round(
  STUDENTS.reduce((sum, s) => sum + s.attendance, 0) / STUDENTS.length
)

/** Percentage-point change vs the previous week. */
export const DEMO_ATTENDANCE_TREND = 2

export interface DemoScheduleEntry {
  period: string
  time: string
  classLabel: string
  subject: string
}

export const DEMO_TODAY_SCHEDULE: DemoScheduleEntry[] = [
  { period: "P2", time: "09:40", classLabel: "Class 10 — A", subject: "Mathematics" },
  { period: "P4", time: "11:20", classLabel: "Class 10 — B", subject: "Mathematics" },
  { period: "P6", time: "01:30", classLabel: "Class 9 — A", subject: "Mathematics" },
]

export type MasteryLevel = "mastered" | "developing" | "struggling" | "not_started"

/** Column headers — the first five Class 10 maths chapters, matching the
 * syllabus the clerk seeds (ncert_rag/clerk/api.py SEED_SYLLABUS). */
export const DEMO_MASTERY_TOPICS = [
  "Real Numbers",
  "Polynomials",
  "Linear Eq.",
  "Quadratic Eq.",
  "Triangles",
]

export interface DemoMasteryRow {
  student: string
  levels: MasteryLevel[]
}

// Rows reuse seed.ts's roster so the names match every other mock surface in
// the app (Attendance, Assignment Tracker), rather than inventing a second
// cast of students.
export const DEMO_MASTERY_ROWS: DemoMasteryRow[] = [
  { student: STUDENTS[0].name, levels: ["mastered", "mastered", "developing", "not_started", "not_started"] },
  { student: STUDENTS[1].name, levels: ["mastered", "developing", "developing", "not_started", "not_started"] },
  { student: STUDENTS[2].name, levels: ["developing", "struggling", "struggling", "not_started", "not_started"] },
  { student: STUDENTS[3].name, levels: ["mastered", "mastered", "mastered", "developing", "not_started"] },
  { student: STUDENTS[4].name, levels: ["mastered", "developing", "mastered", "not_started", "not_started"] },
  { student: STUDENTS[5].name, levels: ["struggling", "struggling", "developing", "not_started", "not_started"] },
]

export const MASTERY_STYLE: Record<MasteryLevel, { bg: string; label: string }> = {
  mastered: { bg: "bg-success", label: "Mastered" },
  developing: { bg: "bg-warning", label: "Developing" },
  struggling: { bg: "bg-danger", label: "Struggling" },
  not_started: { bg: "bg-muted", label: "Not started" },
}
