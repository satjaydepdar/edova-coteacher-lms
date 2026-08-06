// Pure timetable domain logic extracted from the Settings page: conflict
// detection, effective-teaching-days, and period-allocation analytics.
// No store, no React — every input arrives as a parameter.
import { APP_TODAY, formatShortDate, parseShortDate } from "@/lib/dates"
import { unitStatus } from "@/lib/curriculum-utils"
import { sectionLabel } from "@/lib/curriculum-utils"
import type { AcademicCalendarItem, CurriculumUnit, MasterTimetableRow } from "@/lib/types"

export interface TimetableConflicts {
  conflictIds: Set<string>
  messages: string[]
}

/** O(n²) double-booking scan over one academic year's rows: same teacher in
 * two sections, or same room for two non-Study-Hall subjects, in one slot. */
export function detectConflicts(yearRows: MasterTimetableRow[]): TimetableConflicts {
  const byKey: Record<string, MasterTimetableRow[]> = {}
  yearRows.forEach((r) => {
    const k = `${r.day}|${r.period}`
    ;(byKey[k] = byKey[k] || []).push(r)
  })
  const conflictIds = new Set<string>()
  const messages: string[] = []
  Object.values(byKey).forEach((list) => {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i]
        const b = list[j]
        if (a.sectionId === b.sectionId) continue
        if (a.teacher === b.teacher && a.teacher !== "—") {
          conflictIds.add(a.id)
          conflictIds.add(b.id)
          messages.push(`${a.teacher} is double-booked: ${sectionLabel(a.sectionId)} & ${sectionLabel(b.sectionId)}, both ${a.day} Period ${a.period}.`)
        } else if (a.room === b.room && a.subject !== "Study Hall" && b.subject !== "Study Hall") {
          conflictIds.add(a.id)
          conflictIds.add(b.id)
          messages.push(`${a.room} is double-booked: ${sectionLabel(a.sectionId)} & ${sectionLabel(b.sectionId)}, both ${a.day} Period ${a.period}.`)
        }
      }
    }
  })
  return { conflictIds, messages: [...new Set(messages)] }
}

/** "N of M school days in the next 4 weeks — X lost to holidays/events". */
export function effectiveTeachingDaysLabel(calendar: AcademicCalendarItem[]): string {
  const holidaySet = new Set(calendar.map((h) => h.date))
  const endMs = APP_TODAY.getTime() + 4 * 7 * 86400000
  let d = new Date(APP_TODAY)
  let total = 0
  let effective = 0
  while (d.getTime() < endMs) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) {
      total++
      if (!holidaySet.has(formatShortDate(d))) effective++
    }
    d = new Date(d.getTime() + 86400000)
  }
  const lost = total - effective
  return `${effective} of ${total} school days in the next 4 weeks${lost ? ` — ${lost} lost to holidays/events` : ""}`
}

export interface PeriodAllocationRow {
  subject: string
  teacher: string
  periodsPerWeek: number
  unitsLabel: string
  requiredLabel: string
  shortfall: boolean
}

/** Periods/week scheduled per subject vs. what the syllabus needs to finish
 * the active unit on time (periods ÷ planned weeks, rounded up). */
export function computePeriodAllocation(
  yearRows: MasterTimetableRow[],
  sectionId: string,
  curriculum: CurriculumUnit[],
  academicYear: string,
  classIdForSectionSubject: (sectionId: string, subject: string) => string | undefined,
  teacherForSubject: (subject: string) => string,
): PeriodAllocationRow[] {
  const subjectsForSection = [...new Set(yearRows.filter((r) => r.sectionId === sectionId).map((r) => r.subject))]
  return subjectsForSection.map((subject) => {
    const periodsPerWeek = yearRows.filter((r) => r.sectionId === sectionId && r.subject === subject).length
    const teacher = teacherForSubject(subject)
    const syllabusClassId = classIdForSectionSubject(sectionId, subject)
    const units = syllabusClassId ? curriculum.filter((u) => u.classId === syllabusClassId && u.academicYear === academicYear) : []
    let requiredPerWeek: number | null = null
    let shortfall = false
    if (units.length) {
      const activeUnit = units.find((u) => unitStatus(u) === "In Progress") || units[0]
      if (activeUnit.plannedStart && activeUnit.plannedEnd) {
        const weeks = Math.max(1, Math.round((parseShortDate(activeUnit.plannedEnd).getTime() - parseShortDate(activeUnit.plannedStart).getTime()) / (7 * 86400000)))
        requiredPerWeek = Math.ceil((activeUnit.periods ?? 0) / weeks)
        shortfall = periodsPerWeek < requiredPerWeek
      }
    }
    return {
      subject,
      teacher,
      periodsPerWeek,
      unitsLabel: units.length ? units.map((u) => u.unit).join(", ") : "—",
      requiredLabel: requiredPerWeek == null ? "—" : `${requiredPerWeek}/week${shortfall ? " ⚠" : ""}`,
      shortfall,
    }
  })
}
