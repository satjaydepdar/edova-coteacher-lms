// Curriculum slice — the shared mutable syllabus view (mockup
// schoolConfig.curriculum) plus the server-backed hydration for the current
// teaching focus. Mutations propagate cross-view (a topic ticked in Lesson
// Planner updates Syllabus Map + Course Progress). Course-CRUD traffic goes
// to ragApi (:8000, Postgres RAG app serving the clerk-compatible course
// contract) — clerk no longer owns these endpoints.
import type { StateCreator } from "zustand"
import { CURRICULUM } from "@/data/seed"
import type { CurriculumUnit } from "@/lib/types"
import { ragApi } from "@/lib/api-client"
import {
  treeToUnits,
  focusKey,
  type ApiTreeUnit,
  type Focus,
} from "@/lib/curriculum-mappers"

const DEFAULT_FOCUS: Focus = {
  year: "2026–27",
  board: "CBSE",
  classLabel: "Class 10",
  subject: "Mathematics",
  section: "Section A",
}

// One in-flight hydration shared by every page that mounts; reset on failure
// so a later mount retries (e.g. the API came up after the app loaded).
// hydratedKey tracks which focus it's for, so setFocus can tell a stale
// in-flight/completed hydration from one that already matches.
let hydration: Promise<void> | null = null
let hydratedKey: string | null = null

export interface CurriculumSlice {
  curriculum: CurriculumUnit[]

  // Curriculum (app.js:toggleTopicDone) — recomputes actual% from topic completion.
  toggleTopic: (unitId: string, topicId: string) => void
  setCurriculum: (curriculum: CurriculumUnit[]) => void

  // Server-backed syllabus progress for the current focus (class/section/
  // subject). hydrateCurriculum loads units + ticks from the course-CRUD API
  // (ragApi :8000) for whatever `focus` currently is; toggleTopic then persists each tick so
  // Actual % survives reloads. setFocus switches the focus and re-hydrates —
  // this is the one app-wide "which class am I looking at" (Settings >
  // Syllabus's filters drive it; Syllabus Map just reads it).
  focus: Focus
  setFocus: (next: Partial<Focus>) => void
  focusSectionId: string | null
  hydrateCurriculum: () => Promise<void>
}

export const createCurriculumSlice: StateCreator<CurriculumSlice, [], [], CurriculumSlice> = (set, get) => ({
  curriculum: CURRICULUM,

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
      ragApi
        .put(`/api/class-sections/${sectionId}/topics/${topicId}`, { done: nextDone })
        .catch(() => {
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
        const sec = await ragApi.get<{ id: string; subject_id: string }>(
          `/api/class-sections?year=${encodeURIComponent(focus.year)}` +
            `&board=${encodeURIComponent(focus.board)}&class=${encodeURIComponent(focus.classLabel)}` +
            `&subject=${encodeURIComponent(focus.subject)}&section=${encodeURIComponent(focus.section)}`
        )
        const [tree, progress] = await Promise.all([
          ragApi.get<{ units: ApiTreeUnit[] }>(`/api/curriculum-subjects/${sec.subject_id}/syllabus`),
          ragApi.get<{ done_topics: { topic_id: string }[] }>(`/api/class-sections/${sec.id}/progress`),
        ])
        const doneIds = new Set<string>(progress.done_topics.map((d) => d.topic_id))
        // Bail if focus moved on again while this fetch was in flight.
        if (focusKey(get().focus) !== key) return
        set({
          focusSectionId: sec.id,
          curriculum: treeToUnits(tree.units, doneIds, focus),
        })
      })().catch((err) => {
        hydration = null // retry on next call
        hydratedKey = null
        console.warn("curriculum hydration failed:", err)
      })
    }
    return hydration
  },
})
