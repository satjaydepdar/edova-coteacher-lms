// Roster slice — real classroom rosters (edova-backend). One flat, app-wide
// lookup, fetched once and shared by every page (no focus-keying, unlike
// hydrateCurriculum).
import type { StateCreator } from "zustand"
import { CLASSES } from "@/data/seed"
import { backendApi } from "@/lib/api-client"
import { ApiError } from "@/lib/api-gateway"
import type { StudentDisplay } from "@/lib/store-utils"

let realStudentsHydration: Promise<void> | null = null

interface ApiClassroom { id: string; class_level: number; section: string | null; subject: string }
interface ApiRosterStudent { id: string; student_number: string; first_name: string; last_name: string }

export interface RosterSlice {
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
}

export const createRosterSlice: StateCreator<RosterSlice, [], [], RosterSlice> = (set) => ({
  realStudents: {},
  realStudentsList: [],
  realClassroomIdByFakeId: {},
  hydrateRealStudents: () => {
    if (!realStudentsHydration) {
      realStudentsHydration = (async () => {
        const classrooms = await backendApi.get<ApiClassroom[]>("/api/classrooms")
        const rosters = await Promise.all(
          classrooms.map((c) =>
            // A classroom whose roster fetch fails just contributes nothing.
            backendApi
              .get<ApiRosterStudent[]>(`/api/classrooms/${c.id}/students`)
              .catch((err) => (err instanceof ApiError ? [] : Promise.reject(err)))
          )
        )
        const map: Record<string, StudentDisplay> = {}
        const list: (StudentDisplay & { id: string })[] = []
        for (const roster of rosters) {
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
})
