// Assignments slice — seed assignments + real-backend hydration/publish for
// migrated classrooms, and the grading mutators. Writes are optimistic:
// local state updates always land; the backend persist is best-effort with a
// graceful local-only fallback (same posture as the pre-split store).
import type { StateCreator } from "zustand"
import { CLASSES } from "@/data/seed"
import type { Assignment, AssessmentSection } from "@/lib/types"
import { backendApi } from "@/lib/api-client"
import { ApiError } from "@/lib/api-gateway"
import { formatShortDate, parseShortDate } from "@/lib/dates"
import { useAppStore } from "@/store/app-store"
import type { RosterSlice } from "./roster-slice"


interface ApiAssignmentRow {
  id: string; title: string; description: string; due_date: string | null
  points_possible: number; submission_type: string; created_at: string
  sections?: AssessmentSection[]
}
interface ApiGradeRow { student_id: string; points_earned: number | null; feedback: string }
interface ApiSubmissionRow { student_id: string; is_late: boolean; submitted_at: string | null }

// Best-effort write to the real grades table. Silently no-ops for a
// fake seed assignment/student (assignment_id/student_id aren't real
// backend UUIDs, so the request 404s) -- the local score above still
// shows either way, same graceful-fallback posture as publishAssignment.
function persistGrade(
  assignmentId: string,
  studentId: string,
  pointsEarned: number | null,
  feedback?: string
): void {
  if (!backendApi.token) return
  backendApi
    .put(`/api/assignments/${assignmentId}/grades/${studentId}`, {
      points_earned: pointsEarned,
      feedback: feedback ?? "",
    })
    .catch(() => {
      /* not a real assignment/student -- local score still shows */
    })
}

export interface AssignmentsSlice {
  assignments: Assignment[]

  // Assignments (app.js:submitNewAssignment / handleScoreChange).
  // publishAssignment writes a real row when assignment.classId is a known
  // real classroom (currently just Class 10); any other class keeps
  // today's in-memory-only behavior, with a graceful fallback either way.
  hydrateAssignments: () => Promise<void>
  // Re-pulls everything from the backend with MERGE semantics (backend rows
  // replace their local copies; local-only fake-class assignments stay
  // untouched). Used by the tracker's poll + Refresh button so new
  // submissions/grades appear without a page reload.
  refreshAssignments: () => Promise<void>
  // Returns the assignment's final id -- the real backend id when persisted,
  // otherwise the same id that was passed in (fake-class fallback).
  publishAssignment: (assignment: Assignment) => Promise<string>

  setSubmissionScore: (
    assignmentId: string,
    studentId: string,
    value: string
  ) => void
  setSubmissionEvaluation: (
    assignmentId: string,
    studentId: string,
    score: number,
    feedback: string
  ) => void
}

let assignmentsHydration: Promise<void> | null = null

// The hydration body, shared by mount-time hydrate (cached) and refresh
// (re-run). MERGE semantics: every backend row replaces its local copy —
// local scores/statuses are already persisted optimistically, so the
// backend is the truth; fake-class local-only assignments are never
// touched (they have no backend row).
function doHydrateAssignments(
  set: (fn: (s: { assignments: Assignment[] }) => { assignments?: Assignment[] }) => void,
  get: () => AssignmentsSlice & RosterSlice,
) {
  return (async () => {
    // Depends on realClassroomIdByFakeId + realStudentsList being
    // populated first (same real-classroom lookup, and each hydrated
    // assignment's submissions are built from the real roster).
    await get().hydrateRealStudents()
    const classroomIds = get().realClassroomIdByFakeId
    const roster = get().realStudentsList
    for (const [fakeClassId, realClassroomId] of Object.entries(classroomIds)) {
      const rows = await backendApi.get<ApiAssignmentRow[]>(
        `/api/classrooms/${realClassroomId}/assignments`
      )
      // Grades entered in an earlier session -- fetched per assignment
      // so a reload shows them instead of every score resetting to null.
      const gradesByAssignment = new Map<string, Map<string, { score: number | null; feedback: string }>>()
      // Real student submissions (Student Module) -- lets the roster show
      // "Submitted"/"Late" instead of always "not_started" once a student
      // has actually turned work in.
      const submissionsByAssignment = new Map<string, Map<string, { late: boolean; submittedOn: string }>>()
      await Promise.all(
        rows.map(async (r) => {
          const grades = await backendApi
            .get<ApiGradeRow[]>(`/api/assignments/${r.id}/grades`)
            .catch((err) => (err instanceof ApiError ? [] : Promise.reject(err)))
          gradesByAssignment.set(
            r.id,
            new Map(grades.map((g) => [g.student_id, { score: g.points_earned, feedback: g.feedback }]))
          )
          const subs = await backendApi
            .get<ApiSubmissionRow[]>(`/api/assignments/${r.id}/submissions`)
            .catch((err) => (err instanceof ApiError ? [] : Promise.reject(err)))
          submissionsByAssignment.set(
            r.id,
            new Map(
              subs
                .filter((s) => s.submitted_at)
                .map((s) => [s.student_id, { late: s.is_late, submittedOn: formatShortDate(new Date(s.submitted_at as string)) }])
            )
          )
        })
      )
      set((s) => {
        const cls = CLASSES.find((c) => c.id === fakeClassId)
        const hydrated: Assignment[] = rows.map((r) => {
          const grades = gradesByAssignment.get(r.id)
          const subs = submissionsByAssignment.get(r.id)
          const allGraded = roster.length > 0 && roster.every((st) => grades?.get(st.id)?.score != null)
          return {
            id: r.id,
            title: r.title,
            classId: fakeClassId,
            subject: cls?.subject ?? "",
            term: "Term 2",
            academicYear: useAppStore.getState().academicYear,
            due: r.due_date ? formatShortDate(new Date(r.due_date)) : "",
            totalPoints: r.points_possible,
            status: allGraded ? "graded" : "active",
            sourceAssessmentId: null,
            publishedToStudents: true,
            createdOn: formatShortDate(new Date(r.created_at)),
            submissions: roster.map((st) => {
              const sub = subs?.get(st.id)
              return {
                studentId: st.id,
                status: sub ? (sub.late ? "late" : "submitted") : "not_started",
                submittedOn: sub?.submittedOn ?? "",
                score: grades?.get(st.id)?.score ?? null,
                feedback: grades?.get(st.id)?.feedback ?? "",
              }
            }),
            type: r.submission_type as Assignment["type"],
            description: r.description,
            attachments: [],
            sections: r.sections ?? [],
          }
        })
        const hydratedIds = new Set(hydrated.map((a) => a.id))
        const localOnly = s.assignments.filter((a) => !hydratedIds.has(a.id))
        return { assignments: [...hydrated, ...localOnly] }
      })
    }
  })()
}

export const createAssignmentsSlice: StateCreator<
  AssignmentsSlice & RosterSlice,
  [],
  [],
  AssignmentsSlice
> = (set, get) => ({
  // No seed assignments — the tracker shows only real data (backend-
  // hydrated + published from Assessment Builder / Assignment Wizard).
  assignments: [],

  hydrateAssignments: () => {
    if (!assignmentsHydration) {
      assignmentsHydration = doHydrateAssignments(set, get).catch((err) => {
        assignmentsHydration = null // retry on next call
        console.warn("assignment hydration failed, falling back to seed data:", err)
      })
    }
    return assignmentsHydration
  },

  refreshAssignments: () => {
    assignmentsHydration = doHydrateAssignments(set, get).catch((err) => {
      assignmentsHydration = null
      console.warn("assignment refresh failed:", err)
    })
    return assignmentsHydration
  },

  publishAssignment: async (assignment) => {
    // Callers (e.g. AssignmentWizard) don't all hydrate the real-classroom
    // map themselves -- this action is self-sufficient regardless of which
    // page triggered it. Cheap: hydrateRealStudents is cached after its
    // first successful call.
    await get().hydrateRealStudents()
    const realClassroomId = get().realClassroomIdByFakeId[assignment.classId]
    if (realClassroomId && backendApi.token) {
      try {
        const row = await backendApi.post<{ id: string; created_at: string }>(
          `/api/classrooms/${realClassroomId}/assignments`,
          {
            title: assignment.title,
            description: assignment.description ?? "",
            due_date: assignment.due ? parseShortDate(assignment.due).toISOString() : null,
            points_possible: assignment.totalPoints,
            submission_type: assignment.type,
            attachments: [],
            // Saved-assessment questions ride along (settings JSONB) so the
            // student side can render them.
            sections: assignment.sections ?? [],
            topic_label: assignment.topicLabel ?? "",
          }
        )
        const persisted = { ...assignment, id: row.id, createdOn: formatShortDate(new Date(row.created_at)) }
        set((s) => ({ assignments: [persisted, ...s.assignments] }))
        return persisted.id
      } catch (err) {
        console.warn("assignment publish failed, keeping it local-only:", err)
      }
    }
    set((s) => ({ assignments: [assignment, ...s.assignments] }))
    return assignment.id
  },

  // A grade no longer requires "submitted"/"late" status first -- there is
  // no real student-submission flow yet (separate future roadmap item), so
  // gating scoring on a status nothing can ever set would make every real
  // assignment ungradeable forever. allGraded now looks at the whole
  // roster instead of just the submitted subset.
  setSubmissionScore: (assignmentId, studentId, value) => {
    set((s) => ({
      assignments: s.assignments.map((a) => {
        if (a.id !== assignmentId) return a
        const submissions = a.submissions.map((sub) =>
          sub.studentId === studentId
            ? { ...sub, score: value === "" ? null : Number(value) }
            : sub
        )
        const allGraded = submissions.length > 0 && submissions.every((sub) => sub.score != null)
        return {
          ...a,
          submissions,
          status: allGraded ? "graded" : a.status === "graded" ? "closed" : a.status,
        }
      }),
    }))
    persistGrade(assignmentId, studentId, value === "" ? null : Number(value))
  },

  setSubmissionEvaluation: (assignmentId, studentId, score, feedback) => {
    set((s) => ({
      assignments: s.assignments.map((a) => {
        if (a.id !== assignmentId) return a
        const submissions = a.submissions.map((sub) =>
          sub.studentId === studentId ? { ...sub, score, feedback } : sub
        )
        const allGraded = submissions.length > 0 && submissions.every((sub) => sub.score != null)
        return {
          ...a,
          submissions,
          status: allGraded ? "graded" : a.status === "graded" ? "closed" : a.status,
        }
      }),
    }))
    persistGrade(assignmentId, studentId, score, feedback)
  },
})
