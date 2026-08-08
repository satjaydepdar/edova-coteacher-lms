import { Fragment, useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import {
  ACADEMIC_YEARS,
  CLASSES,
  OKF_QUESTION_BANK,
  PALETTE_TYPES,
  STUDENTS,
} from "@/data/seed"
import type { AssessmentBankItem, Assignment, AssessmentSection, Demand } from "@/lib/types"
import { useSchoolStore } from "@/store/school-store"
import { useAppStore } from "@/store/app-store"
import { useSyllabusCascade } from "@/lib/useSyllabusCascade"
import { aiApi } from "@/lib/api-client"
import { getCommonMistakes, recordMemoryEvent } from "@/lib/memory-api"
import { FlashBanner } from "@/components/common/FlashBanner"
import {
  SECTION_LETTERS,
  SECTION_TEMPLATES,
  SECTION_TYPE_META,
  nextId,
  nextSectionLabel,
  normalizeQuestion,
  type RawQuestion,
} from "./assessment-builder/question-gen"
import {
  AssignModal,
  DemandBar,
  DiagnosticsModal,
  ManageQuestionsModal,
  OkfImportModal,
  emptyEditorFor,
  type EditorState,
} from "./assessment-builder/modals"

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
const secondaryBtn: CSSProperties = { background: "#F5F1E6", border: "1px solid #DDD8CF", color: "#3D5A60", padding: "9px 16px", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" }
const stepper: CSSProperties = { width: 30, height: 30, border: "1px solid #DDD8CF", background: "#F5F1E6", borderRadius: 6, cursor: "pointer", fontSize: 18, color: "#3D5A60" }

const classNameById = (id: string) => CLASSES.find((c) => c.id === id)?.name || ""

/* ================================================================== */
/* Component                                                           */
/* ================================================================== */
// Class dropdown options — labels match the DB curriculum class_label
// values, same convention as the Lesson Planner.
const ASSESSMENT_CLASSES = Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`)

// ---- AI quiz blueprint (Skill 1: exam-blueprint, edova-camel :8002) ----

interface AiQuizItem {
  n: number
  type: "mcq" | "short_answer" | "application"
  sub_topic: string
  difficulty: string
  points: number
  question: string
  options?: string[]
  answer: string
  why: string
}

interface AiQuizResponse {
  questions: AiQuizItem[]
  blueprint: { n: number; sub_topic: string; difficulty: string; type: string; points: number }[]
  meta: {
    generated: number
    actual_spread: { easy: number; medium: number; hard: number }
    balance_warning: string | null
  }
}

// AI item type -> the builder's one-type-per-section model.
const AI_SECTION_TYPE: Record<string, string> = {
  mcq: "multiple_choice",
  short_answer: "short_answer",
  application: "scenario",
}

const DIFF_CHIP: Record<string, string> = { easy: "#16A34A", medium: "#F59E0B", hard: "#DC2626" }

function aiToRawQuestion(q: AiQuizItem): RawQuestion {
  const difficulty = q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)
  const base = { id: nextId("q"), text: q.question, difficulty, explanation: q.why, marks: q.points }
  if (q.type === "mcq") {
    const options = (q.options ?? []).map((text, i) => ({
      label: String.fromCharCode(65 + i),
      text,
      correct: text.trim() === q.answer.trim(),
    }))
    // If the model's answer text doesn't match an option verbatim, keep the
    // answer as a free-text correctAnswer instead of flagging nothing.
    return options.some((o) => o.correct)
      ? { ...base, options }
      : { ...base, options, correctAnswer: q.answer }
  }
  if (q.type === "application") {
    return { ...base, scenarioText: q.question, modelAnswer: q.answer }
  }
  return { ...base, modelAnswer: q.answer }
}

export default function AssessmentBuilder() {
  const publishAssignment = useSchoolStore((s) => s.publishAssignment)
  const addAssessmentBankItem = useSchoolStore((s) => s.addAssessmentBankItem)
  const updateAssessmentBankItem = useSchoolStore((s) => s.updateAssessmentBankItem)
  const hydrateAssessments = useSchoolStore((s) => s.hydrateAssessments)
  const showFlash = useSchoolStore((s) => s.showFlash)

  // Load the persisted assessment bank so Saved Assessments survive reload.
  useEffect(() => { hydrateAssessments() }, [hydrateAssessments])

  const [tab, setTab] = useState<"build" | "saved">("build")
  // id of the bank entry being edited (View/Edit from Saved tab); null = fresh build
  const [editingBankId, setEditingBankId] = useState<string | null>(null)
  // DB-driven cascade: Class → Subject → Chapter → Topic (master syllabus).
  // "Other" topic unlocks a free-text field for off-syllabus concepts.
  const [classLabel, setClassLabel] = useState("Class 10")
  const { subjects, subjectId, setSubjectId, units } = useSyllabusCascade(classLabel)
  const [chapterId, setChapterId] = useState("")
  const [topicSel, setTopicSel] = useState("") // topic title, or "__other__"
  const [customTopic, setCustomTopic] = useState("")
  const [objectiveText, setObjectiveText] = useState("")
  // AI blueprint generator state
  const [aiCount, setAiCount] = useState(10)
  const [aiEmphasis, setAiEmphasis] = useState("balanced")
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AiQuizResponse | null>(null)
  const [sections, setSections] = useState<AssessmentSection[]>([])
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null)
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const bank = useSchoolStore((s) => s.assessmentBank)

  // OKF import modal
  const [okfOpen, setOkfOpen] = useState(false)
  const [okfExpanded, setOkfExpanded] = useState<Record<string, boolean>>({})
  const [okfSelected, setOkfSelected] = useState<Record<string, boolean>>({})

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
  const isOkfEligible = (subjects.find((s) => s.id === subjectId)?.name ?? "").startsWith("Math")

  // Derived cascade views + the resolved topic label.
  const chapters = units.flatMap((u) => u.chapters)
  const selectedChapter = chapters.find((c) => c.id === chapterId) ?? null
  const chapterTopics = selectedChapter?.topics ?? []
  const topicLabel = topicSel === "__other__" ? customTopic.trim() : topicSel

  // Seed class row for the assign flow + saved-card label ("Class 10 — Section A").
  const seedClassId = CLASSES.find((c) => c.name.startsWith(classLabel))?.id ?? ""

  /* ---- AI blueprint generation (Skill 1) ---- */
  const session = useAppStore((s) => s.session)

  const generateWithAI = async () => {
    if (!selectedChapter || aiLoading) return
    setAiLoading(true)
    try {
      const topics = topicLabel ? [topicLabel] : chapterTopics.map((t) => t.title)
      // Memory hook: this class's real wrong answers become MCQ distractors.
      const mistakes = await getCommonMistakes(selectedChapter.name).catch(() => [])
      const commonMistakes = mistakes.map((m) =>
        m.question ? `Q: ${m.question} → wrong answer: ${m.wrong} (${m.n}×)` : `${m.wrong} (${m.n}×)`,
      )
      const res = await aiApi.post<AiQuizResponse>("/api/quiz-blueprint", {
        class_label: classLabel,
        subject: subjects.find((s) => s.id === subjectId)?.name ?? "",
        chapter: selectedChapter.name,
        topics,
        count: aiCount,
        emphasis: aiEmphasis,
        common_mistakes: commonMistakes,
      })
      const groups = (["mcq", "short_answer", "application"] as const)
        .map((t) => res.questions.filter((q) => q.type === t))
        .filter((g) => g.length > 0)
      const aiSections: AssessmentSection[] = groups.map((items, gi) => {
        const n = items.length
        const easy = Math.round((100 * items.filter((q) => q.difficulty === "easy").length) / n)
        const medium = Math.round((100 * items.filter((q) => q.difficulty === "medium").length) / n)
        return {
          id: `sec_${Date.now()}_${gi}`,
          type: AI_SECTION_TYPE[items[0].type],
          label: nextSectionLabel(sections.length + gi),
          count: n,
          pointsPer: Math.max(1, Math.round(items.reduce((a, q) => a + q.points, 0) / n)),
          demand: { name: "AI mix", easy, medium, hard: 100 - easy - medium },
          questions: items.map((q) => normalizeQuestion(aiToRawQuestion(q))),
        }
      })
      setSections((prev) => [...prev, ...aiSections])
      setAiResult(res)
      recordMemoryEvent({
        user_id: session?.user.id ?? "teacher_demo",
        role: "teacher",
        event_type: "quiz_generated",
        chapter: selectedChapter.name,
        subject: subjects.find((s) => s.id === subjectId)?.name ?? "",
        payload: { count: res.meta.generated, emphasis: aiEmphasis },
      })
      showFlash("assessment", `AI draft ready — ${res.meta.generated} questions added. Review before saving.`, 5000)
    } catch {
      showFlash("assessment", "Could not generate — is the lesson AI service running on :8002?", 5000)
    } finally {
      setAiLoading(false)
    }
  }

  /* ---- Section handlers ---- */
  // A palette click creates an EMPTY section and opens the question editor
  // straight away — the teacher lands exactly where content gets added.
  // (Questions otherwise come from ✦ Generate with AI or OKF import.)
  const addSection = (type: string) => {
    const demand: Demand = { name: "Balanced", easy: 30, medium: 50, hard: 20 }
    const id = "sec_" + Date.now()
    setSections((prev) => [...prev, { id, type, label: nextSectionLabel(prev.length), count: 0, pointsPer: 2, demand, questions: [] }])
    setSelectedSectionId(id)
    setManageOpen(true)
    setManageSectionId(id)
    setEditingQuestionId(null)
    setEditor(emptyEditorFor(type))
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

  const changePoints = (id: string, delta: number) => {
    setSections((prev) => prev.map((sec) => (sec.id === id ? { ...sec, pointsPer: Math.max(1, Math.min(20, sec.pointsPer + delta)) } : sec)))
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
  const totalItems = sections.reduce((a, s) => a + s.questions.length, 0)
  const totalPoints = sections.reduce((a, s) => a + s.questions.length * s.pointsPer, 0)
  const totalMinutes = sections.reduce((a, s) => a + Math.ceil(s.questions.length * 2), 0)
  const ready = objectiveText.trim().length > 10 && totalItems > 0
  // What's missing before Save/Assign can run — shown as a flash when the
  // teacher clicks a not-ready button (buttons are never hard-disabled).
  const blockedReason =
    objectiveText.trim().length <= 10
      ? "Write a learning objective (one short sentence) in Step 1 before saving."
      : totalItems === 0
        ? "Add at least one question before saving — use ✦ Generate with AI, OKF import, or a palette section."
        : null

  const buildBankEntry = (): AssessmentBankItem => {
    const cls = CLASSES.find((c) => c.id === seedClassId)
    return {
      id: "bank_" + Date.now(),
      title: topicLabel ? topicLabel.replace(/^.*—\s*/, "") + " — Assessment" : "Untitled Assessment",
      classId: seedClassId,
      subject: cls ? cls.subject : (subjects.find((s) => s.id === subjectId)?.name ?? ""),
      term: "",
      academicYear: ACADEMIC_YEARS[1],
      totalPoints,
      sectionCount: sections.length,
      questionCount: totalItems,
      createdOn: "Just now",
      sections,
      objective: objectiveText,
      topicLabel,
    }
  }

  // Editing an existing bank entry writes back to the SAME id — no "copy 1,
  // copy 2" pile-up. A fresh build still creates a new entry.
  const persistEntry = async (entry: AssessmentBankItem): Promise<string> => {
    if (editingBankId) {
      const updated = { ...entry, id: editingBankId, createdOn: "Updated just now" }
      await updateAssessmentBankItem(editingBankId, updated)
      return editingBankId
    }
    return addAssessmentBankItem(entry)
  }

  // Saved tab → View/Edit: reload the assessment into the builder exactly as
  // saved (sections, questions, objective, class context).
  // TODO(post-major-changes): chapter/topic DROPDOWNS restore to the class
  // default, not the exact saved chapter/topic — the bank entry stores only
  // the topic label, not the cascade ids. Fix by storing chapterId/topicId
  // on AssessmentBankItem and re-selecting them here.
  const openForEdit = (item: AssessmentBankItem) => {
    setEditingBankId(item.id)
    setSections(item.sections)
    setObjectiveText(item.objective ?? "")
    setAiResult(null)
    setSelectedSectionId(null)
    const clsName = CLASSES.find((c) => c.id === item.classId)?.name
    if (clsName) setClassLabel(clsName.split(" — ")[0])
    setTab("build")
  }

  // "Build New" always starts a clean form (and exits edit mode).
  const startFresh = () => {
    setEditingBankId(null)
    setSections([])
    setObjectiveText("")
    setAiResult(null)
    setSelectedSectionId(null)
    setTab("build")
  }

  const generate = async () => {
    setGenerating(true)
    try {
      await persistEntry(buildBankEntry())
      setTab("saved")
      showFlash("assessment", editingBankId ? "Assessment updated." : "Saved to your Assessment Bank.", 4000)
    } finally {
      setGenerating(false)
    }
  }

  const assignNow = async () => {
    setGenerating(true)
    try {
      const entry = buildBankEntry()
      const id = await persistEntry(entry)
      // Open the Assign modal directly from `entry` rather than via
      // openAssign(entry.id) — the `bank` array from useSchoolStore is a
      // stale closure until the next render, so a bank.find() here would
      // not see the item we just added.
      setAssignModal({ bankId: id, classId: entry.classId, due: "", totalPoints: entry.totalPoints })
    } finally {
      setGenerating(false)
    }
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
      type: entry.sections.some((s) => s.type === "multiple_choice" || (s.type === "okf_import" && s.questions.some(q => q.options && q.options.length > 0))) ? "mcq" : "written",
      sections: entry.sections,
      topicLabel: entry.topicLabel,
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
    sections.forEach((s) => { const t = (SECTION_TEMPLATES[s.type] || {}).title || s.type; typeMap[t] = (typeMap[t] || 0) + s.questions.length })
    const typeDist = Object.entries(typeMap).map(([name, count]) => ({ name, count, pct: totalItems ? Math.round((count / totalItems) * 100) : 0 }))
    return { easyPct: pct(easy), mediumPct: pct(medium), hardPct: pct(hard), typeDist }
  })()

  const manageSection = getSection(manageSectionId)
  const manageMeta = manageSection ? SECTION_TYPE_META[manageSection.type] || {} : {}
  const manageTitle = manageSection ? (SECTION_TEMPLATES[manageSection.type] || {}).title || "Questions" : "Questions"
  const editingIndex = editingQuestionId
    ? (manageSection?.questions.findIndex((q) => q.id === editingQuestionId) ?? -1) + 1
    : 0
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
        <button type="button" onClick={startFresh} style={tabStyle(tab === "build")}>Build New</button>
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
              <div style={{ fontSize: 14, color: "#7A9298", marginBottom: 6 }}>{[classNameById(b.classId), b.term].filter(Boolean).join(" · ")}</div>
              <div style={{ fontSize: 13.5, color: "#7A9298", marginBottom: 14 }}>{b.sectionCount} sections · {b.questionCount} questions · {b.totalPoints} pts</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 12, borderTop: "1px solid #F1F0EA" }}>
                <div style={{ fontSize: 13.5, color: "#9CA3AF" }}>{b.createdOn.startsWith("Updated") ? b.createdOn : `Saved ${b.createdOn}`}</div>
                <div style={{ display: "flex", gap: 14 }}>
                  <div onClick={() => openForEdit(b)} style={{ fontSize: 14, fontWeight: 700, color: "#3D5A60", cursor: "pointer" }}>✎ View / Edit</div>
                  <div onClick={() => openAssign(b.id)} style={{ fontSize: 14, fontWeight: 700, color: "#16332B", cursor: "pointer" }}>Assign to Class →</div>
                </div>
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
                  <label style={fieldLabel}>Class</label>
                  <select
                    value={classLabel}
                    onChange={(e) => { setClassLabel(e.target.value); setChapterId(""); setTopicSel("") }}
                    style={{ ...nativeSelect, minWidth: 130 }}
                  >
                    {ASSESSMENT_CLASSES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={fieldLabel}>Subject</label>
                  <select
                    value={subjectId}
                    onChange={(e) => { setSubjectId(e.target.value); setChapterId(""); setTopicSel("") }}
                    style={{ ...nativeSelect, minWidth: 170 }}
                    disabled={subjects.length === 0}
                  >
                    {subjects.length === 0 && <option value="">No subjects in DB for this class</option>}
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={fieldLabel}>Chapter</label>
                  <select
                    value={chapterId}
                    onChange={(e) => { setChapterId(e.target.value); setTopicSel("") }}
                    style={{ ...nativeSelect, minWidth: 200 }}
                    disabled={chapters.length === 0}
                  >
                    <option value="">{chapters.length === 0 ? "No chapters in DB" : "Select chapter"}</option>
                    {units.map((u) => (
                      <optgroup key={u.id} label={u.name}>
                        {u.chapters.map((c) => (
                          <option key={c.id} value={c.id}>{c.number != null ? `${c.number}. ${c.name}` : c.name}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={fieldLabel}>Topic / Concept</label>
                  <select
                    value={topicSel}
                    onChange={(e) => setTopicSel(e.target.value)}
                    style={{ ...nativeSelect, minWidth: 190 }}
                    disabled={!selectedChapter}
                  >
                    <option value="">{selectedChapter ? "Select topic" : "Select a chapter first"}</option>
                    {chapterTopics.map((t) => (
                      <option key={t.id} value={t.title}>{t.title}</option>
                    ))}
                    {selectedChapter && <option value="__other__">Other (type your own)</option>}
                  </select>
                </div>
                {topicSel === "__other__" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    <label style={fieldLabel}>Custom concept</label>
                    <input
                      value={customTopic}
                      onChange={(e) => setCustomTopic(e.target.value)}
                      placeholder="Type the concept…"
                      style={{ ...nativeSelect, minWidth: 190, padding: "0 10px" }}
                    />
                  </div>
                )}
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

              {/* AI blueprint generator (Skill 1: exam-blueprint) — turns the
                  Step-1 cascade scope into a balanced draft with answer key */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: "#F0F4F2", border: "1px solid #DCE7E1" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#16332B" }}>✦ Generate with AI</span>
                <select value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} style={{ ...nativeSelect, minWidth: 110 }}>
                  <option value={5}>5 questions</option>
                  <option value={10}>10 questions</option>
                  <option value={15}>15 questions</option>
                </select>
                <select value={aiEmphasis} onChange={(e) => setAiEmphasis(e.target.value)} style={{ ...nativeSelect, minWidth: 130 }}>
                  <option value="balanced">Balanced</option>
                  <option value="recall">Recall</option>
                  <option value="application">Application</option>
                </select>
                <button
                  onClick={generateWithAI}
                  disabled={!selectedChapter || aiLoading}
                  style={{
                    fontSize: 14, fontWeight: 700, color: "#fff", background: "#16332B",
                    padding: "8px 16px", borderRadius: 8, border: "none",
                    cursor: !selectedChapter || aiLoading ? "not-allowed" : "pointer",
                    opacity: !selectedChapter || aiLoading ? 0.5 : 1,
                  }}
                >
                  {aiLoading ? "Generating…" : "Generate draft"}
                </button>
                {!selectedChapter && (
                  <span style={{ fontSize: 13, color: "#7A9298" }}>Pick a chapter in Step 1 first</span>
                )}
              </div>

              {aiResult && (
                <div style={{ marginBottom: 14, border: "1px solid #EFEBE2", borderRadius: 12, padding: "12px 14px", background: "#FCFCFB" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#13231F" }}>
                      Blueprint — {aiResult.meta.generated} questions
                    </span>
                    <span style={{ fontSize: 13, color: "#7A9298" }}>
                      Easy {aiResult.meta.actual_spread.easy} · Medium {aiResult.meta.actual_spread.medium} · Hard {aiResult.meta.actual_spread.hard}
                    </span>
                  </div>
                  {aiResult.meta.balance_warning && (
                    <div style={{ fontSize: 13, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "6px 10px", marginBottom: 8 }}>
                      ⚠ Spread is off the 30/50/20 target — review before saving.
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 110px 90px 40px", gap: "4px 10px", fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: "#7A9298" }}>#</span>
                    <span style={{ fontWeight: 700, color: "#7A9298" }}>Sub-topic</span>
                    <span style={{ fontWeight: 700, color: "#7A9298" }}>Type</span>
                    <span style={{ fontWeight: 700, color: "#7A9298" }}>Difficulty</span>
                    <span style={{ fontWeight: 700, color: "#7A9298" }}>Pts</span>
                    {aiResult.blueprint.map((b) => (
                      <Fragment key={b.n}>
                        <span style={{ color: "#9CA3AF" }}>{b.n}</span>
                        <span style={{ color: "#13231F" }}>{b.sub_topic}</span>
                        <span style={{ color: "#7A9298" }}>{b.type.replace("_", " ")}</span>
                        <span style={{ color: DIFF_CHIP[b.difficulty] ?? "#7A9298", fontWeight: 700, textTransform: "capitalize" }}>{b.difficulty}</span>
                        <span style={{ color: "#7A9298" }}>{b.points}</span>
                      </Fragment>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ minHeight: 160, border: "2px dashed #DDD8CF", borderRadius: 16, padding: 18, background: "#FCFCFB", display: "flex", flexDirection: "column", gap: 14 }}>
                {sections.map((sec) => {
                  const tmpl = SECTION_TEMPLATES[sec.type] || SECTION_TEMPLATES.multiple_choice
                  const isExpanded = sec.id === selectedSectionId
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
                            <div style={{ fontSize: 14, color: "#7A9298" }}>{sec.questions.length * sec.pointsPer} pts · ~{Math.ceil(sec.questions.length * 2)} min · {sec.questions.length} items</div>
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
                              <label style={fieldLabel}>Points / Question</label>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                                <button onClick={() => changePoints(sec.id, -1)} style={stepper}>−</button>
                                <input value={sec.pointsPer} readOnly style={{ width: 52, textAlign: "center", padding: "9px 4px", borderRadius: 8, border: "1px solid #DDD8CF", fontFamily: "inherit", fontSize: 15 }} />
                                <button onClick={() => changePoints(sec.id, 1)} style={stepper}>+</button>
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 280 }}>
                              <label style={fieldLabel}>Cognitive Demand</label>
                              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", border: "1px solid #DDD8CF", borderRadius: 8, background: "#F5F1E6", marginTop: 6 }}>
                                <div>
                                  <div style={{ fontSize: 15, fontWeight: 700, color: "#13231F" }}>{sec.demand.name}</div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                                    <DemandBar easy={sec.demand.easy} medium={sec.demand.medium} hard={sec.demand.hard} width={90} />
                                    <span style={{ fontSize: 12, color: "#7A9298", fontWeight: 600 }}>E {sec.demand.easy}% · M {sec.demand.medium}% · H {sec.demand.hard}%</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                            <div onClick={(e) => { e.stopPropagation(); openManage(sec.id) }} style={{ ...secondaryBtn }}>✎ Manage Questions</div>
                            {sec.questions.length === 0 && (
                              <span style={{ fontSize: 14, color: "#7A9298" }}>No questions yet — add them via ✎ Manage Questions or ✦ Generate with AI.</span>
                            )}
                          </div>

                          {sec.questions.length > 0 && <label style={{ fontSize: 14, fontWeight: 600, color: "#7A9298" }}>Preview</label>}
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
                  <span style={{ fontSize: 15, color: "#3D5A60", fontWeight: 600 }}>Sections {sections.length} · Items {totalItems} · ~Time {totalMinutes}m · Points {totalPoints}</span>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => (blockedReason ? showFlash("assessment", blockedReason, 4000) : generate())}
                    style={{ padding: "10px 20px", borderRadius: 8, fontFamily: "Nunito, sans-serif", fontSize: 15, fontWeight: 700, cursor: ready && !generating ? "pointer" : "not-allowed", border: "none", background: "#D9A94E", color: "#13231F", boxShadow: "0 4px 12px rgba(201,168,76,.28)", opacity: ready && !generating ? 1 : 0.5 }}
                  >
                    {generating ? "💾 Saving…" : editingBankId ? "💾 Update Assessment" : "💾 Save Assessment"}
                  </button>
                  <button
                    onClick={() => (blockedReason ? showFlash("assessment", blockedReason, 4000) : assignNow())}
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

      {/* ------------------------------ MODALS (extracted — see assessment-builder/modals.tsx) ------------------------------ */}
      {assignModal && (
        <AssignModal
          state={assignModal}
          onChange={setAssignModal}
          onConfirm={confirmAssign}
          onClose={() => setAssignModal(null)}
          classNameById={classNameById}
        />
      )}

      {okfOpen && (
        <OkfImportModal
          okfExpanded={okfExpanded}
          setOkfExpanded={setOkfExpanded}
          okfSelected={okfSelected}
          setOkfSelected={setOkfSelected}
          selectedCount={okfSelectedCount}
          onConfirm={confirmOkf}
          onClose={() => setOkfOpen(false)}
        />
      )}

      {manageOpen && manageSection && (
        <ManageQuestionsModal
          manageTitle={manageTitle}
          manageMeta={manageMeta}
          editor={editor}
          setEditor={setEditor}
          optionInputType={optionInputType}
          isSubjective={isSubjective}
          rubricLabel={rubricLabel}
          section={manageSection}
          editingIndex={editingIndex}
          onSave={saveQuestion}
          onEdit={editQuestion}
          onDelete={deleteQuestion}
          onCancelEdit={() => {
            setEditingQuestionId(null)
            setEditor(emptyEditorFor(manageSection?.type ?? null))
          }}
          onClose={closeManage}
        />
      )}

      {diagOpen && (
        <DiagnosticsModal
          totalItems={totalItems}
          totalPoints={totalPoints}
          totalMinutes={totalMinutes}
          diag={diag}
          objectiveComplete={objectiveText.trim().length > 10}
          onClose={() => setDiagOpen(false)}
        />
      )}
    </div>
  )
}
