/**
 * Real roster lookup for the Assign wizard (edova-backend :8003) — optional.
 * Not every class has a real classroom yet (only Class 10 -- Section A --
 * Mathematics does today), and the service itself may not be running. Either
 * case is a silent, graceful fallback to the CLASSES/STUDENTS seed data
 * exactly as before -- never a crash, never a visible error.
 */
import { CLASSES } from "@/data/seed"
import { backendApi } from "./api-client"

export interface RealStudent {
  id: string
  name: string
  rollNo: string
}

interface ClassroomOut {
  id: string
  class_level: number
  section: string | null
  subject: string
}

interface ClassroomStudentOut {
  id: string
  student_number: string
  first_name: string
  last_name: string
}

/** seed-class id -> real roster, for every classroom that matches a seed
 * class (subject + class level + section, fuzzy on punctuation). Empty map
 * when the backend is down or nothing matches — callers fall back to seed. */
export function getRealRosterByClassId(): Promise<Record<string, RealStudent[]>> {
  return backendApi
    .get<ClassroomOut[]>("/api/classrooms")
    .then((classrooms) =>
      Promise.all(
        classrooms.map((rc) => {
          // Match on meaning (subject + class level + section), not exact name
          // string -- the backend and the seed data don't share a punctuation
          // convention ("Class 10 -- Section A" vs "Class 10 — Section A").
          const cls = CLASSES.find(
            (c) =>
              c.subject === rc.subject &&
              c.name.includes(`Class ${rc.class_level}`) &&
              (!rc.section || c.name.includes(rc.section)),
          )
          if (!cls) return null
          return backendApi
            .get<ClassroomStudentOut[]>(`/api/classrooms/${rc.id}/students`)
            .then(
              (students): [string, RealStudent[]] => [
                cls.id,
                students.map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, rollNo: s.student_number })),
              ],
            )
            .catch(() => null)
        }),
      ),
    )
    .then((pairs) => Object.fromEntries(pairs.filter((p): p is [string, RealStudent[]] => p !== null)))
    .catch((err) => {
      console.warn("real classroom roster fetch failed, falling back to seed data:", err)
      return {}
    })
}
