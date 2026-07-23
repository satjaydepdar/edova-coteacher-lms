import { useState } from "react"
import type { CSSProperties } from "react"
import { ChevronDown, ChevronRight, ChevronUp, X } from "lucide-react"
import {
  ACADEMIC_YEARS,
  CLASSES,
  DEMAND_PRESETS,
  OKF_QUESTION_BANK,
  PALETTE_TYPES,
  QUESTION_BANK_V2,
  STUDENTS,
  TERMS,
  TOPIC_OPTIONS,
  VIDEO_LIBRARY,
} from "@/data/seed"
import type { AssessmentBankItem, Assignment, AssessmentSection, BuiltQuestion, Demand, QOption, QPair, QSub } from "@/lib/types"
import { useSchoolStore } from "@/store/school-store"
import { FlashBanner } from "@/components/common/FlashBanner"

/* ------------------------------------------------------------------ */
/* Local data + types (SECTION_TEMPLATES / SECTION_TYPE_META are not   */
/* exported from seed, so they live here — ported from _decomp/app.js) */
/* ------------------------------------------------------------------ */

interface SectionTemplate {
  icon: string
  title: string
  bg: string
  iconColor: string
}
const SECTION_TEMPLATES: Record<string, SectionTemplate> = {
  multiple_choice: { icon: "☰", title: "Multiple Choice", bg: "#E0F2FE", iconColor: "#0369A1" },
  multi_select: { icon: "☑", title: "Multi-Select", bg: "#F3E8FF", iconColor: "#7C3AED" },
  true_false: { icon: "⊘", title: "True/False", bg: "#DCFCE7", iconColor: "#15803D" },
  matching: { icon: "🔗", title: "Matching", bg: "#FFEDD5", iconColor: "#C2410C" },
  fill_blank: { icon: "✎", title: "Fill in the Blank", bg: "#FEF9C3", iconColor: "#A16207" },
  short_answer: { icon: "🔍", title: "Short Answer", bg: "#E0E7FF", iconColor: "#4338CA" },
  scenario: { icon: "📄", title: "Scenario-Based", bg: "#FCE7F3", iconColor: "#BE185D" },
  multi_part: { icon: "🧩", title: "Multi-Part", bg: "#ECFDF5", iconColor: "#047857" },
  essay: { icon: "💬", title: "Essay", bg: "#F5F3FF", iconColor: "#6D28D9" },
  okf_import: { icon: "🔗", title: "OKF Import", bg: "#E9F1EC", iconColor: "#16332B" },
  video_lesson: { icon: "🎬", title: "Video Lesson", bg: "#FEF2F2", iconColor: "#B91C1C" },
}

interface SectionTypeMeta {
  hasOptions?: boolean
  singleCorrect?: boolean
  defaultOptions?: number
  fixed?: boolean
  hasPairs?: boolean
  defaultPairs?: number
  hasCorrectAnswer?: boolean
  hasModelAnswer?: boolean
  hasScenarioText?: boolean
  hasSubQuestions?: boolean
  hasRubric?: boolean
}
const SECTION_TYPE_META: Record<string, SectionTypeMeta> = {
  multiple_choice: { hasOptions: true, singleCorrect: true, defaultOptions: 4 },
  multi_select: { hasOptions: true, singleCorrect: false, defaultOptions: 4 },
  true_false: { hasOptions: true, singleCorrect: true, defaultOptions: 2, fixed: true },
  matching: { hasPairs: true, defaultPairs: 4 },
  fill_blank: { hasCorrectAnswer: true },
  short_answer: { hasModelAnswer: true },
  scenario: { hasScenarioText: true, hasModelAnswer: true },
  multi_part: { hasSubQuestions: true, hasModelAnswer: true },
  essay: { hasRubric: true },
}

type RawQuestion = Omit<
  BuiltQuestion,
  "hasOptions" | "hasPairs" | "hasAnswer" | "hasRubric" | "hasModel" | "hasSubQ" | "hasScenario" | "hasVideo"
>

function normalizeQuestion(raw: RawQuestion): BuiltQuestion {
  return {
    ...raw,
    hasOptions: !!(raw.options && raw.options.length),
    hasPairs: !!(raw.pairs && raw.pairs.length),
    hasAnswer: raw.correctAnswer !== undefined && raw.correctAnswer !== null,
    hasRubric: !!raw.rubric,
    hasModel: !!raw.modelAnswer && !raw.rubric && !(raw.subQuestions && raw.subQuestions.length),
    hasSubQ: !!(raw.subQuestions && raw.subQuestions.length),
    hasScenario: !!raw.scenarioText,
    hasVideo: !!raw.videoThumbnail,
  }
}

function nextSectionLabel(count: number) {
  return String.fromCharCode(65 + count)
}

const SECTION_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("")

type PlaceholderData = {
  text: string
  difficulty: string
  options?: QOption[]
  pairs?: QPair[]
  correctAnswer?: string
  modelAnswer?: string
  scenarioText?: string
  subQuestions?: QSub[]
  rubric?: string
}

function generatePlaceholderQuestionData(type: string, idx: number, topicId: string): PlaceholderData {
  const topicNames: Record<string, string> = { photosynthesis: "photosynthesis", fractions: "fractions", atoms: "atoms" }
  const topic = topicNames[topicId] || "this topic"
  const diffCycle = ["Easy", "Medium", "Hard"]
  const difficulty = diffCycle[idx % 3]

  if (type === "multi_select") {
    const prompts: Record<string, string> = {
      photosynthesis: "Select all that apply: Which of the following are involved in photosynthesis?",
      fractions: "Select all statements that are true about fractions.",
      atoms: "Select all that apply: Which particles are found in an atom?",
    }
    const optionSets: Record<string, { text: string; correct: boolean }[]> = {
      photosynthesis: [{ text: "Chlorophyll", correct: true }, { text: "Carbon dioxide", correct: true }, { text: "Oxygen only as a reactant", correct: false }, { text: "Water", correct: true }],
      fractions: [{ text: "A fraction has a numerator and denominator", correct: true }, { text: "Equivalent fractions represent the same value", correct: true }, { text: "The denominator can never be zero", correct: true }, { text: "All fractions are greater than 1", correct: false }],
      atoms: [{ text: "Protons", correct: true }, { text: "Neutrons", correct: true }, { text: "Electrons", correct: true }, { text: "Photons", correct: false }],
    }
    const opts = optionSets[topicId] || optionSets.atoms
    const options = opts.map((o, i) => ({ label: String.fromCharCode(65 + i), text: o.text, correct: o.correct }))
    return { text: prompts[topicId] || "Select all that apply about " + topic + ".", difficulty, options }
  }

  if (type === "true_false") {
    const statements: Record<string, string> = { photosynthesis: "Plants release oxygen during photosynthesis.", fractions: "The fraction 2/4 is equivalent to 1/2.", atoms: "Electrons are positively charged." }
    const correctMap: Record<string, number> = { photosynthesis: 0, fractions: 0, atoms: 1 }
    const correctIdx = correctMap[topicId] ?? 0
    return {
      text: statements[topicId] || "True or false: this statement about " + topic + " is true.",
      difficulty,
      options: [
        { label: "A", text: "True", correct: correctIdx === 0 },
        { label: "B", text: "False", correct: correctIdx === 1 },
      ],
    }
  }

  if (type === "matching") {
    const pairSets: Record<string, QPair[]> = {
      photosynthesis: [{ left: "Chlorophyll", right: "Pigment that absorbs sunlight" }, { left: "Chloroplast", right: "Organelle where photosynthesis occurs" }, { left: "Carbon dioxide", right: "Gas taken in through stomata" }, { left: "Glucose", right: "Sugar produced by photosynthesis" }],
      fractions: [{ left: "1/2", right: "Equivalent to 2/4" }, { left: "Numerator", right: "Top number of a fraction" }, { left: "Denominator", right: "Bottom number of a fraction" }, { left: "Improper fraction", right: "Numerator is greater than denominator" }],
      atoms: [{ left: "Proton", right: "Positively charged particle" }, { left: "Neutron", right: "Particle with no charge" }, { left: "Electron", right: "Negatively charged particle" }, { left: "Nucleus", right: "Center of the atom" }],
    }
    return { text: "Match the items related to " + topic + ".", difficulty, pairs: pairSets[topicId] || pairSets.atoms }
  }

  if (type === "fill_blank") {
    const blanks: Record<string, { text: string; answer: string }> = {
      photosynthesis: { text: "The process of _______ converts light energy into chemical energy.", answer: "photosynthesis" },
      fractions: { text: "A fraction with a numerator smaller than its denominator is called a _______ fraction.", answer: "proper" },
      atoms: { text: "The _______ has a negative charge and orbits the nucleus.", answer: "electron" },
    }
    const b = blanks[topicId] || { text: "Complete this sentence about " + topic + ".", answer: "answer" }
    return { text: b.text, difficulty, correctAnswer: b.answer }
  }

  if (type === "short_answer") {
    const prompts: Record<string, { text: string; answer: string }> = {
      photosynthesis: { text: "Explain the role of chlorophyll in photosynthesis.", answer: "Chlorophyll absorbs light energy and transfers it to electrons, driving the light-dependent reactions." },
      fractions: { text: "Explain how to convert an improper fraction to a mixed number.", answer: "Divide the numerator by the denominator; the quotient is the whole number and the remainder becomes the new numerator." },
      atoms: { text: "Describe the difference between protons and electrons.", answer: "Protons are positively charged and located in the nucleus; electrons are negatively charged and orbit the nucleus." },
    }
    const p = prompts[topicId] || { text: "Short answer question about " + topic + ".", answer: "" }
    return { text: p.text, difficulty, modelAnswer: p.answer }
  }

  if (type === "scenario") {
    return {
      text: "What conclusion can be drawn from the scenario?",
      scenarioText: "A student is investigating " + topic + " and records an unexpected result. Using what you know about " + topic + ", explain what the student should do next.",
      difficulty,
      modelAnswer: "The student should check the procedure, repeat the observation, and compare the result with the expected behavior of " + topic + ".",
    }
  }

  if (type === "multi_part") {
    const parts: Record<string, QSub[]> = {
      photosynthesis: [{ text: "Name the organelle where photosynthesis takes place.", answer: "Chloroplast" }, { text: "State the two main reactants needed for photosynthesis.", answer: "Carbon dioxide and water" }],
      fractions: [{ text: "Convert 7/4 to a mixed number.", answer: "1 3/4" }, { text: "Simplify 8/12 to lowest terms.", answer: "2/3" }],
      atoms: [{ text: "What is the charge of a neutron?", answer: "Neutral (no charge)" }, { text: "Which particle determines the identity of an element?", answer: "Proton" }],
    }
    const chosen = parts[topicId] || parts.atoms
    return { text: "Answer the following parts about " + topic + ".", difficulty, subQuestions: chosen, modelAnswer: chosen.map((p, i) => i + 1 + ". " + p.answer).join("; ") }
  }

  if (type === "essay") {
    const prompts: Record<string, { text: string; rubric: string }> = {
      photosynthesis: { text: "Describe the process of photosynthesis in detail.", rubric: "Includes light-dependent reactions, Calvin cycle, reactants, products, and location in the chloroplast." },
      fractions: { text: "Explain the importance of fractions in everyday life and how to compare them.", rubric: "Includes real-world examples, equivalent fractions, and comparison strategies." },
      atoms: { text: "Describe the structure of an atom and the roles of its subatomic particles.", rubric: "Includes nucleus, protons, neutrons, electrons, charges, and locations." },
    }
    const e = prompts[topicId] || { text: "Essay question about " + topic + ".", rubric: "" }
    return { text: e.text, difficulty, rubric: e.rubric }
  }

  return { text: "Sample question about " + topic + ".", difficulty, options: [{ label: "A", text: "Correct option", correct: true }, { label: "B", text: "Distractor 1", correct: false }, { label: "C", text: "Distractor 2", correct: false }, { label: "D", text: "Distractor 3", correct: false }] }
}

let qSeq = 0
function nextId(prefix: string) {
  qSeq += 1
  return prefix + "_" + Date.now() + "_" + qSeq
}

function buildSectionQuestions(type: string, topicId: string, count: number, demand: Demand, excludeTexts: Set<string> = new Set()): BuiltQuestion[] {
  if (type === "multiple_choice") {
    const bank = (QUESTION_BANK_V2[topicId] || []).filter((q) => !excludeTexts.has(q.text))
    const easyTarget = Math.round((count * demand.easy) / 100)
    const mediumTarget = Math.round((count * demand.medium) / 100)
    const hardTarget = Math.max(0, count - easyTarget - mediumTarget)
    const byDiff: Record<string, typeof bank> = {
      Easy: bank.filter((q) => q.difficulty === "Easy"),
      Medium: bank.filter((q) => q.difficulty === "Medium"),
      Hard: bank.filter((q) => q.difficulty === "Hard"),
    }
    let picked: typeof bank = []
    ;([["Easy", easyTarget], ["Medium", mediumTarget], ["Hard", hardTarget]] as [string, number][]).forEach(([diff, t]) => {
      picked = picked.concat(byDiff[diff].slice(0, t))
    })
    if (picked.length < count) {
      const usedIds = new Set(picked.map((q) => q.id))
      const remaining = bank.filter((q) => !usedIds.has(q.id))
      picked = picked.concat(remaining.slice(0, count - picked.length))
    }
    picked = picked.slice(0, count)
    return picked.map((q) =>
      normalizeQuestion({
        id: nextId("q"),
        text: q.text,
        difficulty: q.difficulty,
        options: q.options.map((opt, i) => ({ label: String.fromCharCode(65 + i), text: opt, correct: q.correct.includes(i) })),
      }),
    )
  }
  return Array.from({ length: count }, (_, idx) => {
    const data = generatePlaceholderQuestionData(type, idx, topicId)
    return normalizeQuestion({ id: nextId("q"), ...data })
  })
}

/* ------------------------------------------------------------------ */
/* Shared inline style fragments                                       */
/* ------------------------------------------------------------------ */
const stepBadge: CSSProperties = {
  padding: "4px 10px",
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: ".5px",
  textTransform: "uppercase",
  background: "#F8F0D8",
  color: "#D9A94E",
  border: "1px solid rgba(201,168,76,.25)",
}
const fieldLabel: CSSProperties = { fontSize: 13, fontWeight: 700, color: "#3D5A60", textTransform: "uppercase", letterSpacing: ".4px" }
const nativeSelect: CSSProperties = { fontSize: 15, color: "#13231F", padding: "9px 12px", borderRadius: 8, border: "1px solid #DDD8CF", background: "#F5F1E6", cursor: "pointer", fontFamily: "inherit" }
const stepCard: CSSProperties = { background: "rgba(255,255,255,.9)", border: "1px solid #D8E8E4", borderRadius: 16, padding: "18px 20px", marginBottom: 20, boxShadow: "0 4px 24px rgba(26,46,53,.06)" }
const modalOverlay: CSSProperties = { position: "fixed", inset: 0, background: "rgba(26,46,53,.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, padding: 24 }
const closeBtn: CSSProperties = { width: 32, height: 32, border: "none", borderRadius: 8, background: "#F2F0EB", cursor: "pointer", color: "#7A9298", display: "flex", alignItems: "center", justifyContent: "center" }
const secondaryBtn: CSSProperties = { background: "#F5F1E6", border: "1px solid #DDD8CF", color: "#3D5A60", padding: "9px 16px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }
const stepper: CSSProperties = { width: 30, height: 30, border: "1px solid #DDD8CF", background: "#F5F1E6", borderRadius: 6, cursor: "pointer", fontSize: 18, color: "#3D5A60" }
const editorInput: CSSProperties = { fontSize: 15, padding: "8px 10px", borderRadius: 8, border: "1px solid #DDD8CF", fontFamily: "inherit" }
const editorTextarea: CSSProperties = { width: "100%", minHeight: 60, resize: "vertical", border: "1px solid #DDD8CF", borderRadius: 8, fontFamily: "inherit", fontSize: 15, padding: "9px 12px" }
const editorSectionLabel: CSSProperties = { fontSize: 13, fontWeight: 700, color: "#3D5A60", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 }

function DemandBar({ easy, medium, hard, width, height = 6 }: { easy: number; medium: number; hard: number; width?: number | string; height?: number }) {
  return (
    <div style={{ height, borderRadius: 999, background: "#E5E7EB", display: "flex", overflow: "hidden", width }}>
      <span style={{ height: "100%", background: "#2E9E6B", width: `${easy}%` }} />
      <span style={{ height: "100%", background: "#D48A0C", width: `${medium}%` }} />
      <span style={{ height: "100%", background: "#C0392B", width: `${hard}%` }} />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Editor state                                                        */
/* ------------------------------------------------------------------ */
interface EditorState {
  text: string
  difficulty: string
  explanation: string
  options: { text: string; correct: boolean }[]
  pairs: QPair[]
  correctAnswer: string
  modelAnswer: string
  scenarioText: string
  subQuestions: QSub[]
}
function emptyEditorFor(type: string | null): EditorState {
  const meta = type ? SECTION_TYPE_META[type] || {} : {}
  return {
    text: "",
    difficulty: "Easy",
    explanation: "",
    options: meta.hasOptions ? Array.from({ length: meta.defaultOptions || 4 }, (_, i) => ({ text: meta.fixed ? (i === 0 ? "True" : "False") : "", correct: false })) : [],
    pairs: meta.hasPairs ? Array.from({ length: meta.defaultPairs || 4 }, () => ({ left: "", right: "" })) : [],
    correctAnswer: "",
    modelAnswer: "",
    scenarioText: "",
    subQuestions: meta.hasSubQuestions ? Array.from({ length: 2 }, () => ({ text: "", answer: "" })) : [],
  }
}

const classNameById = (id: string) => CLASSES.find((c) => c.id === id)?.name || ""

/* ================================================================== */
/* Component                                                           */
/* ================================================================== */
export default function AssessmentBuilder() {
  const publishAssignment = useSchoolStore((s) => s.publishAssignment)
  const addAssessmentBankItem = useSchoolStore((s) => s.addAssessmentBankItem)
  const showFlash = useSchoolStore((s) => s.showFlash)

  const [tab, setTab] = useState<"build" | "saved">("build")
  const [topicId, setTopicId] = useState("")
  const [classId, setClassId] = useState("")
  const [term, setTerm] = useState("")
  const [objectiveText, setObjectiveText] = useState("")
  const [sections, setSections] = useState<AssessmentSection[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [demandDropdownId, setDemandDropdownId] = useState<string | null>(null)
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const bank = useSchoolStore((s) => s.assessmentBank)

  // OKF import modal
  const [okfOpen, setOkfOpen] = useState(false)
  const [okfExpanded, setOkfExpanded] = useState<Record<string, boolean>>({})
  const [okfSelected, setOkfSelected] = useState<Record<string, boolean>>({})

  // Video Lesson modal
  const [videoOpen, setVideoOpen] = useState(false)
  const [videoClassId, setVideoClassId] = useState("")
  const [videoTopicId, setVideoTopicId] = useState("")
  const [videoObjective, setVideoObjective] = useState("")
  const [videoQuery, setVideoQuery] = useState("")
  const [videoMode, setVideoMode] = useState<"keyword" | "semantic">("keyword")
  const [videoSelected, setVideoSelected] = useState<Record<string, boolean>>({})

  // Assign-from-bank modal
  const [assignModal, setAssignModal] = useState<{ bankId: string; classId: string; due: string; totalPoints: number | string } | null>(null)

  // Manage Questions modal
  const [manageOpen, setManageOpen] = useState(false)
  const [manageSectionId, setManageSectionId] = useState<string | null>(null)
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null)
  const [editor, setEditor] = useState<EditorState>(emptyEditorFor(null))

  // Diagnostics modal
  const [diagOpen, setDiagOpen] = useState(false)

  const getSection = (id: string | null) => sections.find((s) => s.id === id)

  // OKF_QUESTION_BANK only contains CBSE Class 10 Mathematics content — offering
  // it for a non-Math topic (e.g. Biology/Chemistry) would import questions
  // unrelated to the assessment being built, so it's only offered for Math topics.
  const isOkfEligible = TOPIC_OPTIONS.find((t) => t.id === topicId)?.label.startsWith("Maths") ?? false

  /* ---- Section handlers ---- */
  const changeTopic = (newTopic: string) => {
    setTopicId(newTopic)
    setSections((prev) => prev.map((sec) => ({ ...sec, questions: buildSectionQuestions(sec.type, newTopic, sec.count, sec.demand) })))
  }

  const addSection = (type: string) => {
    const demand: Demand = { name: "Balanced", easy: 30, medium: 50, hard: 20 }
    const id = "sec_" + Date.now()
    const questions = buildSectionQuestions(type, topicId, 5, demand)
    setSections((prev) => [...prev, { id, type, label: nextSectionLabel(prev.length), count: 5, pointsPer: 2, demand, questions }])
    setSelectedSectionId(id)
  }

  const setSectionLabel = (id: string, label: string) =>
    setSections((prev) => prev.map((sec) => (sec.id === id ? { ...sec, label } : sec)))

  const toggleSectionSelect = (id: string) => setSelectedSectionId((cur) => (cur === id ? null : id))

  const removeSection = (id: string) => {
    setSections((prev) => prev.filter((sec) => sec.id !== id))
    setSelectedSectionId((cur) => (cur === id ? null : cur))
  }

  const moveSection = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return
    setSections((prev) => {
      const from = prev.findIndex((sec) => sec.id === draggedId)
      const to = prev.findIndex((sec) => sec.id === targetId)
      if (from === -1 || to === -1) return prev
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  const changeCount = (id: string, delta: number) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== id) return sec
        const count = Math.max(1, Math.min(30, sec.count + delta))
        if (count === sec.count) return sec
        // Preserve existing (possibly hand-edited) questions instead of
        // regenerating the whole section: append on increment, trim from
        // the end on decrement.
        const questions =
          count > sec.count
            ? [
                ...sec.questions,
                ...buildSectionQuestions(
                  sec.type,
                  topicId,
                  count - sec.count,
                  sec.demand,
                  new Set(sec.questions.map((q) => q.text)),
                ),
              ]
            : sec.questions.slice(0, count)
        return { ...sec, count, questions }
      }),
    )
  }

  const changePoints = (id: string, delta: number) => {
    setSections((prev) => prev.map((sec) => (sec.id === id ? { ...sec, pointsPer: Math.max(1, Math.min(20, sec.pointsPer + delta)) } : sec)))
  }

  const pickDemand = (id: string, key: string) => {
    const preset = DEMAND_PRESETS.find((p) => p.key === key)
    if (!preset) return
    setDemandDropdownId(null)
    setSections((prev) =>
      prev.map((sec) =>
        sec.id === id
          ? { ...sec, demand: { name: preset.name, easy: preset.easy, medium: preset.medium, hard: preset.hard }, questions: buildSectionQuestions(sec.type, topicId, sec.count, preset) }
          : sec,
      ),
    )
  }

  const repickQuestions = (id: string) => {
    setSections((prev) => prev.map((sec) => (sec.id === id ? { ...sec, questions: buildSectionQuestions(sec.type, topicId, sec.count, sec.demand) } : sec)))
  }

  /* ---- OKF import ---- */
  const openOkf = () => {
    setOkfOpen(true)
    setOkfExpanded({})
    setOkfSelected({})
  }
  const okfSelectedCount = Object.values(okfSelected).filter(Boolean).length
  const confirmOkf = () => {
    const picked: typeof OKF_QUESTION_BANK.chapters[number]["topics"][number]["questions"] = []
    OKF_QUESTION_BANK.chapters.forEach((ch) => ch.topics.forEach((tp) => tp.questions.forEach((q) => { if (okfSelected[q.id]) picked.push(q) })))
    if (!picked.length) return
    const questions = picked.map((q) => {
      if (q.type === "MCQ") {
        return normalizeQuestion({
          id: nextId("q_okf"),
          text: q.text,
          difficulty: "Medium",
          okfRef: q.okf_ref,
          marks: q.marks,
          options: (q.options || []).map((opt, i) => ({ label: String.fromCharCode(65 + i), text: opt, correct: i === q.correctIndex })),
        })
      }
      return normalizeQuestion({
        id: nextId("q_okf"),
        text: q.text,
        difficulty: "Medium",
        okfRef: q.okf_ref,
        marks: q.marks,
        modelAnswer: q.type + " — model solution to be reviewed by teacher before publishing.",
      })
    })
    const totalMarks = picked.reduce((a, q) => a + q.marks, 0)
    const id = "sec_okf_" + Date.now()
    const section: AssessmentSection = {
      id,
      type: "okf_import",
      label: nextSectionLabel(sections.length),
      count: questions.length,
      pointsPer: Math.round(totalMarks / questions.length) || 1,
      demand: { name: "OKF Curriculum", easy: 0, medium: 100, hard: 0 },
      questions,
    }
    setSections((prev) => [...prev, section])
    setSelectedSectionId(id)
    setOkfOpen(false)
  }

  /* ---- Video Lesson import ---- */
  const openVideoLesson = () => {
    setVideoOpen(true)
    setVideoClassId(classId)
    setVideoTopicId(topicId)
    setVideoObjective(objectiveText)
    setVideoQuery("")
    setVideoMode("keyword")
    setVideoSelected({})
  }
  const videoSelectedCount = Object.values(videoSelected).filter(Boolean).length
  const videoResults = VIDEO_LIBRARY.filter((v) => {
    if (videoTopicId && v.topicId !== videoTopicId) return false
    const q = videoQuery.trim().toLowerCase()
    if (!q) return true
    // Both modes search the same local fields for this demo library — "semantic"
    // additionally matches on tags (loosely standing in for meaning-based
    // recall), while "keyword" only matches the literal title text.
    if (videoMode === "keyword") return v.title.toLowerCase().includes(q)
    return v.title.toLowerCase().includes(q) || v.tags.some((t) => t.toLowerCase().includes(q))
  })
  const confirmVideoLesson = () => {
    const picked = VIDEO_LIBRARY.filter((v) => videoSelected[v.id])
    if (!picked.length) return
    const questions = picked.map((v) =>
      normalizeQuestion({
        id: nextId("q_vid"),
        text: v.title,
        difficulty: "Medium",
        videoThumbnail: v.thumbnail,
        videoDuration: v.duration,
      }),
    )
    const id = "sec_vid_" + Date.now()
    const section: AssessmentSection = {
      id,
      type: "video_lesson",
      label: nextSectionLabel(sections.length),
      count: questions.length,
      pointsPer: 1,
      demand: { name: "Video Lesson", easy: 0, medium: 100, hard: 0 },
      questions,
    }
    setSections((prev) => [...prev, section])
    setSelectedSectionId(id)
    setVideoOpen(false)
  }

  /* ---- Manage Questions ---- */
  const openManage = (id: string) => {
    setManageOpen(true)
    setManageSectionId(id)
    setEditingQuestionId(null)
    setEditor(emptyEditorFor(getSection(id)?.type || null))
  }
  const closeManage = () => {
    setManageOpen(false)
    setManageSectionId(null)
    setEditingQuestionId(null)
  }

  const editQuestion = (qid: string) => {
    const sec = getSection(manageSectionId)
    const q = sec?.questions.find((x) => x.id === qid)
    if (!q) return
    setEditingQuestionId(qid)
    setEditor({
      text: q.text || "",
      difficulty: q.difficulty || "Easy",
      explanation: q.explanation || "",
      options: q.options ? q.options.map((o) => ({ text: o.text, correct: o.correct })) : [],
      pairs: q.pairs ? q.pairs.map((p) => ({ ...p })) : [],
      correctAnswer: q.correctAnswer || "",
      modelAnswer: q.modelAnswer || q.rubric || "",
      scenarioText: q.scenarioText || "",
      subQuestions: q.subQuestions ? q.subQuestions.map((sq) => ({ ...sq })) : [],
    })
  }

  const deleteQuestion = (qid: string) => {
    setSections((prev) =>
      prev.map((sec) => {
        if (sec.id !== manageSectionId) return sec
        const questions = sec.questions.filter((q) => q.id !== qid)
        return { ...sec, questions, count: questions.length || sec.count }
      }),
    )
  }

  const saveQuestion = () => {
    const sec = getSection(manageSectionId)
    if (!sec || !editor.text.trim()) return
    const meta = SECTION_TYPE_META[sec.type] || {}
    const raw: RawQuestion = { id: editingQuestionId || nextId("q"), text: editor.text.trim(), difficulty: editor.difficulty, explanation: editor.explanation.trim() }
    if (meta.hasOptions) {
      raw.options = editor.options.filter((o) => o.text.trim()).map((o, i) => ({ label: String.fromCharCode(65 + i), text: o.text.trim(), correct: o.correct }))
    } else if (meta.hasPairs) {
      raw.pairs = editor.pairs.filter((p) => p.left.trim() && p.right.trim())
    } else if (meta.hasCorrectAnswer) {
      raw.correctAnswer = editor.correctAnswer.trim()
    } else if (meta.hasSubQuestions) {
      raw.subQuestions = editor.subQuestions.filter((sq) => sq.text.trim())
      raw.modelAnswer = editor.modelAnswer.trim()
    } else if (meta.hasScenarioText) {
      raw.scenarioText = editor.scenarioText.trim()
      raw.modelAnswer = editor.modelAnswer.trim()
    } else if (meta.hasRubric) {
      raw.rubric = editor.modelAnswer.trim()
    } else if (meta.hasModelAnswer) {
      raw.modelAnswer = editor.modelAnswer.trim()
    }
    const question = normalizeQuestion(raw)
    const editingId = editingQuestionId
    setSections((prev) =>
      prev.map((s) => {
        if (s.id !== manageSectionId) return s
        const questions = editingId ? s.questions.map((q) => (q.id === editingId ? question : q)) : [...s.questions, question]
        return { ...s, questions, count: questions.length }
      }),
    )
    setEditingQuestionId(null)
    setEditor(emptyEditorFor(sec.type))
  }

  /* ---- Generate / Save ---- */
  const ready = objectiveText.trim().length > 10 && sections.length > 0
  const totalItems = sections.reduce((a, s) => a + s.count, 0)
  const totalPoints = sections.reduce((a, s) => a + s.count * s.pointsPer, 0)
  const totalMinutes = sections.reduce((a, s) => a + Math.ceil(s.count * 2), 0)

  const buildBankEntry = (): AssessmentBankItem => {
    const cls = CLASSES.find((c) => c.id === classId)
    const topicLabel = TOPIC_OPTIONS.find((t) => t.id === topicId)?.label || "Assessment"
    return {
      id: "bank_" + Date.now(),
      title: topicLabel.replace(/^.*—\s*/, "") + " — Assessment",
      classId,
      subject: cls ? cls.subject : "",
      term,
      academicYear: ACADEMIC_YEARS[1],
      totalPoints,
      sectionCount: sections.length,
      questionCount: totalItems,
      createdOn: "Just now",
      sections,
    }
  }

  const generate = () => {
    setGenerating(true)
    setTimeout(() => {
      const entry = buildBankEntry()
      addAssessmentBankItem(entry)
      setGenerating(false)
      setTab("saved")
      showFlash("assessment", `Saved "${entry.title}" to your Assessment Bank.`, 4000)
    }, 900)
  }

  const assignNow = () => {
    setGenerating(true)
    setTimeout(() => {
      const entry = buildBankEntry()
      addAssessmentBankItem(entry)
      setGenerating(false)
      // Open the Assign modal directly from `entry` rather than via
      // openAssign(entry.id) — the `bank` array from useSchoolStore is a
      // stale closure until the next render, so a bank.find() here would
      // not see the item we just added.
      setAssignModal({ bankId: entry.id, classId: entry.classId, due: "", totalPoints: entry.totalPoints })
    }, 900)
  }

  /* ---- Assign from bank ---- */
  const openAssign = (id: string) => {
    const entry = bank.find((b) => b.id === id)
    if (!entry) return
    setAssignModal({ bankId: id, classId: entry.classId, due: "", totalPoints: entry.totalPoints })
  }
  const confirmAssign = () => {
    if (!assignModal) return
    const entry = bank.find((b) => b.id === assignModal.bankId)
    if (!entry || !assignModal.due) return
    const cls = CLASSES.find((c) => c.id === assignModal.classId)
    const submissions = STUDENTS.filter((st) => st.classId === assignModal.classId).map((st) => ({
      studentId: st.id,
      status: "not_started" as const,
      submittedOn: "",
      score: null,
      feedback: "",
    }))
    const assignment: Assignment = {
      id: "a_" + Date.now(),
      title: entry.title,
      classId: assignModal.classId,
      subject: cls ? cls.subject : entry.subject,
      term: entry.term,
      academicYear: entry.academicYear,
      due: assignModal.due,
      totalPoints: assignModal.totalPoints === "" ? entry.totalPoints : Number(assignModal.totalPoints),
      status: "active",
      sourceAssessmentId: entry.id,
      publishedToStudents: true,
      createdOn: "Just now",
      submissions,
      sections: entry.sections,
    }
    publishAssignment(assignment)
    setAssignModal(null)
    showFlash("homework", `Assigned "${entry.title}" to ${cls ? cls.name : "class"} — published to students.`)
  }

  /* ---- Diagnostics derived ---- */
  const diag = (() => {
    const easy = sections.reduce((a, s) => a + s.questions.filter((q) => q.difficulty === "Easy").length, 0)
    const medium = sections.reduce((a, s) => a + s.questions.filter((q) => q.difficulty === "Medium").length, 0)
    const hard = sections.reduce((a, s) => a + s.questions.filter((q) => q.difficulty === "Hard").length, 0)
    const pct = (n: number) => (totalItems ? Math.round((n / totalItems) * 100) : 0)
    const typeMap: Record<string, number> = {}
    sections.forEach((s) => { const t = (SECTION_TEMPLATES[s.type] || {}).title || s.type; typeMap[t] = (typeMap[t] || 0) + s.count })
    const typeDist = Object.entries(typeMap).map(([name, count]) => ({ name, count, pct: totalItems ? Math.round((count / totalItems) * 100) : 0 }))
    return { easyPct: pct(easy), mediumPct: pct(medium), hardPct: pct(hard), typeDist }
  })()

  const manageSection = getSection(manageSectionId)
  const manageMeta = manageSection ? SECTION_TYPE_META[manageSection.type] || {} : {}
  const manageTitle = manageSection ? (SECTION_TEMPLATES[manageSection.type] || {}).title || "Questions" : "Questions"
  const optionInputType = manageMeta.singleCorrect ? "radio" : "checkbox"
  const isSubjective = !!((manageMeta.hasModelAnswer || manageMeta.hasRubric) && !manageMeta.hasSubQuestions && !manageMeta.hasScenarioText)
  const rubricLabel = manageSection && manageSection.type === "essay" ? "Rubric / Model Answer" : "Model Answer"

  const tabStyle = (active: boolean): CSSProperties => ({
    padding: "9px 16px",
    borderRadius: 8,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "inherit",
    border: "none",
    cursor: "pointer",
    background: active ? "#111827" : "transparent",
    color: active ? "#fff" : "#6B7280",
  })

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div className="font-display text-[24px] font-bold text-ink" style={{ marginBottom: 4 }}>Assessment Builder</div>
          <div className="text-[16px] text-text-secondary">Add sections from the palette, tune difficulty mix, and generate a ready-to-use assessment.</div>
        </div>
        <div
          onClick={() => setDiagOpen(true)}
          style={{ display: "inline-flex", alignItems: "center", gap: 8, whiteSpace: "nowrap", flexShrink: 0, background: "#F5F1E6", border: "1px solid #DDD8CF", color: "#3D5A60", padding: "9px 16px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }}
        >
          📊 Diagnostics
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 10, padding: 4, width: "fit-content", marginBottom: 20 }}>
        <button type="button" onClick={() => setTab("build")} style={tabStyle(tab === "build")}>Build New</button>
        <button type="button" onClick={() => setTab("saved")} style={tabStyle(tab === "saved")}>Saved Assessments ({bank.length})</button>
      </div>

      <FlashBanner flashKey="assessment" />
      <FlashBanner flashKey="homework" />

      {/* ------------------------------ SAVED TAB ------------------------------ */}
      {tab === "saved" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
          {bank.map((b) => (
            <div key={b.id} style={{ background: "#FFFFFF", border: "1px solid #DDD8CF", borderRadius: 14, padding: 18, boxShadow: "0 2px 10px rgba(26,46,53,.05)" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#16332B", background: "#E9F1EC", display: "inline-block", padding: "3px 9px", borderRadius: 999, marginBottom: 10 }}>{b.subject}</div>
              <div style={{ fontSize: 16.5, fontWeight: 700, color: "#13231F", marginBottom: 6, lineHeight: 1.3 }}>{b.title}</div>
              <div style={{ fontSize: 14, color: "#7A9298", marginBottom: 6 }}>{classNameById(b.classId)} · {b.term}</div>
              <div style={{ fontSize: 13.5, color: "#7A9298", marginBottom: 14 }}>{b.sectionCount} sections · {b.questionCount} questions · {b.totalPoints} pts</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #F1F0EA" }}>
                <div style={{ fontSize: 13.5, color: "#9CA3AF" }}>Saved {b.createdOn}</div>
                <div onClick={() => openAssign(b.id)} style={{ fontSize: 14, fontWeight: 700, color: "#16332B", cursor: "pointer" }}>Assign to Class →</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ------------------------------ BUILD TAB ------------------------------ */}
      {tab === "build" && (
        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* PALETTE */}
          <div style={{ width: 250, minWidth: 250, background: "#FFFFFF", border: "1px solid #DDD8CF", borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: 16, borderBottom: "1px solid #DDD8CF" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#13231F" }}>Add Questions</div>
              <div style={{ fontSize: 14, color: "#7A9298", marginTop: 6 }}>Click a question type to add a section.</div>
            </div>
            <div style={{ padding: 14 }}>
              {isOkfEligible ? (
                <div onClick={openOkf} style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 12, border: "1px solid #BFE0D3", background: "#E9F1EC", padding: 12, cursor: "pointer", marginBottom: 14 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, background: "#fff", color: "#16332B", flexShrink: 0 }}>🔗</div>
                  <div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: "#16332B" }}>Import from OKF</div>
                    <div style={{ fontSize: 12, color: "#3D5A60" }}>Curriculum-aligned questions</div>
                  </div>
                </div>
              ) : (
                <div style={{ borderRadius: 12, border: "1px solid #DDD8CF", background: "#F5F1E6", padding: 12, marginBottom: 14 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#7A9298" }}>Import from OKF</div>
                  <div style={{ fontSize: 12, color: "#7A9298", marginTop: 2 }}>Available for Math topics only</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
                {PALETTE_TYPES.map((pt) => (
                  <div
                    key={pt.type}
                    onClick={() => addSection(pt.type)}
                    style={{ aspectRatio: "1", borderRadius: 12, border: "1px solid #DDD8CF", background: "#F5F1E6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", padding: 8, textAlign: "center" }}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, background: pt.bg, color: pt.color }}>{pt.icon}</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#3D5A60", lineHeight: 1.2 }}>{pt.label}</span>
                  </div>
                ))}
                <div
                  onClick={openVideoLesson}
                  style={{ aspectRatio: "1", borderRadius: 12, border: "1px solid #DDD8CF", background: "#F5F1E6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer", padding: 8, textAlign: "center" }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, background: SECTION_TEMPLATES.video_lesson.bg, color: SECTION_TEMPLATES.video_lesson.iconColor }}>{SECTION_TEMPLATES.video_lesson.icon}</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#3D5A60", lineHeight: 1.2 }}>Video Lesson</span>
                </div>
              </div>
            </div>
          </div>

          {/* BUILDER */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* STEP 1 */}
            <div style={stepCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <span style={stepBadge}>Step 1</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#13231F" }}>Set class context</span>
                <span style={{ fontSize: 14, color: "#7A9298" }}>Choose class and learning objective.</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "flex-end" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={fieldLabel}>Subject / Topic</label>
                  <select value={topicId} onChange={(e) => changeTopic(e.target.value)} style={{ ...nativeSelect, minWidth: 190 }}>
                    <option value="">Select topic</option>
                    {TOPIC_OPTIONS.map((tp) => (
                      <option key={tp.id} value={tp.id}>{tp.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={fieldLabel}>Class &amp; Section</label>
                  <select value={classId} onChange={(e) => setClassId(e.target.value)} style={{ ...nativeSelect, minWidth: 220 }}>
                    <option value="">Select class</option>
                    {CLASSES.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={fieldLabel}>Term</label>
                  <select value={term} onChange={(e) => setTerm(e.target.value)} style={{ ...nativeSelect, minWidth: 140 }}>
                    <option value="">Select term</option>
                    {TERMS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #EFEBE2" }}>
                <label style={fieldLabel}>🎯 Learning Objective</label>
                <textarea
                  value={objectiveText}
                  onChange={(e) => setObjectiveText(e.target.value)}
                  placeholder="Example: Students will analyze how photosynthesis converts light energy into chemical energy..."
                  style={{ width: "100%", marginTop: 8, minHeight: 64, resize: "vertical", fontFamily: "Nunito, sans-serif", fontSize: 15, padding: "9px 12px", borderRadius: 8, border: "1px solid #DDD8CF" }}
                />
              </div>
            </div>

            {/* STEP 2 */}
            <div style={stepCard}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                <span style={stepBadge}>Step 2</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#13231F" }}>Build your assessment</span>
                <span style={{ fontSize: 14, color: "#7A9298" }}>Add sections, set counts, and build or pick questions.</span>
              </div>

              <div style={{ minHeight: 160, border: "2px dashed #DDD8CF", borderRadius: 16, padding: 18, background: "#FCFCFB", display: "flex", flexDirection: "column", gap: 14 }}>
                {sections.map((sec) => {
                  const tmpl = SECTION_TEMPLATES[sec.type] || SECTION_TEMPLATES.multiple_choice
                  const isExpanded = sec.id === selectedSectionId
                  const demandOpen = sec.id === demandDropdownId
                  const preview = sec.questions.slice(0, 2)
                  const moreCount = Math.max(0, sec.questions.length - 2)
                  return (
                    <div
                      key={sec.id}
                      draggable
                      onDragStart={() => setDraggedSectionId(sec.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault()
                        if (draggedSectionId) moveSection(draggedSectionId, sec.id)
                        setDraggedSectionId(null)
                      }}
                      onDragEnd={() => setDraggedSectionId(null)}
                      style={{ background: "#F5F1E6", border: "1px solid #D8E8E4", borderRadius: 12, overflow: "visible", boxShadow: "0 2px 10px rgba(26,46,53,.05)", opacity: draggedSectionId === sec.id ? 0.5 : 1 }}
                    >
                      <div onClick={() => toggleSectionSelect(sec.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: tmpl.bg, color: tmpl.iconColor }}>{tmpl.icon}</div>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 16, fontWeight: 700, color: "#13231F", marginBottom: 3 }}>
                              Section
                              <select
                                value={sec.label}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => setSectionLabel(sec.id, e.target.value)}
                                style={{ fontSize: 15, fontWeight: 700, color: "#13231F", border: "1px solid #DDD8CF", borderRadius: 6, background: "#fff", padding: "1px 4px", cursor: "pointer" }}
                              >
                                {SECTION_LETTERS.map((l) => (
                                  <option key={l} value={l}>{l}</option>
                                ))}
                              </select>
                              : {tmpl.title} Questions
                            </div>
                            <div style={{ fontSize: 14, color: "#7A9298" }}>{sec.count * sec.pointsPer} pts · ~{Math.ceil(sec.count * 2)} min · {sec.count} items</div>
                            <div style={{ marginTop: 8 }}>
                              <DemandBar easy={sec.demand.easy} medium={sec.demand.medium} hard={sec.demand.hard} width={220} />
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: "#7A9298", cursor: "grab" }} title="Drag anywhere on this card to reorder">⠿</button>
                          <button style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: "#7A9298", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="Expand/collapse">
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeSection(sec.id) }}
                            style={{ width: 30, height: 30, borderRadius: 8, border: "none", background: "transparent", color: "#C0392B", cursor: "pointer" }}
                            title="Remove"
                          >
                            🗑
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: "0 16px 16px" }}>
                          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 14 }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 150 }}>
                              <label style={fieldLabel}>Questions</label>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                                <button onClick={() => changeCount(sec.id, -1)} style={stepper}>−</button>
                                <input value={sec.count} readOnly style={{ width: 52, textAlign: "center", padding: "9px 4px", borderRadius: 8, border: "1px solid #DDD8CF", fontFamily: "inherit", fontSize: 15 }} />
                                <button onClick={() => changeCount(sec.id, 1)} style={stepper}>+</button>
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 150 }}>
                              <label style={fieldLabel}>Points / Question</label>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                                <button onClick={() => changePoints(sec.id, -1)} style={stepper}>−</button>
                                <input value={sec.pointsPer} readOnly style={{ width: 52, textAlign: "center", padding: "9px 4px", borderRadius: 8, border: "1px solid #DDD8CF", fontFamily: "inherit", fontSize: 15 }} />
                                <button onClick={() => changePoints(sec.id, 1)} style={stepper}>+</button>
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 280, position: "relative" }}>
                              <label style={fieldLabel}>Cognitive Demand</label>
                              <div
                                onClick={(e) => { e.stopPropagation(); setDemandDropdownId((cur) => (cur === sec.id ? null : sec.id)) }}
                                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 12px", border: "1px solid #DDD8CF", borderRadius: 8, background: "#F5F1E6", cursor: "pointer", marginTop: 6 }}
                              >
                                <div>
                                  <div style={{ fontSize: 15, fontWeight: 700, color: "#13231F" }}>{sec.demand.name}</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                    <DemandBar easy={sec.demand.easy} medium={sec.demand.medium} hard={sec.demand.hard} width={90} />
                                    <span style={{ fontSize: 12, color: "#7A9298", fontWeight: 600 }}>E {sec.demand.easy}% · M {sec.demand.medium}% · H {sec.demand.hard}%</span>
                                  </div>
                                </div>
                                <ChevronDown size={16} />
                              </div>
                              {demandOpen && (
                                <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: "#F5F1E6", border: "1px solid #DDD8CF", borderRadius: 12, boxShadow: "0 10px 30px rgba(26,46,53,.12)", zIndex: 50, padding: 6 }}>
                                  {DEMAND_PRESETS.map((dm) => (
                                    <div key={dm.key} onClick={() => pickDemand(sec.id, dm.key)} style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2, background: dm.name === sec.demand.name ? "#E4F0ED" : "transparent" }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 15, fontWeight: 700, color: "#13231F" }}><span>{dm.name}</span></div>
                                      <div style={{ marginBottom: 6 }}>
                                        <DemandBar easy={dm.easy} medium={dm.medium} hard={dm.hard} height={8} />
                                      </div>
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#7A9298", fontWeight: 600 }}><span>E {dm.easy}%</span><span>M {dm.medium}%</span><span>H {dm.hard}%</span></div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                            <div onClick={(e) => { e.stopPropagation(); openManage(sec.id) }} style={{ ...secondaryBtn }}>✎ Manage Questions</div>
                            <div onClick={(e) => { e.stopPropagation(); repickQuestions(sec.id) }} style={{ ...secondaryBtn }}>🎲 Repick Randomly</div>
                            <span style={{ fontSize: 14, color: "#7A9298" }}>{sec.questions.length} of {sec.count} questions selected from bank</span>
                          </div>

                          <label style={{ fontSize: 14, fontWeight: 600, color: "#7A9298" }}>Preview</label>
                          {preview.map((q, qi) =>
                            q.hasVideo ? (
                              <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, background: "#FFFFFF", border: "1px solid #D8E8E4", borderRadius: 8, margin: "8px 0 10px" }}>
                                <div style={{ width: 48, height: 48, borderRadius: 8, background: "#F5F1E6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{q.videoThumbnail}</div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, color: "#13231F", fontSize: 15 }}>{qi + 1}. {q.text}</div>
                                  <div style={{ fontSize: 13, color: "#7A9298", marginTop: 2 }}>▶ {q.videoDuration}</div>
                                </div>
                              </div>
                            ) : (
                            <div key={q.id} style={{ padding: 12, background: "#FFFFFF", border: "1px solid #D8E8E4", borderRadius: 8, margin: "8px 0 10px", fontSize: 15 }}>
                              {q.hasScenario && <div style={{ fontSize: 14, color: "#7A9298", marginBottom: 8, fontStyle: "italic" }}>{q.scenarioText}</div>}
                              <div style={{ fontWeight: 700, marginBottom: 8, color: "#13231F" }}>
                                {qi + 1}. {q.text}
                                {q.okfRef && <span style={{ fontSize: 11, fontWeight: 700, color: "#16332B", background: "#E9F1EC", padding: "2px 7px", borderRadius: 999, verticalAlign: "middle", marginLeft: 6 }}>🔗 OKF · {q.marks} pts</span>}
                              </div>
                              {q.hasOptions && q.options!.map((opt, oi) => (
                                <div key={oi} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 6, fontSize: 14, marginBottom: 6, background: opt.correct ? "#DFF5EC" : "#fff", border: opt.correct ? "1px solid #2E9E6B" : "1px solid #D8E8E4" }}>
                                  <span>{opt.correct ? "✓" : "○"}</span>
                                  <span><strong>{opt.label}.</strong> {opt.text}</span>
                                </div>
                              ))}
                              {q.hasPairs && q.pairs!.map((pr, pi) => (
                                <div key={pi} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "#F5F1E6", border: "1px solid #D8E8E4", borderRadius: 6, fontSize: 14, marginBottom: 6 }}>
                                  <span>{pr.left}</span><span style={{ color: "#4A7C6F" }}>↔</span><span>{pr.right}</span>
                                </div>
                              ))}
                              {q.hasAnswer && <div style={{ fontSize: 14, color: "#2E9E6B", marginTop: 4 }}><strong>Answer:</strong> {q.correctAnswer}</div>}
                              {q.hasSubQ && (
                                <div style={{ marginTop: 6, paddingLeft: 12 }}>
                                  {q.subQuestions!.map((sq, si) => (
                                    <div key={si} style={{ fontSize: 14, color: "#3D5A60", marginBottom: 4 }}>{sq.text} <span style={{ color: "#2E9E6B" }}>→ {sq.answer}</span></div>
                                  ))}
                                </div>
                              )}
                              {q.hasRubric && <div style={{ fontSize: 13, color: "#7A9298", marginTop: 4 }}><strong>Rubric:</strong> {q.rubric}</div>}
                              {q.hasModel && <div style={{ fontSize: 13, color: "#7A9298", marginTop: 4 }}><strong>Model answer:</strong> {q.modelAnswer}</div>}
                            </div>
                            )
                          )}
                          {moreCount > 0 && <div style={{ fontSize: 14, color: "#7A9298", paddingLeft: 4 }}>+ {moreCount} more questions</div>}
                        </div>
                      )}
                    </div>
                  )
                })}

                {sections.length === 0 && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, minHeight: 120 }}>
                    <div style={{ textAlign: "center", color: "#7A9298", margin: "auto" }}>
                      <div style={{ width: 56, height: 56, margin: "0 auto 14px", borderRadius: 16, background: "#F2F0EB", border: "2px dashed #DDD8CF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>🤖</div>
                      <div style={{ fontSize: 18, color: "#13231F", fontWeight: 700, marginBottom: 6 }}>Build Your Assessment</div>
                      <div style={{ fontSize: 15 }}>Click a question type to add sections to your assessment.</div>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginTop: 22, paddingTop: 16, borderTop: "1px solid #DDD8CF", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <span style={stepBadge}>Step 3</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, fontSize: 14, fontWeight: 600, background: ready ? "#DFF5EC" : "#FDF1D3", color: ready ? "#2E9E6B" : "#D48A0C" }}>
                    {ready ? "✓ Ready to generate" : "⚠ Needs Objective"}
                  </div>
                  <span style={{ fontSize: 15, color: "#3D5A60", fontWeight: 600 }}>Sections {sections.length} · Items {totalItems} · ~Time {totalMinutes}m · Points {totalPoints}</span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={generate}
                    disabled={!ready || generating}
                    style={{ padding: "10px 20px", borderRadius: 8, fontFamily: "Nunito, sans-serif", fontSize: 15, fontWeight: 700, cursor: ready && !generating ? "pointer" : "not-allowed", border: "none", background: "#D9A94E", color: "#13231F", boxShadow: "0 4px 12px rgba(201,168,76,.28)", opacity: ready && !generating ? 1 : 0.5 }}
                  >
                    {generating ? "💾 Saving…" : "💾 Save Assessment"}
                  </button>
                  <button
                    onClick={assignNow}
                    disabled={!ready || generating}
                    style={{ padding: "10px 20px", borderRadius: 8, fontFamily: "Nunito, sans-serif", fontSize: 15, fontWeight: 700, cursor: ready && !generating ? "pointer" : "not-allowed", border: "1px solid #16332B", background: "#16332B", color: "#fff", opacity: ready && !generating ? 1 : 0.5 }}
                  >
                    Assign Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ ASSIGN FROM BANK MODAL ------------------------------ */}
      {assignModal && (
        <div onClick={() => setAssignModal(null)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#F5F1E6", border: "1px solid #DDD8CF", borderRadius: 16, boxShadow: "0 24px 60px rgba(26,46,53,.22)", width: "100%", maxWidth: 440, padding: 22 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#13231F", marginBottom: 16 }}>Assign to Class</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#7A9298", marginBottom: 6 }}>Class &amp; Section</div>
            <div style={{ fontSize: 15.5, fontWeight: 700, color: "#13231F", background: "#fff", border: "1px solid #DDD8CF", borderRadius: 8, padding: "9px 12px", marginBottom: 14 }}>{classNameById(assignModal.classId)}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#7A9298", marginBottom: 6 }}>Due Date</div>
            <input value={assignModal.due} onChange={(e) => setAssignModal({ ...assignModal, due: e.target.value })} placeholder="e.g. Jul 20" style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid #DDD8CF", borderRadius: 8, fontSize: 15, fontFamily: "inherit", marginBottom: 14 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "#7A9298", marginBottom: 6 }}>Total Points</div>
            <input value={assignModal.totalPoints} type="number" onChange={(e) => setAssignModal({ ...assignModal, totalPoints: e.target.value })} style={{ width: "100%", height: 38, padding: "0 12px", border: "1px solid #DDD8CF", borderRadius: 8, fontSize: 15, fontFamily: "inherit", marginBottom: 4 }} />
            <div style={{ fontSize: 13, color: "#9CA3AF", marginBottom: 18 }}>Publishes immediately to every student in this class.</div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 14, borderTop: "1px solid #E5E7EB" }}>
              <div onClick={() => setAssignModal(null)} style={{ fontSize: 14.5, fontWeight: 600, color: "#374151", background: "#fff", border: "1px solid #DDD8CF", padding: "9px 16px", borderRadius: 8, cursor: "pointer" }}>Cancel</div>
              <div onClick={confirmAssign} style={{ fontSize: 14.5, fontWeight: 700, color: "#fff", background: "#16332B", padding: "9px 18px", borderRadius: 8, cursor: "pointer" }}>Assign &amp; Publish</div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ OKF IMPORT MODAL ------------------------------ */}
      {okfOpen && (
        <div onClick={() => setOkfOpen(false)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#F5F1E6", border: "1px solid #DDD8CF", borderRadius: 16, boxShadow: "0 24px 60px rgba(26,46,53,.22)", width: "100%", maxWidth: 720, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #DDD8CF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 19, fontWeight: 700, color: "#13231F" }}>
                  Import from OKF <span style={{ fontSize: 12, fontWeight: 700, color: "#16332B", background: "#E9F1EC", padding: "2px 8px", borderRadius: 999, marginLeft: 6 }}>CBSE · Class 10 · Mathematics</span>
                </div>
                <div style={{ fontSize: 13, color: "#7A9298", marginTop: 2 }}>Browse chapter → topic, tick questions to add as a new section.</div>
              </div>
              <div onClick={() => setOkfOpen(false)} style={{ ...closeBtn, fontSize: 20 }}><X size={20} /></div>
            </div>
            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
              {OKF_QUESTION_BANK.chapters.map((ch) => {
                const expanded = !!okfExpanded[ch.id]
                return (
                  <div key={ch.id} style={{ background: "#fff", border: "1px solid #DDD8CF", borderRadius: 12, marginBottom: 10, overflow: "hidden" }}>
                    <div onClick={() => setOkfExpanded((prev) => ({ ...prev, [ch.id]: !prev[ch.id] }))} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", cursor: "pointer" }}>
                      <span style={{ color: "#9CA3AF", display: "inline-flex" }}>{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                      <div style={{ fontSize: 15, fontWeight: 700, color: "#13231F" }}>Chapter {ch.number}: {ch.title}</div>
                    </div>
                    {expanded && (
                      <div style={{ padding: "0 16px 14px" }}>
                        {ch.topics.map((tp) => (
                          <div key={tp.id} style={{ padding: "8px 0", borderTop: "1px solid #F1F0EA" }}>
                            <div style={{ fontSize: 13.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>{tp.title}</div>
                            {tp.questions.map((q) => (
                              <div key={q.id} onClick={() => setOkfSelected((prev) => ({ ...prev, [q.id]: !prev[q.id] }))} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px", borderRadius: 8, cursor: "pointer" }}>
                                <input type="checkbox" checked={!!okfSelected[q.id]} readOnly style={{ width: 15, height: 15, marginTop: 2, accentColor: "#16332B", cursor: "pointer" }} />
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontSize: 14, color: "#111827" }}>{q.text}</div>
                                  <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{q.type} · {q.marks} pts · {q.okf_ref}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 20px", borderTop: "1px solid #DDD8CF" }}>
              <span style={{ fontSize: 14, color: "#3D5A60", fontWeight: 600 }}>{okfSelectedCount} question(s) selected</span>
              <div style={{ display: "flex", gap: 10 }}>
                <div onClick={() => setOkfOpen(false)} style={{ background: "#fff", border: "1px solid #DDD8CF", color: "#3D5A60", padding: "9px 16px", borderRadius: 8, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
                <div onClick={confirmOkf} style={{ background: "#16332B", color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>Add to Assessment</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ VIDEO LESSON MODAL ------------------------------ */}
      {videoOpen && (
        <div onClick={() => setVideoOpen(false)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#F5F1E6", border: "1px solid #DDD8CF", borderRadius: 16, boxShadow: "0 24px 60px rgba(26,46,53,.22)", width: "100%", maxWidth: 720, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #DDD8CF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 19, fontWeight: 700, color: "#13231F" }}>🎬 Add Video Lesson</div>
                <div style={{ fontSize: 13, color: "#7A9298", marginTop: 2 }}>Search the video library and add clips as a new section.</div>
              </div>
              <div onClick={() => setVideoOpen(false)} style={{ ...closeBtn, fontSize: 20 }}><X size={20} /></div>
            </div>

            <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginBottom: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={fieldLabel}>Class &amp; Section</label>
                  <select value={videoClassId} onChange={(e) => setVideoClassId(e.target.value)} style={{ ...nativeSelect, minWidth: 200 }}>
                    <option value="">Select class</option>
                    {CLASSES.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.subject}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={fieldLabel}>Subject / Topic</label>
                  <select value={videoTopicId} onChange={(e) => setVideoTopicId(e.target.value)} style={{ ...nativeSelect, minWidth: 190 }}>
                    <option value="">All topics</option>
                    {TOPIC_OPTIONS.map((tp) => (
                      <option key={tp.id} value={tp.id}>{tp.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={fieldLabel}>Learning Objective</label>
                <textarea
                  value={videoObjective}
                  onChange={(e) => setVideoObjective(e.target.value)}
                  placeholder="What should students take away from this video?"
                  style={{ width: "100%", marginTop: 6, minHeight: 44, resize: "vertical", fontFamily: "Nunito, sans-serif", fontSize: 15, padding: "9px 12px", borderRadius: 8, border: "1px solid #DDD8CF" }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 4, background: "#EFEBE2", borderRadius: 8, padding: 3 }}>
                  {(["keyword", "semantic"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setVideoMode(m)}
                      style={{ padding: "7px 14px", borderRadius: 6, border: "none", fontSize: 13.5, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", background: videoMode === m ? "#16332B" : "transparent", color: videoMode === m ? "#fff" : "#3D5A60", textTransform: "capitalize" }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={videoQuery}
                  onChange={(e) => setVideoQuery(e.target.value)}
                  placeholder={videoMode === "semantic" ? "Describe what you're looking for…" : "Search by title…"}
                  style={{ flex: 1, minWidth: 200, fontSize: 15, padding: "9px 12px", borderRadius: 8, border: "1px solid #DDD8CF", fontFamily: "inherit" }}
                />
              </div>

              {videoResults.length === 0 ? (
                <div style={{ fontSize: 14, color: "#7A9298", textAlign: "center", padding: "20px 0" }}>No videos match your search.</div>
              ) : (
                videoResults.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setVideoSelected((prev) => ({ ...prev, [v.id]: !prev[v.id] }))}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 8, background: "#fff", border: videoSelected[v.id] ? "1px solid #16332B" : "1px solid #D8E8E4" }}
                  >
                    <input type="checkbox" checked={!!videoSelected[v.id]} readOnly style={{ width: 15, height: 15, accentColor: "#16332B", cursor: "pointer", flexShrink: 0 }} />
                    <div style={{ width: 44, height: 44, borderRadius: 8, background: "#F5F1E6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{v.thumbnail}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14.5, fontWeight: 600, color: "#111827" }}>{v.title}</div>
                      <div style={{ fontSize: 12, color: "#9CA3AF", marginTop: 2 }}>{v.duration} · {v.tags.slice(0, 3).join(" · ")}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, padding: "14px 20px", borderTop: "1px solid #DDD8CF" }}>
              <span style={{ fontSize: 14, color: "#3D5A60", fontWeight: 600 }}>{videoSelectedCount} video(s) selected</span>
              <div style={{ display: "flex", gap: 10 }}>
                <div onClick={() => setVideoOpen(false)} style={{ background: "#fff", border: "1px solid #DDD8CF", color: "#3D5A60", padding: "9px 16px", borderRadius: 8, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>Cancel</div>
                <div onClick={confirmVideoLesson} style={{ background: "#16332B", color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: 14.5, fontWeight: 700, cursor: "pointer" }}>Add to Assessment</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ MANAGE QUESTIONS MODAL ------------------------------ */}
      {manageOpen && manageSection && (
        <div onClick={closeManage} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#F5F1E6", border: "1px solid #DDD8CF", borderRadius: 16, boxShadow: "0 24px 60px rgba(26,46,53,.22)", width: "100%", maxWidth: 680, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #DDD8CF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: "#13231F" }}>Manage Questions — {manageTitle}</div>
              <div onClick={closeManage} style={closeBtn}><X size={20} /></div>
            </div>
            <div style={{ padding: 20, overflowY: "auto" }}>
              <div style={{ marginBottom: 14 }}>
                <div style={editorSectionLabel}>Question Text</div>
                <textarea value={editor.text} onChange={(e) => setEditor({ ...editor, text: e.target.value })} placeholder="Enter your question here..." style={editorTextarea} />
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={editorSectionLabel}>Difficulty</div>
                <select value={editor.difficulty} onChange={(e) => setEditor({ ...editor, difficulty: e.target.value })} style={{ maxWidth: 180, fontSize: 15, padding: "9px 12px", borderRadius: 8, border: "1px solid #DDD8CF", fontFamily: "inherit" }}>
                  <option value="Easy">Easy</option>
                  <option value="Medium">Medium</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              {manageMeta.hasOptions && (
                <>
                  <div style={editorSectionLabel}>Options &amp; Correct Answer</div>
                  {editor.options.map((opt, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => setEditor({ ...editor, options: editor.options.map((o, oi) => (oi === i ? { ...o, text: e.target.value } : o)) })}
                        placeholder="Option text"
                        style={{ ...editorInput, flex: 1 }}
                      />
                      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: "#3D5A60", cursor: "pointer", whiteSpace: "nowrap" }}>
                        <input
                          type={optionInputType}
                          name="ab-editor-correct"
                          checked={opt.correct}
                          onChange={() =>
                            setEditor({
                              ...editor,
                              options: editor.options.map((o, oi) => (manageMeta.singleCorrect ? { ...o, correct: oi === i } : oi === i ? { ...o, correct: !o.correct } : o)),
                            })
                          }
                          style={{ width: 16, height: 16, cursor: "pointer" }}
                        />
                        Correct
                      </label>
                    </div>
                  ))}
                  <div onClick={() => setEditor({ ...editor, options: [...editor.options, { text: "", correct: false }] })} style={{ ...secondaryBtn, padding: "8px 14px", fontSize: 14.5, display: "inline-block", marginTop: 6 }}>+ Add Option</div>
                </>
              )}

              {manageMeta.hasPairs && (
                <>
                  <div style={editorSectionLabel}>Matching Pairs</div>
                  {editor.pairs.map((pair, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <input type="text" value={pair.left} onChange={(e) => setEditor({ ...editor, pairs: editor.pairs.map((p, pi) => (pi === i ? { ...p, left: e.target.value } : p)) })} placeholder="Left item" style={{ ...editorInput, flex: 1 }} />
                      <span style={{ color: "#7A9298" }}>↔</span>
                      <input type="text" value={pair.right} onChange={(e) => setEditor({ ...editor, pairs: editor.pairs.map((p, pi) => (pi === i ? { ...p, right: e.target.value } : p)) })} placeholder="Right item" style={{ ...editorInput, flex: 1 }} />
                    </div>
                  ))}
                  <div onClick={() => setEditor({ ...editor, pairs: [...editor.pairs, { left: "", right: "" }] })} style={{ ...secondaryBtn, padding: "8px 14px", fontSize: 14.5, display: "inline-block", marginTop: 6 }}>+ Add Pair</div>
                </>
              )}

              {manageMeta.hasCorrectAnswer && (
                <>
                  <div style={editorSectionLabel}>Correct Answer</div>
                  <input type="text" value={editor.correctAnswer} onChange={(e) => setEditor({ ...editor, correctAnswer: e.target.value })} placeholder="Enter the correct answer" style={{ ...editorInput, width: "100%", padding: "9px 12px" }} />
                </>
              )}

              {manageMeta.hasScenarioText && (
                <>
                  <div style={editorSectionLabel}>Scenario Text</div>
                  <textarea value={editor.scenarioText} onChange={(e) => setEditor({ ...editor, scenarioText: e.target.value })} placeholder="Describe the scenario here..." style={{ ...editorTextarea, marginBottom: 12 }} />
                  <div style={editorSectionLabel}>Model Answer</div>
                  <textarea value={editor.modelAnswer} onChange={(e) => setEditor({ ...editor, modelAnswer: e.target.value })} placeholder="Enter expected model answer..." style={editorTextarea} />
                </>
              )}

              {manageMeta.hasSubQuestions && (
                <>
                  <div style={editorSectionLabel}>Sub-questions</div>
                  {editor.subQuestions.map((sq, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                      <input type="text" value={sq.text} onChange={(e) => setEditor({ ...editor, subQuestions: editor.subQuestions.map((s, si) => (si === i ? { ...s, text: e.target.value } : s)) })} placeholder="Sub-question" style={editorInput} />
                      <input type="text" value={sq.answer} onChange={(e) => setEditor({ ...editor, subQuestions: editor.subQuestions.map((s, si) => (si === i ? { ...s, answer: e.target.value } : s)) })} placeholder="Answer" style={editorInput} />
                    </div>
                  ))}
                  <div onClick={() => setEditor({ ...editor, subQuestions: [...editor.subQuestions, { text: "", answer: "" }] })} style={{ ...secondaryBtn, padding: "8px 14px", fontSize: 14.5, display: "inline-block", margin: "6px 0 12px" }}>+ Add Sub-question</div>
                  <div style={editorSectionLabel}>Model Answer / Rubric</div>
                  <textarea value={editor.modelAnswer} onChange={(e) => setEditor({ ...editor, modelAnswer: e.target.value })} placeholder="Enter model answer covering all parts..." style={editorTextarea} />
                </>
              )}

              {isSubjective && (
                <>
                  <div style={editorSectionLabel}>{rubricLabel}</div>
                  <textarea value={editor.modelAnswer} onChange={(e) => setEditor({ ...editor, modelAnswer: e.target.value })} placeholder="Enter model answer or rubric..." style={{ ...editorTextarea, minHeight: 70 }} />
                </>
              )}

              <div style={{ marginTop: 14 }}>
                <div style={editorSectionLabel}>Explanation (optional)</div>
                <textarea value={editor.explanation} onChange={(e) => setEditor({ ...editor, explanation: e.target.value })} placeholder="Explain why the correct answer is right..." style={{ ...editorTextarea, minHeight: 50 }} />
              </div>

              <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid #DDD8CF" }}>
                <div onClick={saveQuestion} style={{ background: "#D9A94E", color: "#13231F", padding: "9px 16px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer", display: "inline-block" }}>💾 Save Question</div>
              </div>

              <div style={{ marginTop: 22 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#13231F", marginBottom: 10 }}>Questions in this Section</div>
                {manageSection.questions.map((q, i) => (
                  <div key={q.id} style={{ padding: 12, background: "#F5F1E6", border: "1px solid #D8E8E4", borderRadius: 8, marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ fontSize: 15, fontWeight: 600, color: "#13231F", flex: 1 }}>{i + 1}. {q.text}</div>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "3px 8px", borderRadius: 20, textTransform: "uppercase", background: "#DFF5EC", color: "#2E9E6B", flexShrink: 0 }}>{q.difficulty}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <div onClick={() => editQuestion(q.id)} style={{ background: "#F5F1E6", border: "1px solid #DDD8CF", color: "#3D5A60", padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Edit</div>
                      <div onClick={() => deleteQuestion(q.id)} style={{ background: "#FDECEA", border: "1px solid rgba(192,57,43,.2)", color: "#C0392B", padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Delete</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid #DDD8CF", display: "flex", justifyContent: "flex-end" }}>
              <div onClick={closeManage} style={{ ...secondaryBtn, padding: "8px 16px" }}>Close</div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------ DIAGNOSTICS MODAL ------------------------------ */}
      {diagOpen && (
        <div onClick={() => setDiagOpen(false)} style={modalOverlay}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#F5F1E6", border: "1px solid #DDD8CF", borderRadius: 16, boxShadow: "0 24px 60px rgba(26,46,53,.22)", width: "100%", maxWidth: 480, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #DDD8CF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 19, fontWeight: 700, color: "#13231F" }}>Assessment Overview</div>
              <div onClick={() => setDiagOpen(false)} style={closeBtn}><X size={20} /></div>
            </div>
            <div style={{ padding: 20, overflowY: "auto" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }}>
                <div style={{ textAlign: "center", padding: "18px 12px", background: "#FFFFFF", border: "1px solid #DDD8CF", borderRadius: 12 }}><div style={{ fontSize: 30, fontWeight: 800, color: "#13231F" }}>{totalItems}</div><div style={{ fontSize: 14, color: "#7A9298" }}>Items</div></div>
                <div style={{ textAlign: "center", padding: "18px 12px", background: "#FFFFFF", border: "1px solid #DDD8CF", borderRadius: 12 }}><div style={{ fontSize: 30, fontWeight: 800, color: "#13231F" }}>{totalPoints}</div><div style={{ fontSize: 14, color: "#7A9298" }}>Points</div></div>
                <div style={{ textAlign: "center", padding: "18px 12px", background: "#FFFFFF", border: "1px solid #DDD8CF", borderRadius: 12 }}><div style={{ fontSize: 30, fontWeight: 800, color: "#13231F" }}>~{totalMinutes}</div><div style={{ fontSize: 14, color: "#7A9298" }}>Minutes</div></div>
              </div>
              <div style={{ fontSize: 15, textTransform: "uppercase", color: "#3D5A60", margin: "0 0 10px", fontWeight: 700 }}>Difficulty Distribution</div>
              <DemandBar easy={diag.easyPct} medium={diag.mediumPct} hard={diag.hardPct} width="100%" height={10} />
              <div style={{ display: "flex", gap: 16, fontSize: 14, marginTop: 8 }}><span>🟢 Easy {diag.easyPct}%</span><span>🟡 Medium {diag.mediumPct}%</span><span>🔴 Hard {diag.hardPct}%</span></div>

              <div style={{ fontSize: 15, textTransform: "uppercase", color: "#3D5A60", margin: "18px 0 10px", fontWeight: 700 }}>Question Types</div>
              {diag.typeDist.length > 0 ? (
                diag.typeDist.map((td) => (
                  <div key={td.name} style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, fontSize: 15 }}>
                    <span style={{ width: 120, flexShrink: 0, color: "#13231F" }}>{td.name}</span>
                    <div style={{ flex: 1, height: 8, background: "#E5E7EB", borderRadius: 999, overflow: "hidden" }}><div style={{ height: "100%", borderRadius: 999, background: "#4A7C6F", width: `${td.pct}%` }} /></div>
                    <span style={{ width: 28, textAlign: "right", fontWeight: 700, color: "#3D5A60" }}>{td.count}</span>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 15, color: "#7A9298" }}>No sections yet</div>
              )}

              <div style={{ fontSize: 15, textTransform: "uppercase", color: "#3D5A60", margin: "18px 0 10px", fontWeight: 700 }}>Alignment Coverage</div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: "#FFFFFF", borderRadius: 8 }}>
                <span style={{ fontSize: 15, color: "#13231F" }}>Learning Objective</span>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: objectiveText.trim().length > 10 ? "#2E9E6B" : "#D48A0C" }} />
              </div>
            </div>
            <div style={{ padding: "14px 20px", borderTop: "1px solid #DDD8CF", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <div onClick={() => setDiagOpen(false)} style={{ ...secondaryBtn, padding: "8px 16px" }}>Close</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
