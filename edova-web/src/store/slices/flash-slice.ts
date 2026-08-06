// Flash slice — inline confirmation banners (ports the mockup's flash
// pattern: lessonFlash/curriculumFlash/homeworkFlash/...).
import type { StateCreator } from "zustand"

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

export interface FlashSlice {
  flash: Record<string, string | null>
  showFlash: (key: FlashKey, msg: string, ms?: number) => void
}

export const createFlashSlice: StateCreator<FlashSlice, [], [], FlashSlice> = (set) => ({
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
})
