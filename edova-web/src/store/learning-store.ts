import { create } from "zustand"
import type { Mistake, NewMistake } from "@/lib/types"
import { currentStudentId, getGamification, postFlag, postMistake, postXP } from "@/lib/learning-api"

// Student Learning Hub gamification state, backed by the clerk API (:8001).
// hydrate() pulls the server's xp/streak/mistakes once; every mutation is
// optimistic and reconciles with the server response. All calls are
// fire-and-forget — when the API is down the UI keeps its last-known state.
// The initial values mirror the server's demo seed so a pre-hydration render
// matches the hydrated one.
interface LearningState {
  xp: number
  streak: number
  mistakes: Mistake[]
  hydrate: () => void
  addXP: (v: number) => void
  addMistake: (m: NewMistake) => void
  flag: (context: string) => void
}

const today = () => new Date().toISOString().slice(0, 10)

// Which student id the store currently holds data for. A boolean "hydrated
// once" guard (the original approach) is wrong once STUDENT_ID can vary --
// switching from one real student login to another within the same SPA
// session (no full page reload) must re-hydrate, not keep showing the
// previous student's XP/streak/mistakes.
let hydratedFor: string | null = null

export const useLearningStore = create<LearningState>()((set) => ({
  xp: 1240,
  streak: 7,
  mistakes: [
    {
      id: "mis_seed",
      q: "Angle of incidence = ?",
      yourAns: "30°",
      correct: "45°",
      chapter: "Light — Reflection and Refraction",
      date: "2026-07-24",
      solution: "Use law: i = r. Mirror angle was 45°",
    },
  ],
  hydrate: () => {
    const id = currentStudentId()
    if (hydratedFor === id) return
    // Clear the previous student's numbers immediately on a real switch —
    // only skip this on the very first hydrate of the session, so the seed
    // above (matching the server's demo seed) still avoids a flash there.
    if (hydratedFor !== null) set({ xp: 0, streak: 0, mistakes: [] })
    hydratedFor = id
    getGamification()
      .then((g) => set({ xp: g.xp, streak: g.streak, mistakes: g.mistakes }))
      .catch(() => { hydratedFor = null /* API down — retry next hydrate() call */ })
  },
  addXP: (v) => {
    set((s) => ({ xp: s.xp + v }))
    postXP(v)
      .then(({ xp, streak }) => set({ xp, streak }))
      .catch(() => { /* keep the optimistic xp */ })
  },
  addMistake: (m) => {
    const tempId = `local_${Date.now()}`
    set((s) => ({
      mistakes: [{ ...m, id: tempId, date: today() }, ...s.mistakes],
    }))
    postMistake(m)
      .then((row) =>
        set((s) => ({
          mistakes: s.mistakes.map((x) => (x.id === tempId ? row : x)),
        })),
      )
      .catch(() => { /* keep the optimistic local row */ })
  },
  flag: (context) => {
    postFlag(context).catch(() => { /* flag is lost if the API is down; the button still confirms locally */ })
  },
}))
