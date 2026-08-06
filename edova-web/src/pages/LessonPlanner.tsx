import { useEffect, useMemo, useState } from "react"
import type { CSSProperties } from "react"
import { ArrowRight, Download, RotateCw } from "lucide-react"
import {
  APP_TODAY,
  CLASSES,
  TIMETABLE_SEED,
} from "@/data/seed"
import type { CurriculumUnit, LessonPlan, SavedLessonPlanRecord } from "@/lib/types"
import { useSchoolStore } from "@/store/school-store"
import { exportPlanToPdf, exportPlanToWord } from "@/lib/lesson-export"
import { FlashBanner } from "@/components/common/FlashBanner"
import {
  PLANNER_CARD_DIVIDER,
  PLANNER_CARD_INK,
  PLANNER_CARD_META,
  plannerCardChipStyle,
  plannerCardStyle,
  plannerCardTone,
} from "@/lib/styles"

// ---- local helpers (ported from _decomp/app.js) ----

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8001"
// CAMEL lesson-plan AI service (edova-camel) — separate from the data API.
const AI_API_BASE = import.meta.env.VITE_AI_API_URL ?? "http://localhost:8002"

// Class labels match the DB curriculum class_label values; sections come
// from the seed timetable's class names ("Class 8 — Section A").
const PLANNER_CLASSES = Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`)
const PLANNER_SECTIONS = [...new Set(CLASSES.map((c) => c.name.split(" — ")[1]))]

interface PlannerSubject {
  id: string
  name: string
}

interface PlannerSubjectRow {
  id: string
  subject_name: string
  syllabus_json: Record<string, number>
}

const CURRENT_YEAR = "2026–27"
const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

// ---- saved-plan API (persisted library) ----

// Wire shape returned by GET/POST /api/lesson-plans — snake_case, full body.
interface ApiSavedPlan {
  id: string
  topic: string
  title: string
  class_label: string
  section: string | null
  subject: string
  curriculum_subject_id: string | null
  duration_minutes: number
  standards: string[]
  objective: string
  materials: string[]
  outcomes: string[]
  warmup: string
  instruction: string
  activity: string
  assessment: string
  homework: string
  created_at: string
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatSavedOn(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return "Saved"
  return `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`
}

// API record -> the in-app record the library renders and can re-open.
function apiToRecord(r: ApiSavedPlan): SavedLessonPlanRecord {
  return {
    id: r.id,
    savedOn: formatSavedOn(r.created_at),
    curriculumSubjectId: r.curriculum_subject_id,
    classLabel: r.class_label,
    section: r.section,
    plan: {
      topic: r.topic,
      title: r.title,
      className: r.section ? `${r.class_label} — ${r.section}` : r.class_label,
      subject: r.subject,
      duration: String(r.duration_minutes),
      standards: r.standards ?? [],
      objective: r.objective,
      materials: r.materials ?? [],
      outcomes: r.outcomes ?? [],
      warmup: r.warmup,
      instruction: r.instruction,
      activity: r.activity,
      assessment: r.assessment,
      homework: r.homework,
    },
  }
}

function parseShortDate(str: string): Date {
  const parts = (str || "").trim().split(/\s+/)
  const mon = MONTH_MAP[parts[0]]
  const day = parseInt(parts[1], 10)
  if (mon === undefined || isNaN(day)) return new Date(2026, 0, 1)
  return new Date(2026, mon, day)
}

function unitStatus(row: { actual: number; plannedStart?: string; plannedEnd?: string }): string {
  if (Number(row.actual) >= 100) return "Completed"
  if (!row.plannedStart || !row.plannedEnd) return Number(row.actual) > 0 ? "In Progress" : "Not Started"
  const start = parseShortDate(row.plannedStart)
  const end = parseShortDate(row.plannedEnd)
  if (APP_TODAY < start && Number(row.actual) === 0) return "Not Started"
  if (APP_TODAY > end && Number(row.actual) < 100) return "Delayed"
  return "In Progress"
}

function lessonStatusStyle(status: string): CSSProperties {
  const c = status === "Ready" ? "#16A34A" : "#F59E0B"
  const bg = status === "Ready" ? "#F0FDF4" : "#FFFBEB"
  return { fontSize: 13, fontWeight: 600, color: c, background: bg, padding: "3px 9px", borderRadius: 999 }
}

function topicLabelStyle(done: boolean): CSSProperties {
  return done
    ? { fontSize: "14.5px", color: "#9CA3AF", textDecoration: "line-through" }
    : { fontSize: "14.5px", color: "#374151" }
}

function tabStyle(active: boolean): CSSProperties {
  return {
    padding: "9px 16px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer",
    background: active ? "#111827" : "transparent", color: active ? "#fff" : "#6B7280",
  }
}

const inputStyle: CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1px solid #E5E7EB", borderRadius: 8,
  fontSize: 15, fontFamily: "inherit", resize: "vertical", marginBottom: 16,
}
const selectStyle: CSSProperties = {
  width: "100%", height: 38, padding: "0 10px", border: "1px solid #E5E7EB", borderRadius: 8,
  fontSize: 15, fontFamily: "inherit", marginBottom: 16,
}
const actionBtnStyle: CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, fontSize: "14.5px", fontWeight: 600,
  color: "#374151", background: "#F9FAFB", border: "1px solid #E5E7EB", padding: "8px 14px",
  borderRadius: 8, cursor: "pointer",
}

const PLAN_SECTIONS: { key: keyof LessonPlan; label: string; color: string }[] = [
  { key: "warmup", label: "Warm-Up", color: "#93C5FD" },
  { key: "instruction", label: "Direct Instruction", color: "#60A5FA" },
  { key: "activity", label: "Core Activity", color: "#16332B" },
  { key: "assessment", label: "Assessment", color: "#3F6E62" },
  { key: "homework", label: "Homework", color: "#D1D5DB" },
]

// Master-syllabus tree (GET /api/curriculum-subjects/{id}/syllabus) — units
// carry chapters carry topics. The generator's Unit + Topic dropdowns are
// driven from this so a picked topic comes straight from the database.
interface SyllabusTreeTopic { id: string; title: string }
interface SyllabusTreeChapter { id: string; name: string; topics: SyllabusTreeTopic[] }
interface SyllabusTreeUnit { id: string; name: string; chapters: SyllabusTreeChapter[] }

type SubTab = "generator" | "week" | "library"

export default function LessonPlanner() {
  const [subTab, setSubTab] = useState<SubTab>("generator")

  // Generator form state
  const [planTopic, setPlanTopic] = useState("")
  const [planClass, setPlanClass] = useState("Class 10")
  const [planSection, setPlanSection] = useState(PLANNER_SECTIONS[0])
  const [planDuration, setPlanDuration] = useState("45")

  const [year, setYear] = useState("")
  const [subjects, setSubjects] = useState<PlannerSubject[]>([])
  const [planSubjectId, setPlanSubjectId] = useState("")
  const [planUnit, setPlanUnit] = useState("")        // selected unit id (tree)
  const [planTopicSel, setPlanTopicSel] = useState("") // selected topic title
  const [syllabusUnits, setSyllabusUnits] = useState<SyllabusTreeUnit[]>([])

  const [generatedPlan, setGeneratedPlan] = useState<LessonPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const [savedLibrary, setSavedLibrary] = useState<SavedLessonPlanRecord[]>([])
  const [savingPlan, setSavingPlan] = useState(false)

  // This Week reads the shared curriculum so ticking a topic here updates
  // Actual %/status live and propagates to Syllabus Map + Course Progress.
  const curriculum = useSchoolStore((s) => s.curriculum)
  const toggleTopic = useSchoolStore((s) => s.toggleTopic)
  const showFlash = useSchoolStore((s) => s.showFlash)
  const hydrateCurriculum = useSchoolStore((s) => s.hydrateCurriculum)

  // Pull the focus section's syllabus + taught-topic progress from the API so
  // This Week shows real Class 10 Math units (and ticks persist server-side).
  useEffect(() => {
    hydrateCurriculum()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Latest academic year, then the subject list for the chosen class from
  // the curriculum API (currently only Class 10 Mathematics 041 exists).
  useEffect(() => {
    fetch(`${API_BASE}/api/academic-years`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((rows: { year_label: string }[]) => setYear(rows[rows.length - 1]?.year_label ?? ""))
      .catch(() => showFlash("lesson", "Could not load academic years — is the API running on :8001?", 5000))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load the persisted plan library so it survives reload and the "Saved
  // Plans (N)" count is correct on first paint.
  useEffect(() => {
    fetch(`${API_BASE}/api/lesson-plans`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((rows: ApiSavedPlan[]) => setSavedLibrary(rows.map(apiToRecord)))
      .catch(() => { /* library stays empty if the API is down; save will surface the error */ })
  }, [])

  useEffect(() => {
    if (!year) return
    fetch(`${API_BASE}/api/curriculums?year=${encodeURIComponent(year)}&board=CBSE&class=${encodeURIComponent(planClass)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { subjects: PlannerSubjectRow[] }) => {
        const list = d.subjects.map((s) => ({ id: s.id, name: s.subject_name }))
        setSubjects(list)
        setPlanSubjectId(list[0]?.id ?? "")
      })
      .catch(() => setSubjects([]))
  }, [year, planClass])

  // Load the selected subject's full syllabus tree (units → chapters → topics)
  // so the Unit and Topic dropdowns can be driven from the database.
  useEffect(() => {
    setSyllabusUnits([])
    setPlanUnit("")
    setPlanTopicSel("")
    if (!planSubjectId) return
    fetch(`${API_BASE}/api/curriculum-subjects/${planSubjectId}/syllabus`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { units: SyllabusTreeUnit[] }) => setSyllabusUnits(d.units ?? []))
      .catch(() => setSyllabusUnits([]))
  }, [planSubjectId])

  const selectedSubject = subjects.find((s) => s.id === planSubjectId) ?? null
  const selectedUnit = syllabusUnits.find((u) => u.id === planUnit) ?? null
  const unitTopics = selectedUnit ? selectedUnit.chapters.flatMap((c) => c.topics) : []

  // Strip a leading enumerator ("II. Algebra" → "Algebra") for a cleaner
  // default objective when a unit is picked without drilling to a topic.
  const cleanUnitName = (name: string) => name.replace(/^[IVXLCDM]+\.\s*/i, "").trim()

  const pickUnit = (unitId: string) => {
    setPlanUnit(unitId)
    setPlanTopicSel("")
    const u = syllabusUnits.find((x) => x.id === unitId)
    if (u) setPlanTopic(cleanUnitName(u.name))
  }

  const pickTopic = (title: string) => {
    setPlanTopicSel(title)
    if (title) setPlanTopic(title)
  }

  const handleToggleTopic = (unitId: string, topicId: string) => {
    toggleTopic(unitId, topicId)
    showFlash("lesson", "Marked taught — Syllabus Actual % updated.", 3000)
  }

  const generatePlan = async () => {
    const topic = planTopic.trim()
    if (!topic) return
    setIsGenerating(true)
    try {
      const res = await fetch(`${AI_API_BASE}/api/lesson-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the teaching context so the AI society grounds the plan in this
        // exact class/subject/unit/topic instead of a hardcoded chapter.
        body: JSON.stringify({
          topic,
          duration: Number(planDuration) || 45,
          board: "CBSE",
          class_label: planClass,
          subject: selectedSubject?.name ?? "",
          unit: selectedUnit?.name ?? "",
        }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const data = await res.json()
      const p = data.plan
      setGeneratedPlan({
        topic: p.topic,
        title: p.title ?? p.topic,
        className: `${planClass} — ${planSection}`,
        subject: selectedSubject?.name ?? "Mathematics",
        duration: p.duration,
        standards: [],
        objective: p.objective,
        materials: p.materials ?? [],
        outcomes: p.outcomes ?? [],
        warmup: p.warmup,
        instruction: p.instruction,
        activity: p.activity,
        assessment: p.assessment,
        homework: p.homework,
      })
    } catch {
      showFlash("lesson", `Could not generate — is the lesson AI service running at ${AI_API_BASE}?`, 5000)
    } finally {
      setIsGenerating(false)
    }
  }

  const saveToLibrary = async () => {
    if (!generatedPlan || savingPlan) return
    const p = generatedPlan
    setSavingPlan(true)
    try {
      const res = await fetch(`${API_BASE}/api/lesson-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: p.topic,
          class_label: planClass,
          section: planSection || null,
          subject: p.subject,
          curriculum_subject_id: planSubjectId || null,
          duration_minutes: Number(p.duration) || Number(planDuration) || 45,
          standards: p.standards,
          objective: p.objective,
          materials: p.materials,
          warmup: p.warmup,
          instruction: p.instruction,
          activity: p.activity,
          assessment: p.assessment,
          homework: p.homework,
        }),
      })
      if (!res.ok) throw new Error(`API ${res.status}`)
      const saved: ApiSavedPlan = await res.json()
      setSavedLibrary((prev) => [apiToRecord(saved), ...prev])
      setSubTab("library")
      showFlash("lesson", "Lesson plan saved to My Plans")
    } catch {
      showFlash("lesson", "Could not save — is the API running on :8001?", 5000)
    } finally {
      setSavingPlan(false)
    }
  }

  // Re-open a saved plan into the generator output pane.
  const viewPlan = (record: SavedLessonPlanRecord) => {
    setGeneratedPlan(record.plan)
    setSubTab("generator")
  }

  // This Week rows — timetable slots linked to their in-progress syllabus unit
  const lessonPlanRows = useMemo(() => {
    return TIMETABLE_SEED.map((r) => {
      const candidates = curriculum.filter(
        (u) => u.classId === r.classId && u.academicYear === CURRENT_YEAR,
      )
      // Current unit = the one being taught; a fully-taught unit hands over
      // to the next unfinished one.
      const unit: CurriculumUnit | null =
        candidates.find((u) => unitStatus(u) === "In Progress") ||
        candidates.find((u) => unitStatus(u) !== "Completed") ||
        candidates[0] || null
      const cls = CLASSES.find((c) => c.id === r.classId)
      return {
        day: r.day,
        unitId: unit ? unit.id : null,
        className: cls ? cls.name : r.classId,
        hasUnit: !!unit,
        unitName: unit ? unit.unit : "",
        topics: unit ? unit.topics : [],
        status: unit ? unitStatus(unit) : "No Syllabus unit linked",
      }
    })
  }, [curriculum])

  const generateBtnLabel = isGenerating ? "Generating…" : "✦ Generate Lesson Plan"

  return (
    <div>
      <div className="mb-1.5">
        <div className="mb-1 font-display text-[24px] font-bold text-ink">Lesson Planner</div>
        <div className="text-[16px] text-text-secondary">
          Generate standards-aligned lesson plans with an AI agent, or browse this week's plan and your saved library.
        </div>
      </div>

      <div
        style={{
          display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4,
          width: "fit-content", margin: "16px 0 20px",
        }}
      >
        <div style={tabStyle(subTab === "generator")} onClick={() => setSubTab("generator")}>✦ AI Generator</div>
        <div style={tabStyle(subTab === "week")} onClick={() => setSubTab("week")}>This Week</div>
        <div style={tabStyle(subTab === "library")} onClick={() => setSubTab("library")}>
          Saved Plans ({savedLibrary.length})
        </div>
      </div>

      {subTab === "generator" && (
        <div>
          <FlashBanner flashKey="lesson" />
        <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 20, alignItems: "start" }}>
          {/* Generator form */}
          <div className="rounded-[12px] border border-card-border bg-cream shadow-card" style={{ padding: 20 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 14 }}>Build a Lesson</div>

            <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Class</div>
            <select value={planClass} onChange={(e) => setPlanClass(e.target.value)} style={selectStyle}>
              {PLANNER_CLASSES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>

            <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Section</div>
            <select value={planSection} onChange={(e) => setPlanSection(e.target.value)} style={selectStyle}>
              {PLANNER_SECTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Subject</div>
            <select
              value={planSubjectId}
              onChange={(e) => { setPlanSubjectId(e.target.value); setPlanUnit("") }}
              style={selectStyle}
              disabled={subjects.length === 0}
            >
              {subjects.length === 0 && <option value="">No subjects in DB for this class</option>}
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Syllabus Unit</div>
            <select
              value={planUnit}
              onChange={(e) => pickUnit(e.target.value)}
              style={selectStyle}
              disabled={!selectedSubject || syllabusUnits.length === 0}
            >
              <option value="">
                {!selectedSubject
                  ? "Select a subject first"
                  : syllabusUnits.length === 0
                    ? "No syllabus units in DB for this subject"
                    : "Select a unit…"}
              </option>
              {syllabusUnits.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>

            <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Topic</div>
            <select
              value={planTopicSel}
              onChange={(e) => pickTopic(e.target.value)}
              style={selectStyle}
              disabled={!selectedUnit || unitTopics.length === 0}
            >
              <option value="">
                {!selectedUnit
                  ? "Select a unit first"
                  : unitTopics.length === 0
                    ? "No topics for this unit — type one below"
                    : "Select a topic…"}
              </option>
              {selectedUnit?.chapters
                .filter((c) => c.topics.length > 0)
                .map((c) => (
                  <optgroup key={c.id} label={c.name}>
                    {c.topics.map((t) => (
                      <option key={t.id} value={t.title}>{t.title}</option>
                    ))}
                  </optgroup>
                ))}
            </select>

            <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>
              Topic or Learning Objective
            </div>
            <textarea
              value={planTopic}
              onChange={(e) => setPlanTopic(e.target.value)}
              rows={3}
              placeholder="Pick a syllabus unit above, or type any topic of your choice"
              style={inputStyle}
            />

            <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Duration</div>
            <select value={planDuration} onChange={(e) => setPlanDuration(e.target.value)} style={selectStyle}>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>

            <div
              onClick={generatePlan}
              style={{
                textAlign: "center", background: "#3F6E62", color: "#fff", padding: 12, borderRadius: 8,
                fontSize: "15.5px", fontWeight: 700,
                cursor: planTopic.trim() ? "pointer" : "not-allowed",
                opacity: planTopic.trim() ? 1 : 0.5,
              }}
            >
              {generateBtnLabel}
            </div>
            <div style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", marginTop: 8 }}>
              Powered by an AI planning agent · review before teaching
            </div>
          </div>

          {/* Generated plan output */}
          {!generatedPlan && (
            <div
              className="rounded-[12px] border border-card-border bg-cream shadow-card"
              style={{ padding: 48, textAlign: "center", color: "#9CA3AF", fontSize: 15 }}
            >
              Enter a topic and click ✦ Generate Lesson Plan — the AI-generated draft will appear here.
            </div>
          )}
          {generatedPlan && (
            <div className="rounded-[12px] border border-card-border bg-cream shadow-card" style={{ padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <span
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 700,
                    color: "#3F6E62", background: "#E4F0ED", border: "1px solid #CFE3DC", padding: "3px 9px",
                    borderRadius: 999,
                  }}
                >
                  <span
                    style={{
                      width: 14, height: 14, borderRadius: "50%", background: "#D9A94E",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11,
                    }}
                  >
                    🤖
                  </span>
                  AI-GENERATED DRAFT
                </span>
                <span style={{ fontSize: "13.5px", color: "#9CA3AF" }}>
                  {generatedPlan.duration} min · {generatedPlan.subject}
                </span>
              </div>
              <div style={{ fontSize: 21, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{generatedPlan.topic}</div>
              <div style={{ fontSize: "14.5px", color: "#6B7280", marginBottom: 18 }}>{generatedPlan.className}</div>

              <div
                style={{
                  fontSize: 14, fontWeight: 700, color: "#6B7280", textTransform: "uppercase",
                  letterSpacing: "0.04em", marginBottom: 6,
                }}
              >
                Objective
              </div>
              <div style={{ fontSize: "15.5px", color: "#111827", lineHeight: 1.6, marginBottom: 18 }}>
                {generatedPlan.objective}
              </div>

              <div
                style={{
                  fontSize: 14, fontWeight: 700, color: "#6B7280", textTransform: "uppercase",
                  letterSpacing: "0.04em", marginBottom: 8,
                }}
              >
                Materials
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
                {generatedPlan.materials.map((mat) => (
                  <div
                    key={mat}
                    style={{
                      fontSize: 14, color: "#374151", background: "#F9FAFB", border: "1px solid #E5E7EB",
                      padding: "5px 10px", borderRadius: 999,
                    }}
                  >
                    {mat}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 6 }}>
                {PLAN_SECTIONS.map((sec) => (
                  <div key={sec.key} style={{ display: "flex", gap: 12 }}>
                    <div style={{ width: 6, borderRadius: 3, background: sec.color }} />
                    <div>
                      <div style={{ fontSize: "14.5px", fontWeight: 700, color: "#111827", marginBottom: 2 }}>
                        {sec.label}
                      </div>
                      <div style={{ fontSize: 15, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                        {generatedPlan[sec.key] as string}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22, paddingTop: 18,
                  borderTop: "1px solid #F1F5F9",
                }}
              >
                <div onClick={generatePlan} style={actionBtnStyle}>
                  <RotateCw size={15} /> Regenerate
                </div>
                <div onClick={() => exportPlanToWord(generatedPlan)} style={actionBtnStyle}>📄 Export to Word</div>
                <div onClick={() => exportPlanToPdf(generatedPlan)} style={actionBtnStyle}>
                  <Download size={15} /> Export to PDF
                </div>
                <div
                  onClick={saveToLibrary}
                  style={{
                    fontSize: "14.5px", fontWeight: 700, color: "#fff", background: "#16332B",
                    padding: "8px 16px", borderRadius: 8,
                    cursor: savingPlan ? "not-allowed" : "pointer",
                    opacity: savingPlan ? 0.6 : 1,
                  }}
                >
                  {savingPlan ? "Saving…" : "Save to My Plans"}
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {subTab === "week" && (
        <div>
          <FlashBanner flashKey="lesson" />
          <div style={{ fontSize: "13.5px", color: "#6B7280", marginBottom: 12 }}>
            Each slot is linked to its Syllabus unit — tick a topic here as you teach it, and its Actual % updates automatically in Syllabus Map.
          </div>
          <div className="rounded-[12px] border border-card-border bg-cream shadow-card" style={{ padding: "8px 20px" }}>
            {lessonPlanRows.map((row, i) => (
              <div key={i} style={{ padding: "14px 0", borderBottom: "1px solid #F1F5F9" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 90, fontSize: 15, fontWeight: 700, color: "#111827" }}>{row.day}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "15.5px", fontWeight: 600, color: "#111827" }}>{row.unitName}</div>
                    <div style={{ fontSize: 14, color: "#6B7280", marginTop: 2 }}>{row.className}</div>
                  </div>
                  <div style={lessonStatusStyle(row.hasUnit ? row.status : "Draft")}>{row.status}</div>
                </div>
                {row.hasUnit && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 18px", margin: "8px 0 4px 106px" }}>
                    {row.topics.map((topic) => (
                      <div
                        key={topic.id}
                        style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
                        onClick={() => row.unitId && handleToggleTopic(row.unitId, topic.id)}
                      >
                        <input
                          type="checkbox"
                          checked={topic.done}
                          readOnly
                          style={{ width: 15, height: 15, accentColor: "#3F6E62", cursor: "pointer" }}
                        />
                        <span style={topicLabelStyle(topic.done)}>{topic.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === "library" && savedLibrary.length === 0 && (
        <div
          className="rounded-[12px] border border-card-border bg-cream shadow-card"
          style={{ padding: 48, textAlign: "center", color: "#9CA3AF", fontSize: 15 }}
        >
          No saved plans yet — generate a lesson and click “Save to My Plans”.
        </div>
      )}
      {subTab === "library" && savedLibrary.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
          {savedLibrary.map((record) => {
            const lib = record.plan
            const tone = plannerCardTone(lib.className)
            return (
              <div key={record.id} className="shadow-sm hover:shadow-md transition-shadow" style={plannerCardStyle(tone)}>
                <div style={{ ...plannerCardChipStyle(tone), marginBottom: 10 }}>
                  {lib.subject}
                </div>
                <div style={{ fontSize: "16.5px", fontWeight: 700, color: PLANNER_CARD_INK, marginBottom: 6, lineHeight: 1.3 }}>
                  {lib.topic}
                </div>
                <div style={{ fontSize: 14, color: PLANNER_CARD_META, marginBottom: 14 }}>
                  {lib.className} · {lib.duration} min
                </div>
                <div
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    paddingTop: 12, borderTop: `1px solid ${PLANNER_CARD_DIVIDER}`,
                  }}
                >
                  <div style={{ fontSize: "13.5px", color: PLANNER_CARD_META }}>Saved {record.savedOn}</div>
                  <div
                    onClick={() => viewPlan(record)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4, fontSize: 14,
                      fontWeight: 600, color: tone.accent, cursor: "pointer",
                    }}
                  >
                    View <ArrowRight size={14} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
