import { Fragment, useEffect, useState, type CSSProperties } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronDown, ChevronRight } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ACADEMIC_CALENDAR_SEED,
  ACADEMIC_YEARS,
  APP_TODAY,
  CLASSES,
  EXAMS,
  MASTER_TIMETABLE,
  MT_SECTIONS,
  OKF_LIBRARY,
} from "@/data/seed"
import { parseShortDate } from "@/lib/dates"
import {
  barFill,
  unitStatusStyle,
  weightageChipStyle,
} from "@/lib/styles"
import type { CurriculumUnit } from "@/lib/types"
import { useAppStore } from "@/store/app-store"
import { useSchoolStore } from "@/store/school-store"
import { FlashBanner } from "@/components/common/FlashBanner"

// The Settings curriculum modal writes difficulty/dependsOn onto stored units
// (Settings.tsx), but the base CurriculumUnit type omits them — same local
// extension as Settings.tsx so both views agree on the shape.
type CurriculumUnitX = CurriculumUnit & { difficulty?: string; dependsOn?: string }

// ---- Local helpers (ported from _decomp/app.js so this screen is self-contained) ----

const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatShortDate(d: Date): string {
  return MONTH_NAMES_SHORT[d.getMonth()] + " " + d.getDate()
}

function classNameById(id: string): string {
  const c = CLASSES.find((x) => x.id === id)
  return c ? c.name : id
}

function sectionLabel(id: string): string {
  const s = MT_SECTIONS.find((x) => x.id === id)
  return s ? s.label : id
}

/** Auto planned-end from periods + the section/subject's weekly load, skipping weekends & holidays. */
function computeAutoPlannedEnd(
  classId: string,
  plannedStart: string | undefined,
  periods: number | undefined,
  academicYear: string
): string | null {
  const cls = CLASSES.find((c) => c.id === classId)
  if (!cls || !plannedStart || !periods) return null
  const periodsPerWeek = MASTER_TIMETABLE.filter(
    (r) => r.sectionId === cls.sectionId && r.subject === cls.subject && r.academicYear === academicYear
  ).length
  if (!periodsPerWeek) return null
  const periodsPerDay = periodsPerWeek / 5
  const teachingDaysNeeded = Math.ceil(Number(periods) / periodsPerDay)
  const holidaySet = new Set(ACADEMIC_CALENDAR_SEED.map((h) => h.date))
  let d = parseShortDate(plannedStart)
  let counted = 0
  let guard = 0
  while (counted < teachingDaysNeeded && guard < 400) {
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6 && !holidaySet.has(formatShortDate(d))) counted++
    if (counted < teachingDaysNeeded) d = new Date(d.getTime() + 86400000)
    guard++
  }
  return formatShortDate(d)
}

function unitStatus(row: { actual: number; plannedStart?: string; plannedEnd?: string }): string {
  if (Number(row.actual) >= 100) return "Completed"
  if (!row.plannedStart || !row.plannedEnd) return Number(row.actual) > 0 ? "In Progress" : "Not Started"
  const start = parseShortDate(row.plannedStart)
  const end = parseShortDate(row.plannedEnd)
  if (APP_TODAY.getTime() < start.getTime() && Number(row.actual) === 0) return "Not Started"
  if (APP_TODAY.getTime() > end.getTime() && Number(row.actual) < 100) return "Delayed"
  return "In Progress"
}

// The seed CurriculumUnit type carries no per-unit difficulty; the mockup form defaults it to "Medium".
const DEFAULT_DIFFICULTY = "Medium"

const headerCellStyle: CSSProperties = {
  padding: "10px 12px",
  borderBottom: "1px solid #E5E7EB",
  background: "#F9FAFB",
  fontSize: 14.5,
  color: "#6B7280",
  fontWeight: 600,
}
const cellBase: CSSProperties = { padding: 12, borderBottom: "1px solid #E5E7EB" }

const okfTriggerCls =
  "h-[34px] w-auto gap-2 rounded-[7px] border-[#E5E7EB] bg-white px-2.5 text-[13.5px] shadow-none"
const curriculumTriggerCls =
  "h-[38px] w-auto gap-2 rounded-[8px] border-[#E5E7EB] bg-white px-3 text-[14.5px] shadow-none"

export default function SyllabusMap() {
  const navigate = useNavigate()
  const academicYear = useAppStore((s) => s.academicYear)
  const sectionId = useAppStore((s) => s.sectionId)
  const setAcademicYear = useAppStore((s) => s.setAcademicYear)
  const setSectionId = useAppStore((s) => s.setSectionId)

  // Curriculum is shared so ticking a topic recomputes Actual % and propagates
  // cross-view (mockup: schoolConfig.curriculum).
  const curriculum = useSchoolStore((s) => s.curriculum) as CurriculumUnitX[]
  const toggleTopic = useSchoolStore((s) => s.toggleTopic)
  const showFlash = useSchoolStore((s) => s.showFlash)
  const hydrateCurriculum = useSchoolStore((s) => s.hydrateCurriculum)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  // Same server-backed syllabus as Lesson Planner's This Week — Actual %
  // here reflects topics ticked there (and vice versa), persisted in the DB.
  useEffect(() => {
    hydrateCurriculum()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [okfFilters, setOkfFilters] = useState({ classId: "all", subject: "all", topicId: "all" })
  const [classFilter, setClassFilter] = useState("all")
  const [search, setSearch] = useState("")

  const globalContextLabel = sectionLabel(sectionId) + " · " + academicYear

  // ---- OKF Curriculum Alignment computed views ----
  const okfSubjectOptions = [
    ...new Set(
      CLASSES.filter((c) => okfFilters.classId === "all" || c.id === okfFilters.classId).map((c) => c.subject)
    ),
  ]
  const okfTopicOptions = OKF_LIBRARY.chapters.flatMap((ch) =>
    ch.topics.map((t) => ({ id: t.id, label: `Ch.${ch.number} — ${t.title}` }))
  )
  const okfCoverageRows = OKF_LIBRARY.chapters
    .filter((ch) => {
      if (okfFilters.topicId === "all") return true
      const t = OKF_LIBRARY.chapters
        .flatMap((c) => c.topics.map((tp) => ({ id: tp.id, chapterId: c.id })))
        .find((x) => x.id === okfFilters.topicId)
      return !!t && t.chapterId === ch.id
    })
    .map((ch) => {
      const { classId, subject } = okfFilters
      const linked = curriculum.filter(
        (u) =>
          u.okfChapterId === ch.id &&
          u.academicYear === "2026–27" &&
          (classId === "all" || u.classId === classId) &&
          (subject === "all" || u.subject === subject)
      )
      const coverage = linked.length
        ? Math.round(linked.reduce((a, u) => a + Number(u.actual || 0), 0) / linked.length)
        : 0
      return {
        id: ch.id,
        number: ch.number,
        title: ch.title,
        linked: linked.length > 0,
        coverage,
        linkedUnitsLabel: linked.map((u) => u.unit + " — " + classNameById(u.classId)).join(", "),
      }
    })

  // ---- Syllabus table computed rows ----
  const filtered = curriculum.filter(
    (r) =>
      r.academicYear === academicYear &&
      (classFilter === "all" || r.classId === classFilter) &&
      (!search || (r.subject + " " + r.unit).toLowerCase().includes(search.toLowerCase()))
  )

  const curriculumRows = filtered.map((r) => {
    const auto = computeAutoPlannedEnd(r.classId, r.plannedStart, r.periods, r.academicYear)
    const displayPlannedEnd = auto ?? r.plannedEnd
    const status = unitStatus({ ...r, plannedEnd: displayPlannedEnd })
    const siblings = curriculum.filter(
      (u) => u.classId === r.classId && u.academicYear === r.academicYear && u.term === r.term
    )
    const cumulativePeriods = siblings
      .filter((u) => parseShortDate(u.plannedStart || "Jan 1").getTime() <= parseShortDate(r.plannedStart || "Jan 1").getTime())
      .reduce((a, u) => a + Number(u.periods || 0), 0)
    const testedIn = EXAMS.filter((ex) => (ex.coverageUnitIds || []).includes(r.id)).map((ex) => ex.title)
    const okfChapter = r.okfChapterId ? OKF_LIBRARY.chapters.find((c) => c.id === r.okfChapterId) : undefined
    const dependsOnUnit = r.dependsOn ? curriculum.find((u) => u.id === r.dependsOn) : null
    const dependsIncomplete = !!(dependsOnUnit && Number(dependsOnUnit.actual) < 100)
    return {
      ...r,
      className: classNameById(r.classId),
      status,
      displayPlannedEnd,
      isAutoPlannedEnd: !!auto,
      cumulativePeriods,
      topicsDoneCount: r.topics.filter((t) => t.done).length,
      topicsTotalCount: r.topics.length,
      testedInLabel: testedIn.length ? testedIn.join(", ") : "Not yet linked to an exam",
      okfChapter,
      dependsOnUnit,
      dependsIncomplete,
    }
  })

  const toggleUnit = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }))

  const handleToggleTopic = (unitId: string, topicId: string) => {
    toggleTopic(unitId, topicId)
    showFlash("lesson", "Marked taught — Syllabus Actual % updated.", 3000)
  }

  const viewChapter = (chapterId: string) => navigate(`/resources?expandChapter=${chapterId}`)

  const changeOkfFilter = (field: "classId" | "subject" | "topicId", value: string) => {
    setOkfFilters((prev) => {
      const next = { ...prev, [field]: value }
      if (field === "classId") {
        next.subject = "all"
        next.topicId = "all"
      }
      if (field === "subject") next.topicId = "all"
      return next
    })
  }

  const changeClassFilter = (value: string) => {
    setClassFilter(value)
    if (value !== "all") {
      const cls = CLASSES.find((c) => c.id === value)
      if (cls) setSectionId(cls.sectionId)
    }
  }

  const exportCSV = () => {
    const header = [
      "Subject", "Class/Section", "Term", "Unit", "Periods", "Planned Start",
      "Planned End", "Planned %", "Actual %", "Status", "Textbook", "Weightage",
    ]
    const lines = [header.join(",")]
    filtered.forEach((r) => {
      const status = unitStatus(r)
      lines.push(
        [r.subject, classNameById(r.classId), r.term, r.unit, r.periods, r.plannedStart, r.plannedEnd, r.planned, r.actual, status, r.textbookRef, r.weightage]
          .map((v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`)
          .join(",")
      )
    })
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `syllabus_${academicYear}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const chipStyle: CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "#16332B",
    background: "#E9F1EC",
    border: "1px solid #BFE0D3",
    padding: "4px 10px",
    borderRadius: 999,
  }

  return (
    <div data-screen-label="Syllabus Map">
      {/* Header */}
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <div className="font-display text-[24px] font-bold text-ink">Syllabus Map</div>
        <div className="flex items-center gap-2.5">
          <span style={chipStyle}>📍 {globalContextLabel}</span>
          <div
            onClick={exportCSV}
            style={{
              background: "#fff",
              color: "#16332B",
              border: "1px solid #16332B",
              padding: "9px 14px",
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Export
          </div>
        </div>
      </div>
      <div className="mb-4 text-[16px] text-text-secondary">
        Syllabus coverage, learning objectives, and milestones.
      </div>

      <FlashBanner flashKey="lesson" />

      {/* OKF Curriculum Alignment */}
      <div
        className="mb-4 rounded-[12px] border border-card-border bg-cream shadow-card"
        style={{ padding: "18px 20px" }}
      >
        <div className="mb-1 flex items-center gap-2">
          <div className="text-[15.5px] font-bold text-[#111827]">OKF Curriculum Alignment</div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#16332B",
              background: "#E9F1EC",
              border: "1px solid #BFE0D3",
              padding: "2px 8px",
              borderRadius: 999,
            }}
          >
            🔗 CBSE · Class 10 · Mathematics
          </span>
        </div>
        <div className="mb-3 text-[13px] text-[#9CA3AF]">
          Where your planned units map onto the OKF chapter taxonomy, and how much of each is taught so far.
        </div>

        {/* Cascading Class › Subject › Topic filters */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Select value={okfFilters.classId} onValueChange={(v) => changeOkfFilter("classId", v)}>
            <SelectTrigger className={okfTriggerCls}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {CLASSES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span style={{ color: "#D1D5DB" }}>›</span>
          <Select value={okfFilters.subject} onValueChange={(v) => changeOkfFilter("subject", v)}>
            <SelectTrigger className={okfTriggerCls}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {okfSubjectOptions.map((subj) => (
                <SelectItem key={subj} value={subj}>
                  {subj}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span style={{ color: "#D1D5DB" }}>›</span>
          <Select value={okfFilters.topicId} onValueChange={(v) => changeOkfFilter("topicId", v)}>
            <SelectTrigger className={`${okfTriggerCls} max-w-[240px]`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Topics</SelectItem>
              {okfTopicOptions.map((tp) => (
                <SelectItem key={tp.id} value={tp.id}>
                  {tp.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Coverage rows */}
        <div className="flex flex-col gap-2">
          {okfCoverageRows.map((okfc) => (
            <div
              key={okfc.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.6fr 1fr auto",
                alignItems: "center",
                gap: 12,
                padding: "8px 10px",
                borderRadius: 8,
                background: "#fff",
                border: "1px solid #E5E7EB",
              }}
            >
              <div className="text-[14px] font-semibold text-[#111827]">
                Ch. {okfc.number} — {okfc.title}
              </div>
              {okfc.linked ? (
                <div>
                  <div
                    style={{
                      width: "100%",
                      maxWidth: 160,
                      height: 7,
                      background: "#F1F5F9",
                      borderRadius: 999,
                      overflow: "hidden",
                      marginBottom: 3,
                    }}
                  >
                    <div style={barFill(okfc.coverage, "#3F6E62")} />
                  </div>
                  <div className="text-[12px] text-[#6B7280]">
                    {okfc.coverage}% taught · {okfc.linkedUnitsLabel}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: "#9CA3AF", fontStyle: "italic" }}>
                  Not yet scheduled in your syllabus
                </div>
              )}
              <div
                onClick={() => viewChapter(okfc.id)}
                style={{ fontSize: 12.5, fontWeight: 700, color: "#16332B", cursor: "pointer", whiteSpace: "nowrap" }}
              >
                View in OKF Library →
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Year / Class / Search filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Select value={academicYear} onValueChange={(v) => setAcademicYear(v)}>
          <SelectTrigger className={curriculumTriggerCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACADEMIC_YEARS.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={classFilter} onValueChange={changeClassFilter}>
          <SelectTrigger className={curriculumTriggerCls}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes &amp; Sections</SelectItem>
            {CLASSES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} — {c.subject}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search unit or subject..."
          style={{
            height: 38,
            padding: "0 12px",
            border: "1px solid #E5E7EB",
            borderRadius: 8,
            fontSize: 14.5,
            fontFamily: "inherit",
            flex: 1,
            minWidth: 180,
            background: "#fff",
          }}
        />
      </div>

      {/* Syllabus table */}
      <div
        className="rounded-[12px] border border-card-border bg-cream shadow-card"
        style={{ padding: 20, overflowX: "auto" }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 0.7fr 1.3fr 0.7fr 0.8fr 1fr 0.9fr 0.9fr",
            minWidth: 900,
          }}
        >
          {["Unit", "Term", "Planned Dates", "Periods", "Planned %", "Actual %", "Status", "Weightage"].map((h) => (
            <div key={h} style={headerCellStyle}>
              {h}
            </div>
          ))}

          {curriculumRows.map((row) => (
            <Fragment key={row.id}>
              {/* Unit */}
              <div style={{ ...cellBase, verticalAlign: "top" }}>
                <div
                  className="flex cursor-pointer items-start gap-2"
                  onClick={() => toggleUnit(row.id)}
                >
                  {expanded[row.id] ? (
                    <ChevronDown className="mt-[3px] size-3 text-[#9CA3AF]" />
                  ) : (
                    <ChevronRight className="mt-[3px] size-3 text-[#9CA3AF]" />
                  )}
                  <div>
                    <div className="text-[15.5px] font-bold text-[#111827]">{row.unit}</div>
                    <div className="mt-0.5 text-[13.5px] text-[#6B7280]">
                      {row.subject} · {row.className}
                    </div>
                    <div className="mt-0.5 text-[12.5px] text-[#9CA3AF]">
                      {row.topicsDoneCount}/{row.topicsTotalCount} topics complete
                    </div>
                    {row.okfChapter && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation()
                          viewChapter(row.okfChapter!.id)
                        }}
                        style={{
                          fontSize: 11.5,
                          fontWeight: 700,
                          color: "#16332B",
                          background: "#E9F1EC",
                          border: "1px solid #BFE0D3",
                          padding: "2px 7px",
                          borderRadius: 999,
                          marginTop: 5,
                          display: "inline-block",
                          cursor: "pointer",
                        }}
                      >
                        🔗 OKF Ch.{row.okfChapter.number}: {row.okfChapter.title}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Term */}
              <div style={{ ...cellBase, fontSize: 15, color: "#374151", display: "flex", alignItems: "center" }}>
                {row.term}
              </div>

              {/* Planned Dates */}
              <div
                style={{
                  ...cellBase,
                  fontSize: 14.5,
                  color: "#374151",
                  whiteSpace: "nowrap",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {row.plannedStart} – {row.displayPlannedEnd}
                {row.isAutoPlannedEnd && <span style={{ color: "#9CA3AF", fontWeight: 400 }}> (auto)</span>}
              </div>

              {/* Periods */}
              <div style={{ ...cellBase, fontSize: 15, color: "#374151", display: "flex", alignItems: "center" }}>
                {row.periods}
              </div>

              {/* Planned % */}
              <div style={{ ...cellBase, fontSize: 15, color: "#374151", display: "flex", alignItems: "center" }}>
                {row.planned}%
              </div>

              {/* Actual % */}
              <div style={{ ...cellBase, minWidth: 120 }}>
                <div
                  style={{
                    width: 90,
                    height: 8,
                    background: "#F1F5F9",
                    borderRadius: 999,
                    overflow: "hidden",
                    marginBottom: 4,
                  }}
                >
                  <div style={barFill(row.actual, "#3F6E62")} />
                </div>
                <div className="text-[13px] text-[#6B7280]">{row.actual}%</div>
              </div>

              {/* Status */}
              <div style={{ ...cellBase, display: "flex", alignItems: "center" }}>
                <span style={unitStatusStyle(row.status)}>{row.status}</span>
              </div>

              {/* Weightage */}
              <div style={{ ...cellBase, display: "flex", alignItems: "center" }}>
                <span style={weightageChipStyle(row.weightage)}>{row.weightage}</span>
              </div>

              {/* Expanded detail */}
              {expanded[row.id] && (
                <div
                  style={{
                    gridColumn: "1 / -1",
                    padding: "14px 16px 18px 40px",
                    borderBottom: "1px solid #E5E7EB",
                    background: "#FBFAF6",
                  }}
                >
                  <div className="mb-2 text-[13px] font-semibold text-[#6B7280]">Topics</div>
                  {row.topics.map((topic) => (
                    <div
                      key={topic.id}
                      className="flex cursor-pointer items-center gap-2 py-1"
                      onClick={() => handleToggleTopic(row.id, topic.id)}
                    >
                      <input
                        type="checkbox"
                        checked={topic.done}
                        readOnly
                        style={{ width: 15, height: 15, accentColor: "#3F6E62", cursor: "pointer" }}
                      />
                      <span
                        style={
                          topic.done
                            ? { fontSize: 14.5, color: "#9CA3AF", textDecoration: "line-through" }
                            : { fontSize: 14.5, color: "#374151" }
                        }
                      >
                        {topic.name}
                      </span>
                    </div>
                  ))}
                  <div
                    className="mt-2.5 flex flex-wrap gap-4 text-[13px]"
                    style={{ color: "#9CA3AF" }}
                  >
                    <div>Textbook: {row.textbookRef}</div>
                    <div>
                      Difficulty:{" "}
                      <span
                        style={weightageChipStyle(
                          row.difficulty === "High" ? "High" : row.difficulty === "Low" ? "Low" : "Medium"
                        )}
                      >
                        {row.difficulty || DEFAULT_DIFFICULTY}
                      </span>
                    </div>
                    <div>Cumulative periods to date: {row.cumulativePeriods}</div>
                    <div>Tested in: {row.testedInLabel}</div>
                  </div>
                  {row.dependsOnUnit && (
                    <div
                      className="mt-1.5 text-[13px]"
                      style={{ color: row.dependsIncomplete ? "#DC2626" : "#9CA3AF" }}
                    >
                      Depends on: {row.dependsOnUnit.unit}
                      {row.dependsIncomplete && " — ⚠ not yet complete"}
                    </div>
                  )}
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
