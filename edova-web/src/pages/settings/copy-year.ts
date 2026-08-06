// Pure copy-from-previous-year computations for the Syllabus + Timetable
// workflows. Each returns the copies to append plus the labels for the
// flash message; the page owns the store update.
import type { CurriculumUnit, MasterTimetableRow } from "@/lib/types"

export interface CopyResult<T> {
  copies: T[]
  prevYear: string
  curYear: string
}

/** null when the current year has no earlier year to copy from. */
export function copyCurriculumFromPreviousYear(
  curriculum: CurriculumUnit[],
  years: string[],
  academicYear: string,
): CopyResult<CurriculumUnit> | null {
  const idx = years.indexOf(academicYear)
  if (idx <= 0) return null
  const prevYear = years[idx - 1]
  const curYear = years[idx]
  const existing = curriculum.filter((r) => r.academicYear === curYear)
  const already = new Set(existing.map((r) => r.classId + "|" + r.unit))
  const source = curriculum.filter((r) => r.academicYear === prevYear && !already.has(r.classId + "|" + r.unit))
  const copies: CurriculumUnit[] = source.map((r, i) => ({
    ...r,
    id: "cu_" + Date.now() + "_" + i,
    academicYear: curYear,
    actual: 0,
    plannedStart: "",
    plannedEnd: "",
    topics: r.topics.map((t) => ({ ...t, done: false })),
  }))
  return { copies, prevYear, curYear }
}

export function copyTimetableFromPreviousYear(
  masterTimetable: MasterTimetableRow[],
  years: string[],
  academicYear: string,
): CopyResult<MasterTimetableRow> | null {
  const idx = years.indexOf(academicYear)
  if (idx <= 0) return null
  const prevYear = years[idx - 1]
  const curYear = years[idx]
  const existing = masterTimetable.filter((r) => r.academicYear === curYear)
  const already = new Set(existing.map((r) => r.sectionId + "|" + r.day + "|" + r.period))
  const source = masterTimetable.filter((r) => r.academicYear === prevYear && !already.has(r.sectionId + "|" + r.day + "|" + r.period))
  const copies: MasterTimetableRow[] = source.map((r, i) => ({ ...r, id: "mt_copy_" + Date.now() + "_" + i, academicYear: curYear }))
  return { copies, prevYear, curYear }
}
