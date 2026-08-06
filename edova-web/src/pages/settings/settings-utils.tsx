// Shared presentational tokens + small components + modal types for the
// Settings page sections. No behavior — style and type contracts only.
import type { CSSProperties } from "react"
import {
  MT_SECTIONS,
  PERIOD_TIME_LABELS,
  SECTION_SUBJECT_TO_SYLLABUS_CLASS,
} from "@/data/seed"

export const headerCell: CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: 11, lineHeight: "16px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B7280", fontWeight: 600 }
export const bodyCell: CSSProperties = { padding: 12, borderBottom: "1px solid #E5E7EB", fontSize: 13, lineHeight: "20px", letterSpacing: "-0.01em", color: "#374151", display: "flex", alignItems: "center" }
export const filterCtrl: CSSProperties = { height: 38, padding: "0 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fff" }
export const outlineBtn: CSSProperties = { background: "#fff", color: "#16332B", border: "1px solid #16332B", padding: "9px 14px", borderRadius: 8, fontSize: 14, lineHeight: "20px", fontWeight: 500, cursor: "pointer" }
export const primaryBtn: CSSProperties = { background: "#16332B", color: "#fff", padding: "9px 16px", borderRadius: 8, fontSize: 14, lineHeight: "20px", fontWeight: 500, cursor: "pointer", border: "none" }
export const modalLabel: CSSProperties = { fontSize: 14, lineHeight: "20px", fontWeight: 500, color: "#6B7280", marginBottom: 6 }
export const modalInput: CSSProperties = { width: "100%", height: 38, padding: "0 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 15, fontFamily: "inherit", marginBottom: 14, boxSizing: "border-box" }

export function subViewTabStyle(active: boolean): CSSProperties {
  return { padding: "9px 16px", borderRadius: 8, fontSize: 14, lineHeight: "20px", fontWeight: 500, cursor: "pointer", background: active ? "#111827" : "transparent", color: active ? "#fff" : "#6B7280" }
}
export function ctxBadge(): CSSProperties {
  return { fontSize: 13, fontWeight: 600, color: "#16332B", background: "#E9F1EC", border: "1px solid #BFE0D3", padding: "4px 10px", borderRadius: 999 }
}

// Cell shell for timetable grids.
export function cellShell(hasConflict: boolean): CSSProperties {
  return { background: hasConflict ? "#FEE2E2" : "#fff", border: hasConflict ? "1px solid #FCA5A5" : "1px solid #E5E7EB", borderRadius: 8, padding: 8, minHeight: 56 }
}

export function examReadinessStyle(status: string): CSSProperties {
  const map: Record<string, [string, string]> = {
    Ready: ["#15803D", "#DCFCE7"],
    "Needs Revision": ["#B45309", "#FEF3C7"],
    "Not Ready": ["#DC2626", "#FEE2E2"],
    "—": ["#64748B", "#F1F5F9"],
  }
  const [c, bg] = map[status] || map["—"]
  return { display: "inline-block", padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600, background: bg, color: c, whiteSpace: "nowrap" }
}

export type SettingsTab = "timetable" | "curriculum" | "masterdata" | "syllabus" | "exam" | "calendar" | "resources"
export type SubView = "class" | "teacher" | "summary"
export type ModalType = "curriculum" | "masterTimetable" | "exam" | "calendar"

export interface ModalForm {
  // curriculum
  subject?: string
  classId?: string
  academicYear?: string
  term?: string
  weightage?: string
  difficulty?: string
  dependsOn?: string
  unit?: string
  plannedStart?: string
  plannedEnd?: string
  periods?: number | string
  planned?: number | string
  actual?: number | string
  textbookRef?: string
  topics?: { id: string; name: string; done: boolean }[]
  // master timetable
  sectionId?: string
  day?: string
  period?: number | string
  teacher?: string
  room?: string
  // exam
  title?: string
  date?: string
  type?: string
  weight?: string
  duration?: number | string
  coverageUnitIds?: string[]
  revisionAllocated?: number | string
  revisionUsed?: number | string
  teacherId?: string
  // calendar
  label?: string
}

export interface ModalState {
  type: ModalType
  mode: "add" | "edit"
  editingId: string | null
  form: ModalForm
}

export const th = (label: string, extra?: CSSProperties) => (
  <div style={{ ...headerCell, ...extra }}>{label}</div>
)

export const editLink = (onClick: () => void) => (
  <span onClick={onClick} style={{ fontSize: 14, fontWeight: 600, color: "#16332B", cursor: "pointer", marginRight: 14 }}>Edit</span>
)
export const deleteLink = (onClick: () => void) => (
  <span onClick={onClick} style={{ fontSize: 14, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>Delete</span>
)

// A keyed fragment for laying grid cells out flat (CSS grid children).
export function FragmentKey({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// One timetable period row: the period label cell + the day cells passed in.
export function FragmentRow({ period, children }: { period: number; children: React.ReactNode }) {
  return (
    <>
      <div style={{ padding: "8px 10px", borderBottom: "1px solid #E5E7EB" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>Period {period}</div>
        <div style={{ fontSize: 12, color: "#9CA3AF" }}>{PERIOD_TIME_LABELS[period]}</div>
      </div>
      {children}
    </>
  )
}

// classId -> { sectionId, subject } (inverse of the exported section→syllabus map)
export const CLASSID_TO_SECTION_SUBJECT: Record<string, { sectionId: string; subject: string }> = {}
Object.entries(SECTION_SUBJECT_TO_SYLLABUS_CLASS).forEach(([key, classId]) => {
  const [sectionId, subject] = key.split("|")
  CLASSID_TO_SECTION_SUBJECT[classId] = { sectionId, subject }
})

// Fixed subject→teacher / subject→room maps (mirror _decomp/seed; the seed
// module keeps these private, so we replicate the exact map order here — the
// Set() over Object.values(SUBJECT_TEACHER) gives the canonical dropdown order).
export const MASTER_SUBJECTS = ["Mathematics", "Science", "English", "Social Studies", "Computer Science"]
export const SUBJECT_TEACHER: Record<string, string> = {
  Mathematics: "Meenakshi Parameswaran", "Algebra II": "Meenakshi Parameswaran", Science: "James Okafor",
  English: "Priya Nair", "Social Studies": "David Kim", "Computer Science": "Laura Chen",
}
export const SUBJECT_ROOM: Record<string, string> = {
  Mathematics: "Room 204", "Algebra II": "Room 204", Science: "Science Lab",
  English: "Room 112", "Social Studies": "Room 108", "Computer Science": "Computer Lab",
}

export { MT_SECTIONS, PERIOD_TIME_LABELS }
