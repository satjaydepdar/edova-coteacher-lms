// Shared store-domain helpers that don't belong to a single slice.
import { STUDENTS } from "@/data/seed"

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
