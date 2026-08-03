// Canonical curriculum domain helpers — the single implementation of logic
// that used to be copy-pasted across Settings, SyllabusMap, and LessonPlanner.
import { CLASSES, MT_SECTIONS } from "@/data/seed"
import { APP_TODAY, formatShortDate, parseShortDate } from "@/lib/dates"

export { formatShortDate } from "@/lib/dates"

/** Unit progress label. `today` defaults to the app clock (APP_TODAY). */
export function unitStatus(
  row: { actual: number | string; plannedStart?: string; plannedEnd?: string },
  today: Date = APP_TODAY,
): string {
  if (Number(row.actual) >= 100) return "Completed"
  const start = parseShortDate(row.plannedStart ?? "")
  const end = parseShortDate(row.plannedEnd ?? "")
  if (!row.plannedStart || !row.plannedEnd) return Number(row.actual) > 0 ? "In Progress" : "Not Started"
  if (today.getTime() < start.getTime() && Number(row.actual) === 0) return "Not Started"
  if (today.getTime() > end.getTime() && Number(row.actual) < 100) return "Delayed"
  return "In Progress"
}

export function classNameById(id: string): string {
  return CLASSES.find((c) => c.id === id)?.name ?? id
}

export function sectionLabel(id: string): string {
  return MT_SECTIONS.find((s) => s.id === id)?.label ?? id
}

/**
 * Pure planned-end computation: walk forward from `plannedStart` counting
 * teaching days (skip weekends + `holidayDates`) until the periods needed at
 * `periodsPerWeek` are covered. Callers resolve `periodsPerWeek` and the
 * holiday list from their own data source (Settings reads the live store;
 * SyllabusMap reads the seed timetable/calendar).
 */
export function computeAutoPlannedEnd(
  periodsPerWeek: number,
  plannedStart: string | undefined,
  periods: number | string | undefined,
  holidayDates: Iterable<string>,
): string | null {
  if (!periodsPerWeek || !plannedStart || !periods) return null
  const periodsPerDay = periodsPerWeek / 5
  const teachingDaysNeeded = Math.ceil(Number(periods) / periodsPerDay)
  const holidaySet = new Set(holidayDates)
  let d = parseShortDate(plannedStart)
  let counted = 0
  let guard = 0
  while (counted < teachingDaysNeeded && guard < 400) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6 && !holidaySet.has(formatShortDate(d))) counted++
    if (counted < teachingDaysNeeded) d = new Date(d.getTime() + 86400000)
    guard++
  }
  return formatShortDate(d)
}
