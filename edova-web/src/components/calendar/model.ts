import { ENTRY_COLOR } from "./types"

// Unified view-model for everything renderable on the calendar: schedule
// events (class/meeting/deadline/holiday), exams, and teacher plan entries.
export type EventKind = "class" | "exam" | "homework" | "holiday" | "quiz" | "meeting" | "entry"

/** Single registry: one entry per kind carries every presentation concern.
 * Adding a kind = one entry here; the derived maps below, the legend, the
 * month/time grids, and makeItem's solid flag all follow automatically. */
export interface KindMeta {
  color: string
  label: string
  /** Soft background tint behind the accent bar (white card + colored left bar). */
  tint: string
  /** Solid chip vs. dot-line (design language from the approved mockup). */
  solid: boolean
  /** Legend swatch shape: round dot vs. square chip; outline = white w/ border. */
  legend: { round?: boolean; outline?: boolean }
}

export const KIND_META: Record<EventKind, KindMeta> = {
  class: { color: "#16332B", label: "Class", tint: "#F0F5F1", solid: false, legend: {} },
  exam: { color: "#DC2626", label: "Exam", tint: "#FEF2F2", solid: true, legend: {} },
  homework: { color: "#F59E0B", label: "Homework due", tint: "#FFFBEB", solid: true, legend: {} },
  holiday: { color: "#16A34A", label: "Holiday", tint: "#F0FDF4", solid: true, legend: {} },
  quiz: { color: "#B91C1C", label: "Quiz / test", tint: "#FEF2F2", solid: false, legend: { round: true } },
  meeting: { color: "#0284C7", label: "Meeting", tint: "#EFF6FF", solid: false, legend: { round: true } },
  entry: { color: ENTRY_COLOR, label: "My plan entry", tint: "#E9F1EC", solid: true, legend: { outline: true } },
}

const derive = <V>(pick: (meta: KindMeta) => V) =>
  Object.fromEntries(Object.entries(KIND_META).map(([k, meta]) => [k, pick(meta)])) as Record<EventKind, V>

export const KIND_COLORS = derive((m) => m.color)
export const KIND_LABELS = derive((m) => m.label)
export const KIND_TINTS = derive((m) => m.tint)

export interface CalItem {
  id: string
  kind: EventKind
  title: string
  time?: string
  /** Solid chip vs. dot-line (design language from the approved mockup). */
  solid: boolean
  sortKey: number
}

const SCHEDULE_TYPE_KIND: Record<string, EventKind> = {
  deadline: "homework",
  holiday: "holiday",
  meeting: "meeting",
  class: "class",
}

export function kindForSchedule(type: string, title: string): EventKind {
  // exams: quizzes / unit tests are dot-lines, big exams are solid red chips
  return SCHEDULE_TYPE_KIND[type] ?? (/quiz|unit test/i.test(title) ? "quiz" : "exam")
}

export function makeItem(id: string, kind: EventKind, title: string, time: string | undefined, sortKey: number): CalItem {
  return { id, kind, title, time, solid: KIND_META[kind].solid, sortKey }
}

/** solids first (visual priority), then chronological within each group. */
export function sortItems(items: CalItem[]): CalItem[] {
  return [...items].sort((a, b) => Number(b.solid) - Number(a.solid) || a.sortKey - b.sortKey)
}
