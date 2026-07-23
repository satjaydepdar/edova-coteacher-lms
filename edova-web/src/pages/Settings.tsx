import { useEffect, useMemo, useState, type CSSProperties } from "react"
import { useAppStore } from "@/store/app-store"
import { useSchoolStore } from "@/store/school-store"
import { FlashBanner } from "@/components/common/FlashBanner"
import Curriculum from "@/pages/Curriculum"
import MasterData from "@/pages/MasterData"
import ResourceLibrary from "@/pages/ResourceLibrary"
import {
  ACADEMIC_YEARS,
  APP_TODAY,
  CALENDAR_TYPES,
  CLASSES,
  DAYS_OF_WEEK,
  DIFFICULTY_LEVELS,
  EXAM_TYPES,
  MT_DAYS,
  MT_GRID_STRUCTURE,
  MT_PERIODS,
  MT_SECTIONS,
  PERIOD_TIME_LABELS,
  SECTION_SUBJECT_TO_SYLLABUS_CLASS,
  TEACHERS,
  TERMS,
  WEIGHTAGE_LEVELS,
} from "@/data/seed"
import { parseShortDate } from "@/lib/dates"
import {
  barFill,
  unitStatusStyle,
  weightageChipStyle,
} from "@/lib/styles"
import type {
  AcademicCalendarItem,
  CurriculumUnit,
  Exam,
  MasterTimetableRow,
} from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8001"

// ---- local domain helpers (ported from _decomp/app.js Settings region) ----

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
function formatShortDate(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`
}

// Extra fields the mockup modal tracks but the persisted type doesn't carry.
type CurriculumUnitX = CurriculumUnit & { difficulty?: string; dependsOn?: string }

// classId -> { sectionId, subject } (inverse of the exported section→syllabus map)
const CLASSID_TO_SECTION_SUBJECT: Record<string, { sectionId: string; subject: string }> = {}
Object.entries(SECTION_SUBJECT_TO_SYLLABUS_CLASS).forEach(([key, classId]) => {
  const [sectionId, subject] = key.split("|")
  CLASSID_TO_SECTION_SUBJECT[classId] = { sectionId, subject }
})

// Fixed subject→teacher / subject→room maps (mirror _decomp/seed; the seed
// module keeps these private, so we replicate the exact map order here — the
// Set() over Object.values(SUBJECT_TEACHER) gives the canonical dropdown order).
const MASTER_SUBJECTS = ["Mathematics", "Science", "English", "Social Studies", "Computer Science"]
const SUBJECT_TEACHER: Record<string, string> = {
  Mathematics: "Meenakshi Parameswaran", "Algebra II": "Meenakshi Parameswaran", Science: "James Okafor",
  English: "Priya Nair", "Social Studies": "David Kim", "Computer Science": "Laura Chen",
}
const SUBJECT_ROOM: Record<string, string> = {
  Mathematics: "Room 204", "Algebra II": "Room 204", Science: "Science Lab",
  English: "Room 112", "Social Studies": "Room 108", "Computer Science": "Computer Lab",
}

function sectionLabel(id: string): string {
  return MT_SECTIONS.find((s) => s.id === id)?.label ?? id
}
function classNameById(id: string): string {
  return CLASSES.find((c) => c.id === id)?.name ?? id
}

function unitStatus(row: { actual: number | string; plannedStart: string; plannedEnd: string }): string {
  if (Number(row.actual) >= 100) return "Completed"
  const start = parseShortDate(row.plannedStart)
  const end = parseShortDate(row.plannedEnd)
  if (!row.plannedStart || !row.plannedEnd) return Number(row.actual) > 0 ? "In Progress" : "Not Started"
  if (APP_TODAY < start && Number(row.actual) === 0) return "Not Started"
  if (APP_TODAY > end && Number(row.actual) < 100) return "Delayed"
  return "In Progress"
}

function examReadinessStyle(status: string): CSSProperties {
  const map: Record<string, [string, string]> = {
    Ready: ["#15803D", "#DCFCE7"],
    "Needs Revision": ["#B45309", "#FEF3C7"],
    "Not Ready": ["#DC2626", "#FEE2E2"],
    "—": ["#64748B", "#F1F5F9"],
  }
  const [c, bg] = map[status] || map["—"]
  return { display: "inline-block", padding: "4px 10px", borderRadius: 999, fontSize: 13, fontWeight: 600, background: bg, color: c, whiteSpace: "nowrap" }
}

// ---- shared inline style tokens (match the mockup pixel-for-pixel) ----

const headerCell: CSSProperties = { padding: "10px 12px", borderBottom: "1px solid #E5E7EB", background: "#F9FAFB", fontSize: 11, lineHeight: "16px", letterSpacing: "0.06em", textTransform: "uppercase", color: "#6B7280", fontWeight: 600 }
const bodyCell: CSSProperties = { padding: 12, borderBottom: "1px solid #E5E7EB", fontSize: 13, lineHeight: "20px", letterSpacing: "-0.01em", color: "#374151", display: "flex", alignItems: "center" }
const filterCtrl: CSSProperties = { height: 38, padding: "0 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14, fontFamily: "inherit", background: "#fff" }
const outlineBtn: CSSProperties = { background: "#fff", color: "#16332B", border: "1px solid #16332B", padding: "9px 14px", borderRadius: 8, fontSize: 14, lineHeight: "20px", fontWeight: 500, cursor: "pointer" }
const primaryBtn: CSSProperties = { background: "#16332B", color: "#fff", padding: "9px 16px", borderRadius: 8, fontSize: 14, lineHeight: "20px", fontWeight: 500, cursor: "pointer", border: "none" }
const modalLabel: CSSProperties = { fontSize: 14, lineHeight: "20px", fontWeight: 500, color: "#6B7280", marginBottom: 6 }
const modalInput: CSSProperties = { width: "100%", height: 38, padding: "0 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 15, fontFamily: "inherit", marginBottom: 14, boxSizing: "border-box" }

function subViewTabStyle(active: boolean): CSSProperties {
  return { padding: "9px 16px", borderRadius: 8, fontSize: 14, lineHeight: "20px", fontWeight: 500, cursor: "pointer", background: active ? "#111827" : "transparent", color: active ? "#fff" : "#6B7280" }
}
function ctxBadge(): CSSProperties {
  return { fontSize: 13, fontWeight: 600, color: "#16332B", background: "#E9F1EC", border: "1px solid #BFE0D3", padding: "4px 10px", borderRadius: 999 }
}

// Cell shell for timetable grids.
function cellShell(hasConflict: boolean): CSSProperties {
  return { background: hasConflict ? "#FEE2E2" : "#fff", border: hasConflict ? "1px solid #FCA5A5" : "1px solid #E5E7EB", borderRadius: 8, padding: 8, minHeight: 56 }
}

type SettingsTab = "timetable" | "curriculum" | "masterdata" | "syllabus" | "exam" | "calendar" | "resources"
type SubView = "class" | "teacher" | "summary"
type ModalType =
  | "curriculum"
  | "masterTimetable"
  | "exam"
  | "calendar"

interface ModalForm {
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

interface ModalState {
  type: ModalType
  mode: "add" | "edit"
  editingId: string | null
  form: ModalForm
}

const th = (label: string, extra?: CSSProperties) => (
  <div style={{ ...headerCell, ...extra }}>{label}</div>
)

export default function Settings() {
  const academicYear = useAppStore((s) => s.academicYear)
  const setAcademicYear = useAppStore((s) => s.setAcademicYear)
  const sectionId = useAppStore((s) => s.sectionId)
  const setSectionId = useAppStore((s) => s.setSectionId)

  const [tab, setTab] = useState<SettingsTab>("masterdata")
  const [subView, setSubView] = useState<SubView>("class")

  // Curriculum + master timetable live in the shared store so edits here
  // persist and propagate to Syllabus Map (app.js schoolConfig.*).
  const curriculum = useSchoolStore((s) => s.curriculum) as CurriculumUnitX[]
  const setCurriculum = useSchoolStore((s) => s.setCurriculum)
  const setFocus = useSchoolStore((s) => s.setFocus)
  const masterTimetable = useSchoolStore((s) => s.masterTimetable)
  const setMasterTimetable = useSchoolStore((s) => s.setMasterTimetable)
  const showFlash = useSchoolStore((s) => s.showFlash)

  // Exams + calendar stay local (no shared store slice yet) — start empty;
  // real entries are created via + Add Exam / + Add Entry.
  const [exams, setExams] = useState<Exam[]>([])
  const [calendar, setCalendar] = useState<AcademicCalendarItem[]>([])

  // Teacher dropdown = fixed SUBJECT_TEACHER map order (app.js:2278), not
  // derived from scheduled rows.
  const teacherNameOptions = useMemo(() => [...new Set(Object.values(SUBJECT_TEACHER))], [])
  const [teacherName, setTeacherName] = useState<string>(() => teacherNameOptions[0] ?? "")
  // School Syllabus filters — values come from Master Data (real curriculum
  // classes/subjects + real class_sections), not a hardcoded option list.
  // Class -> Section and Class -> Subject both cascade off the selected
  // class; Section and Subject are independent of each other.
  const [syllabusClassOptions, setSyllabusClassOptions] = useState<string[]>([])
  const [syllabusSectionOptions, setSyllabusSectionOptions] = useState<string[]>([])
  const [syllabusSubjectOptions, setSyllabusSubjectOptions] = useState<string[]>([])
  const [syllabusClass, setSyllabusClass] = useState<string>("all")
  const [syllabusSection, setSyllabusSection] = useState<string>("all")
  const [syllabusSubject, setSyllabusSubject] = useState<string>("all")
  const [curriculumSearch, setCurriculumSearch] = useState<string>("")

  useEffect(() => {
    if (!academicYear) return
    fetch(`${API_BASE}/api/curriculums/classes?year=${encodeURIComponent(academicYear)}&board=CBSE`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((classes: string[]) => setSyllabusClassOptions(classes))
      .catch(() => setSyllabusClassOptions([]))
    setSyllabusClass("all")
  }, [academicYear])

  useEffect(() => {
    if (!academicYear || syllabusClass === "all") {
      setSyllabusSectionOptions([])
      setSyllabusSubjectOptions([])
      setSyllabusSection("all")
      setSyllabusSubject("all")
      return
    }
    fetch(`${API_BASE}/api/class-sections/sections?year=${encodeURIComponent(academicYear)}&board=CBSE&class=${encodeURIComponent(syllabusClass)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((sections: string[]) => setSyllabusSectionOptions(sections))
      .catch(() => setSyllabusSectionOptions([]))
    fetch(`${API_BASE}/api/curriculums?year=${encodeURIComponent(academicYear)}&board=CBSE&class=${encodeURIComponent(syllabusClass)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { subjects: { subject_name: string }[] }) => setSyllabusSubjectOptions(d.subjects.map((s) => s.subject_name)))
      .catch(() => setSyllabusSubjectOptions([]))
    setSyllabusSection("all")
    setSyllabusSubject("all")
  }, [academicYear, syllabusClass])

  // Once Class + Subject are both picked, this becomes the app-wide focus —
  // hydrates the shared curriculum (Syllabus Map / This Week read the same
  // store) from the real Master Data syllabus tree for that class/subject.
  // Section defaults to the first real section (or "Section A") when "All
  // Sections" is still selected, matching the class-sections API's default.
  useEffect(() => {
    if (!academicYear || syllabusClass === "all" || syllabusSubject === "all") return
    setFocus({
      year: academicYear,
      board: "CBSE",
      classLabel: syllabusClass,
      subject: syllabusSubject,
      section: syllabusSection === "all" ? (syllabusSectionOptions[0] ?? "Section A") : syllabusSection,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academicYear, syllabusClass, syllabusSubject, syllabusSection])
  const [examSectionId, setExamSectionId] = useState<string>("all")

  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({})
  const [expandedExams, setExpandedExams] = useState<Record<string, boolean>>({})

  const [modal, setModal] = useState<ModalState | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState("")
  const [ttBulkOpen, setTtBulkOpen] = useState(false)
  const [ttBulkText, setTtBulkText] = useState("")

  const globalContextLabel = `${sectionLabel(sectionId)} · ${academicYear}`

  // ---- derived: master-timetable computed views ----
  const yearRows = useMemo(() => masterTimetable.filter((r) => r.academicYear === academicYear), [masterTimetable, academicYear])

  const conflicts = useMemo(() => {
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
  }, [yearRows])

  const computeAutoPlannedEnd = (classId: string, plannedStart: string, periods: number | string, year: string) => {
    const map = CLASSID_TO_SECTION_SUBJECT[classId]
    if (!map || !plannedStart || !periods) return null
    const periodsPerWeek = masterTimetable.filter((r) => r.sectionId === map.sectionId && r.subject === map.subject && r.academicYear === year).length
    if (!periodsPerWeek) return null
    const periodsPerDay = periodsPerWeek / 5
    const teachingDaysNeeded = Math.ceil(Number(periods) / periodsPerDay)
    const holidaySet = new Set(calendar.map((h) => h.date))
    let d = parseShortDate(plannedStart)
    let counted = 0
    let guard = 0
    while (counted < teachingDaysNeeded && guard < 400) {
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6 && !holidaySet.has(formatShortDate(d))) counted++
      if (counted < teachingDaysNeeded) d = new Date(d.getTime() + 86400000)
      guard++
    }
    return { endDate: formatShortDate(d), periodsPerWeek }
  }

  const effectiveTeachingDaysLabel = useMemo(() => {
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
  }, [calendar])

  // subject -> teacher/room lookup, derived from the timetable itself.
  const subjectMeta = (subject: string) => {
    const row = masterTimetable.find((r) => r.subject === subject)
    return { teacher: row?.teacher ?? "Unassigned", room: row?.room ?? "TBD" }
  }
  const masterSubjectsOptions = useMemo(
    () => [...new Set(masterTimetable.map((r) => r.subject))].filter((s) => s !== "Study Hall"),
    [masterTimetable]
  )

  // ---- modal helpers ----
  function openAdd(type: ModalType) {
    const blank: Record<ModalType, ModalForm> = {
      curriculum: { subject: "", classId: CLASSES[0].id, academicYear, term: "Term 1", unit: "", plannedStart: "", plannedEnd: "", periods: "", textbookRef: "", weightage: "Medium", difficulty: "Medium", dependsOn: "", planned: 100, actual: 0, topics: [] },
      masterTimetable: { sectionId, academicYear, day: "Monday", period: 1, subject: masterSubjectsOptions[0], ...subjectMeta(masterSubjectsOptions[0]) },
      exam: { title: "", classId: "c1", date: "", type: "Quiz", weight: "", duration: 45, coverageUnitIds: [], revisionAllocated: 0, revisionUsed: 0, teacherId: TEACHERS[0].id },
      calendar: { date: "", label: "", type: "Holiday" },
    }
    setModal({ type, mode: "add", editingId: null, form: blank[type] })
  }
  function openEdit(type: ModalType, id: string) {
    let form: ModalForm | null = null
    if (type === "curriculum") {
      const r = curriculum.find((x) => x.id === id)
      if (r) form = { ...r }
    } else if (type === "masterTimetable") {
      const r = masterTimetable.find((x) => x.id === id)
      if (r) form = { ...r }
    } else if (type === "exam") {
      const r = exams.find((x) => x.id === id)
      if (r) form = { ...r, coverageUnitIds: [...(r.coverageUnitIds || [])] }
    } else {
      const r = calendar.find((x) => x.id === id)
      if (r) form = { ...r }
    }
    if (form) setModal({ type, mode: "edit", editingId: id, form })
  }
  const setField = (field: keyof ModalForm, value: unknown) =>
    setModal((m) => (m ? { ...m, form: { ...m.form, [field]: value } } : m))

  function saveModal() {
    if (!modal) return
    const f = modal.form
    if (modal.type === "curriculum") {
      const rec: CurriculumUnitX = {
        id: modal.editingId ?? `cu_${Date.now()}`,
        subject: f.subject || "",
        classId: f.classId || CLASSES[0].id,
        academicYear: f.academicYear || academicYear,
        term: f.term || "Term 1",
        unit: f.unit || "",
        plannedStart: f.plannedStart || "",
        plannedEnd: f.plannedEnd || "",
        periods: Number(f.periods) || 0,
        textbookRef: f.textbookRef || "",
        weightage: f.weightage || "Medium",
        planned: Number(f.planned) || 0,
        actual: Number(f.actual) || 0,
        topics: f.topics || [],
        difficulty: f.difficulty,
        dependsOn: f.dependsOn || undefined,
      }
      setCurriculum(modal.editingId ? curriculum.map((r) => (r.id === modal.editingId ? rec : r)) : [...curriculum, rec])
    } else if (modal.type === "masterTimetable") {
      const rec: MasterTimetableRow = {
        id: modal.editingId ?? `mt_${Date.now()}`,
        sectionId: f.sectionId || sectionId,
        academicYear: f.academicYear || academicYear,
        day: f.day || "Monday",
        period: Number(f.period) || 1,
        subject: f.subject || "",
        teacher: f.teacher || "Unassigned",
        room: f.room || "TBD",
      }
      setMasterTimetable(modal.editingId ? masterTimetable.map((r) => (r.id === modal.editingId ? rec : r)) : [...masterTimetable, rec])
    } else if (modal.type === "exam") {
      const rec: Exam = {
        id: modal.editingId ?? `ex_${Date.now()}`,
        title: f.title || "",
        classId: f.classId || "c1",
        date: f.date || "",
        type: f.type || "Quiz",
        weight: f.weight || "",
        duration: Number(f.duration) || 0,
        coverageUnitIds: f.coverageUnitIds || [],
        revisionAllocated: Number(f.revisionAllocated) || 0,
        revisionUsed: Number(f.revisionUsed) || 0,
        teacherId: (f.teacherId as string) || TEACHERS[0].id,
      }
      setExams((prev) => (modal.editingId ? prev.map((r) => (r.id === modal.editingId ? rec : r)) : [...prev, rec]))
    } else if (modal.type === "calendar") {
      const rec: AcademicCalendarItem = {
        id: modal.editingId ?? `cal_${Date.now()}`,
        date: f.date || "",
        label: f.label || "",
        type: (f.type as AcademicCalendarItem["type"]) || "Holiday",
      }
      setCalendar((prev) => (modal.editingId ? prev.map((r) => (r.id === modal.editingId ? rec : r)) : [...prev, rec]))
    }
    const flashKey =
      modal.type === "curriculum"
        ? "curriculum"
        : modal.type === "masterTimetable"
          ? "timetable"
          : modal.type === "exam"
            ? "exam"
            : "calendar"
    showFlash(flashKey, modal.mode === "add" ? "Added — changes apply across Lesson Planner, Syllabus Map, and Calendar." : "Saved.")
    setModal(null)
  }

  function deleteCurriculum(id: string) {
    setCurriculum(curriculum.filter((r) => r.id !== id))
    showFlash("curriculum", "Syllabus unit deleted.")
  }

  function deleteMasterRow(id: string) {
    setMasterTimetable(masterTimetable.filter((r) => r.id !== id))
    showFlash("timetable", "Slot deleted.")
  }
  function deleteExam(id: string) {
    setExams((prev) => prev.filter((r) => r.id !== id))
    showFlash("exam", "Exam deleted.")
  }
  function deleteCalendar(id: string) {
    setCalendar((prev) => prev.filter((r) => r.id !== id))
    showFlash("calendar", "Entry deleted.")
  }

  function toggleTopicDone(unitId: string, topicId: string) {
    setCurriculum(
      curriculum.map((r) => {
        if (r.id !== unitId) return r
        const topics = r.topics.map((t) => (t.id === topicId ? { ...t, done: !t.done } : t))
        const actual = topics.length ? Math.round((topics.filter((t) => t.done).length / topics.length) * 100) : r.actual
        return { ...r, topics, actual }
      })
    )
    showFlash("curriculum", "Marked taught — Syllabus Actual % updated.")
  }

  function toggleCoverageUnit(unitId: string) {
    setModal((m) => {
      if (!m) return m
      const cur = m.form.coverageUnitIds || []
      const next = cur.includes(unitId) ? cur.filter((x) => x !== unitId) : [...cur, unitId]
      return { ...m, form: { ...m.form, coverageUnitIds: next } }
    })
  }

  // ---- Syllabus tab workflows (app.js:copyFromPreviousYear / submitBulkUpload / exportCurriculumCSV) ----
  function copyFromPreviousYear() {
    const idx = ACADEMIC_YEARS.indexOf(academicYear)
    if (idx <= 0) {
      showFlash("curriculum", "No earlier academic year to copy from.")
      return
    }
    const prevYear = ACADEMIC_YEARS[idx - 1]
    const curYear = ACADEMIC_YEARS[idx]
    const existing = curriculum.filter((r) => r.academicYear === curYear)
    const already = new Set(existing.map((r) => r.classId + "|" + r.unit))
    const source = curriculum.filter((r) => r.academicYear === prevYear && !already.has(r.classId + "|" + r.unit))
    const copies: CurriculumUnitX[] = source.map((r, i) => ({
      ...r,
      id: "cu_" + Date.now() + "_" + i,
      academicYear: curYear,
      actual: 0,
      plannedStart: "",
      plannedEnd: "",
      topics: r.topics.map((t) => ({ ...t, done: false })),
    }))
    const count = copies.length
    setCurriculum([...curriculum, ...copies])
    showFlash(
      "curriculum",
      count
        ? `Copied ${count} unit${count === 1 ? "" : "s"} from ${prevYear}. Set new planned dates for each.`
        : `Nothing new to copy — all units already exist for ${curYear}.`
    )
  }

  function submitBulkUpload() {
    const lines = (bulkText || "").split("\n").map((l) => l.trim()).filter(Boolean)
    const year = academicYear
    const rows: CurriculumUnitX[] = []
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
        academicYear: year,
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
    setCurriculum([...curriculum, ...rows])
    setBulkOpen(false)
    setBulkText("")
    showFlash("curriculum", `Added ${rows.length} unit${rows.length === 1 ? "" : "s"} from upload.`)
  }

  function exportCurriculumCSV() {
    const rows = curriculumRows
    const header = ["Subject", "Class/Section", "Term", "Unit", "Periods", "Planned Start", "Planned End", "Planned %", "Actual %", "Status", "Textbook", "Weightage"]
    const lines = [header.join(",")]
    rows.forEach((r) => {
      const status = unitStatus(r)
      const cls = classNameById(r.classId)
      lines.push(
        [r.subject, cls, r.term, r.unit, r.periods, r.plannedStart, r.plannedEnd, r.planned, r.actual, status, r.textbookRef, r.weightage]
          .map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`)
          .join(",")
      )
    })
    const csv = lines.join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `syllabus_${academicYear}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ---- Timetable tab workflows (app.js:copyTimetableFromPreviousYear / submitTimetableBulk / exportTimetableCSV) ----
  function copyTimetableFromPreviousYear() {
    const idx = ACADEMIC_YEARS.indexOf(academicYear)
    if (idx <= 0) {
      showFlash("timetable", "No earlier academic year to copy from.")
      return
    }
    const prevYear = ACADEMIC_YEARS[idx - 1]
    const curYear = ACADEMIC_YEARS[idx]
    const existing = masterTimetable.filter((r) => r.academicYear === curYear)
    const already = new Set(existing.map((r) => r.sectionId + "|" + r.day + "|" + r.period))
    const source = masterTimetable.filter((r) => r.academicYear === prevYear && !already.has(r.sectionId + "|" + r.day + "|" + r.period))
    const copies: MasterTimetableRow[] = source.map((r, i) => ({ ...r, id: "mt_copy_" + Date.now() + "_" + i, academicYear: curYear }))
    const count = copies.length
    setMasterTimetable([...masterTimetable, ...copies])
    showFlash(
      "timetable",
      count
        ? `Copied ${count} slot${count === 1 ? "" : "s"} from ${prevYear}.`
        : `Nothing new to copy — all slots already exist for ${curYear}.`
    )
  }

  function submitTimetableBulk() {
    const lines = (ttBulkText || "").split("\n").map((l) => l.trim()).filter(Boolean)
    const year = academicYear
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
        academicYear: year,
        day: day || "Monday",
        period: Number(period) || 1,
        subject: subject || MASTER_SUBJECTS[0],
        teacher: SUBJECT_TEACHER[subject] || "Unassigned",
        room: SUBJECT_ROOM[subject] || "TBD",
      })
    })
    setMasterTimetable([...masterTimetable, ...rows])
    setTtBulkOpen(false)
    setTtBulkText("")
    showFlash("timetable", `Added ${rows.length} slot${rows.length === 1 ? "" : "s"} from upload.`)
  }

  function exportTimetableCSV() {
    const rows = masterTimetable.filter((r) => r.academicYear === academicYear)
    const header = ["Section", "Day", "Period", "Time", "Subject", "Teacher", "Room"]
    const lines = [header.join(",")]
    rows.forEach((r) => {
      lines.push(
        [sectionLabel(r.sectionId), r.day, r.period, PERIOD_TIME_LABELS[r.period], r.subject, r.teacher, r.room]
          .map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`)
          .join(",")
      )
    })
    const csv = lines.join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `timetable_${academicYear}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ---- render helpers ----
  const renderTimetableGrid = (mode: "class" | "teacher") => (
    <div style={{ overflowX: "auto", marginBottom: mode === "class" ? 20 : 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "110px repeat(5,1fr)", minWidth: 640 }}>
        <div style={{ padding: "8px 10px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", fontSize: 13.5, color: "#6B7280", fontWeight: 600 }}>Period</div>
        {MT_DAYS.map((d) => (
          <div key={d} style={{ textAlign: "center", padding: "8px 10px", background: "#F9FAFB", borderBottom: "1px solid #E5E7EB", fontSize: 13.5, color: "#6B7280", fontWeight: 600 }}>{d}</div>
        ))}
        {MT_GRID_STRUCTURE.map((g, gi) => {
          if (g.kind !== "period") {
            return (
              <div key={`b${gi}`} style={{ gridColumn: "1 / -1", padding: "6px 10px", borderBottom: "1px solid #E5E7EB", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#B45309", background: "#FEF3C7" }}>
                {g.label} · {g.time}
              </div>
            )
          }
          return (
            <FragmentRow key={`p${g.period}`} period={g.period}>
              {MT_DAYS.map((day) => {
                const slot =
                  mode === "class"
                    ? yearRows.find((r) => r.sectionId === sectionId && r.day === day && r.period === g.period)
                    : yearRows.find((r) => r.teacher === teacherName && r.day === day && r.period === g.period)
                const hasConflict = !!(slot && conflicts.conflictIds.has(slot.id))
                return (
                  <div key={day} style={{ padding: 6, borderBottom: "1px solid #E5E7EB" }}>
                    <div style={cellShell(hasConflict)}>
                      {slot ? (
                        <>
                          <div style={{ fontSize: 13.5, fontWeight: 700, color: "#111827" }}>{mode === "class" ? slot.subject : sectionLabel(slot.sectionId)}</div>
                          <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>{mode === "class" ? slot.teacher : slot.subject}</div>
                          <div style={{ fontSize: 11.5, color: "#9CA3AF" }}>{slot.room}</div>
                        </>
                      ) : (
                        <div style={{ fontSize: 13, color: "#D1D5DB", textAlign: "center" }}>{mode === "class" ? "—" : "FREE"}</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </FragmentRow>
          )
        })}
      </div>
    </div>
  )

  // ---- filtered rows ----
  const curriculumRows = curriculum.filter((r) => {
    const rowClassName = classNameById(r.classId) // e.g. "Class 10 — Section A"
    return (
      r.academicYear === academicYear &&
      (syllabusClass === "all" || rowClassName.startsWith(syllabusClass)) &&
      (syllabusSection === "all" || rowClassName.endsWith(`— ${syllabusSection}`)) &&
      (syllabusSubject === "all" || r.subject === syllabusSubject) &&
      (!curriculumSearch || `${r.subject} ${r.unit}`.toLowerCase().includes(curriculumSearch.toLowerCase()))
    )
  })

  const examRows = exams.filter((ex) => {
    const cls = CLASSES.find((c) => c.id === ex.classId)
    const yearMatches = (ex.coverageUnitIds || []).length ? curriculum.some((u) => (ex.coverageUnitIds || []).includes(u.id) && u.academicYear === academicYear) : true
    const sectionMatches = examSectionId === "all" || (cls && cls.sectionId === examSectionId)
    return yearMatches && sectionMatches
  })

  const calendarRows = [...calendar].sort((a, b) => parseShortDate(a.date).getTime() - parseShortDate(b.date).getTime())

  // Timetable → Exam Schedule link: exams for the section currently shown in
  // the Class Timetable view, so a teacher planning periods can see upcoming
  // exam dates without switching tabs.
  const timetableExamRows = exams
    .filter((ex) => CLASSES.find((c) => c.id === ex.classId)?.sectionId === sectionId)
    .sort((a, b) => parseShortDate(a.date).getTime() - parseShortDate(b.date).getTime())

  const masterSectionRows = [...yearRows]
    .filter((r) => r.sectionId === sectionId)
    .sort((a, b) => MT_DAYS.indexOf(a.day) - MT_DAYS.indexOf(b.day) || a.period - b.period)

  const teacherTotalPeriods = yearRows.filter((r) => r.teacher === teacherName).length
  const teacherFreePeriods = MT_DAYS.length * MT_PERIODS.length - teacherTotalPeriods

  const subjectsForSection = [...new Set(yearRows.filter((r) => r.sectionId === sectionId).map((r) => r.subject))]
  const periodAllocationRows = subjectsForSection.map((subject) => {
    const periodsPerWeek = yearRows.filter((r) => r.sectionId === sectionId && r.subject === subject).length
    const teacher = subjectMeta(subject).teacher
    const syllabusClassId = SECTION_SUBJECT_TO_SYLLABUS_CLASS[`${sectionId}|${subject}`]
    const units = syllabusClassId ? curriculum.filter((u) => u.classId === syllabusClassId && u.academicYear === academicYear) : []
    let requiredPerWeek: number | null = null
    let shortfall = false
    if (units.length) {
      const activeUnit = units.find((u) => unitStatus(u) === "In Progress") || units[0]
      if (activeUnit.plannedStart && activeUnit.plannedEnd) {
        const weeks = Math.max(1, Math.round((parseShortDate(activeUnit.plannedEnd).getTime() - parseShortDate(activeUnit.plannedStart).getTime()) / (7 * 86400000)))
        requiredPerWeek = Math.ceil(activeUnit.periods / weeks)
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
  const totalWeeklyPeriods = periodAllocationRows.reduce((a, r) => a + r.periodsPerWeek, 0)

  const editLink = (onClick: () => void) => (
    <span onClick={onClick} style={{ fontSize: 14, fontWeight: 600, color: "#16332B", cursor: "pointer", marginRight: 14 }}>Edit</span>
  )
  const deleteLink = (onClick: () => void) => (
    <span onClick={onClick} style={{ fontSize: 14, fontWeight: 600, color: "#DC2626", cursor: "pointer" }}>Delete</span>
  )

  return (
    <div>
      <div className="font-display text-[24px] font-bold text-ink" style={{ marginBottom: 4 }}>Settings</div>
      <div className="text-[16px] text-text-secondary" style={{ marginBottom: 20 }}>
        Manage the school timetable, syllabus, and exam schedule for the year. Changes apply instantly across Lesson Planner, Syllabus Map, and Calendar.
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 20 }}>
        {([
          ["masterdata", "Master Data"],
          ["curriculum", "Curriculum"],
          ["syllabus", "Syllabus"],
          ["exam", "Exam Schedule"],
          ["calendar", "Calendar"],
          ["resources", "Resource Library"],
        ] as [SettingsTab, string][]).map(([key, label]) => (
          <div key={key} onClick={() => setTab(key)} style={subViewTabStyle(tab === key)}>{label}</div>
        ))}
      </div>

      {/* ===================== TIMETABLE ===================== */}
      {tab === "timetable" && (
        <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>School Timetable</div>
              <span style={ctxBadge()}>📍 {globalContextLabel}</span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={outlineBtn} onClick={copyTimetableFromPreviousYear}>Copy from Previous Year</button>
              <button style={outlineBtn} onClick={() => setTtBulkOpen(true)}>Bulk Upload</button>
              <button style={outlineBtn} onClick={exportTimetableCSV}>Export</button>
              <button style={primaryBtn} onClick={() => openAdd("masterTimetable")}>+ Add Slot</button>
            </div>
          </div>

          <FlashBanner flashKey="timetable" />

          {conflicts.messages.length > 0 && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C", padding: "10px 14px", borderRadius: 8, fontSize: 14, marginBottom: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ Scheduling conflicts detected</div>
              {conflicts.messages.map((m, i) => (
                <div key={i} style={{ fontSize: 13.5, marginTop: 2 }}>{m}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} style={filterCtrl}>
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} style={filterCtrl}>
              {MT_SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
            <select value={teacherName} onChange={(e) => setTeacherName(e.target.value)} style={filterCtrl}>
              {teacherNameOptions.map((tn) => (
                <option key={tn} value={tn}>{tn}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 20 }}>
            {([
              ["class", "Class Timetable"],
              ["teacher", "Teacher Timetable"],
              ["summary", "Period Allocation Summary"],
            ] as [SubView, string][]).map(([key, label]) => (
              <div key={key} onClick={() => setSubView(key)} style={subViewTabStyle(subView === key)}>{label}</div>
            ))}
          </div>

          {/* Class view */}
          {subView === "class" && (
            <div>
              {timetableExamRows.length > 0 && (
                <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "#374151", marginBottom: 6 }}>📝 Upcoming Exams — {sectionLabel(sectionId)}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                    {timetableExamRows.map((ex) => (
                      <span key={ex.id} style={{ fontSize: 13.5, color: "#6B7280" }}>
                        {ex.title} <strong style={{ color: "#111827" }}>{ex.date}</strong>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {renderTimetableGrid("class")}
              <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 10 }}>Manage Slots — {sectionLabel(sectionId)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "0.9fr 0.8fr 1.3fr 1.3fr 1fr 1fr" }}>
                {th("Day")}
                {th("Period")}
                {th("Subject")}
                {th("Teacher")}
                {th("Room")}
                {th("Actions", { textAlign: "right" })}
                {masterSectionRows.map((r) => (
                  <FragmentKey key={r.id}>
                    <div style={bodyCell}>{r.day}</div>
                    <div style={bodyCell}>{r.period}</div>
                    <div style={{ ...bodyCell, fontSize: 15.5, fontWeight: 600, color: "#111827" }}>{r.subject}</div>
                    <div style={bodyCell}>{r.teacher}</div>
                    <div style={bodyCell}>{r.room}</div>
                    <div style={{ ...bodyCell, justifyContent: "flex-end", whiteSpace: "nowrap" }}>
                      {editLink(() => openEdit("masterTimetable", r.id))}
                      {deleteLink(() => deleteMasterRow(r.id))}
                    </div>
                  </FragmentKey>
                ))}
              </div>
            </div>
          )}

          {/* Teacher view */}
          {subView === "teacher" && (
            <div>
              <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ fontSize: 14.5, color: "#374151" }}>Total Teaching Periods: <strong>{teacherTotalPeriods}/week</strong></div>
                <div style={{ fontSize: 14.5, color: "#374151" }}>Free Periods: <strong>{teacherFreePeriods}/week</strong></div>
              </div>
              {renderTimetableGrid("teacher")}
            </div>
          )}

          {/* Summary view */}
          {subView === "summary" && (
            <div>
              <div style={{ fontSize: 14.5, color: "#6B7280", marginBottom: 6 }}>{sectionLabel(sectionId)} — periods/week vs. what the Syllabus requires to finish each unit on time.</div>
              <div style={{ fontSize: 13.5, color: "#9CA3AF", marginBottom: 14 }}>Effective teaching days: {effectiveTeachingDaysLabel}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.4fr 2fr 1.2fr" }}>
                {th("Subject")}
                {th("Periods/Week")}
                {th("Teacher")}
                {th("Syllabus Units Assigned")}
                {th("Required/Week")}
                {periodAllocationRows.map((r) => (
                  <FragmentKey key={r.subject}>
                    <div style={{ ...bodyCell, fontSize: 15.5, fontWeight: 600, color: "#111827" }}>{r.subject}</div>
                    <div style={bodyCell}>{r.periodsPerWeek}</div>
                    <div style={bodyCell}>{r.teacher}</div>
                    <div style={{ ...bodyCell, fontSize: 14.5 }}>{r.unitsLabel}</div>
                    <div style={bodyCell}>
                      <span style={{ fontWeight: r.shortfall ? 700 : 400, color: r.shortfall ? "#DC2626" : "#374151" }}>{r.requiredLabel}</span>
                    </div>
                  </FragmentKey>
                ))}
                <div style={{ padding: 12, fontSize: 15, fontWeight: 700, color: "#111827" }}>TOTAL</div>
                <div style={{ padding: 12, fontSize: 15, fontWeight: 700, color: "#111827" }}>{totalWeeklyPeriods}</div>
                <div style={{ padding: 12 }} />
                <div style={{ padding: 12 }} />
                <div style={{ padding: 12 }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== CURRICULUM (subjects by class) ===================== */}
      {tab === "curriculum" && <Curriculum />}

      {/* ===================== MASTER DATA (units / chapters / topics) ===================== */}
      {tab === "masterdata" && <MasterData />}

      {/* ===================== SYLLABUS ===================== */}
      {tab === "syllabus" && (
        <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card">
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 12 }}>School Syllabus</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={outlineBtn} onClick={copyFromPreviousYear}>Copy from Previous Year</button>
              <button style={outlineBtn} onClick={() => setBulkOpen(true)}>Bulk Upload</button>
              <button style={outlineBtn} onClick={exportCurriculumCSV}>Export</button>
              <button style={primaryBtn} onClick={() => openAdd("curriculum")}>+ Add Unit</button>
            </div>
          </div>

          <FlashBanner flashKey="curriculum" />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} style={filterCtrl}>
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={syllabusClass} onChange={(e) => setSyllabusClass(e.target.value)} style={filterCtrl}>
              <option value="all">All Classes</option>
              {syllabusClassOptions.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select value={syllabusSection} onChange={(e) => setSyllabusSection(e.target.value)} style={filterCtrl} disabled={syllabusClass === "all"}>
              <option value="all">All Sections</option>
              {syllabusSectionOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={syllabusSubject} onChange={(e) => setSyllabusSubject(e.target.value)} style={filterCtrl} disabled={syllabusClass === "all"}>
              <option value="all">All Subjects</option>
              {syllabusSubjectOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input value={curriculumSearch} onChange={(e) => setCurriculumSearch(e.target.value)} placeholder="Search unit or subject..." style={{ ...filterCtrl, flex: 1, minWidth: 180 }} />
          </div>

          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 0.6fr 1.2fr 0.6fr 0.7fr 0.7fr 0.8fr 0.8fr 1fr", minWidth: 1000 }}>
              {th("Unit")}
              {th("Term")}
              {th("Planned Dates")}
              {th("Periods")}
              {th("Planned %")}
              {th("Actual %")}
              {th("Status")}
              {th("Weightage")}
              {th("Actions", { textAlign: "right" })}
              {curriculumRows.map((r) => {
                const autoInfo = computeAutoPlannedEnd(r.classId, r.plannedStart, r.periods, r.academicYear)
                const displayPlannedEnd = autoInfo ? autoInfo.endDate : r.plannedEnd
                const status = unitStatus({ ...r, plannedEnd: displayPlannedEnd })
                const expanded = !!expandedUnits[r.id]
                const doneCount = r.topics.filter((t) => t.done).length
                const siblings = curriculum.filter((u) => u.classId === r.classId && u.academicYear === r.academicYear && u.term === r.term)
                const cumulativePeriods = siblings
                  .filter((u) => parseShortDate(u.plannedStart || "Jan 1") <= parseShortDate(r.plannedStart || "Jan 1"))
                  .reduce((a, u) => a + Number(u.periods || 0), 0)
                const testedIn = exams.filter((ex) => (ex.coverageUnitIds || []).includes(r.id)).map((ex) => ex.title)
                const dependsOnUnit = r.dependsOn ? curriculum.find((u) => u.id === r.dependsOn) : null
                const dependsIncomplete = !!(dependsOnUnit && Number(dependsOnUnit.actual) < 100)
                return (
                  <FragmentKey key={r.id}>
                    <div style={{ padding: 12, borderBottom: "1px solid #E5E7EB" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }} onClick={() => setExpandedUnits((s) => ({ ...s, [r.id]: !s[r.id] }))}>
                        <span style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>{expanded ? "▾" : "▸"}</span>
                        <div>
                          <div style={{ fontSize: 15.5, fontWeight: 700, color: "#111827" }}>{r.unit}</div>
                          <div style={{ fontSize: 13.5, color: "#6B7280", marginTop: 2 }}>{r.subject} · {classNameById(r.classId)}</div>
                          <div style={{ fontSize: 12.5, color: "#9CA3AF", marginTop: 2 }}>{doneCount}/{r.topics.length} topics complete</div>
                        </div>
                      </div>
                    </div>
                    <div style={bodyCell}>{r.term}</div>
                    <div style={{ ...bodyCell, fontSize: 14.5, whiteSpace: "nowrap" }}>
                      {r.plannedStart} – {displayPlannedEnd}
                      {autoInfo && <span style={{ color: "#9CA3AF", fontWeight: 400 }}> (auto)</span>}
                    </div>
                    <div style={bodyCell}>{r.periods}</div>
                    <div style={bodyCell}>{r.planned}%</div>
                    <div style={{ ...bodyCell, flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
                      <span>{r.actual}%</span>
                      <div style={{ width: "100%", height: 5, background: "#E5E7EB", borderRadius: 999 }}>
                        <div style={barFill(r.actual, "#3F6E62")} />
                      </div>
                    </div>
                    <div style={{ ...bodyCell }}>
                      <span style={unitStatusStyle(status)}>{status}</span>
                    </div>
                    <div style={{ ...bodyCell }}>
                      <span style={weightageChipStyle(r.weightage)}>{r.weightage}</span>
                    </div>
                    <div style={{ ...bodyCell, justifyContent: "flex-end", whiteSpace: "nowrap" }}>
                      {editLink(() => openEdit("curriculum", r.id))}
                      {deleteLink(() => deleteCurriculum(r.id))}
                    </div>
                    {expanded && (
                      <div style={{ gridColumn: "1 / -1", padding: "14px 16px 18px 40px", borderBottom: "1px solid #E5E7EB", background: "#FBFAF6" }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", marginBottom: 8 }}>Topics</div>
                        {r.topics.map((topic) => (
                          <div key={topic.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer" }} onClick={() => toggleTopicDone(r.id, topic.id)}>
                            <input type="checkbox" checked={topic.done} readOnly style={{ width: 15, height: 15, accentColor: "#3F6E62", cursor: "pointer" }} />
                            <span style={topic.done ? { fontSize: 14.5, color: "#9CA3AF", textDecoration: "line-through" } : { fontSize: 14.5, color: "#374151" }}>{topic.name}</span>
                          </div>
                        ))}
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, fontSize: 13, color: "#9CA3AF" }}>
                          <div>Textbook: {r.textbookRef}</div>
                          <div>Difficulty: <span style={weightageChipStyle(r.difficulty === "High" ? "High" : r.difficulty === "Low" ? "Low" : "Medium")}>{r.difficulty || "Medium"}</span></div>
                          <div>Cumulative periods to date: {cumulativePeriods}</div>
                          <div>Tested in: {testedIn.length ? testedIn.join(", ") : "Not yet linked to an exam"}</div>
                        </div>
                        {dependsOnUnit && (
                          <div style={{ fontSize: 13, marginTop: 6, color: dependsIncomplete ? "#DC2626" : "#9CA3AF" }}>
                            Depends on: {dependsOnUnit.unit}{dependsIncomplete && " — ⚠ not yet complete"}
                          </div>
                        )}
                      </div>
                    )}
                  </FragmentKey>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================== EXAM SCHEDULE ===================== */}
      {tab === "exam" && (
        <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>Exam Schedule</div>
              <span style={ctxBadge()}>📍 {globalContextLabel}</span>
            </div>
            <button style={primaryBtn} onClick={() => openAdd("exam")}>+ Add Exam</button>
          </div>

          <FlashBanner flashKey="exam" />

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} style={filterCtrl}>
              {ACADEMIC_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <select value={examSectionId} onChange={(e) => setExamSectionId(e.target.value)} style={filterCtrl}>
              <option value="all">All Classes &amp; Sections</option>
              {MT_SECTIONS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 0.8fr 0.8fr 0.9fr 0.9fr 1fr" }}>
            {th("Exam")}
            {th("Date")}
            {th("Days Left")}
            {th("Readiness")}
            {th("Status")}
            {th("Actions", { textAlign: "right" })}
            {examRows.map((r) => {
              const cls = CLASSES.find((c) => c.id === r.classId)
              const daysToExam = Math.round((parseShortDate(r.date).getTime() - APP_TODAY.getTime()) / 86400000)
              const coveredUnits = (r.coverageUnitIds || []).map((id) => curriculum.find((u) => u.id === id)).filter((u): u is CurriculumUnitX => !!u)
              const totalPeriodsInScope = coveredUnits.reduce((a, u) => a + Number(u.periods || 0), 0)
              const periodsCompleted = coveredUnits.reduce((a, u) => a + (Number(u.periods || 0) * Number(u.actual || 0)) / 100, 0)
              const readinessPct = totalPeriodsInScope ? Math.round((periodsCompleted / totalPeriodsInScope) * 100) : null
              const status = readinessPct == null ? "—" : readinessPct >= 80 ? "Ready" : readinessPct >= 60 ? "Needs Revision" : "Not Ready"
              const atRiskUnit = coveredUnits.find((u) => Number(u.actual) === 0)
              const expanded = !!expandedExams[r.id]
              return (
                <FragmentKey key={r.id}>
                  <div style={{ padding: 12, borderBottom: "1px solid #E5E7EB" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }} onClick={() => setExpandedExams((s) => ({ ...s, [r.id]: !s[r.id] }))}>
                      <span style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>{expanded ? "▾" : "▸"}</span>
                      <div>
                        <div style={{ fontSize: 15.5, fontWeight: 700, color: "#111827" }}>{r.title}</div>
                        <div style={{ fontSize: 13.5, color: "#6B7280", marginTop: 2 }}>{cls?.subject ?? ""} · {cls?.name ?? ""}</div>
                      </div>
                    </div>
                  </div>
                  <div style={bodyCell}>{r.date}</div>
                  <div style={bodyCell}>{daysToExam < 0 ? "Past" : `${daysToExam}d`}</div>
                  <div style={{ ...bodyCell, fontWeight: 600, color: "#111827" }}>{readinessPct == null ? "—" : `${readinessPct}%`}</div>
                  <div style={bodyCell}><span style={examReadinessStyle(status)}>{status}</span></div>
                  <div style={{ ...bodyCell, justifyContent: "flex-end", whiteSpace: "nowrap" }}>
                    {editLink(() => openEdit("exam", r.id))}
                    {deleteLink(() => deleteExam(r.id))}
                  </div>
                  {expanded && (
                    <div style={{ gridColumn: "1 / -1", padding: "14px 16px 18px 40px", borderBottom: "1px solid #E5E7EB", background: "#FBFAF6" }}>
                      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13, color: "#9CA3AF", marginBottom: 10 }}>
                        <div>Type: {r.type}</div>
                        <div>Weight: {r.weight}</div>
                        <div>Duration: {r.duration} min</div>
                        <div>Revision slots: {r.revisionUsed || 0}/{r.revisionAllocated || 0} used</div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", marginBottom: 8 }}>Syllabus Coverage</div>
                      {coveredUnits.length ? (
                        coveredUnits.map((u) => (
                          <div key={u.id} style={{ fontSize: 14, color: "#374151", padding: "3px 0" }}>{u.unit} — {u.actual}% done ({u.periods} periods)</div>
                        ))
                      ) : (
                        <div style={{ fontSize: 14, color: "#9CA3AF" }}>No Syllabus units linked yet — Readiness can't be calculated.</div>
                      )}
                      {atRiskUnit && <div style={{ fontSize: 13.5, color: "#DC2626", fontWeight: 600, marginTop: 8 }}>⚠ {atRiskUnit.unit} not yet started</div>}
                    </div>
                  )}
                </FragmentKey>
              )
            })}
          </div>
        </div>
      )}

      {/* ===================== ACADEMIC CALENDAR ===================== */}
      {tab === "calendar" && (
        <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>Academic Calendar</div>
              <div style={{ fontSize: 13.5, color: "#6B7280", marginTop: 2 }}>Holidays and events reduce effective teaching days used by the Timetable's Period Allocation Summary.</div>
            </div>
            <button style={{ ...primaryBtn, whiteSpace: "nowrap" }} onClick={() => openAdd("calendar")}>+ Add Entry</button>
          </div>

          <FlashBanner flashKey="calendar" />

          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 1fr 1fr" }}>
            {th("Date")}
            {th("Label")}
            {th("Type")}
            {th("Actions", { textAlign: "right" })}
            {calendarRows.map((r) => (
              <FragmentKey key={r.id}>
                <div style={{ ...bodyCell, fontSize: 15.5, fontWeight: 600, color: "#111827" }}>{r.date}</div>
                <div style={bodyCell}>{r.label}</div>
                <div style={bodyCell}>{r.type}</div>
                <div style={{ ...bodyCell, justifyContent: "flex-end", whiteSpace: "nowrap" }}>
                  {editLink(() => openEdit("calendar", r.id))}
                  {deleteLink(() => deleteCalendar(r.id))}
                </div>
              </FragmentKey>
            ))}
          </div>
        </div>
      )}

      {/* ===================== RESOURCE LIBRARY ===================== */}
      {tab === "resources" && <ResourceLibrary />}

      {/* ===================== ADD / EDIT MODAL ===================== */}
      <Dialog open={!!modal} onOpenChange={(o) => !o && setModal(null)}>
        {modal && (
          <DialogContent className="max-h-[86vh] overflow-y-auto sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>{modalTitle(modal)}</DialogTitle>
            </DialogHeader>
            <div>
              {modal.type === "masterTimetable" && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={modalLabel}>Class &amp; Section</div>
                      <select value={modal.form.sectionId} onChange={(e) => setField("sectionId", e.target.value)} style={modalInput}>
                        {MT_SECTIONS.map((s) => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={modalLabel}>Academic Year</div>
                      <select value={modal.form.academicYear} onChange={(e) => setField("academicYear", e.target.value)} style={modalInput}>
                        {ACADEMIC_YEARS.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={modalLabel}>Day</div>
                      <select value={modal.form.day} onChange={(e) => setField("day", e.target.value)} style={modalInput}>
                        {DAYS_OF_WEEK.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={modalLabel}>Period</div>
                      <select value={modal.form.period} onChange={(e) => setField("period", Number(e.target.value))} style={modalInput}>
                        {MT_PERIODS.map((p) => (
                          <option key={p} value={p}>Period {p} — {PERIOD_TIME_LABELS[p]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={modalLabel}>Subject</div>
                  <select
                    value={modal.form.subject}
                    onChange={(e) => {
                      const meta = subjectMeta(e.target.value)
                      setModal((m) => (m ? { ...m, form: { ...m.form, subject: e.target.value, teacher: meta.teacher, room: meta.room } } : m))
                    }}
                    style={modalInput}
                  >
                    {masterSubjectsOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <div style={modalLabel}>Teacher <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(auto-assigned from Subject)</span></div>
                  <input value={modal.form.teacher ?? ""} disabled style={{ ...modalInput, background: "#F9FAFB", color: "#6B7280" }} />
                  <div style={modalLabel}>Room</div>
                  <input value={modal.form.room ?? ""} onChange={(e) => setField("room", e.target.value)} placeholder="e.g. Room 204" style={{ ...modalInput, marginBottom: 4 }} />
                </div>
              )}

              {modal.type === "curriculum" && (
                <div>
                  <div style={modalLabel}>Subject</div>
                  <input value={modal.form.subject ?? ""} onChange={(e) => setField("subject", e.target.value)} placeholder="e.g. Mathematics" style={modalInput} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={modalLabel}>Class &amp; Section</div>
                      <select value={modal.form.classId} onChange={(e) => setField("classId", e.target.value)} style={modalInput}>
                        {CLASSES.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={modalLabel}>Academic Year</div>
                      <select value={modal.form.academicYear} onChange={(e) => setField("academicYear", e.target.value)} style={modalInput}>
                        {ACADEMIC_YEARS.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={modalLabel}>Term</div>
                      <select value={modal.form.term} onChange={(e) => setField("term", e.target.value)} style={modalInput}>
                        {TERMS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={modalLabel}>Weightage</div>
                      <select value={modal.form.weightage} onChange={(e) => setField("weightage", e.target.value)} style={modalInput}>
                        {WEIGHTAGE_LEVELS.map((w) => (
                          <option key={w} value={w}>{w}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <div style={modalLabel}>Difficulty</div>
                      <select value={modal.form.difficulty} onChange={(e) => setField("difficulty", e.target.value)} style={modalInput}>
                        {DIFFICULTY_LEVELS.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={modalLabel}>Unit</div>
                  <input value={modal.form.unit ?? ""} onChange={(e) => setField("unit", e.target.value)} placeholder="e.g. Linear Equations & Graphing" style={modalInput} />
                  <div style={modalLabel}>Depends On <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(prerequisite unit, optional)</span></div>
                  <select value={modal.form.dependsOn} onChange={(e) => setField("dependsOn", e.target.value)} style={modalInput}>
                    <option value="">None</option>
                    {curriculum.filter((u) => u.classId === modal.form.classId && u.id !== modal.editingId).map((u) => (
                      <option key={u.id} value={u.id}>{u.unit}</option>
                    ))}
                  </select>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={modalLabel}>Planned Start</div>
                      <input value={modal.form.plannedStart ?? ""} onChange={(e) => setField("plannedStart", e.target.value)} placeholder="e.g. Jul 1" style={modalInput} />
                    </div>
                    <div>
                      <div style={modalLabel}>Planned End</div>
                      <input value={modal.form.plannedEnd ?? ""} onChange={(e) => setField("plannedEnd", e.target.value)} placeholder="e.g. Jul 15" style={modalInput} />
                    </div>
                  </div>
                  {(() => {
                    const suggestion = computeAutoPlannedEnd(modal.form.classId ?? "", modal.form.plannedStart ?? "", modal.form.periods ?? "", modal.form.academicYear ?? academicYear)?.endDate
                    return suggestion ? (
                      <div style={{ fontSize: 12.5, color: "#16332B", marginBottom: 14 }}>
                        Timetable suggests finishing <strong>{suggestion}</strong> at current periods/week.{" "}
                        <span onClick={() => setField("plannedEnd", suggestion)} style={{ textDecoration: "underline", cursor: "pointer", fontWeight: 600 }}>Use this date</span>
                      </div>
                    ) : null
                  })()}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={modalLabel}>Periods</div>
                      <input type="number" min={0} value={modal.form.periods ?? ""} onChange={(e) => setField("periods", e.target.value)} style={modalInput} />
                    </div>
                    <div>
                      <div style={modalLabel}>Planned %</div>
                      <input type="number" min={0} max={100} value={modal.form.planned ?? ""} onChange={(e) => setField("planned", e.target.value)} style={modalInput} />
                    </div>
                    <div>
                      <div style={modalLabel}>Actual %</div>
                      <input type="number" min={0} max={100} value={modal.form.actual ?? ""} onChange={(e) => setField("actual", e.target.value)} style={modalInput} />
                    </div>
                  </div>
                  <div style={modalLabel}>Textbook Reference</div>
                  <input value={modal.form.textbookRef ?? ""} onChange={(e) => setField("textbookRef", e.target.value)} placeholder="e.g. NCERT Math VIII, Ch. 4" style={modalInput} />
                  <div style={modalLabel}>Topics</div>
                  {(modal.form.topics || []).map((topic, idx) => (
                    <div key={topic.id} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <input
                        value={topic.name}
                        onChange={(e) =>
                          setModal((m) => {
                            if (!m) return m
                            const topics = [...(m.form.topics || [])]
                            topics[idx] = { ...topics[idx], name: e.target.value }
                            return { ...m, form: { ...m.form, topics } }
                          })
                        }
                        placeholder="Topic name"
                        style={{ flex: 1, height: 36, padding: "0 10px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 14.5, fontFamily: "inherit", boxSizing: "border-box" }}
                      />
                      <span
                        onClick={() =>
                          setModal((m) => {
                            if (!m) return m
                            const topics = [...(m.form.topics || [])]
                            topics.splice(idx, 1)
                            return { ...m, form: { ...m.form, topics } }
                          })
                        }
                        style={{ fontSize: 13, fontWeight: 600, color: "#DC2626", cursor: "pointer", whiteSpace: "nowrap" }}
                      >
                        Remove
                      </span>
                    </div>
                  ))}
                  <div
                    onClick={() =>
                      setModal((m) => (m ? { ...m, form: { ...m.form, topics: [...(m.form.topics || []), { id: `t_${Date.now()}`, name: "", done: false }] } } : m))
                    }
                    style={{ fontSize: 14, fontWeight: 600, color: "#16332B", cursor: "pointer", marginBottom: 4 }}
                  >
                    + Add Topic
                  </div>
                </div>
              )}

              {modal.type === "exam" && (
                <div>
                  <div style={modalLabel}>Exam Title</div>
                  <input value={modal.form.title ?? ""} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. Unit Test — Fractions" style={modalInput} />
                  <div style={modalLabel}>Class</div>
                  <select value={modal.form.classId} onChange={(e) => setField("classId", e.target.value)} style={modalInput}>
                    {CLASSES.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>
                    ))}
                  </select>
                  <div style={modalLabel}>Date</div>
                  <input value={modal.form.date ?? ""} onChange={(e) => setField("date", e.target.value)} placeholder="e.g. Jul 25" style={modalInput} />
                  <div style={modalLabel}>Type</div>
                  <select value={modal.form.type} onChange={(e) => setField("type", e.target.value)} style={modalInput}>
                    {EXAM_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={modalLabel}>Weight</div>
                      <input value={modal.form.weight ?? ""} onChange={(e) => setField("weight", e.target.value)} placeholder="e.g. 20%" style={modalInput} />
                    </div>
                    <div>
                      <div style={modalLabel}>Duration (min)</div>
                      <input type="number" min={0} value={modal.form.duration ?? ""} onChange={(e) => setField("duration", e.target.value)} style={modalInput} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <div style={modalLabel}>Revision Slots Allocated</div>
                      <input type="number" min={0} value={modal.form.revisionAllocated ?? ""} onChange={(e) => setField("revisionAllocated", e.target.value)} style={modalInput} />
                    </div>
                    <div>
                      <div style={modalLabel}>Revision Slots Used</div>
                      <input type="number" min={0} value={modal.form.revisionUsed ?? ""} onChange={(e) => setField("revisionUsed", e.target.value)} style={modalInput} />
                    </div>
                  </div>
                  <div style={modalLabel}>Syllabus Coverage <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(units this exam tests — drives Readiness %)</span></div>
                  {curriculum.filter((u) => u.classId === modal.form.classId).length ? (
                    curriculum
                      .filter((u) => u.classId === modal.form.classId)
                      .map((u) => (
                        <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer" }} onClick={() => toggleCoverageUnit(u.id)}>
                          <input type="checkbox" checked={(modal.form.coverageUnitIds || []).includes(u.id)} readOnly style={{ width: 15, height: 15, accentColor: "#3F6E62", cursor: "pointer" }} />
                          <span style={{ fontSize: 14.5, color: "#374151" }}>{u.unit} ({u.periods} periods)</span>
                        </div>
                      ))
                  ) : (
                    <div style={{ fontSize: 13.5, color: "#9CA3AF", marginBottom: 4 }}>No Syllabus units exist yet for this Class. Add them in Settings → Syllabus first.</div>
                  )}
                </div>
              )}

              {modal.type === "calendar" && (
                <div>
                  <div style={modalLabel}>Date</div>
                  <input value={modal.form.date ?? ""} onChange={(e) => setField("date", e.target.value)} placeholder="e.g. Jul 20" style={modalInput} />
                  <div style={modalLabel}>Label</div>
                  <input value={modal.form.label ?? ""} onChange={(e) => setField("label", e.target.value)} placeholder="e.g. Founders Day" style={modalInput} />
                  <div style={modalLabel}>Type</div>
                  <select value={modal.form.type} onChange={(e) => setField("type", e.target.value)} style={{ ...modalInput, marginBottom: 4 }}>
                    {CALENDAR_TYPES.map((ct) => (
                      <option key={ct} value={ct}>{ct}</option>
                    ))}
                  </select>
                </div>
              )}

            </div>
            <DialogFooter className="border-t border-[#F1F5F9] pt-4">
              <Button variant="outline" onClick={() => setModal(null)}>Cancel</Button>
              <Button onClick={saveModal}>Save</Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* ===================== BULK UPLOAD (SYLLABUS) ===================== */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Bulk Upload Syllabus Units</DialogTitle>
          </DialogHeader>
          <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 4 }}>Upload a CSV file or paste rows below. Columns: Subject, Class &amp; Section, Unit, Periods, Planned Start, Planned End, Planned %.</div>
          <input type="file" accept=".csv" style={{ fontSize: 14 }} />
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Mathematics, Class 8 — Section A, Ratios & Proportions, 6, Jul 20, Aug 1, 100"
            style={{ width: "100%", height: 140, padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 13.5, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }}
          />
          <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>One unit per line, comma-separated. A header row is skipped automatically if present.</div>
          <DialogFooter className="border-t border-[#F1F5F9] pt-4">
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={submitBulkUpload}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===================== BULK UPLOAD (TIMETABLE) ===================== */}
      <Dialog open={ttBulkOpen} onOpenChange={setTtBulkOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Bulk Upload Timetable Slots</DialogTitle>
          </DialogHeader>
          <div style={{ fontSize: 14, color: "#6B7280", marginBottom: 4 }}>Upload a CSV file or paste rows below. Columns: Class &amp; Section, Day, Period, Subject.</div>
          <input type="file" accept=".csv" style={{ fontSize: 14 }} />
          <textarea
            value={ttBulkText}
            onChange={(e) => setTtBulkText(e.target.value)}
            placeholder="Class 8 — Section A, Monday, 3, Science"
            style={{ width: "100%", height: 140, padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8, fontSize: 13.5, fontFamily: "monospace", resize: "vertical", boxSizing: "border-box" }}
          />
          <div style={{ fontSize: 12.5, color: "#9CA3AF" }}>One slot per line, comma-separated. Teacher and Room auto-assign from Subject. A header row is skipped automatically if present.</div>
          <DialogFooter className="border-t border-[#F1F5F9] pt-4">
            <Button variant="outline" onClick={() => setTtBulkOpen(false)}>Cancel</Button>
            <Button onClick={submitTimetableBulk}>Upload</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function modalTitle(modal: ModalState): string {
  const verb = modal.mode === "add" ? "Add" : "Edit"
  const noun: Record<ModalType, string> = {
    curriculum: "Syllabus Unit",
    masterTimetable: "Timetable Slot",
    exam: "Exam",
    calendar: "Calendar Entry",
  }
  return `${verb} ${noun[modal.type]}`
}

// A keyed fragment for laying grid cells out flat (CSS grid children).
function FragmentKey({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// One timetable period row: the period label cell + the day cells passed in.
function FragmentRow({ period, children }: { period: number; children: React.ReactNode }) {
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
