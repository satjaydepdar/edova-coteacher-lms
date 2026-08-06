// Modal registry for the Settings page's 4 entity editors. ONE entry per
// entity carries its title noun, flash key, blank form, form→record mapping,
// and body component — openEdit/saveModal/modalTitle/the render switch all
// dispatch through this table. Adding a 5th entity = one entry here (+ one
// upsert line in the page).
import {
  ACADEMIC_YEARS,
  CALENDAR_TYPES,
  CLASSES,
  DAYS_OF_WEEK,
  DIFFICULTY_LEVELS,
  EXAM_TYPES,
  MT_PERIODS,
  MT_SECTIONS,
  TEACHERS,
  TERMS,
  WEIGHTAGE_LEVELS,
} from "@/data/seed"
import type {
  AcademicCalendarItem,
  CurriculumUnit,
  Exam,
  MasterTimetableRow,
} from "@/lib/types"
import type { FlashKey } from "@/store/school-store"
import {
  PERIOD_TIME_LABELS,
  modalInput,
  modalLabel,
  type ModalForm,
  type ModalState,
  type ModalType,
} from "./settings-utils"

export interface ModalCtx {
  academicYear: string
  sectionId: string
  curriculum: CurriculumUnit[]
  masterSubjectsOptions: string[]
  subjectMeta: (subject: string) => { teacher: string; room: string }
  computeAutoPlannedEnd: (
    classId: string,
    plannedStart: string | undefined,
    periods: number | string | undefined,
    year: string,
  ) => { endDate: string; periodsPerWeek: number } | null
  toggleCoverageUnit?: (unitId: string) => void
}

export interface ModalBodyProps {
  modal: ModalState
  setField: (field: keyof ModalForm, value: unknown) => void
  setModal: React.Dispatch<React.SetStateAction<ModalState | null>>
  ctx: ModalCtx
}

export type ModalRecord = CurriculumUnit | MasterTimetableRow | Exam | AcademicCalendarItem

export interface ModalConfig {
  noun: string
  flashKey: FlashKey
  blank: (ctx: ModalCtx) => ModalForm
  toRecord: (form: ModalForm, editingId: string | null, ctx: ModalCtx) => ModalRecord
  Body: React.ComponentType<ModalBodyProps>
}

function MasterTimetableBody({ modal, setField, setModal, ctx }: ModalBodyProps) {
  return (
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
          const meta = ctx.subjectMeta(e.target.value)
          setModal((m) => (m ? { ...m, form: { ...m.form, subject: e.target.value, teacher: meta.teacher, room: meta.room } } : m))
        }}
        style={modalInput}
      >
        {ctx.masterSubjectsOptions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <div style={modalLabel}>Teacher <span style={{ fontWeight: 400, color: "#9CA3AF" }}>(auto-assigned from Subject)</span></div>
      <input value={modal.form.teacher ?? ""} disabled style={{ ...modalInput, background: "#F9FAFB", color: "#6B7280" }} />
      <div style={modalLabel}>Room</div>
      <input value={modal.form.room ?? ""} onChange={(e) => setField("room", e.target.value)} placeholder="e.g. Room 204" style={{ ...modalInput, marginBottom: 4 }} />
    </div>
  )
}

function CurriculumBody({ modal, setField, setModal, ctx }: ModalBodyProps) {
  return (
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
        {ctx.curriculum.filter((u) => u.classId === modal.form.classId && u.id !== modal.editingId).map((u) => (
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
        const suggestion = ctx.computeAutoPlannedEnd(modal.form.classId ?? "", modal.form.plannedStart ?? "", modal.form.periods ?? "", modal.form.academicYear ?? ctx.academicYear)?.endDate
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
  )
}

function ExamBody({ modal, setField, ctx }: ModalBodyProps) {
  return (
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
      {ctx.curriculum.filter((u) => u.classId === modal.form.classId).length ? (
        ctx.curriculum
          .filter((u) => u.classId === modal.form.classId)
          .map((u) => (
            <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0", cursor: "pointer" }} onClick={() => ctx.toggleCoverageUnit?.(u.id)}>
              <input type="checkbox" checked={(modal.form.coverageUnitIds || []).includes(u.id)} readOnly style={{ width: 15, height: 15, accentColor: "#3F6E62", cursor: "pointer" }} />
              <span style={{ fontSize: 14.5, color: "#374151" }}>{u.unit} ({u.periods} periods)</span>
            </div>
          ))
      ) : (
        <div style={{ fontSize: 13.5, color: "#9CA3AF", marginBottom: 4 }}>No Syllabus units exist yet for this Class. Add them in Settings → Syllabus first.</div>
      )}
    </div>
  )
}

function CalendarBody({ modal, setField }: ModalBodyProps) {
  return (
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
  )
}

export const MODAL_REGISTRY: Record<ModalType, ModalConfig> = {
  curriculum: {
    noun: "Syllabus Unit",
    flashKey: "curriculum",
    blank: (ctx) => ({ subject: "", classId: CLASSES[0].id, academicYear: ctx.academicYear, term: "Term 1", unit: "", plannedStart: "", plannedEnd: "", periods: "", textbookRef: "", weightage: "Medium", difficulty: "Medium", dependsOn: "", planned: 100, actual: 0, topics: [] }),
    toRecord: (f, editingId, ctx): CurriculumUnit => ({
      id: editingId ?? `cu_${Date.now()}`,
      subject: f.subject || "",
      classId: f.classId || CLASSES[0].id,
      academicYear: f.academicYear || ctx.academicYear,
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
    }),
    Body: CurriculumBody,
  },
  masterTimetable: {
    noun: "Timetable Slot",
    flashKey: "timetable",
    blank: (ctx) => ({ sectionId: ctx.sectionId, academicYear: ctx.academicYear, day: "Monday", period: 1, subject: ctx.masterSubjectsOptions[0], ...ctx.subjectMeta(ctx.masterSubjectsOptions[0]) }),
    toRecord: (f, editingId, ctx): MasterTimetableRow => ({
      id: editingId ?? `mt_${Date.now()}`,
      sectionId: f.sectionId || ctx.sectionId,
      academicYear: f.academicYear || ctx.academicYear,
      day: f.day || "Monday",
      period: Number(f.period) || 1,
      subject: f.subject || "",
      teacher: f.teacher || "Unassigned",
      room: f.room || "TBD",
    }),
    Body: MasterTimetableBody,
  },
  exam: {
    noun: "Exam",
    flashKey: "exam",
    blank: () => ({ title: "", classId: "c1", date: "", type: "Quiz", weight: "", duration: 45, coverageUnitIds: [], revisionAllocated: 0, revisionUsed: 0, teacherId: TEACHERS[0].id }),
    toRecord: (f, editingId): Exam => ({
      id: editingId ?? `ex_${Date.now()}`,
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
    }),
    Body: ExamBody,
  },
  calendar: {
    noun: "Calendar Entry",
    flashKey: "calendar",
    blank: () => ({ date: "", label: "", type: "Holiday" }),
    toRecord: (f, editingId): AcademicCalendarItem => ({
      id: editingId ?? `cal_${Date.now()}`,
      date: f.date || "",
      label: f.label || "",
      type: (f.type as AcademicCalendarItem["type"]) || "Holiday",
    }),
    Body: CalendarBody,
  },
}

export function modalTitle(modal: ModalState): string {
  const verb = modal.mode === "add" ? "Add" : "Edit"
  return `${verb} ${MODAL_REGISTRY[modal.type].noun}`
}
