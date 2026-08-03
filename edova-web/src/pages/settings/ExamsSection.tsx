// Exam Schedule tab: filter bar + exam grid with readiness derivation.
// Pure render — data and callbacks arrive as props.
import { ACADEMIC_YEARS, CLASSES, MT_SECTIONS } from "@/data/seed"
import { APP_TODAY, parseShortDate } from "@/lib/dates"
import type { CurriculumUnit, Exam } from "@/lib/types"
import { FlashBanner } from "@/components/common/FlashBanner"
import {
  FragmentKey,
  bodyCell,
  ctxBadge,
  deleteLink,
  editLink,
  examReadinessStyle,
  filterCtrl,
  primaryBtn,
  th,
} from "./settings-utils"

export interface ExamRow {
  exam: Exam
  classSubject: string
  className: string
  daysLabel: string
  readinessPct: number | null
  status: string
  coveredUnits: CurriculumUnit[]
  atRiskUnit: CurriculumUnit | undefined
}

export interface ExamsSectionProps {
  academicYear: string
  setAcademicYear: (y: string) => void
  examSectionId: string
  setExamSectionId: (id: string) => void
  globalContextLabel: string
  rows: ExamRow[]
  expandedExams: Record<string, boolean>
  onToggleExam: (id: string) => void
  onAddExam: () => void
  onEditExam: (id: string) => void
  onDeleteExam: (id: string) => void
}

/** Readiness % = periods-weighted completion across the exam's covered units. */
export function buildExamRows(examRows: Exam[], curriculum: CurriculumUnit[]): ExamRow[] {
  return examRows.map((r) => {
    const cls = CLASSES.find((c) => c.id === r.classId)
    const daysToExam = Math.round((parseShortDate(r.date).getTime() - APP_TODAY.getTime()) / 86400000)
    const coveredUnits = (r.coverageUnitIds || []).map((id) => curriculum.find((u) => u.id === id)).filter((u): u is CurriculumUnit => !!u)
    const totalPeriodsInScope = coveredUnits.reduce((a, u) => a + Number(u.periods || 0), 0)
    const periodsCompleted = coveredUnits.reduce((a, u) => a + (Number(u.periods || 0) * Number(u.actual || 0)) / 100, 0)
    const readinessPct = totalPeriodsInScope ? Math.round((periodsCompleted / totalPeriodsInScope) * 100) : null
    const status = readinessPct == null ? "—" : readinessPct >= 80 ? "Ready" : readinessPct >= 60 ? "Needs Revision" : "Not Ready"
    const atRiskUnit = coveredUnits.find((u) => Number(u.actual) === 0)
    return {
      exam: r,
      classSubject: cls?.subject ?? "",
      className: cls?.name ?? "",
      daysLabel: daysToExam < 0 ? "Past" : `${daysToExam}d`,
      readinessPct,
      status,
      coveredUnits,
      atRiskUnit,
    }
  })
}

export function ExamsSection(p: ExamsSectionProps) {
  return (
    <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>Exam Schedule</div>
          <span style={ctxBadge()}>📍 {p.globalContextLabel}</span>
        </div>
        <button style={primaryBtn} onClick={p.onAddExam}>+ Add Exam</button>
      </div>

      <FlashBanner flashKey="exam" />

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={p.academicYear} onChange={(e) => p.setAcademicYear(e.target.value)} style={filterCtrl}>
          {ACADEMIC_YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={p.examSectionId} onChange={(e) => p.setExamSectionId(e.target.value)} style={filterCtrl}>
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
        {p.rows.map(({ exam: r, classSubject, className, daysLabel, readinessPct, status, coveredUnits, atRiskUnit }) => {
          const expanded = !!p.expandedExams[r.id]
          return (
            <FragmentKey key={r.id}>
              <div style={{ padding: 12, borderBottom: "1px solid #E5E7EB" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, cursor: "pointer" }} onClick={() => p.onToggleExam(r.id)}>
                  <span style={{ fontSize: 12, color: "#9CA3AF", marginTop: 3 }}>{expanded ? "▾" : "▸"}</span>
                  <div>
                    <div style={{ fontSize: 15.5, fontWeight: 700, color: "#111827" }}>{r.title}</div>
                    <div style={{ fontSize: 13.5, color: "#6B7280", marginTop: 2 }}>{classSubject} · {className}</div>
                  </div>
                </div>
              </div>
              <div style={bodyCell}>{r.date}</div>
              <div style={bodyCell}>{daysLabel}</div>
              <div style={{ ...bodyCell, fontWeight: 600, color: "#111827" }}>{readinessPct == null ? "—" : `${readinessPct}%`}</div>
              <div style={bodyCell}><span style={examReadinessStyle(status)}>{status}</span></div>
              <div style={{ ...bodyCell, justifyContent: "flex-end", whiteSpace: "nowrap" }}>
                {editLink(() => p.onEditExam(r.id))}
                {deleteLink(() => p.onDeleteExam(r.id))}
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
  )
}
