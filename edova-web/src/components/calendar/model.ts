import { ENTRY_COLOR } from "./types"

// Unified view-model for everything renderable on the calendar: schedule
// events (class/meeting/deadline/holiday), exams, and teacher plan entries.
export type EventKind = "class" | "exam" | "homework" | "holiday" | "quiz" | "meeting" | "entry"

export const KIND_COLORS: Record<EventKind, string> = {
  class: "#16332B",
  exam: "#DC2626",
  homework: "#F59E0B",
  holiday: "#16A34A",
  quiz: "#B91C1C",
  meeting: "#0284C7",
  entry: ENTRY_COLOR,
}

export const KIND_LABELS: Record<EventKind, string> = {
  class: "Class",
  exam: "Exam",
  homework: "Homework due",
  holiday: "Holiday",
  quiz: "Quiz / test",
  meeting: "Meeting",
  entry: "My plan entry",
}

// Soft background tints behind each kind's accent bar (screenshot style:
// white card + colored left bar, not solid color chips).
export const KIND_TINTS: Record<EventKind, string> = {
  class: "#F0F5F1",
  exam: "#FEF2F2",
  homework: "#FFFBEB",
  holiday: "#F0FDF4",
  quiz: "#FEF2F2",
  meeting: "#EFF6FF",
  entry: "#E9F1EC",
}

export interface CalItem {
  id: string
  kind: EventKind
  title: string
  time?: string
  /** Solid chip vs. dot-line (design language from the approved mockup). */
  solid: boolean
  sortKey: number
}

export function kindForSchedule(type: string, title: string): EventKind {
  if (type === "deadline") return "homework"
  if (type === "holiday") return "holiday"
  if (type === "meeting") return "meeting"
  if (type === "class") return "class"
  // exams: quizzes / unit tests are dot-lines, big exams are solid red chips
  return /quiz|unit test/i.test(title) ? "quiz" : "exam"
}

export function makeItem(id: string, kind: EventKind, title: string, time: string | undefined, sortKey: number): CalItem {
  const solid = kind === "exam" || kind === "homework" || kind === "holiday" || kind === "entry"
  return { id, kind, title, time, solid, sortKey }
}

/** solids first (visual priority), then chronological within each group. */
export function sortItems(items: CalItem[]): CalItem[] {
  return [...items].sort((a, b) => Number(b.solid) - Number(a.solid) || a.sortKey - b.sortKey)
}
