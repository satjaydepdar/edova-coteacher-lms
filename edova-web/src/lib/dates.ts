

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

export function parseShortDate(str: string): Date {
  // Handle full ISO strings (e.g. from dueIso) — parse directly
  if (str && str.includes("T")) return new Date(str)
  const parts = (str || "").trim().split(/\s+/)
  const mon = MONTH_MAP[parts[0]]
  const day = parseInt(parts[1], 10)
  if (mon === undefined || isNaN(day)) return new Date()
  // Use current real year so due-date diffs are always correct
  return new Date(new Date().getFullYear(), mon, day)
}

export function dayLabelForDate(d: Date): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(d)
  target.setHours(0, 0, 0, 0)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)
  if (diffDays === 0) return "Today"
  if (diffDays === 1) return "Tomorrow"
  return d.toLocaleDateString("en-US", { weekday: "short" })
}
