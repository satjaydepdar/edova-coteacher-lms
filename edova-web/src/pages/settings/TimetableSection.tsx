// Timetable tab: class/teacher grid views + period-allocation summary +
// slot management. Pure render — all data and callbacks arrive as props.
import {
  ACADEMIC_YEARS,
  MT_DAYS,
  MT_GRID_STRUCTURE,
  MT_SECTIONS,
} from "@/data/seed"
import { sectionLabel } from "@/lib/curriculum-utils"
import type { Exam, MasterTimetableRow } from "@/lib/types"
import { FlashBanner } from "@/components/common/FlashBanner"
import type { PeriodAllocationRow, TimetableConflicts } from "./timetable-utils"
import {
  FragmentKey,
  FragmentRow,
  bodyCell,
  cellShell,
  ctxBadge,
  deleteLink,
  editLink,
  filterCtrl,
  outlineBtn,
  primaryBtn,
  subViewTabStyle,
  th,
  type SubView,
} from "./settings-utils"

export interface TimetableSectionProps {
  academicYear: string
  setAcademicYear: (y: string) => void
  sectionId: string
  setSectionId: (id: string) => void
  teacherName: string
  setTeacherName: (n: string) => void
  teacherNameOptions: string[]
  subView: SubView
  setSubView: (v: SubView) => void
  globalContextLabel: string
  yearRows: MasterTimetableRow[]
  conflicts: TimetableConflicts
  timetableExamRows: Exam[]
  masterSectionRows: MasterTimetableRow[]
  teacherTotalPeriods: number
  teacherFreePeriods: number
  periodAllocationRows: PeriodAllocationRow[]
  totalWeeklyPeriods: number
  effectiveTeachingDaysLabel: string
  onCopyPreviousYear: () => void
  onOpenBulk: () => void
  onExport: () => void
  onAddSlot: () => void
  onEditSlot: (id: string) => void
  onDeleteSlot: (id: string) => void
}

export function TimetableSection(p: TimetableSectionProps) {
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
                    ? p.yearRows.find((r) => r.sectionId === p.sectionId && r.day === day && r.period === g.period)
                    : p.yearRows.find((r) => r.teacher === p.teacherName && r.day === day && r.period === g.period)
                const hasConflict = !!(slot && p.conflicts.conflictIds.has(slot.id))
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

  return (
    <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card">
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>School Timetable</div>
          <span style={ctxBadge()}>📍 {p.globalContextLabel}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button style={outlineBtn} onClick={p.onCopyPreviousYear}>Copy from Previous Year</button>
          <button style={outlineBtn} onClick={p.onOpenBulk}>Bulk Upload</button>
          <button style={outlineBtn} onClick={p.onExport}>Export</button>
          <button style={primaryBtn} onClick={p.onAddSlot}>+ Add Slot</button>
        </div>
      </div>

      <FlashBanner flashKey="timetable" />

      {p.conflicts.messages.length > 0 && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#B91C1C", padding: "10px 14px", borderRadius: 8, fontSize: 14, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>⚠ Scheduling conflicts detected</div>
          {p.conflicts.messages.map((m, i) => (
            <div key={i} style={{ fontSize: 13.5, marginTop: 2 }}>{m}</div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={p.academicYear} onChange={(e) => p.setAcademicYear(e.target.value)} style={filterCtrl}>
          {ACADEMIC_YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <select value={p.sectionId} onChange={(e) => p.setSectionId(e.target.value)} style={filterCtrl}>
          {MT_SECTIONS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <select value={p.teacherName} onChange={(e) => p.setTeacherName(e.target.value)} style={filterCtrl}>
          {p.teacherNameOptions.map((tn) => (
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
          <div key={key} onClick={() => p.setSubView(key)} style={subViewTabStyle(p.subView === key)}>{label}</div>
        ))}
      </div>

      {/* Class view */}
      {p.subView === "class" && (
        <div>
          {p.timetableExamRows.length > 0 && (
            <div style={{ background: "#F9FAFB", border: "1px solid #E5E7EB", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: "#374151", marginBottom: 6 }}>📝 Upcoming Exams — {sectionLabel(p.sectionId)}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                {p.timetableExamRows.map((ex) => (
                  <span key={ex.id} style={{ fontSize: 13.5, color: "#6B7280" }}>
                    {ex.title} <strong style={{ color: "#111827" }}>{ex.date}</strong>
                  </span>
                ))}
              </div>
            </div>
          )}
          {renderTimetableGrid("class")}
          <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 10 }}>Manage Slots — {sectionLabel(p.sectionId)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "0.9fr 0.8fr 1.3fr 1.3fr 1fr 1fr" }}>
            {th("Day")}
            {th("Period")}
            {th("Subject")}
            {th("Teacher")}
            {th("Room")}
            {th("Actions", { textAlign: "right" })}
            {p.masterSectionRows.map((r) => (
              <FragmentKey key={r.id}>
                <div style={bodyCell}>{r.day}</div>
                <div style={bodyCell}>{r.period}</div>
                <div style={{ ...bodyCell, fontSize: 15.5, fontWeight: 600, color: "#111827" }}>{r.subject}</div>
                <div style={bodyCell}>{r.teacher}</div>
                <div style={bodyCell}>{r.room}</div>
                <div style={{ ...bodyCell, justifyContent: "flex-end", whiteSpace: "nowrap" }}>
                  {editLink(() => p.onEditSlot(r.id))}
                  {deleteLink(() => p.onDeleteSlot(r.id))}
                </div>
              </FragmentKey>
            ))}
          </div>
        </div>
      )}

      {/* Teacher view */}
      {p.subView === "teacher" && (
        <div>
          <div style={{ display: "flex", gap: 20, marginBottom: 16, flexWrap: "wrap" }}>
            <div style={{ fontSize: 14.5, color: "#374151" }}>Total Teaching Periods: <strong>{p.teacherTotalPeriods}/week</strong></div>
            <div style={{ fontSize: 14.5, color: "#374151" }}>Free Periods: <strong>{p.teacherFreePeriods}/week</strong></div>
          </div>
          {renderTimetableGrid("teacher")}
        </div>
      )}

      {/* Summary view */}
      {p.subView === "summary" && (
        <div>
          <div style={{ fontSize: 14.5, color: "#6B7280", marginBottom: 6 }}>{sectionLabel(p.sectionId)} — periods/week vs. what the Syllabus requires to finish each unit on time.</div>
          <div style={{ fontSize: 13.5, color: "#9CA3AF", marginBottom: 14 }}>Effective teaching days: {p.effectiveTeachingDaysLabel}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1.4fr 2fr 1.2fr" }}>
            {th("Subject")}
            {th("Periods/Week")}
            {th("Teacher")}
            {th("Syllabus Units Assigned")}
            {th("Required/Week")}
            {p.periodAllocationRows.map((r) => (
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
            <div style={{ padding: 12, fontSize: 15, fontWeight: 700, color: "#111827" }}>{p.totalWeeklyPeriods}</div>
            <div style={{ padding: 12 }} />
            <div style={{ padding: 12 }} />
            <div style={{ padding: 12 }} />
          </div>
        </div>
      )}
    </div>
  )
}
