import type { CSSProperties } from "react"

// Shared badge / dot / status style helpers — ported from the mockup's
// Component style methods (_decomp/app.js ~1444–1470) so every screen uses
// the same colour mapping rather than per-row inline logic.

const EVENT_COLORS: Record<string, string> = {
  exam: "#DC2626",
  meeting: "#0284C7",
  class: "#16332B",
  deadline: "#F59E0B",
  holiday: "#16A34A",
}

export function eventDotStyle(type: string): CSSProperties {
  return {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: EVENT_COLORS[type] || "#9CA3AF",
  }
}
export function eventBadgeStyle(type: string): CSSProperties {
  const c = EVENT_COLORS[type] || "#6B7280"
  return {
    fontSize: 13,
    fontWeight: 600,
    color: c,
    background: c + "1A",
    padding: "3px 8px",
    borderRadius: 999,
    textTransform: "capitalize",
  }
}
export function priorityDotStyle(p: string): CSSProperties {
  const colors: Record<string, string> = { high: "#DC2626", medium: "#F59E0B", low: "#16A34A" }
  return { width: 7, height: 7, borderRadius: "50%", background: colors[p] || "#9CA3AF" }
}
export function statusBadgeStyle(status: string): CSSProperties {
  const map: Record<string, [string, string]> = {
    "on-track": ["#16A34A", "#F0FDF4"],
    "at-risk": ["#DC2626", "#FEF2F2"],
  }
  const [c, bg] = map[status] || ["#6B7280", "#F9FAFB"]
  return { fontSize: 13, fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: 999, textTransform: "capitalize", whiteSpace: "nowrap" }
}
export function assignmentStatusStyle(status: string): CSSProperties {
  const map: Record<string, [string, string]> = {
    active: ["#0284C7", "#F0F9FF"],
    closed: ["#6B7280", "#F9FAFB"],
    graded: ["#16A34A", "#F0FDF4"],
  }
  const [c, bg] = map[status] || ["#6B7280", "#F9FAFB"]
  return { fontSize: 13, fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: 999, textTransform: "capitalize", whiteSpace: "nowrap" }
}
export function behaviorBadgeStyle(type: string): CSSProperties {
  const map: Record<string, [string, string]> = {
    positive: ["#16A34A", "#F0FDF4"],
    incident: ["#DC2626", "#FEF2F2"],
  }
  const [c, bg] = map[type] || ["#6B7280", "#F9FAFB"]
  return { fontSize: 13, fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: 999 }
}
export function submissionStatusStyle(status: string): CSSProperties {
  const map: Record<string, [string, string]> = {
    submitted: ["#15803D", "#DCFCE7"],
    not_started: ["#64748B", "#F1F5F9"],
    late: ["#B45309", "#FEF3C7"],
    missing: ["#DC2626", "#FEE2E2"],
    graded: ["#166534", "#DCFCE7"],
  }
  const [c, bg] = map[status] || ["#6B7280", "#F9FAFB"]
  return { fontSize: 13, fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }
}
export function weightageChipStyle(w: string): CSSProperties {
  const map: Record<string, [string, string]> = {
    High: ["#DC2626", "#FEE2E2"],
    Medium: ["#B45309", "#FEF3C7"],
    Low: ["#64748B", "#F1F5F9"],
  }
  const [c, bg] = map[w] || map.Medium
  return { display: "inline-block", padding: "3px 9px", borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: bg, color: c, whiteSpace: "nowrap" }
}
export function unitStatusStyle(status: string): CSSProperties {
  const map: Record<string, [string, string]> = {
    "Not Started": ["#64748B", "#F1F5F9"],
    "In Progress": ["#0369A1", "#E0F2FE"],
    Delayed: ["#DC2626", "#FEE2E2"],
    Completed: ["#15803D", "#DCFCE7"],
  }
  const [c, bg] = map[status] || map["In Progress"]
  return { display: "inline-block", padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600, background: bg, color: c, whiteSpace: "nowrap" }
}

/**
 * Due-date urgency chip (Assignment Tracker). Derived purely from `due` vs
 * APP_TODAY — deliberately separate from the workflow AssignmentStatus
 * (active/closed/graded), which drives the scoring flow and must not be
 * overloaded to mean "overdue".
 */
export type DueUrgency = "overdue" | "today" | "soon" | "upcoming"
export function dueUrgencyStyle(urgency: string): CSSProperties {
  const map: Record<string, [string, string]> = {
    overdue: ["#DC2626", "#FEE2E2"],
    today: ["#B45309", "#FEF3C7"],
    soon: ["#0284C7", "#F0F9FF"],
    upcoming: ["#64748B", "#F1F5F9"],
  }
  const [c, bg] = map[urgency] || ["#6B7280", "#F9FAFB"]
  return { fontSize: 13, fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: 999, whiteSpace: "nowrap" }
}

/** Count badge on an at-risk student chip: red when behind on 2+, amber for 1. */
export function riskCountStyle(count: number): CSSProperties {
  const [c, bg] = count >= 2 ? ["#DC2626", "#FEE2E2"] : ["#B45309", "#FEF3C7"]
  return { fontSize: 13, fontWeight: 700, color: c, background: bg, minWidth: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, padding: "0 6px" }
}

/** Filled progress-bar segment: width = pct%, given colour, pill radius. */
export function barFill(pct: number | string, color: string): CSSProperties {
  return { width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }
}

/** Weak-chapter coverage bar colour (app.js:2859): amber if <65, green if >=80, teal otherwise. */
export function coverageBarColor(pct: number): string {
  if (pct < 65) return "#D97706"
  if (pct >= 80) return "#16A34A"
  return "#3D5A60"
}

// Label formatting used across submission tables.
export const SUBMISSION_LABEL: Record<string, string> = {
  not_started: "Not Started",
  submitted: "Submitted",
  late: "Late",
  missing: "Missing",
  graded: "Graded",
}

// ---- Planner card theme (Saved Plans + any future planner cards) ----
// Pastel card scheme ported from the weekly calendar lesson cards
// (instructions/edova-coteacher_meta_app_v1.html: bg/accent pairs + card
// anatomy rounded-[14px], border-black/5, white/70 chips). Every planner
// card MUST derive colours from here so the schema stays consistent.

export interface PlannerCardTone {
  bg: string
  accent: string
}

export const PLANNER_CARD_TONES: PlannerCardTone[] = [
  { bg: "#E9E2F3", accent: "#7C5CBF" }, // lavender — 8A Science
  { bg: "#D6EADF", accent: "#2E8B57" }, // mint — 10B Biology
  { bg: "#FFE5D4", accent: "#E67E22" }, // peach — 9C EVS
  { bg: "#DCEEFF", accent: "#3A86FF" }, // sky — 8B Lab
  { bg: "#FFF3C4", accent: "#D97706" }, // butter — Revision & Quiz
]

/** Deterministic tone pick from a stable key (subject/class) — same key always gets the same colour. */
export function plannerCardTone(key: string): PlannerCardTone {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return PLANNER_CARD_TONES[h % PLANNER_CARD_TONES.length]
}

/** Card container: pastel fill, 14px radius, hairline dark border.
 *  Pair with className "shadow-sm hover:shadow-md transition-shadow" (calendar hover lift). */
export function plannerCardStyle(tone: PlannerCardTone): CSSProperties {
  return {
    background: tone.bg,
    border: "1px solid rgba(0,0,0,0.05)",
    borderRadius: 14,
    padding: 18,
  }
}

/** Translucent white chip on pastel fill (calendar goal-chip anatomy), accent text. */
export function plannerCardChipStyle(tone: PlannerCardTone): CSSProperties {
  return {
    fontSize: 13,
    fontWeight: 600,
    color: tone.accent,
    background: "rgba(255,255,255,0.7)",
    border: "1px solid rgba(0,0,0,0.05)",
    display: "inline-block",
    padding: "3px 9px",
    borderRadius: 999,
  }
}

/** Primary text on pastel fill. */
export const PLANNER_CARD_INK = "#111827"
/** Secondary/meta text on pastel fill (calendar uses text-black/60). */
export const PLANNER_CARD_META = "rgba(0,0,0,0.6)"
/** Hairline divider on pastel fill. */
export const PLANNER_CARD_DIVIDER = "rgba(0,0,0,0.08)"
