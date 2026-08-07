import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { ArrowRight, Download, RotateCw } from "lucide-react"
import { CLASSES } from "@/data/seed"
import type { AiGeneratedPlan, ApiSavedPlan, LessonPlan, NewLessonPlan, SavedLessonPlanRecord } from "@/lib/types"
import { aiApi } from "@/lib/api-client"
import { saveLessonPlan, updateLessonPlan } from "@/lib/curriculum-api"
import { usePlannerData } from "./lesson-planner/usePlannerData"
import { useSchoolStore } from "@/store/school-store"
import { exportPlanToPdf } from "@/lib/lesson-export"
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

// Class labels match the DB curriculum class_label values; sections come
// from the seed timetable's class names ("Class 8 — Section A").
const PLANNER_CLASSES = Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`)
const PLANNER_SECTIONS = [...new Set(CLASSES.map((c) => c.name.split(" — ")[1]))]

// Concept is a cosmetic 4th-level dropdown — no such level exists in the
// syllabus DB (Subject > Unit > Chapter > Topic only), so this is a fixed
// mockup list, not fetched or sent anywhere.
const CONCEPT_OPTIONS = ["Introduction", "Core Concept", "Application", "Critical Analysis"]

const BLOOM_LEVELS = ["Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"]

// NEP 2020 concept tags — checking one grounds the objective and at least
// one generated assessment question in that concept (see edova-camel).
const NEP_CONCEPTS = ["Application", "Concept", "Case Study", "Critical thinking"]

// The backend returns each 5E phase as "{mins} min\n• Teacher: ...\n• Students: ...".
// Split it so the compact card can show just the duration + a one-line summary.
function splitPhase(text: string): { duration: string; teacher: string } {
  const [duration = "", teacherLine = ""] = (text || "").split("\n")
  return { duration, teacher: teacherLine.replace(/^•\s*Teacher:\s*/, "") }
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
      title: r.title || r.topic,
      className: r.section ? `${r.class_label} — ${r.section}` : r.class_label,
      subject: r.subject,
      duration: String(r.duration_minutes),
      standards: r.standards ?? [],
      objective: r.objective,
      outcomes: r.outcomes ?? [],
      warmup: r.warmup,
      instruction: r.instruction,
      activity: r.activity,
      assessment: r.assessment,
      homework: r.homework,
    },
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
const editableFieldStyle: CSSProperties = {
  width: "100%", padding: "8px 10px", border: "1px solid #D1D5DB", borderRadius: 6,
  fontSize: "inherit", fontFamily: "inherit", color: "inherit", lineHeight: "inherit",
  resize: "vertical", background: "#fff",
}

const PLAN_SECTIONS: { key: keyof LessonPlan; label: string; color: string }[] = [
  { key: "warmup", label: "Warm-Up", color: "#93C5FD" },
  { key: "instruction", label: "Direct Instruction", color: "#60A5FA" },
  { key: "activity", label: "Core Activity", color: "#16332B" },
  { key: "assessment", label: "Assessment", color: "#3F6E62" },
  { key: "homework", label: "Homework", color: "#D1D5DB" },
]

export default function LessonPlanner() {
  const [showLibrary, setShowLibrary] = useState(false)

  // Generator form state
  const [planTopic, setPlanTopic] = useState("")
  const [planClass, setPlanClass] = useState("Class 10")
  const [planSection, setPlanSection] = useState(PLANNER_SECTIONS[0])
  const [planDuration, setPlanDuration] = useState("45")

  const [planUnit, setPlanUnit] = useState("")        // selected unit id (tree)
  const [planTopicSel, setPlanTopicSel] = useState("") // selected topic title
  const [planConcept, setPlanConcept] = useState("")    // cosmetic only, not sent anywhere
  const [planBloom, setPlanBloom] = useState<string[]>([])
  const [planNep, setPlanNep] = useState<string[]>([])

  const [generatedPlan, setGeneratedPlan] = useState<LessonPlan | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [savingPlan, setSavingPlan] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Set when the output pane is showing a saved plan (via viewPlan), so
  // "Save Changes" knows which record to update in place. Cleared on a
  // fresh generation — a regenerated draft is never an in-place edit.
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null)
  const [contentEditMode, setContentEditMode] = useState(false)

  const showFlash = useSchoolStore((s) => s.showFlash)

  const {
    subjects, planSubjectId, setPlanSubjectId, syllabusUnits, savedLibrary, setSavedLibrary,
  } = usePlannerData(planClass, apiToRecord, showFlash)

  // Reset the unit/topic pick when the subject changes (the tree reloads).
  useEffect(() => {
    setPlanUnit("")
    setPlanTopicSel("")
    setPlanConcept("")
  }, [planSubjectId])

  const toggleBloom = (level: string) => {
    setPlanBloom((prev) => (prev.includes(level) ? prev.filter((l) => l !== level) : [...prev, level]))
  }
  const toggleNep = (concept: string) => {
    setPlanNep((prev) => (prev.includes(concept) ? prev.filter((c) => c !== concept) : [...prev, concept]))
  }

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

  const updateField = <K extends keyof LessonPlan>(key: K, value: LessonPlan[K]) => {
    setGeneratedPlan((prev) => (prev ? { ...prev, [key]: value } : prev))
  }

  const generatePlan = async () => {
    const topic = planTopic.trim()
    if (!topic) return
    setEditingPlanId(null)
    setContentEditMode(false)
    setIsGenerating(true)
    try {
      // Send the teaching context so the AI society grounds the plan in this
      // exact class/subject/unit/topic instead of a hardcoded chapter.
      const data = await aiApi.post<AiGeneratedPlan>("/api/lesson-plan", {
        topic,
        duration: Number(planDuration) || 45,
        board: "CBSE",
        class_label: planClass,
        subject: selectedSubject?.name ?? "",
        unit: selectedUnit?.name ?? "",
        nep_concepts: planNep,
      })
      const p = data.plan
      setShowDetails(false)
      setGeneratedPlan({
        topic: p.topic,
        title: p.title || p.topic,
        className: `${planClass} — ${planSection}`,
        subject: selectedSubject?.name ?? "Mathematics",
        duration: p.duration,
        standards: [],
        objective: p.objective,
        outcomes: p.outcomes,
        warmup: p.warmup,
        instruction: p.instruction,
        activity: p.activity,
        assessment: p.assessment,
        homework: p.homework,
      })
    } catch {
      showFlash("lesson", "Could not generate — is the lesson AI service running on :8002?", 5000)
    } finally {
      setIsGenerating(false)
    }
  }

  const buildPlanBody = (p: LessonPlan): NewLessonPlan => ({
    topic: p.topic,
    title: p.title,
    class_label: planClass,
    section: planSection || null,
    subject: p.subject,
    curriculum_subject_id: planSubjectId || null,
    duration_minutes: Number(p.duration) || Number(planDuration) || 45,
    standards: p.standards,
    objective: p.objective,
    outcomes: p.outcomes.filter((o) => o.trim()),
    warmup: p.warmup,
    instruction: p.instruction,
    activity: p.activity,
    assessment: p.assessment,
    homework: p.homework,
    bloom_levels: planBloom,
  })

  // Creates a new saved record — the first save of a fresh draft, or
  // (when reopened from the library with a changed Class/Section)
  // "Assign to Another Class": the original record is left untouched.
  const saveToLibrary = async () => {
    if (!generatedPlan || savingPlan) return
    setSavingPlan(true)
    try {
      const saved = await saveLessonPlan(buildPlanBody(generatedPlan))
      setSavedLibrary((prev) => [apiToRecord(saved), ...prev])
      setEditingPlanId(saved.id)
      setShowLibrary(true)
      showFlash("lesson", "Lesson plan saved to My Plans")
    } catch {
      showFlash("lesson", "Could not save — is the API running on :8000?", 5000)
    } finally {
      setSavingPlan(false)
    }
  }

  // Updates the currently-open saved record in place (content edits and/or
  // a reassigned Class/Section) — only available when a saved plan is open.
  const saveChanges = async () => {
    if (!generatedPlan || !editingPlanId || savingPlan) return
    setSavingPlan(true)
    try {
      const saved = await updateLessonPlan(editingPlanId, buildPlanBody(generatedPlan))
      setSavedLibrary((prev) => prev.map((r) => (r.id === saved.id ? apiToRecord(saved) : r)))
      showFlash("lesson", "Changes saved")
    } catch {
      showFlash("lesson", "Could not save changes — is the API running on :8000?", 5000)
    } finally {
      setSavingPlan(false)
    }
  }

  // Re-open a saved plan into the generator output pane, restoring which
  // class it's assigned to (so reassigning it means an explicit dropdown
  // change, not a leftover from whatever was last selected).
  const viewPlan = (record: SavedLessonPlanRecord) => {
    setGeneratedPlan(record.plan)
    setEditingPlanId(record.id)
    setContentEditMode(false)
    setPlanClass(record.classLabel)
    setPlanSection(record.section ?? PLANNER_SECTIONS[0])
    setPlanSubjectId(record.curriculumSubjectId ?? "")
    setPlanTopic(record.plan.topic)
    setPlanDuration(record.plan.duration)
    setShowDetails(false)
    setShowLibrary(false)
  }

  const generateBtnLabel = isGenerating ? "Generating…" : "✦ Generate Lesson Plan"

  return (
    <div>
      <div className="mb-1.5 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 font-display text-[24px] font-bold text-ink">Lesson Planner</div>
          <div className="text-[16px] text-text-secondary">
            Generate standards-aligned lesson plans with an AI agent.
          </div>
        </div>
        <div
          onClick={() => setShowLibrary((v) => !v)}
          style={{
            padding: "9px 16px", borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: "pointer",
            whiteSpace: "nowrap", marginTop: 2,
            background: showLibrary ? "#111827" : "#F1F5F9", color: showLibrary ? "#fff" : "#374151",
          }}
        >
          Saved Plans ({savedLibrary.length})
        </div>
      </div>

      {!showLibrary && (
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

            <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Concept</div>
            <select value={planConcept} onChange={(e) => setPlanConcept(e.target.value)} style={selectStyle}>
              <option value="">Select a concept…</option>
              {CONCEPT_OPTIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
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

            <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>Bloom's Level</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {BLOOM_LEVELS.map((level) => {
                const active = planBloom.includes(level)
                return (
                  <div
                    key={level}
                    onClick={() => toggleBloom(level)}
                    style={{
                      fontSize: 12.5, fontWeight: 600, padding: "4px 10px", borderRadius: 999, cursor: "pointer",
                      color: active ? "#fff" : "#374151",
                      background: active ? "#16332B" : "#F9FAFB",
                      border: `1px solid ${active ? "#16332B" : "#E5E7EB"}`,
                    }}
                  >
                    {level}
                  </div>
                )
              })}
            </div>

            <div style={{ fontSize: 14, fontWeight: 600, color: "#6B7280", marginBottom: 6 }}>NEP Concepts</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              {NEP_CONCEPTS.map((concept) => (
                <label key={concept} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={planNep.includes(concept)}
                    onChange={() => toggleNep(concept)}
                    style={{ width: 15, height: 15, accentColor: "#3F6E62", cursor: "pointer" }}
                  />
                  <span style={{ fontSize: "14.5px", color: "#374151" }}>{concept}</span>
                </label>
              ))}
            </div>

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
              {contentEditMode ? (
                <input
                  value={generatedPlan.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  style={{ ...editableFieldStyle, fontSize: 21, fontWeight: 700, marginBottom: 4 }}
                />
              ) : (
                <div style={{ fontSize: 21, fontWeight: 700, color: "#111827", marginBottom: 4 }}>
                  {generatedPlan.title || generatedPlan.topic}
                </div>
              )}
              {/* Live Class/Section, not the frozen value from generation time — so
                  changing the dropdowns to reassign is visibly reflected here. */}
              <div style={{ fontSize: "14.5px", color: "#6B7280", marginBottom: 18 }}>
                {planClass}{planSection ? ` — ${planSection}` : ""}
              </div>

              <div
                style={{
                  fontSize: 14, fontWeight: 700, color: "#6B7280", textTransform: "uppercase",
                  letterSpacing: "0.04em", marginBottom: 6,
                }}
              >
                Objective
              </div>
              {contentEditMode ? (
                <textarea
                  value={generatedPlan.objective}
                  onChange={(e) => updateField("objective", e.target.value)}
                  rows={2}
                  style={{ ...editableFieldStyle, fontSize: "15.5px", marginBottom: 18 }}
                />
              ) : (
                <div style={{ fontSize: "15.5px", color: "#111827", lineHeight: 1.6, marginBottom: 18 }}>
                  {generatedPlan.objective}
                </div>
              )}

              {(generatedPlan.outcomes.length > 0 || contentEditMode) && (
                <>
                  <div
                    style={{
                      fontSize: 14, fontWeight: 700, color: "#6B7280", textTransform: "uppercase",
                      letterSpacing: "0.04em", marginBottom: 8,
                    }}
                  >
                    Learning Outcomes
                  </div>
                  {contentEditMode ? (
                    <textarea
                      value={generatedPlan.outcomes.join("\n")}
                      onChange={(e) => updateField("outcomes", e.target.value.split("\n"))}
                      rows={4}
                      placeholder="One outcome per line"
                      style={{ ...editableFieldStyle, fontSize: "14.5px", marginBottom: 18 }}
                    />
                  ) : (
                    <ul style={{ margin: "0 0 18px", paddingLeft: 20 }}>
                      {generatedPlan.outcomes.map((o, i) => (
                        <li key={i} style={{ fontSize: "14.5px", color: "#374151", lineHeight: 1.6 }}>{o}</li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {/* Compact 5E flow — phase + duration + one line; full teacher/student
                  breakdown and assessment/homework text live behind "Show details" */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 12 }}>
                {PLAN_SECTIONS.map((sec) => {
                  const { duration, teacher } = splitPhase(generatedPlan[sec.key] as string)
                  return (
                    <div key={sec.key} style={{ border: "1px solid #E5E7EB", borderRadius: 10, padding: 10 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: "#111827" }}>{sec.label}</div>
                      <div style={{ fontSize: 11, color: "#9CA3AF", marginBottom: 4 }}>{duration}</div>
                      <div style={{ fontSize: 12, color: "#6B7280", lineHeight: 1.4 }}>{teacher}</div>
                    </div>
                  )
                })}
              </div>

              <div style={{ display: "flex", gap: 16, marginBottom: showDetails ? 14 : 6 }}>
                <div
                  onClick={() => setShowDetails((v) => !v)}
                  style={{ fontSize: 13, fontWeight: 600, color: "#3F6E62", cursor: "pointer" }}
                >
                  {showDetails ? "▴ Hide details" : "▾ Show details"}
                </div>
                <div
                  onClick={() => setContentEditMode((v) => !v)}
                  style={{ fontSize: 13, fontWeight: 600, color: contentEditMode ? "#B45309" : "#3F6E62", cursor: "pointer" }}
                >
                  {contentEditMode ? "✓ Done editing" : "✎ Edit"}
                </div>
              </div>

              {showDetails && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 6 }}>
                  {PLAN_SECTIONS.map((sec) => (
                    <div key={sec.key} style={{ display: "flex", gap: 12 }}>
                      <div style={{ width: 6, borderRadius: 3, background: sec.color }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: "14.5px", fontWeight: 700, color: "#111827", marginBottom: 2 }}>
                          {sec.label}
                        </div>
                        {contentEditMode ? (
                          <textarea
                            value={generatedPlan[sec.key] as string}
                            onChange={(e) => updateField(sec.key, e.target.value)}
                            rows={4}
                            style={{ ...editableFieldStyle, fontSize: 15 }}
                          />
                        ) : (
                          <div style={{ fontSize: 15, color: "#374151", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                            {generatedPlan[sec.key] as string}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
                <div onClick={() => exportPlanToPdf(generatedPlan)} style={actionBtnStyle}>
                  <Download size={15} /> Export to PDF
                </div>
                {editingPlanId ? (
                  <>
                    <div
                      onClick={saveChanges}
                      style={{
                        fontSize: "14.5px", fontWeight: 700, color: "#fff", background: "#16332B",
                        padding: "8px 16px", borderRadius: 8,
                        cursor: savingPlan ? "not-allowed" : "pointer",
                        opacity: savingPlan ? 0.6 : 1,
                      }}
                    >
                      {savingPlan ? "Saving…" : "Save Changes"}
                    </div>
                    <div
                      onClick={saveToLibrary}
                      style={{
                        ...actionBtnStyle,
                        cursor: savingPlan ? "not-allowed" : "pointer",
                        opacity: savingPlan ? 0.6 : 1,
                      }}
                    >
                      Assign to Another Class
                    </div>
                  </>
                ) : (
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
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {showLibrary && savedLibrary.length === 0 && (
        <div
          className="rounded-[12px] border border-card-border bg-cream shadow-card"
          style={{ padding: 48, textAlign: "center", color: "#9CA3AF", fontSize: 15 }}
        >
          No saved plans yet — generate a lesson and click “Save to My Plans”.
        </div>
      )}
      {showLibrary && savedLibrary.length > 0 && (
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
