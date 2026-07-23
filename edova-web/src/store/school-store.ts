import { create } from "zustand"
import {
  CURRICULUM,
  ASSIGNMENTS_SEED,
  ANNOUNCEMENTS,
  MASTER_TIMETABLE,
  ASSESSMENT_BANK_SEED,
  RESOURCE_CLASSES_SEED,
  RESOURCE_UNITS_SEED,
  RESOURCE_CHAPTERS_SEED,
  RESOURCE_SUBTOPICS_SEED,
  CLASSES,
} from "@/data/seed"
import type {
  CurriculumUnit,
  Assignment,
  Announcement,
  MasterTimetableRow,
  AssessmentBankItem,
  OkfResource,
  ResourceClass,
  ResourceUnit,
  ResourceChapter,
  ResourceSubtopic,
} from "@/lib/types"

// Learning Resources taxonomy starts empty — real classes/units/chapters/
// subtopics are created in Settings > Resource Library.

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8001"

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

  // Assignments (app.js:submitNewAssignment / handleScoreChange).
  publishAssignment: (assignment: Assignment) => void
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

  // Announcements (app.js:submitNotify + Announcements composer).
  postAnnouncement: (announcement: Announcement) => void

  // Timetable + assessment bank (mutators added as those views are wired).
  setMasterTimetable: (rows: MasterTimetableRow[]) => void
  addAssessmentBankItem: (item: AssessmentBankItem) => void

  // OKF Library assignment — Learning Resources page (Developer Handoff Notes).
  // Assignment is tracked per resourceClassId since the same OKF resource can
  // be Ready for one class and already Assigned for another.
  okfAssignedByClass: Record<string, string[]>
  assignOkfResources: (classId: string, resourceIds: string[]) => void
  undoOkfAssign: (classId: string, resourceIds: string[]) => void

  // Learning Resources taxonomy (Settings > Resource Library). Editing these
  // is the single source of truth for the Learning Resources filters/list.
  resourceClasses: ResourceClass[]
  resourceUnits: ResourceUnit[]
  resourceChapters: ResourceChapter[]
  resourceSubtopics: ResourceSubtopic[]
  setResourceClasses: (v: ResourceClass[]) => void
  setResourceUnits: (v: ResourceUnit[]) => void
  setResourceChapters: (v: ResourceChapter[]) => void
  setResourceSubtopics: (v: ResourceSubtopic[]) => void

  // A resource a teacher uploads directly into a subtopic (Flow 2). Pushed
  // onto that subtopic's resources with status:"processing", then flipped to
  // "ready" after the (simulated, or real S3 conversion) pipeline finishes.
  addOkfUpload: (subtopicId: string, resource: OkfResource) => void
  markOkfUploadReady: (subtopicId: string, resourceId: string, meta: string,
    extra?: Partial<OkfResource>) => void
  markOkfUploadFailed: (subtopicId: string, resourceId: string) => void
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

  publishAssignment: (assignment) =>
    set((s) => ({ assignments: [assignment, ...s.assignments] })),
  setSubmissionScore: (assignmentId, studentId, value) =>
    set((s) => ({
      assignments: s.assignments.map((a) => {
        if (a.id !== assignmentId) return a
        const submissions = a.submissions.map((sub) =>
          sub.studentId === studentId
            ? { ...sub, score: value === "" ? null : Number(value) }
            : sub
        )
        const scored = submissions.filter(
          (sub) => sub.status === "submitted" || sub.status === "late"
        )
        const allGraded = scored.length > 0 && scored.every((sub) => sub.score != null)
        return {
          ...a,
          submissions,
          status: allGraded ? "graded" : a.status === "graded" ? "closed" : a.status,
        }
      }),
    })),

  setSubmissionEvaluation: (assignmentId, studentId, score, feedback) =>
    set((s) => ({
      assignments: s.assignments.map((a) => {
        if (a.id !== assignmentId) return a
        const submissions = a.submissions.map((sub) =>
          sub.studentId === studentId ? { ...sub, score, feedback } : sub
        )
        const scored = submissions.filter(
          (sub) => sub.status === "submitted" || sub.status === "late"
        )
        const allGraded = scored.length > 0 && scored.every((sub) => sub.score != null)
        return {
          ...a,
          submissions,
          status: allGraded ? "graded" : a.status === "graded" ? "closed" : a.status,
        }
      }),
    })),

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

  // Seeded from the OKF libraries (seed.ts) so filters/list work out of the
  // box; Settings > Resource Library edits this same slice.
  resourceClasses: RESOURCE_CLASSES_SEED,
  resourceUnits: RESOURCE_UNITS_SEED,
  resourceChapters: RESOURCE_CHAPTERS_SEED,
  resourceSubtopics: RESOURCE_SUBTOPICS_SEED,
  setResourceClasses: (v) => set({ resourceClasses: v }),
  setResourceUnits: (v) => set({ resourceUnits: v }),
  setResourceChapters: (v) => set({ resourceChapters: v }),
  setResourceSubtopics: (v) => set({ resourceSubtopics: v }),

  addOkfUpload: (subtopicId, resource) =>
    set((s) => ({
      resourceSubtopics: s.resourceSubtopics.map((st) =>
        st.id === subtopicId
          ? { ...st, resources: [...st.resources, resource] }
          : st
      ),
    })),
  markOkfUploadReady: (subtopicId, resourceId, meta, extra) =>
    set((s) => ({
      resourceSubtopics: s.resourceSubtopics.map((st) =>
        st.id !== subtopicId
          ? st
          : {
              ...st,
              resources: st.resources.map((r) =>
                r.id === resourceId ? { ...r, status: "ready", meta, ...extra } : r
              ),
            }
      ),
    })),
  markOkfUploadFailed: (subtopicId, resourceId) =>
    set((s) => ({
      resourceSubtopics: s.resourceSubtopics.map((st) =>
        st.id !== subtopicId
          ? st
          : {
              ...st,
              resources: st.resources.map((r) =>
                r.id === resourceId ? { ...r, status: "failed" } : r
              ),
            }
      ),
    })),
}))
