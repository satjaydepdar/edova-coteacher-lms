import { create } from "zustand"
import {
  CURRICULUM,
  ASSIGNMENTS_SEED,
  ANNOUNCEMENTS,
  MASTER_TIMETABLE,
  ASSESSMENT_BANK_SEED,
  CLASSES,
  STUDENTS,
} from "@/data/seed"
import type {
  CurriculumUnit,
  Assignment,
  Announcement,
  MasterTimetableRow,
  AssessmentBankItem,
  SubmissionStatus,
} from "@/lib/types"
import { useAppStore } from "@/store/app-store"
import { parseShortDate } from "@/lib/dates"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8001"
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL ?? "http://localhost:8003"

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
const formatShortDate = (d: Date) => `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`

// Builds a map of question IDs ("1.1", "1.2", ...) to their correct answer text
// from the sections data stored when teacher creates MCQ in AssessmentBuilder
function buildAnswerKeyFromSections(sections?: unknown): Record<string, string> {
  if (!sections || !Array.isArray(sections)) return {}
  const key: Record<string, string> = {}
  ;(sections as any[]).forEach((sec: any, sIdx: number) => {
    if (!Array.isArray(sec.questions)) return
    ;(sec.questions as any[]).forEach((q: any, qIdx: number) => {
      const qId = `${sIdx + 1}.${qIdx + 1}`
      if (Array.isArray(q.options)) {
        const correctOpt = q.options.find((opt: any) => opt?.correct === true)
        if (correctOpt) {
          key[qId] = typeof correctOpt === "string" ? correctOpt : (correctOpt?.text || "")
        }
      } else if (q.correctAnswer) {
        key[qId] = String(q.correctAnswer)
      }
    })
  })
  return key
}


export interface RealCalendarEvent {
  id: string
  title: string
  eventType: string
  startAt: string
  isAllDay: boolean
}

// A real classroom's roster (edova-backend), keyed by student id, so any
// page can resolve a submission's studentId to a display name/rollNo
// regardless of whether it's one of the fake seed.ts STUDENTS or a real
// student from a migrated classroom (currently just Class 10 -- Section A).
export interface StudentDisplay { name: string; rollNo: string }
export function resolveStudentDisplay(
  studentId: string,
  realStudents: Record<string, StudentDisplay>,
): StudentDisplay | undefined {
  return STUDENTS.find((st) => st.id === studentId) ?? realStudents[studentId]
}

// Current teaching focus — the one class/section/subject whose real syllabus
// tree (clerk DB) is hydrated into the shared curriculum, so This Week /
// Syllabus Map / Course Progress / Settings > Syllabus all read and write the
// same server-backed data. Settings > Syllabus's Class/Section/Subject
// filters call setFocus to switch it; everything else just reads whatever is
// currently focused. Defaults to the original Class 10 Math Section A focus.
export interface Focus { year: string; board: string; classLabel: string; subject: string; section: string }
const DEFAULT_FOCUS: Focus = {
  year: "2026–27",
  board: "CBSE",
  classLabel: "Class 10",
  subject: "Mathematics",
  section: "Section A",
}

// classId is a mock-CLASSES lookup key used only for display/cross-links
// (classNameById, timetable auto-planned-end, period-allocation checks) —
// reuse the matching CLASSES entry's id when one exists (preserves those
// features for the original focus) and fall back to a synthetic, readable id
// otherwise (any other real class won't have a matching mock timetable row).
function classIdForFocus(f: Focus): string {
  return CLASSES.find((c) => c.name === `${f.classLabel} — ${f.section}` && c.subject === f.subject)?.id
    ?? `${f.classLabel} — ${f.section}`
}

// Wire shapes from the clerk API.
interface ApiTreeTopic { id: string; title: string }
interface ApiTreeChapter { id: string; number: number | null; name: string; topics: ApiTreeTopic[] }
interface ApiTreeUnit { id: string; name: string; marks: number | null; chapters: ApiTreeChapter[] }

function weightageFromMarks(marks: number | null): string {
  if (marks == null) return "Medium"
  if (marks >= 15) return "High"
  if (marks >= 8) return "Medium"
  return "Low"
}

// API syllabus tree + taught-topic ids -> the CurriculumUnit rows the views
// render. Chapters flatten into the unit's topic list (mockup shape).
function treeToUnits(units: ApiTreeUnit[], doneIds: Set<string>, focus: Focus): CurriculumUnit[] {
  const classId = classIdForFocus(focus)
  return units.map((u) => {
    const topics = u.chapters.flatMap((c) =>
      c.topics.map((t) => ({ id: t.id, name: t.title, done: doneIds.has(t.id) }))
    )
    const actual = topics.length
      ? Math.round((topics.filter((t) => t.done).length / topics.length) * 100)
      : 0
    return {
      id: u.id,
      subject: focus.subject,
      classId,
      academicYear: focus.year,
      term: "Term 1",
      unit: u.name,
      plannedStart: "",
      plannedEnd: "",
      periods: 0,
      textbookRef: u.chapters.map((c) => c.name).join(", "),
      weightage: weightageFromMarks(u.marks),
      planned: 0,
      actual,
      topics,
    }
  })
}

// One in-flight hydration shared by every page that mounts; reset on failure
// so a later mount retries (e.g. the API came up after the app loaded).
// hydratedKey tracks which focus it's for, so setFocus can tell a stale
// in-flight/completed hydration from one that already matches.
let hydration: Promise<void> | null = null
let hydratedKey: string | null = null
const focusKey = (f: Focus) => `${f.year}|${f.board}|${f.classLabel}|${f.subject}|${f.section}`

// realStudents needs no focus-keying (unlike hydrateCurriculum) -- it's one
// flat, app-wide roster lookup, fetched once and shared by every page.
let realStudentsHydration: Promise<void> | null = null
let assignmentsHydration: Promise<void> | null = null
let calendarEventsHydration: Promise<void> | null = null

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
  const token = useAppStore.getState().session?.token
  if (!token) return
  fetch(`${BACKEND_API_URL}/api/assignments/${assignmentId}/grades/${studentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ points_earned: pointsEarned, feedback: feedback ?? "" }),
  }).catch(() => {
    /* not a real assignment/student -- local score still shows */
  })
}

// Shared mutable "schoolConfig" — mirrors the mockup Component's schoolConfig
// state so mutations persist across navigation and propagate cross-view
// (e.g. a topic ticked in Lesson Planner updates Syllabus Map + Course Progress).
// Intentionally NOT persisted: like the mockup, it resets from seed on reload.

export type FlashKey =
  | "lesson"
  | "curriculum"
  | "masterdata"
  | "homework"
  | "timetable"
  | "resource"
  | "assessment"
  | "exam"
  | "calendar"

// Per-key token so a newer flash isn't cleared by an older timer.
const flashTokens: Record<string, number> = {}

interface SchoolState {
  curriculum: CurriculumUnit[]
  assignments: Assignment[]
  announcements: Announcement[]
  masterTimetable: MasterTimetableRow[]
  assessmentBank: AssessmentBankItem[]

  flash: Record<string, string | null>
  showFlash: (key: FlashKey, msg: string, ms?: number) => void

  // Curriculum (app.js:toggleTopicDone) — recomputes actual% from topic completion.
  toggleTopic: (unitId: string, topicId: string) => void
  setCurriculum: (curriculum: CurriculumUnit[]) => void

  // Server-backed syllabus progress for the current focus (class/section/
  // subject). hydrateCurriculum loads units + ticks from the clerk API for
  // whatever `focus` currently is; toggleTopic then persists each tick so
  // Actual % survives reloads. setFocus switches the focus and re-hydrates —
  // this is the one app-wide "which class am I looking at" (Settings >
  // Syllabus's filters drive it; Syllabus Map / This Week just read it).
  focus: Focus
  setFocus: (next: Partial<Focus>) => void
  focusSectionId: string | null
  hydrateCurriculum: () => Promise<void>

  // Real classroom rosters (edova-backend). realStudents is keyed by student
  // id for resolveStudentDisplay(); realStudentsList is the same data as a
  // flat array for pages that render a whole roster (e.g. Attendance).
  // Currently just Class 10 -- Section A; grows as more classrooms migrate
  // off seed.ts's STUDENTS.
  realStudents: Record<string, StudentDisplay>
  realStudentsList: (StudentDisplay & { id: string })[]
  // Real classroom backend id, keyed by the matching fake CLASSES id (e.g.
  // { c10: "<real classroom uuid>" }) -- built by the same
  // subject/class_level/section match AssignmentWizard.tsx already uses for
  // its own roster fetch. Lets publishAssignment/hydrateAssignments below
  // know which classrooms have a real backend to write to.
  realClassroomIdByFakeId: Record<string, string>
  hydrateRealStudents: () => Promise<void>

  // Assignments (app.js:submitNewAssignment / handleScoreChange).
  // publishAssignment writes a real row when assignment.classId is a known
  // real classroom (currently just Class 10); any other class keeps
  // today's in-memory-only behavior, with a graceful fallback either way.
  hydrateAssignments: () => Promise<void>
  // Returns the assignment's final id -- the real backend id when persisted,
  // otherwise the same id that was passed in (fake-class fallback).
  publishAssignment: (assignment: Assignment) => Promise<string>
  deleteAssignment: (id: string) => Promise<void>

  // Real calendar events (meetings/holidays/exams/general) -- additive on
  // top of Calendar.tsx's existing fake CALENDAR_EVENTS/EXAMS, never
  // replacing them. Requires a real session (Guest mode never fetches).
  realCalendarEvents: RealCalendarEvent[]
  hydrateCalendarEvents: () => Promise<void>
  createCalendarEvent: (input: {
    title: string
    eventType: string
    startAt: string
    isAllDay: boolean
  }) => Promise<void>
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
  recordStudentSubmission: (
    assignmentId: string,
    studentId: string,
    textResponse: string,
    score: number | null
  ) => void

  // Announcements (app.js:submitNotify + Announcements composer).
  postAnnouncement: (announcement: Announcement) => void

  // Timetable + assessment bank (mutators added as those views are wired).
  setMasterTimetable: (rows: MasterTimetableRow[]) => void
  addAssessmentBankItem: (item: AssessmentBankItem) => void

  // OKF Library assignment — Learning Resources page (Developer Handoff Notes).
  // Assignment is tracked per class label (e.g. "Class 10") since the same
  // resource can be Ready for one class and already Assigned for another.
  okfAssignedByClass: Record<string, string[]>
  assignOkfResources: (classId: string, resourceIds: string[]) => void
  undoOkfAssign: (classId: string, resourceIds: string[]) => void
}

export const useSchoolStore = create<SchoolState>()((set, get) => ({
  curriculum: CURRICULUM,
  assignments: ASSIGNMENTS_SEED,
  announcements: ANNOUNCEMENTS,
  masterTimetable: MASTER_TIMETABLE,
  assessmentBank: ASSESSMENT_BANK_SEED,

  flash: {},
  showFlash: (key, msg, ms = 3500) => {
    const token = (flashTokens[key] = (flashTokens[key] || 0) + 1)
    set((s) => ({ flash: { ...s.flash, [key]: msg } }))
    setTimeout(() => {
      if (flashTokens[key] === token) {
        set((s) => ({ flash: { ...s.flash, [key]: null } }))
      }
    }, ms)
  },

  toggleTopic: (unitId, topicId) => {
    // Optimistic local flip (mockup behaviour) …
    const before = get().curriculum.find((r) => r.id === unitId)
    const nextDone = !before?.topics.find((t) => t.id === topicId)?.done
    set((s) => ({
      curriculum: s.curriculum.map((r) => {
        if (r.id !== unitId) return r
        const topics = r.topics.map((t) =>
          t.id === topicId ? { ...t, done: !t.done } : t
        )
        const actual = topics.length
          ? Math.round((topics.filter((t) => t.done).length / topics.length) * 100)
          : r.actual
        return { ...r, topics, actual }
      }),
    }))
    // … then persist to the section's progress so it survives reloads.
    const sectionId = get().focusSectionId
    if (sectionId) {
      fetch(`${API_BASE}/api/class-sections/${sectionId}/topics/${topicId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: nextDone }),
      }).catch(() => {
        /* offline tick still shows locally; next hydration re-syncs */
      })
    }
  },
  setCurriculum: (curriculum) => set({ curriculum }),

  focus: DEFAULT_FOCUS,
  setFocus: (next) => {
    set((s) => ({ focus: { ...s.focus, ...next } }))
    hydration = null // force a fresh hydration for the new focus
    hydratedKey = null
    get().hydrateCurriculum()
  },
  focusSectionId: null,
  hydrateCurriculum: () => {
    const focus = get().focus
    const key = focusKey(focus)
    if (!hydration || hydratedKey !== key) {
      hydratedKey = key
      hydration = (async () => {
        const sec = await fetch(
          `${API_BASE}/api/class-sections?year=${encodeURIComponent(focus.year)}` +
            `&board=${encodeURIComponent(focus.board)}&class=${encodeURIComponent(focus.classLabel)}` +
            `&subject=${encodeURIComponent(focus.subject)}&section=${encodeURIComponent(focus.section)}`
        ).then((r) => {
          if (!r.ok) throw new Error(`API ${r.status}`)
          return r.json()
        })
        const [tree, progress] = await Promise.all([
          fetch(`${API_BASE}/api/curriculum-subjects/${sec.subject_id}/syllabus`).then((r) => {
            if (!r.ok) throw new Error(`API ${r.status}`)
            return r.json()
          }),
          fetch(`${API_BASE}/api/class-sections/${sec.id}/progress`).then((r) => {
            if (!r.ok) throw new Error(`API ${r.status}`)
            return r.json()
          }),
        ])
        const doneIds = new Set<string>(
          (progress.done_topics as { topic_id: string }[]).map((d) => d.topic_id)
        )
        // Bail if focus moved on again while this fetch was in flight.
        if (focusKey(get().focus) !== key) return
        set({
          focusSectionId: sec.id,
          curriculum: treeToUnits(tree.units as ApiTreeUnit[], doneIds, focus),
        })
      })().catch((err) => {
        hydration = null // retry on next call
        hydratedKey = null
        console.warn("curriculum hydration failed:", err)
      })
    }
    return hydration
  },

  realStudents: {},
  realStudentsList: [],
  realClassroomIdByFakeId: {},
  hydrateRealStudents: () => {
    if (!realStudentsHydration) {
      realStudentsHydration = (async () => {
        const classrooms: { id: string; class_level: number; section: string | null; subject: string }[] =
          await fetch(`${BACKEND_API_URL}/api/classrooms`).then((r) => {
            if (!r.ok) throw new Error(`API ${r.status}`)
            return r.json()
          })
        const rosters = await Promise.all(
          classrooms.map((c) =>
            fetch(`${BACKEND_API_URL}/api/classrooms/${c.id}/students`).then((r) => (r.ok ? r.json() : []))
          )
        )
        const map: Record<string, StudentDisplay> = {}
        const list: (StudentDisplay & { id: string })[] = []
        for (const roster of rosters as { id: string; student_number: string; first_name: string; last_name: string }[][]) {
          for (const s of roster) {
            const entry = { name: `${s.first_name} ${s.last_name}`, rollNo: s.student_number }
            map[s.id] = entry
            list.push({ id: s.id, ...entry })
          }
        }
        // Same subject/class_level/section match AssignmentWizard.tsx's own
        // roster fetch uses -- backend and seed.ts don't share a punctuation
        // convention for names, so match on meaning, not exact string.
        const classroomIds: Record<string, string> = {}
        for (const rc of classrooms) {
          const cls = CLASSES.find(
            (c) =>
              c.subject === rc.subject &&
              c.name.includes(`Class ${rc.class_level}`) &&
              (!rc.section || c.name.includes(rc.section)),
          )
          if (cls) classroomIds[cls.id] = rc.id
        }
        set({ realStudents: map, realStudentsList: list, realClassroomIdByFakeId: classroomIds })
      })().catch((err) => {
        realStudentsHydration = null // retry on next call
        console.warn("real students hydration failed, falling back to seed data:", err)
      })
    }
    return realStudentsHydration
  },

  hydrateAssignments: () => {
    if (!assignmentsHydration) {
      assignmentsHydration = (async () => {
        // Depends on realClassroomIdByFakeId + realStudentsList being
        // populated first (same real-classroom lookup, and each hydrated
        // assignment's submissions are built from the real roster).
        await get().hydrateRealStudents()
        const classroomIds = get().realClassroomIdByFakeId
        const roster = get().realStudentsList
        for (const [fakeClassId, realClassroomId] of Object.entries(classroomIds)) {
          const rows: {
            id: string; title: string; description: string; due_date: string | null
            points_possible: number; submission_type: string; created_at: string
          }[] = await fetch(`${BACKEND_API_URL}/api/classrooms/${realClassroomId}/assignments`).then((r) => {
            if (!r.ok) throw new Error(`API ${r.status}`)
            return r.json()
          })
          // Grades entered in an earlier session -- fetched per assignment
          // so a reload shows them instead of every score resetting to null.
          const gradesByAssignment = new Map<string, Map<string, { score: number | null; feedback: string }>>()
          // Real student submissions (Student Module) -- lets the roster show
          // "Submitted"/"Late" instead of always "not_started" once a student
          // has actually turned work in.
          const submissionsByAssignment = new Map<string, Map<string, { late: boolean; submittedOn: string; textResponse?: string }>>()
          await Promise.all(
            rows.map(async (r) => {
              const grades: { student_id: string; points_earned: number | null; feedback: string }[] =
                await fetch(`${BACKEND_API_URL}/api/assignments/${r.id}/grades`).then((res) => (res.ok ? res.json() : []))
              gradesByAssignment.set(
                r.id,
                new Map(grades.map((g) => [g.student_id, { score: g.points_earned, feedback: g.feedback }]))
              )
              const subs: { student_id: string; is_late: boolean; submitted_at: string | null; text_response?: string }[] =
                await fetch(`${BACKEND_API_URL}/api/assignments/${r.id}/submissions`).then((res) => (res.ok ? res.json() : []))
              submissionsByAssignment.set(
                r.id,
                new Map(
                  subs
                    .filter((s) => s.submitted_at)
                    .map((s) => [s.student_id, { late: s.is_late, submittedOn: formatShortDate(new Date(s.submitted_at as string)), textResponse: s.text_response }])
                )
              )
            })
          )
          set((s) => {
            const cls = CLASSES.find((c) => c.id === fakeClassId)
            const fetchedMap = new Map(rows.map((r) => [r.id, r]))

            // Update existing assignments in state with latest grades & submissions from DB
            const updatedAssignments = s.assignments.map((a) => {
              const r = fetchedMap.get(a.id)
              if (!r) return a
              const grades = gradesByAssignment.get(r.id)
              const subs = submissionsByAssignment.get(r.id)
              const allGraded = roster.length > 0 && roster.every((st) => grades?.get(st.id)?.score != null)
              const detectedType = r.submission_type === "mcq" || (r.title && (r.title.toLowerCase().includes("mcq") || r.title.toLowerCase().includes("quiz") || r.title.toLowerCase().includes("assessment"))) ? "mcq" : (r.submission_type as Assignment["type"]) || a.type || "written"
              return {
                ...a,
                type: detectedType,
                status: allGraded ? ("graded" as const) : a.status,
                submissions: roster.map((st) => {
                  const sub = subs?.get(st.id)
                  const g = grades?.get(st.id)
                  const existingSub = a.submissions.find((s) => s.studentId === st.id)
                  const savedScore = localStorage.getItem(`edova_score_${st.id}_${a.id}`) || localStorage.getItem(`edova_score_${a.id}`)
                  const parsedSavedScore = savedScore !== null ? parseFloat(savedScore) : null

                  const finalScore = g?.score ?? existingSub?.score ?? parsedSavedScore
                  const finalResponse = sub?.textResponse || existingSub?.textResponse || ""
                  const subStatus: SubmissionStatus = finalScore != null ? "graded" : (sub || existingSub?.status === "submitted" || existingSub?.status === "graded") ? (sub?.late ? "late" : "submitted") : "not_started"

                  return {
                    studentId: st.id,
                    status: subStatus,
                    submittedOn: sub?.submittedOn || existingSub?.submittedOn || "",
                    score: finalScore,
                    feedback: g?.feedback || existingSub?.feedback || "",
                    textResponse: finalResponse,
                  }
                }),
              }
            })

            const existingIds = new Set(s.assignments.map((a) => a.id))
            const fresh: Assignment[] = rows
              .filter((r) => !existingIds.has(r.id))
              .map((r) => {
                const grades = gradesByAssignment.get(r.id)
                const subs = submissionsByAssignment.get(r.id)
                const allGraded = roster.length > 0 && roster.every((st) => grades?.get(st.id)?.score != null)
                const detectedType = r.submission_type === "mcq" || (r.title && (r.title.toLowerCase().includes("mcq") || r.title.toLowerCase().includes("quiz") || r.title.toLowerCase().includes("assessment"))) ? "mcq" : (r.submission_type as Assignment["type"]) || "written"
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
                    const g = grades?.get(st.id)
                    const savedScore = localStorage.getItem(`edova_score_${st.id}_${r.id}`) || localStorage.getItem(`edova_score_${r.id}`)
                    const parsedSavedScore = savedScore !== null ? parseFloat(savedScore) : null

                    const finalScore = g?.score ?? parsedSavedScore
                    const subStatus: SubmissionStatus = finalScore != null ? "graded" : sub ? (sub.late ? "late" : "submitted") : "not_started"
                    return {
                      studentId: st.id,
                      status: subStatus,
                      submittedOn: sub?.submittedOn ?? "",
                      score: finalScore,
                      feedback: g?.feedback ?? "",
                      textResponse: sub?.textResponse ?? "",
                    }
                  }),
                  type: detectedType,
                  description: r.description,
                  attachments: [],
                }
              })
            // Only add, never overwrite -- don't clobber session-local edits
            // to an assignment already present.
            return { assignments: [...fresh, ...updatedAssignments] }
          })
        }
      })().finally(() => {
        assignmentsHydration = null
      })
    }
    return assignmentsHydration
  },

  publishAssignment: async (assignment) => {
    // Callers (e.g. AssignmentWizard) don't all hydrate the real-classroom
    // map themselves -- this action is self-sufficient regardless of which
    // page triggered it. Cheap: hydrateRealStudents is cached after its
    // first successful call.
    await get().hydrateRealStudents()
    const realClassroomId = get().realClassroomIdByFakeId[assignment.classId]
    const token = useAppStore.getState().session?.token
    const subType = assignment.type ?? "mcq"
    if (realClassroomId && token) {
      try {
        const res = await fetch(`${BACKEND_API_URL}/api/classrooms/${realClassroomId}/assignments`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: assignment.title,
            description: assignment.description ?? "",
            due_date: assignment.dueIso ?? (assignment.due ? parseShortDate(assignment.due).toISOString() : null),
            points_possible: assignment.totalPoints,
            submission_type: subType,
            attachments: [],
            settings: {
              submission_type: subType,
              answer_key: buildAnswerKeyFromSections(assignment.sections),
            },
          }),
        })
        if (!res.ok) throw new Error(`API ${res.status}`)
        const row: { id: string; created_at: string } = await res.json()
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

  deleteAssignment: async (id) => {
    // Remove from local state immediately for instant feedback
    set((s) => ({ assignments: s.assignments.filter((a) => a.id !== id) }))
    // Try to remove from backend for real classroom assignments
    const token = useAppStore.getState().session?.token
    if (!token) return
    const realClassroomIdByFakeId = get().realClassroomIdByFakeId
    // Find any real classroom id (the assignment id itself is a real uuid for persisted ones)
    // Try DELETE on each known real classroom until one matches (backend ignores unknown ids)
    const realIds = Object.values(realClassroomIdByFakeId)
    for (const classroomId of realIds) {
      try {
        await fetch(`${BACKEND_API_URL}/api/classrooms/${classroomId}/assignments/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch {
        // best-effort — local state already updated
      }
    }
  },

  realCalendarEvents: [],
  hydrateCalendarEvents: () => {
    const token = useAppStore.getState().session?.token
    // No session yet (Guest mode, or not-logged-in-yet on a page that
    // mounts before session hydration) -- nothing to fetch, and don't
    // cache a permanent no-op so a later call (after login) can retry.
    if (!token) return Promise.resolve()
    if (!calendarEventsHydration) {
      calendarEventsHydration = (async () => {
        const rows: {
          id: string; title: string; event_type: string; start_at: string; is_all_day: boolean
        }[] = await fetch(`${BACKEND_API_URL}/api/calendar-events`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => {
          if (!r.ok) throw new Error(`API ${r.status}`)
          return r.json()
        })
        set({
          realCalendarEvents: rows.map((r) => ({
            id: r.id, title: r.title, eventType: r.event_type, startAt: r.start_at, isAllDay: r.is_all_day,
          })),
        })
      })().catch((err) => {
        calendarEventsHydration = null // retry on next call
        console.warn("calendar events hydration failed:", err)
      })
    }
    return calendarEventsHydration
  },
  createCalendarEvent: async (input) => {
    const token = useAppStore.getState().session?.token
    if (!token) throw new Error("not signed in")
    const res = await fetch(`${BACKEND_API_URL}/api/calendar-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        title: input.title,
        event_type: input.eventType,
        start_at: input.startAt,
        is_all_day: input.isAllDay,
        visibility: "school",
      }),
    })
    if (!res.ok) throw new Error(`API ${res.status}`)
    const row: { id: string; title: string; event_type: string; start_at: string; is_all_day: boolean } = await res.json()
    set((s) => ({
      realCalendarEvents: [
        ...s.realCalendarEvents,
        { id: row.id, title: row.title, eventType: row.event_type, startAt: row.start_at, isAllDay: row.is_all_day },
      ],
    }))
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

  recordStudentSubmission: (assignmentId, studentId, textResponse, score) => {
    const todayStr = formatShortDate(new Date())
    set((s) => ({
      assignments: s.assignments.map((a) => {
        if (a.id !== assignmentId) return a
        const exists = a.submissions.some((sub) => sub.studentId === studentId)
        const subStatus: SubmissionStatus = score !== null ? "graded" : "submitted"
        const updatedSubs = exists
          ? a.submissions.map((sub) =>
              sub.studentId === studentId
                ? {
                    ...sub,
                    status: subStatus,
                    submittedOn: todayStr,
                    score: score,
                    textResponse: textResponse,
                    feedback: score !== null ? "Auto-graded MCQ" : sub.feedback,
                  }
                : sub
            )
          : [
              ...a.submissions,
              {
                studentId,
                status: subStatus,
                submittedOn: todayStr,
                score: score,
                textResponse: textResponse,
                feedback: score !== null ? "Auto-graded MCQ" : "",
              },
            ]
        const allGraded = updatedSubs.length > 0 && updatedSubs.every((sub) => sub.score != null)
        return {
          ...a,
          submissions: updatedSubs,
          status: allGraded ? "graded" : a.status,
        }
      }),
    }))
    if (score !== null) {
      persistGrade(assignmentId, studentId, score, "Auto-graded MCQ")
    }
  },

  postAnnouncement: (announcement) =>
    set((s) => ({ announcements: [announcement, ...s.announcements] })),

  setMasterTimetable: (rows) => set({ masterTimetable: rows }),
  addAssessmentBankItem: (item) =>
    set((s) => ({ assessmentBank: [item, ...s.assessmentBank] })),

  okfAssignedByClass: {},
  assignOkfResources: (classId, resourceIds) =>
    set((s) => {
      const existing = s.okfAssignedByClass[classId] ?? []
      const merged = Array.from(new Set([...existing, ...resourceIds]))
      return { okfAssignedByClass: { ...s.okfAssignedByClass, [classId]: merged } }
    }),
  undoOkfAssign: (classId, resourceIds) =>
    set((s) => {
      const existing = s.okfAssignedByClass[classId] ?? []
      const remaining = existing.filter((id) => !resourceIds.includes(id))
      return { okfAssignedByClass: { ...s.okfAssignedByClass, [classId]: remaining } }
    }),
}))
