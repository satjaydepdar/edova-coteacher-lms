export interface CalendarEntry {
  id: string
  date: string // yyyy-mm-dd (local)
  classSection: string
  subjectChapter: string
  assignment: string
  percentCovered: number
}

export type CalendarViewKey = "day" | "week" | "month" | "year"

// Accent used for user-created plan entries — distinct from the school
// schedule's exam/meeting/class/deadline/holiday palette (lib/styles.ts).
export const ENTRY_COLOR = "#16332B"
export const ENTRY_BG = "#E9F1EC"
