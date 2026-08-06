// Syllabus tab: filters + unit grid with expandable topic rows. Pure render —
// all data and callbacks arrive as props.
import { ACADEMIC_YEARS } from "@/data/seed"
import { parseShortDate } from "@/lib/dates"
import { classNameById, unitStatus } from "@/lib/curriculum-utils"
import { barFill, unitStatusStyle, weightageChipStyle } from "@/lib/styles"
import type { CurriculumUnit, Exam } from "@/lib/types"
import { FlashBanner } from "@/components/common/FlashBanner"
import {
  FragmentKey,
  bodyCell,
  deleteLink,
  editLink,
  filterCtrl,
  outlineBtn,
  primaryBtn,
  th,
} from "./settings-utils"

export interface SyllabusRow {
  row: CurriculumUnit
  displayPlannedEnd: string
  isAuto: boolean
  status: string
  doneCount: number
  cumulativePeriods: number
  testedIn: string[]
  dependsOnUnit: CurriculumUnit | null
  dependsIncomplete: boolean
}

export interface SyllabusSectionProps {
  academicYear: string
  setAcademicYear: (y: string) => void
  syllabusClass: string
  setSyllabusClass: (v: string) => void
  syllabusSection: string
  setSyllabusSection: (v: string) => void
  syllabusSubject: string
  setSyllabusSubject: (v: string) => void
  syllabusClassOptions: string[]
  syllabusSectionOptions: string[]
  syllabusSubjectOptions: string[]
  curriculumSearch: string
  setCurriculumSearch: (v: string) => void
  rows: SyllabusRow[]
  expandedUnits: Record<string, boolean>
  onToggleUnit: (id: string) => void
  onToggleTopic: (unitId: string, topicId: string) => void
  onCopyPreviousYear: () => void
  onOpenBulk: () => void
  onExport: () => void
  onAddUnit: () => void
  onEditUnit: (id: string) => void
  onDeleteUnit: (id: string) => void
}

export function SyllabusSection(p: SyllabusSectionProps) {
  return (
    <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: "#111827", marginBottom: 12 }}>School Syllabus</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={outlineBtn} onClick={p.onCopyPreviousYear}>Copy from Previous Year</button>
          <button style={outlineBtn} onClick={p.onOpenBulk}>Bulk Upload</button>
          <button style={outlineBtn} onClick={p.onExport}>Export</button>
          <button style={primaryBtn} onClick={p.onAddUnit}>+ Add Unit</button>
        </div>
      </div>

      <FlashBanner flashKey="curriculum" />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={p.academicYear} onChange={(e) => p.setAcademicYear(e.target.value)} style={filterCtrl}>
          {ACADEMIC_YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={p.syllabusClass} onChange={(e) => p.setSyllabusClass(e.target.value)} style={filterCtrl}>
          <option value="all">All Classes</option>
          {p.syllabusClassOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select value={p.syllabusSection} onChange={(e) => p.setSyllabusSection(e.target.value)} style={filterCtrl} disabled={p.syllabusClass === "all"}>
          <option value="all">All Sections</option>
          {p.syllabusSectionOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={p.syllabusSubject} onChange={(e) => p.setSyllabusSubject(e.target.value)} style={filterCtrl} disabled={p.syllabusClass === "all"}>
          <option value="all">All Subjects</option>
          {p.syllabusSubjectOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input value={p.curriculumSearch} onChange={(e) => p.setCurriculumSearch(e.target.value)} placeholder="Search unit or subject..." style={{ ...filterCtrl, flex: 1, minWidth: 180 }} />
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
          {p.rows.map(({ row: r, displayPlannedEnd, isAuto, status, doneCount, cumulativePeriods, testedIn, dependsOnUnit, dependsIncomplete }) => {
            const expanded = !!p.expandedUnits[r.id]
            return (
              <FragmentKey key={r.id}>
                <div style={{ padding: 12, borderBottom: "1px solid #E5E7EB" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }} onClick={() => p.onToggleUnit(r.id)}>
                    <span style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>{expanded ? "▾" : "▸"}</span>
                    <div>
                      <div style={{ fontSize: 15.5, fontWeight: 700, color: "#111827" }}>{r.unit}</div>
                      <div style={{ fontSize: 13.5, color: "#6B7280", marginTop: 2 }}>{r.subject} · {classNameById(r.classId)}</div>
                      <div style={{ fontSize: 12.5, color: "#9CA3AF", marginTop: 2 }}>{doneCount}/{r.topics.length} topics complete</div>
                    </div>
                  </div>
                </div>
                <div style={bodyCell}>{r.term ?? "Term 1"}</div>
                <div style={{ ...bodyCell, fontSize: 14.5, whiteSpace: "nowrap" }}>
                  {r.plannedStart} – {displayPlannedEnd}
                  {isAuto && <span style={{ color: "#9CA3AF", fontWeight: 400 }}> (auto)</span>}
                </div>
                <div style={bodyCell}>{r.periods ?? 0}</div>
                <div style={bodyCell}>{r.planned ?? 0}%</div>
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
                  {editLink(() => p.onEditUnit(r.id))}
                  {deleteLink(() => p.onDeleteUnit(r.id))}
                </div>
                {expanded && (
                  <div style={{ gridColumn: "1 / -1", padding: "14px 16px 18px 40px", borderBottom: "1px solid #E5E7EB", background: "#FBFAF6" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#6B7280", marginBottom: 8 }}>Topics</div>
                    {r.topics.map((topic) => (
                      <div key={topic.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer" }} onClick={() => p.onToggleTopic(r.id, topic.id)}>
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
  )
}

/** Per-row derivation the page used to inline in JSX: auto planned-end,
 * status, cumulative periods, exam links, dependency state. */
export function buildSyllabusRows(
  curriculumRows: CurriculumUnit[],
  curriculum: CurriculumUnit[],
  exams: Exam[],
  computeAutoPlannedEnd: (classId: string, plannedStart: string | undefined, periods: number | string | undefined, year: string) => { endDate: string; periodsPerWeek: number } | null,
 ): SyllabusRow[] {
  return curriculumRows.map((r) => {
    const autoInfo = computeAutoPlannedEnd(r.classId, r.plannedStart, r.periods, r.academicYear ?? "")
    const displayPlannedEnd = (autoInfo ? autoInfo.endDate : r.plannedEnd) ?? ""
    const status = unitStatus({ ...r, plannedEnd: displayPlannedEnd })
    const doneCount = r.topics.filter((t) => t.done).length
    const siblings = curriculum.filter((u) => u.classId === r.classId && u.academicYear === r.academicYear && (u.term ?? "Term 1") === (r.term ?? "Term 1"))
    const cumulativePeriods = siblings
      .filter((u) => parseShortDate(u.plannedStart || "Jan 1") <= parseShortDate(r.plannedStart || "Jan 1"))
      .reduce((a, u) => a + Number(u.periods || 0), 0)
    const testedIn = exams.filter((ex) => (ex.coverageUnitIds || []).includes(r.id)).map((ex) => ex.title)
    const dependsOnUnit = r.dependsOn ? (curriculum.find((u) => u.id === r.dependsOn) ?? null) : null
    const dependsIncomplete = !!(dependsOnUnit && Number(dependsOnUnit.actual) < 100)
    return { row: r, displayPlannedEnd, isAuto: !!autoInfo, status, doneCount, cumulativePeriods, testedIn, dependsOnUnit, dependsIncomplete }
  })
}
