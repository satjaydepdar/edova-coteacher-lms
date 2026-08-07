// Settings page — tab orchestration + shared modal/bulk state only. Domain
// logic lives in ./settings/* (timetable-utils, csv, copy-year, modals
// registry); tab bodies live in ./settings/*Section.tsx.
import { useEffect, useMemo, useState } from "react"
import {
  ACADEMIC_YEARS,
  CLASSES,
  MT_DAYS,
  MT_PERIODS,
  SECTION_SUBJECT_TO_SYLLABUS_CLASS,
} from "@/data/seed"
import { parseShortDate } from "@/lib/dates"
import { classNameById, computeAutoPlannedEnd as autoPlannedEnd, sectionLabel } from "@/lib/curriculum-utils"
import type { AcademicCalendarItem, CurriculumUnit, Exam } from "@/lib/types"
import { getClassSections, getCurriculum, getCurriculumClasses } from "@/lib/curriculum-api"
import { useAppStore } from "@/store/app-store"
import { useSchoolStore } from "@/store/school-store"
import Curriculum from "./Curriculum"
import MasterData from "./MasterData"
import ResourceLibrary from "./ResourceLibrary"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CalendarSection } from "./settings/CalendarSection"
import { ExamsSection, buildExamRows } from "./settings/ExamsSection"
import { SyllabusSection, buildSyllabusRows } from "./settings/SyllabusSection"
import { TimetableSection } from "./settings/TimetableSection"
import { MODAL_REGISTRY, modalTitle, type ModalCtx, type ModalRecord } from "./settings/modals"
import { copyCurriculumFromPreviousYear, copyTimetableFromPreviousYear } from "./settings/copy-year"
import {
  exportCurriculumCSV,
  exportTimetableCSV,
  parseCurriculumBulk,
  parseTimetableBulk,
} from "./settings/csv"
import {
  CLASSID_TO_SECTION_SUBJECT,
  SUBJECT_TEACHER,
  subViewTabStyle,
  type ModalForm,
  type ModalState,
  type ModalType,
  type SettingsTab,
  type SubView,
} from "./settings/settings-utils"
import {
  computePeriodAllocation,
  detectConflicts,
  effectiveTeachingDaysLabel,
} from "./settings/timetable-utils"

export default function Settings() {
  const academicYear = useAppStore((s) => s.academicYear)
  const setAcademicYear = useAppStore((s) => s.setAcademicYear)
  const sectionId = useAppStore((s) => s.sectionId)
  const setSectionId = useAppStore((s) => s.setSectionId)

  const [tab, setTab] = useState<SettingsTab>("masterdata")
  const [subView, setSubView] = useState<SubView>("class")

  // Curriculum + master timetable live in the shared store so edits here
  // persist and propagate to Syllabus Map (app.js schoolConfig.*).
  const curriculum = useSchoolStore((s) => s.curriculum)
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
  const [syllabusClassOptions, setSyllabusClassOptions] = useState<string[]>([])
  const [syllabusSectionOptions, setSyllabusSectionOptions] = useState<string[]>([])
  const [syllabusSubjectOptions, setSyllabusSubjectOptions] = useState<string[]>([])
  const [syllabusClass, setSyllabusClass] = useState<string>("all")
  const [syllabusSection, setSyllabusSection] = useState<string>("all")
  const [syllabusSubject, setSyllabusSubject] = useState<string>("all")
  const [curriculumSearch, setCurriculumSearch] = useState<string>("")

  useEffect(() => {
    if (!academicYear) return
    getCurriculumClasses(academicYear, "CBSE")
      .then((classes) => setSyllabusClassOptions(classes))
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
    getClassSections(academicYear, "CBSE", syllabusClass)
      .then((sections) => setSyllabusSectionOptions(sections))
      .catch(() => setSyllabusSectionOptions([]))
    getCurriculum(academicYear, "CBSE", syllabusClass)
      .then((d) => setSyllabusSubjectOptions(d.subjects.map((s) => s.subject_name)))
      .catch(() => setSyllabusSubjectOptions([]))
    setSyllabusSection("all")
    setSyllabusSubject("all")
  }, [academicYear, syllabusClass])

  // Once Class + Subject are both picked, this becomes the app-wide focus —
  // hydrates the shared curriculum (Syllabus Map reads the same
  // store) from the real Master Data syllabus tree for that class/subject.
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
  const conflicts = useMemo(() => detectConflicts(yearRows), [yearRows])

  // Data-source wrapper: resolves periods/week from the live store timetable
  // + holidays from the store calendar, then delegates to the canonical lib
  // implementation (shared with SyllabusMap, which reads the seed instead).
  const computeAutoPlannedEnd = (classId: string, plannedStart: string | undefined, periods: number | string | undefined, year: string) => {
    const map = CLASSID_TO_SECTION_SUBJECT[classId]
    if (!map || !plannedStart || !periods) return null
    const periodsPerWeek = masterTimetable.filter((r) => r.sectionId === map.sectionId && r.subject === map.subject && r.academicYear === year).length
    const endDate = autoPlannedEnd(periodsPerWeek, plannedStart, periods, calendar.map((h) => h.date))
    return endDate ? { endDate, periodsPerWeek } : null
  }

  const teachingDaysLabel = useMemo(() => effectiveTeachingDaysLabel(calendar), [calendar])

  // subject -> teacher/room lookup, derived from the timetable itself.
  const subjectMeta = (subject: string) => {
    const row = masterTimetable.find((r) => r.subject === subject)
    return { teacher: row?.teacher ?? "Unassigned", room: row?.room ?? "TBD" }
  }
  const masterSubjectsOptions = useMemo(
    () => [...new Set(masterTimetable.map((r) => r.subject))].filter((s) => s !== "Study Hall"),
    [masterTimetable]
  )

  // ---- modal helpers (entity behavior lives in the MODAL_REGISTRY) ----
  const modalCtx: ModalCtx = {
    academicYear,
    sectionId,
    curriculum,
    masterSubjectsOptions,
    subjectMeta,
    computeAutoPlannedEnd,
    toggleCoverageUnit,
  }

  function openAdd(type: ModalType) {
    setModal({ type, mode: "add", editingId: null, form: MODAL_REGISTRY[type].blank(modalCtx) })
  }
  function openEdit(type: ModalType, id: string) {
    const r = { curriculum, masterTimetable, exam: exams, calendar }[type].find((x) => x.id === id)
    if (!r) return
    const form: ModalForm =
      type === "exam" ? { ...(r as Exam), coverageUnitIds: [...((r as Exam).coverageUnitIds || [])] } : { ...r }
    setModal({ type, mode: "edit", editingId: id, form })
  }
  const setField = (field: keyof ModalForm, value: unknown) =>
    setModal((m) => (m ? { ...m, form: { ...m.form, [field]: value } } : m))

  // Entity upserts — one line per type; everything else dispatches through
  // the registry (blank/toRecord/noun/flashKey/Body).
  const upsert: Record<ModalType, (rec: ModalRecord, editingId: string | null) => void> = {
    curriculum: (rec, id) =>
      setCurriculum(id ? curriculum.map((r) => (r.id === id ? (rec as CurriculumUnit) : r)) : [...curriculum, rec as CurriculumUnit]),
    masterTimetable: (rec, id) =>
      setMasterTimetable(id ? masterTimetable.map((r) => (r.id === id ? (rec as never) : r)) : [...masterTimetable, rec as never]),
    exam: (rec, id) =>
      setExams((prev) => (id ? prev.map((r) => (r.id === id ? (rec as Exam) : r)) : [...prev, rec as Exam])),
    calendar: (rec, id) =>
      setCalendar((prev) => (id ? prev.map((r) => (r.id === id ? (rec as AcademicCalendarItem) : r)) : [...prev, rec as AcademicCalendarItem])),
  }

  function saveModal() {
    if (!modal) return
    const cfg = MODAL_REGISTRY[modal.type]
    upsert[modal.type](cfg.toRecord(modal.form, modal.editingId, modalCtx), modal.editingId)
    showFlash(cfg.flashKey, modal.mode === "add" ? "Added — changes apply across Lesson Planner, Syllabus Map, and Calendar." : "Saved.")
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

  // ---- Syllabus tab workflows ----
  function copyFromPreviousYear() {
    const result = copyCurriculumFromPreviousYear(curriculum, ACADEMIC_YEARS, academicYear)
    if (!result) {
      showFlash("curriculum", "No earlier academic year to copy from.")
      return
    }
    const { copies, prevYear, curYear } = result
    setCurriculum([...curriculum, ...copies])
    showFlash(
      "curriculum",
      copies.length
        ? `Copied ${copies.length} unit${copies.length === 1 ? "" : "s"} from ${prevYear}. Set new planned dates for each.`
        : `Nothing new to copy — all units already exist for ${curYear}.`
    )
  }

  function submitBulkUpload() {
    const rows = parseCurriculumBulk(bulkText, academicYear)
    setCurriculum([...curriculum, ...rows])
    setBulkOpen(false)
    setBulkText("")
    showFlash("curriculum", `Added ${rows.length} unit${rows.length === 1 ? "" : "s"} from upload.`)
  }

  // ---- Timetable tab workflows ----
  function copyTimetablePreviousYear() {
    const result = copyTimetableFromPreviousYear(masterTimetable, ACADEMIC_YEARS, academicYear)
    if (!result) {
      showFlash("timetable", "No earlier academic year to copy from.")
      return
    }
    const { copies, prevYear, curYear } = result
    setMasterTimetable([...masterTimetable, ...copies])
    showFlash(
      "timetable",
      copies.length
        ? `Copied ${copies.length} slot${copies.length === 1 ? "" : "s"} from ${prevYear}.`
        : `Nothing new to copy — all slots already exist for ${curYear}.`
    )
  }

  function submitTimetableBulk() {
    const rows = parseTimetableBulk(ttBulkText, academicYear)
    setMasterTimetable([...masterTimetable, ...rows])
    setTtBulkOpen(false)
    setTtBulkText("")
    showFlash("timetable", `Added ${rows.length} slot${rows.length === 1 ? "" : "s"} from upload.`)
  }

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
  const syllabusRows = buildSyllabusRows(curriculumRows, curriculum, exams, computeAutoPlannedEnd)

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

  const periodAllocationRows = computePeriodAllocation(
    yearRows,
    sectionId,
    curriculum,
    academicYear,
    (secId, subject) => SECTION_SUBJECT_TO_SYLLABUS_CLASS[`${secId}|${subject}`],
    (subject) => subjectMeta(subject).teacher,
  )
  const totalWeeklyPeriods = periodAllocationRows.reduce((a, r) => a + r.periodsPerWeek, 0)

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
        <TimetableSection
          academicYear={academicYear}
          setAcademicYear={setAcademicYear}
          sectionId={sectionId}
          setSectionId={setSectionId}
          teacherName={teacherName}
          setTeacherName={setTeacherName}
          teacherNameOptions={teacherNameOptions}
          subView={subView}
          setSubView={setSubView}
          globalContextLabel={globalContextLabel}
          yearRows={yearRows}
          conflicts={conflicts}
          timetableExamRows={timetableExamRows}
          masterSectionRows={masterSectionRows}
          teacherTotalPeriods={teacherTotalPeriods}
          teacherFreePeriods={teacherFreePeriods}
          periodAllocationRows={periodAllocationRows}
          totalWeeklyPeriods={totalWeeklyPeriods}
          effectiveTeachingDaysLabel={teachingDaysLabel}
          onCopyPreviousYear={copyTimetablePreviousYear}
          onOpenBulk={() => setTtBulkOpen(true)}
          onExport={() => exportTimetableCSV(masterTimetable.filter((r) => r.academicYear === academicYear), academicYear)}
          onAddSlot={() => openAdd("masterTimetable")}
          onEditSlot={(id) => openEdit("masterTimetable", id)}
          onDeleteSlot={deleteMasterRow}
        />
      )}

      {/* ===================== CURRICULUM (subjects by class) ===================== */}
      {tab === "curriculum" && <Curriculum />}

      {/* ===================== MASTER DATA (units / chapters / topics) ===================== */}
      {tab === "masterdata" && <MasterData />}

      {/* ===================== SYLLABUS ===================== */}
      {tab === "syllabus" && (
        <SyllabusSection
          academicYear={academicYear}
          setAcademicYear={setAcademicYear}
          syllabusClass={syllabusClass}
          setSyllabusClass={setSyllabusClass}
          syllabusSection={syllabusSection}
          setSyllabusSection={setSyllabusSection}
          syllabusSubject={syllabusSubject}
          setSyllabusSubject={setSyllabusSubject}
          syllabusClassOptions={syllabusClassOptions}
          syllabusSectionOptions={syllabusSectionOptions}
          syllabusSubjectOptions={syllabusSubjectOptions}
          curriculumSearch={curriculumSearch}
          setCurriculumSearch={setCurriculumSearch}
          rows={syllabusRows}
          expandedUnits={expandedUnits}
          onToggleUnit={(id) => setExpandedUnits((s) => ({ ...s, [id]: !s[id] }))}
          onToggleTopic={toggleTopicDone}
          onCopyPreviousYear={copyFromPreviousYear}
          onOpenBulk={() => setBulkOpen(true)}
          onExport={() => exportCurriculumCSV(curriculumRows, academicYear)}
          onAddUnit={() => openAdd("curriculum")}
          onEditUnit={(id) => openEdit("curriculum", id)}
          onDeleteUnit={deleteCurriculum}
        />
      )}

      {/* ===================== EXAM SCHEDULE ===================== */}
      {tab === "exam" && (
        <ExamsSection
          academicYear={academicYear}
          setAcademicYear={setAcademicYear}
          examSectionId={examSectionId}
          setExamSectionId={setExamSectionId}
          globalContextLabel={globalContextLabel}
          rows={buildExamRows(examRows, curriculum)}
          expandedExams={expandedExams}
          onToggleExam={(id) => setExpandedExams((s) => ({ ...s, [id]: !s[id] }))}
          onAddExam={() => openAdd("exam")}
          onEditExam={(id) => openEdit("exam", id)}
          onDeleteExam={deleteExam}
        />
      )}

      {/* ===================== ACADEMIC CALENDAR ===================== */}
      {tab === "calendar" && (
        <CalendarSection
          rows={calendarRows}
          onAddEntry={() => openAdd("calendar")}
          onEditEntry={(id) => openEdit("calendar", id)}
          onDeleteEntry={deleteCalendar}
        />
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
              {(() => {
                const Body = MODAL_REGISTRY[modal.type].Body
                return <Body modal={modal} setField={setField} setModal={setModal} ctx={modalCtx} />
              })()}
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
