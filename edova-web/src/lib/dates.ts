// App clock + short-date helpers. APP_TODAY is the single source of truth for
// "today" in the demo app (data/seed.ts re-exports it so existing importers
// keep working).
export const APP_TODAY = new Date(2026, 6, 9) // Jul 9, 2026

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
export const MONTH_SHORT = MONTHS_SHORT

export function formatShortDate(d: Date): string {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`
}

export function parseShortDate(str: string): Date {
  const parts = (str || "").trim().split(/\s+/)
  const mon = MONTH_MAP[parts[0]]
  const day = parseInt(parts[1], 10)
  if (mon === undefined || isNaN(day)) return new Date(2026, 0, 1)
  return new Date(2026, mon, day)
}

export function dayLabelForDate(d: Date): string {
  const diffDays = Math.round((d.getTime() - APP_TODAY.getTime()) / 86400000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  return d.toLocaleDateString("en-US", { weekday: "short" })
}
