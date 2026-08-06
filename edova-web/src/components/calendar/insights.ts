import { ASSIGNMENTS_SEED, CLASSES, STUDENTS } from "@/data/seed"
import type { Assignment, Student } from "@/lib/types"
import { parseShortDate } from "@/lib/dates"
import type { CalendarEntry } from "./types"

// Everything below is computed from data the app already has (assignments,
// submissions, attendance, plan entries). No nightly pipeline yet — risk and
// mastery use the simplified formulas documented per function.

export interface PlanSnapshot {
  topic: string
  taughtPct: number
  plannedPct: number | null // null = no annual plan set for this class
}

export interface ComplianceItem {
  title: string
  due: string
  status: "done" | "pending" | "overdue"
}

export interface Funnel {
  assignmentTitle: string
  submitted: number
  late: number
  notStarted: number
  missing: number
  total: number
  avgScoreLast: string | null // e.g. "8.2/10" from the last graded assignment
}

export interface AtRiskStudent {
  student: Student
  riskScore: number
  bucket: "critical" | "falling" | "watch"
  reason: string
}

export interface Mastery {
  mastered: number
  developing: number
  needsHelp: number
}

export function classIdByName(classSection: string): string | undefined {
  return CLASSES.find((c) => c.name === classSection)?.id
}

export function className(classId: string): string {
  return CLASSES.find((c) => c.id === classId)?.name ?? classId
}

function classStudents(classId: string): Student[] {
  return STUDENTS.filter((s) => s.classId === classId)
}

function classAssignments(classId: string): Assignment[] {
  return ASSIGNMENTS_SEED.filter((a) => a.classId === classId)
}

function sameWeek(a: Date, b: Date): boolean {
  const startOf = (d: Date) => {
    const s = new Date(d)
    s.setDate(d.getDate() - d.getDay())
    return s.toDateString()
  }
  return startOf(a) === startOf(b)
}

/** Taught % comes from the day's plan entry; planned % from the (seeded)
 *  annual plan. Variance badge = taught - planned. */
export function getPlanSnapshot(
  classSection: string,
  entry: CalendarEntry | undefined,
  plannedPctByClass: Record<string, number>,
): PlanSnapshot | null {
  if (!entry) return null
  return {
    topic: entry.subjectChapter,
    taughtPct: entry.percentCovered,
    plannedPct: plannedPctByClass[classSection] ?? null,
  }
}

/** This week's assignments for the class: done (every student submitted),
 * overdue (due date passed), or pending. */
export function getWeeklyCompliance(classId: string, date: Date): ComplianceItem[] {
  return classAssignments(classId)
    .filter((a) => sameWeek(parseShortDate(a.due), date))
    .map((a) => {
      const dueDate = parseShortDate(a.due)
      const allSubmitted = a.submissions.every((s) => s.status === "submitted")
      return {
        title: a.title,
        due: a.due,
        status: allSubmitted ? "done" : dueDate < date ? "overdue" : "pending",
      }
    })
}

/** Submission funnel for the class's current (latest-due, still open)
 *  assignment, plus the class average on the last graded one. */
export function getFunnel(classId: string, date: Date): Funnel | null {
  const assignments = classAssignments(classId)
    .filter((a) => a.status !== "closed" || parseShortDate(a.due) <= date)
    .sort((a, b) => parseShortDate(b.due).getTime() - parseShortDate(a.due).getTime())
  const latest = assignments[0]
  if (!latest) return null

  const late = latest.submissions.filter(
    (s) => s.status === "submitted" && parseShortDate(s.submittedOn) > parseShortDate(latest.due),
  ).length
  const graded = assignments.find((a) => a.submissions.some((s) => s.score !== null))
  const avgScoreLast = graded
    ? `${(graded.submissions.reduce((sum, s) => sum + (s.score ?? 0), 0) / graded.submissions.length / (graded.totalPoints / 10)).toFixed(1)}/10`
    : null

  return {
    assignmentTitle: latest.title,
    submitted: latest.submissions.filter((s) => s.status === "submitted").length,
    late,
    notStarted: latest.submissions.filter((s) => s.status === "not_started").length,
    missing: latest.submissions.filter((s) => s.status === "missing").length,
    total: latest.submissions.length,
    avgScoreLast,
  }
}

/** Simplified Figma risk formula over available data:
 * risk = avgScore% * 0.5 + attendance% * 0.2 + delayFactor * 0.3,
 * delayFactor = 100 on-time / 50 late / 0 missing-or-not-started. */
export function getAtRisk(classId: string, date: Date, limit = 5): AtRiskStudent[] {
  const gradedAssignments = classAssignments(classId).filter((a) =>
    a.submissions.some((s) => s.score !== null),
  )
  const latestAssignment = classAssignments(classId)
    .filter((a) => parseShortDate(a.due) <= date)
    .sort((a, b) => parseShortDate(b.due).getTime() - parseShortDate(a.due).getTime())[0]

  return classStudents(classId)
    .map((student) => {
      const scores = gradedAssignments
        .flatMap((a) => a.submissions)
        .filter((s) => s.studentId === student.id && s.score !== null)
        .map((s) => ((s.score ?? 0) / 20) * 100)
      const scoreAvg = scores.length ? scores.reduce((x, y) => x + y, 0) / scores.length : 0

      const sub = latestAssignment?.submissions.find((s) => s.studentId === student.id)
      const delayFactor =
        !sub || sub.status !== "submitted"
          ? 0
          : parseShortDate(sub.submittedOn) > parseShortDate(latestAssignment!.due)
            ? 50
            : 100

      const riskScore = Math.round(scoreAvg * 0.5 + student.attendance * 0.2 + delayFactor * 0.3)
      const bucket: AtRiskStudent["bucket"] = riskScore < 40 ? "critical" : riskScore < 60 ? "falling" : "watch"
      const reason =
        scores.length === 0 && (!sub || sub.status !== "submitted")
          ? "No submissions yet"
          : !sub || sub.status !== "submitted"
            ? `Latest assignment ${sub?.status === "missing" ? "missing" : "not started"}`
            : `Avg ${Math.round(scoreAvg)}% · attendance ${student.attendance}%`
      return { student, riskScore, bucket, reason }
    })
    .sort((a, b) => a.riskScore - b.riskScore)
    .slice(0, limit)
}

/** Topic mastery from the last graded assignment: >=75% mastered,
 * 50–74 developing, <50 needs reteach. */
export function getMastery(classId: string): Mastery | null {
  const graded = classAssignments(classId).find((a) => a.submissions.some((s) => s.score !== null))
  if (!graded) return null
  const pct = (s: number | null) => ((s ?? 0) / graded.totalPoints) * 100
  return {
    mastered: graded.submissions.filter((s) => pct(s.score) >= 75).length,
    developing: graded.submissions.filter((s) => pct(s.score) >= 50 && pct(s.score) < 75).length,
    needsHelp: graded.submissions.filter((s) => pct(s.score) < 50).length,
  }
}
