// Shared mutable "schoolConfig" — mirrors the mockup Component's schoolConfig
// state so mutations persist across navigation and propagate cross-view
// (e.g. a topic ticked in Lesson Planner updates Syllabus Map + Course Progress).
// Intentionally NOT persisted: like the mockup, it resets from seed on reload.
//
// Composed from per-domain slices under ./slices; the public surface (the
// useSchoolStore hook + the re-exports below) is unchanged for consumers.
import { create } from "zustand"
import { createCurriculumSlice, type CurriculumSlice } from "./slices/curriculum-slice"
import { createRosterSlice, type RosterSlice } from "./slices/roster-slice"
import { createAssignmentsSlice, type AssignmentsSlice } from "./slices/assignments-slice"
import { createCalendarSlice, type CalendarSlice } from "./slices/calendar-slice"
import { createAnnouncementsSlice, type AnnouncementsSlice } from "./slices/announcements-slice"
import { createBankSlice, type BankSlice } from "./slices/bank-slice"
import { createFlashSlice, type FlashSlice } from "./slices/flash-slice"

export type SchoolState = CurriculumSlice &
  RosterSlice &
  AssignmentsSlice &
  CalendarSlice &
  AnnouncementsSlice &
  BankSlice &
  FlashSlice

export const useSchoolStore = create<SchoolState>()((...a) => ({
  ...createCurriculumSlice(...a),
  ...createRosterSlice(...a),
  ...createAssignmentsSlice(...a),
  ...createCalendarSlice(...a),
  ...createAnnouncementsSlice(...a),
  ...createBankSlice(...a),
  ...createFlashSlice(...a),
}))

// Re-exported so existing consumer imports from "@/store/school-store"
// keep working unchanged after the split.
export { resolveStudentDisplay, type StudentDisplay } from "@/lib/store-utils"
export { type Focus } from "@/lib/curriculum-mappers"
export { type FlashKey } from "./slices/flash-slice"
export { type RealCalendarEvent } from "./slices/calendar-slice"
