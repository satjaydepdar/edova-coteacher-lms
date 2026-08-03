// Pure CSV import/export for the Settings Syllabus + Timetable bulk flows.
// Parsers return row records; the page owns the store updates + flash text.
import {
  CLASSES,
  MT_SECTIONS,
  PERIOD_TIME_LABELS,
} from "@/data/seed"
import { classNameById, sectionLabel, unitStatus } from "@/lib/curriculum-utils"
import type { CurriculumUnit, MasterTimetableRow } from "@/lib/types"
import { MASTER_SUBJECTS, SUBJECT_ROOM, SUBJECT_TEACHER } from "./settings-utils"

const csvCell = (v: unknown) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ---- syllabus (curriculum units) ----

export function parseCurriculumBulk(text: string, academicYear: string): CurriculumUnit[] {
  const lines = (text || "").split("\n").map((l) => l.trim()).filter(Boolean)
  const rows: CurriculumUnit[] = []
  lines.forEach((line, i) => {
    if (i === 0 && /subject/i.test(line) && /unit/i.test(line)) return
    const cols = line.split(",").map((c) => c.trim())
    if (cols.length < 3) return
    const [subject, className, unit, periods, plannedStart, plannedEnd, plannedPct] = cols
    const cls =
      CLASSES.find((c) => c.name.toLowerCase() === (className || "").toLowerCase()) ||
      CLASSES.find((c) => c.subject.toLowerCase() === (subject || "").toLowerCase())
    rows.push({
      id: "cu_bulk_" + Date.now() + "_" + i,
      subject: subject || "Untitled Subject",
      classId: cls ? cls.id : CLASSES[0].id,
      academicYear,
      term: "Term 2",
      unit: unit || "Untitled Unit",
      plannedStart: plannedStart || "",
      plannedEnd: plannedEnd || "",
      periods: Number(periods) || 0,
      textbookRef: "",
      weightage: "Medium",
      planned: Number(plannedPct) || 100,
      actual: 0,
      topics: [],
    })
  })
  return rows
}

export function exportCurriculumCSV(rows: CurriculumUnit[], academicYear: string) {
  const header = ["Subject", "Class/Section", "Term", "Unit", "Periods", "Planned Start", "Planned End", "Planned %", "Actual %", "Status", "Textbook", "Weightage"]
  const lines = [header.join(",")]
  rows.forEach((r) => {
    const status = unitStatus(r)
    const cls = classNameById(r.classId)
    lines.push(
      [r.subject, cls, r.term ?? "Term 1", r.unit, r.periods ?? 0, r.plannedStart, r.plannedEnd, r.planned ?? 0, r.actual, status, r.textbookRef, r.weightage]
        .map(csvCell)
        .join(",")
    )
  })
  downloadCsv(lines.join("\n"), `syllabus_${academicYear}.csv`)
}

// ---- master timetable ----

export function parseTimetableBulk(text: string, academicYear: string): MasterTimetableRow[] {
  const lines = (text || "").split("\n").map((l) => l.trim()).filter(Boolean)
  const rows: MasterTimetableRow[] = []
  lines.forEach((line, i) => {
    if (i === 0 && /section/i.test(line) && /subject/i.test(line)) return
    const cols = line.split(",").map((c) => c.trim())
    if (cols.length < 4) return
    const [secLabel, day, period, subject] = cols
    const sec = MT_SECTIONS.find((s) => s.label.toLowerCase() === (secLabel || "").toLowerCase())
    rows.push({
      id: "mt_bulk_" + Date.now() + "_" + i,
      sectionId: sec ? sec.id : MT_SECTIONS[0].id,
      academicYear,
      day: day || "Monday",
      period: Number(period) || 1,
      subject: subject || MASTER_SUBJECTS[0],
      teacher: SUBJECT_TEACHER[subject] || "Unassigned",
      room: SUBJECT_ROOM[subject] || "TBD",
    })
  })
  return rows
}

export function exportTimetableCSV(rows: MasterTimetableRow[], academicYear: string) {
  const header = ["Section", "Day", "Period", "Time", "Subject", "Teacher", "Room"]
  const lines = [header.join(",")]
  rows.forEach((r) => {
    lines.push(
      [sectionLabel(r.sectionId), r.day, r.period, PERIOD_TIME_LABELS[r.period], r.subject, r.teacher, r.room]
        .map(csvCell)
        .join(",")
    )
  })
  downloadCsv(lines.join("\n"), `timetable_${academicYear}.csv`)
}
