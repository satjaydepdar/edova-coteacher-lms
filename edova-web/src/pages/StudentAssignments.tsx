import { useEffect, useState, useMemo, useCallback } from "react"
import { PageHeader } from "@/components/common/PageHeader"
import { McqQuiz } from "@/components/student/McqQuiz"
import { submissionStatusStyle, SUBMISSION_LABEL } from "@/lib/styles"
import { getMyAssignments, submitMyAssignment, type MyAssignment } from "@/lib/student-api"
import { getSubjects, type LearningSubject } from "@/lib/learning-api"
import { useAppStore } from "@/store/app-store"
import {
  LayoutGrid,
  Calculator,
  Search as SearchIcon,
  BookOpen,
  Users,
  Laptop,
  Calendar as CalendarIcon,
  User as UserIcon,
  ChevronDown
} from "lucide-react"

interface SubjectChip {
  id: string
  label: string
  icon: any
}

// Default 5 Class 10 Subjects matching LMS Settings Master Data
const DEFAULT_SUBJECT_CHIPS: SubjectChip[] = [
  { id: "all", label: "All Lessons", icon: LayoutGrid },
  { id: "math", label: "Mathematics", icon: Calculator },
  { id: "sci", label: "Science", icon: SearchIcon },
  { id: "eng", label: "English", icon: BookOpen },
  { id: "ss", label: "Social Studies", icon: Users },
  { id: "cs", label: "Computer Science", icon: Laptop },
]

function formatDue(due: string | null): string {
  if (!due) return "No due date"
  return new Date(due).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

// ── Description-embedded MCQ parsing ────────────────────────────────────
// AssessmentBuilder assignments that don't carry structured `sections`
// (the real /api/students/me/assignments path never returns sections at
// all — see edova-backend/main.py's MyAssignmentOut) instead embed a
// __ANSWER_KEY__:{...} block in the description, which edova-backend's
// _evaluate_quiz_score parses server-side to auto-grade. This mirrors that
// parsing client-side so students get a real quiz UI instead of the raw
// description text, and submits in the exact {questionId: answer} shape
// the backend expects.
interface ParsedQuestion {
  id: string
  label: string
  text: string
  options: string[]
}

function parseAnswerKey(description: string): Record<string, string> {
  if (!description) return {}
  const match = description.match(/__ANSWER_KEY__:\s*(\{.*?\})/)
  if (match) {
    try {
      return JSON.parse(match[1])
    } catch {
      return {}
    }
  }
  return {}
}

function parseQuestions(description: string): ParsedQuestion[] {
  if (!description) return []

  let cleanDesc = description.replace(/__ANSWER_KEY__:\s*\{.*?\}\s*/g, "").trim()
  if (!cleanDesc) return []

  cleanDesc = cleanDesc
    .replace(/\s+(\d+(\.\d+)?[\)\.]|Q\d+[\.\)])\s+/gi, "\n$1 ")
    .replace(/\s+([A-D][\)\.]|Option\s+[A-D])\s+/gi, "\n$1 ")

  const lines = cleanDesc
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const list: ParsedQuestion[] = []
  let current: ParsedQuestion | null = null

  for (const line of lines) {
    const qMatch = line.match(/^(\d+(\.\d+)?[\)\.]|Q\d+[\.\)])\s*(.*)/i)
    const optMatch = line.match(/^([A-D][\)\.]|Option\s+[A-D])\s*(.*)/i)

    if (qMatch) {
      if (current) list.push(current)
      const cleanId = qMatch[1].trim().replace(/[\)\:]+$/, "").replace(/\.$/, "").replace(/^Q/i, "")
      current = {
        id: cleanId,
        label: qMatch[1],
        text: qMatch[3] || line,
        options: [],
      }
    } else if (optMatch && current) {
      current.options.push(line)
    } else if (current) {
      if (current.options.length > 0) {
        current.options.push(line)
      } else {
        current.text += " " + line
      }
    }
  }
  if (current) list.push(current)
  return list
}

function isAnswerMatching(studentVal: string, correctVal: string): boolean {
  if (!studentVal || !correctVal) return false
  const s = studentVal.trim().toLowerCase()
  const c = correctVal.trim().toLowerCase()
  const sClean = s.replace(/^[a-d][\)\.]\s*/i, "").trim()
  const cClean = c.replace(/^[a-d][\)\.]\s*/i, "").trim()
  return s === c || sClean === cClean || s.includes(cClean) || c.includes(sClean) || sClean.includes(c) || cClean.includes(s)
}

function getCorrectAnswerForQuestion(q: ParsedQuestion, idx: number, answerKey: Record<string, string>): string {
  if (!answerKey || Object.keys(answerKey).length === 0) return ""
  if (answerKey[q.id]) return answerKey[q.id]
  const secQKey = `1.${idx + 1}`
  if (answerKey[secQKey]) return answerKey[secQKey]
  const numKey = `${idx + 1}`
  if (answerKey[numKey]) return answerKey[numKey]
  const foundKey = Object.keys(answerKey).find(
    (k) => k === q.id || k.endsWith(`.${idx + 1}`) || k === String(idx + 1)
  )
  if (foundKey) return answerKey[foundKey]
  return ""
}

// "A) Some text" -> "Some text"
function optionDisplayText(opt: string): string {
  return opt.replace(/^[A-D][\)\.]\s*/i, "").trim()
}

// Card summary text — never show the raw __ANSWER_KEY__ block or the full
// question dump; a short generic line is friendlier for MCQ assignments.
function descriptionPreview(a: MyAssignment, questionCount: number): string {
  if (questionCount > 0) return `${questionCount} question${questionCount === 1 ? "" : "s"} — open to answer.`
  const clean = (a.description || "").replace(/__ANSWER_KEY__:\s*\{.*?\}\s*/g, "").trim()
  return clean || "Your teacher has assigned you homework. Complete it before the deadline."
}

function DescriptionMcq({
  assignment,
  questions,
  onSubmitted,
}: {
  assignment: MyAssignment
  questions: ParsedQuestion[]
  onSubmitted: () => void
}) {
  const isSubmitted =
    assignment.submission_status === "submitted" ||
    assignment.submission_status === "late" ||
    assignment.submission_status === "graded"
  const answerKey = useMemo(() => parseAnswerKey(assignment.description), [assignment.description])
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (assignment.text_response) {
      try {
        const parsed = JSON.parse(assignment.text_response)
        if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) return parsed
      } catch { /* not JSON */ }
    }
    return {}
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      await submitMyAssignment(assignment.id, JSON.stringify(answers))
      onSubmitted()
    } catch (err: any) {
      setError(err?.message || err?.detail || "Submission failed. Please log in as a student.")
    } finally {
      setSubmitting(false)
    }
  }

  const allAnswered = questions.every((q) => !!answers[q.id])

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-[13px] text-[#991B1B]">{error}</div>
      )}
      {questions.map((q, idx) => {
        const studentAns = answers[q.id] || ""
        const correctAns = getCorrectAnswerForQuestion(q, idx, answerKey)
        const isCorrect = isSubmitted && isAnswerMatching(studentAns, correctAns)
        return (
          <div key={q.id} className="rounded-[10px] border border-[#E8E2D5] bg-white p-3.5">
            <div className="mb-2 text-[13.5px] font-semibold text-[#1A2E26]">
              {q.label} {q.text}
            </div>
            {q.options.length >= 2 ? (
              <div className="space-y-1.5">
                {q.options.map((opt, oIdx) => {
                  const optText = optionDisplayText(opt)
                  const isSelected = studentAns === optText || studentAns === opt
                  const isCorrectOpt = isSubmitted && correctAns && optText.toLowerCase().includes(correctAns.trim().toLowerCase())
                  let style = "border-[#E8E2D5] bg-[#FBF9F4] cursor-pointer"
                  if (isSubmitted) {
                    if (isCorrectOpt) style = "border-[#86EFAC] bg-[#DCFCE7] font-semibold text-[#14532D] cursor-default"
                    else if (isSelected) style = "border-[#FCA5A5] bg-[#FEE2E2] font-semibold text-[#7F1D1D] cursor-default"
                    else style = "border-[#E8E2D5] bg-white opacity-60 cursor-default"
                  } else if (isSelected) {
                    style = "border-[#C17D3A] bg-[#FFF7E8] font-semibold text-[#1A2E26] cursor-pointer"
                  }
                  return (
                    <label
                      key={oIdx}
                      onClick={() => !isSubmitted && setAnswers((a) => ({ ...a, [q.id]: optText }))}
                      className={`flex items-center gap-2.5 rounded-[8px] border p-2.5 text-[13px] transition ${style}`}
                    >
                      <input type="radio" checked={isSelected} disabled={isSubmitted} readOnly className="h-3.5 w-3.5 accent-[#C17D3A]" />
                      {optText || opt}
                    </label>
                  )
                })}
              </div>
            ) : (
              <input
                type="text"
                value={studentAns}
                disabled={isSubmitted}
                onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                placeholder="Type your answer here…"
                className="h-9 w-full rounded-[8px] border border-[#E8E2D5] bg-[#FBF9F4] px-3 text-[13px] outline-none focus:border-[#C17D3A] focus:bg-white disabled:opacity-60"
              />
            )}
            {isSubmitted && (
              <div className={`mt-2 text-[11.5px] font-semibold ${isCorrect ? "text-[#15803D]" : "text-[#991B1B]"}`}>
                {isCorrect ? "✓ Correct" : correctAns ? `✕ Correct answer: ${correctAns}` : "✕ Incorrect"}
              </div>
            )}
          </div>
        )
      })}
      {!isSubmitted && (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={submitting || !allAnswered}
            onClick={handleSubmit}
            className="cursor-pointer rounded-[10px] bg-[#C17D3A] hover:bg-[#A86B2F] text-white px-4 py-2 text-[13px] font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting…" : "Submit Assignment"}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Date helpers for filter logic ──────────────────────────────────────
function toDateOnly(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function isDueToday(dueDateStr: string | null): boolean {
  if (!dueDateStr) return false
  const due = new Date(dueDateStr)
  return toDateOnly(due) === toDateOnly(new Date())
}

function isOverdue(dueDateStr: string | null): boolean {
  if (!dueDateStr) return false
  const due = new Date(dueDateStr)
  const today = new Date()
  // Compare date-only (strip time)
  return toDateOnly(due) < toDateOnly(today)
}

function isDueOnDate(dueDateStr: string | null, filterDate: string): boolean {
  if (!dueDateStr || !filterDate) return false
  const due = new Date(dueDateStr)
  return toDateOnly(due) === filterDate
}

// ── localStorage helper for "started" assignments ──────────────────────
const STARTED_KEY = "edova_started_assignments"
function getStartedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(STARTED_KEY) || "[]"))
  } catch { return new Set() }
}
function markStarted(id: string) {
  const set = getStartedIds()
  set.add(id)
  localStorage.setItem(STARTED_KEY, JSON.stringify([...set]))
}

export default function StudentAssignments() {
  const [selectedSubject, setSelectedSubject] = useState("all")
  const [recFilter, setRecFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [dueDateFilter, setDueDateFilter] = useState("") // yyyy-mm-dd or "" for "all dates"

  // Real Backend Data States
  const [assignments, setAssignments] = useState<MyAssignment[]>([])
  const [subjects, setSubjects] = useState<SubjectChip[]>(DEFAULT_SUBJECT_CHIPS)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [startedIds, setStartedIds] = useState<Set<string>>(getStartedIds)

  // Session info — needed to show proper button labels and enable submissions
  const session = useAppStore((s) => s.session)
  const isStudent = session?.user?.role === "student"

  // 1. Fetch live Class 10 subjects from backend API
  useEffect(() => {
    getSubjects()
      .then((res) => {
        if (res.subjects && res.subjects.length > 0) {
          const liveChips: SubjectChip[] = [
            { id: "all", label: "All Lessons", icon: LayoutGrid },
            ...res.subjects.map((sub: LearningSubject) => {
              const name = sub.subject_name.toLowerCase()
              let icon = BookOpen
              let id = sub.id
              if (name.includes("math")) { icon = Calculator; id = "math" }
              else if (name.includes("sci")) { icon = SearchIcon; id = "sci" }
              else if (name.includes("eng")) { icon = BookOpen; id = "eng" }
              else if (name.includes("social") || name.includes("ss")) { icon = Users; id = "ss" }
              else if (name.includes("computer") || name.includes("cs")) { icon = Laptop; id = "cs" }
              return { id, label: sub.subject_name, icon }
            })
          ]
          setSubjects(liveChips)
        }
      })
      .catch(() => {
        // Fallback to default 5 subjects
      })
  }, [])

  // 2. Fetch real student assignments from backend database API
  const loadAssignments = useCallback(() => {
    setLoading(true)
    getMyAssignments()
      .then((data) => {
        setAssignments(data)
      })
      .catch(() => {
        setAssignments([])
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    loadAssignments()
  }, [loadAssignments])

  function openAssignment(a: MyAssignment) {
    if (openId === a.id) {
      setOpenId(null)
      return
    }
    // Mark as "started" in localStorage for persistence across refreshes
    markStarted(a.id)
    setStartedIds(getStartedIds())
    setOpenId(a.id)
    setDraft(a.text_response ?? "")
    setSubmitError(null)
  }

  async function turnIn(id: string) {
    setSubmitting(true)
    setSubmitError(null)
    try {
      await submitMyAssignment(id, draft)
      setOpenId(null)
      loadAssignments()
    } catch (err: any) {
      const message = err?.message || err?.detail || "Submission failed. Please log in as a student."
      setSubmitError(message)
    } finally {
      setSubmitting(false)
    }
  }

  // 3. Dynamically filter database assignments based on Subject Chips, Recommendation Filter, Date picker, and Search Input
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      // ── Subject Filter ───────────────────────────────────────────────
      const titleLower = a.title.toLowerCase()
      const classLower = a.classroom_name.toLowerCase()
      const topicLower = (a.topic_label || "").toLowerCase()

      const matchSubject =
        selectedSubject === "all" ||
        (selectedSubject === "math" && (titleLower.includes("math") || classLower.includes("math") || topicLower.includes("math"))) ||
        (selectedSubject === "sci" && (titleLower.includes("science") || titleLower.includes("sci") || classLower.includes("sci"))) ||
        (selectedSubject === "eng" && (titleLower.includes("english") || titleLower.includes("eng") || classLower.includes("eng"))) ||
        (selectedSubject === "ss" && (titleLower.includes("social") || titleLower.includes("ss") || classLower.includes("ss"))) ||
        (selectedSubject === "cs" && (titleLower.includes("computer") || titleLower.includes("cs") || classLower.includes("cs"))) ||
        selectedSubject === a.id

      // ── Status / Recommendation Filter ───────────────────────────────
      let matchStatus = true
      if (recFilter === "due_today") {
        matchStatus = isDueToday(a.due_date) && a.submission_status !== "submitted" && a.submission_status !== "graded"
      } else if (recFilter === "overdue") {
        matchStatus = isOverdue(a.due_date) && a.submission_status !== "submitted" && a.submission_status !== "graded"
      } else if (recFilter === "completed") {
        matchStatus = a.submission_status === "submitted" || a.submission_status === "graded"
      }

      // ── Due Date Filter ──────────────────────────────────────────────
      const matchDate = !dueDateFilter || isDueOnDate(a.due_date, dueDateFilter)

      // ── Search Query Filter ──────────────────────────────────────────
      const matchSearch =
        !searchQuery ||
        titleLower.includes(searchQuery.toLowerCase()) ||
        classLower.includes(searchQuery.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(searchQuery.toLowerCase()))

      return matchSubject && matchStatus && matchDate && matchSearch
    })
  }, [assignments, selectedSubject, recFilter, dueDateFilter, searchQuery])

  // Group filtered real database assignments by date
  const groupedAssignments = useMemo(() => {
    const groups: Record<string, MyAssignment[]> = {}
    filteredAssignments.forEach((a) => {
      const dateKey = a.due_date ? new Date(a.due_date).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "2-digit" }) : "Recent Tasks"
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(a)
    })
    return Object.entries(groups).map(([date, items]) => ({ date, items }))
  }, [filteredAssignments])

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Learning Pathways"
        subtitle="Recommendations based on individual progress and goals."
      />

      {/* Subject Filter Chips (Populated dynamically from backend API) */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 min-w-0">
        {subjects.map((chip) => {
          const isActive = selectedSubject === chip.id
          const Icon = chip.icon
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => setSelectedSubject(chip.id)}
              className={`shrink-0 flex flex-col items-center justify-center gap-2 rounded-[14px] border transition-all w-[96px] h-[80px] cursor-pointer ${
                isActive
                  ? "bg-[#FFF7E8] border-[#C17D3A] shadow-[0_1px_6px_rgba(193,125,58,0.14)]"
                  : "bg-[#FBF9F4] border-[#F0E6D3] hover:border-[#E8E2D5] hover:bg-white"
              }`}
            >
              <div
                className={`w-[36px] h-[36px] rounded-[10px] flex items-center justify-center transition-colors ${
                  isActive ? "bg-[#C17D3A] text-white" : "bg-[#F5EEE0] text-[#8A7A60]"
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
              </div>
              <span className="text-[11.5px] font-semibold leading-[1.15] text-center px-1.5 line-clamp-1 text-[#1A2E26]">
                {chip.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Control Strip: Dynamic Status Dropdown + Date Picker + Teacher Filter + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Recommendations Filter Dropdown */}
          <div className="relative">
            <select
              value={recFilter}
              onChange={(e) => setRecFilter(e.target.value)}
              className="appearance-none flex items-center gap-2 bg-white border border-[#E8E2D5] rounded-[10px] h-[36px] pl-3 pr-8 text-[13px] font-medium text-[#1A2E26] outline-none hover:border-[#C17D3A] transition-colors cursor-pointer"
            >
              <option value="all">All Recommendations</option>
              <option value="due_today">Due Today</option>
              <option value="overdue">Overdue</option>
              <option value="completed">Completed</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A7A60] pointer-events-none" />
          </div>

          {/* Due-Date Picker — filters assignments by their due date */}
          <div className="flex items-center gap-2 bg-white border border-[#E8E2D5] rounded-[10px] h-[36px] px-1 text-[13px] font-medium text-[#1A2E26]">
            <CalendarIcon size={14} className="text-[#8A7A60] ml-2" />
            <input
              type="date"
              value={dueDateFilter}
              onChange={(e) => setDueDateFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] font-medium text-[#1A2E26] h-full cursor-pointer pr-1"
            />
            {dueDateFilter && (
              <button
                type="button"
                onClick={() => setDueDateFilter("")}
                className="text-[11px] text-[#C17D3A] font-bold px-1.5 hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Teacher Selector */}
          <div className="flex items-center gap-2 bg-white border border-[#E8E2D5] rounded-[10px] h-[36px] px-3 text-[13px] font-medium text-[#1A2E26]">
            <UserIcon size={14} className="text-[#8A7A60]" />
            <span>Teacher</span>
          </div>
        </div>

        {/* Dynamic Search Bar */}
        <div className="relative w-full sm:w-[220px]">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A7A60]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search task"
            className="w-full bg-white border border-[#E8E2D5] rounded-[10px] h-[36px] pl-9 pr-3 text-[13px] font-medium text-[#1A2E26] placeholder-[#9A9893] outline-none focus:border-[#C17D3A] transition-colors"
          />
        </div>
      </div>

      {/* Real Database Assignments Display */}
      {loading ? (
        <div className="rounded-[16px] border border-[#F0E6D3] bg-white p-8 text-center text-[#8A7A60] text-[14px]">
          Loading learning pathways from database...
        </div>
      ) : groupedAssignments.length > 0 ? (
        <div className="space-y-6 pt-2">
          {groupedAssignments.map(({ date, items }) => (
            <div key={date} className="min-w-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-[6px] h-[6px] rounded-full bg-[#C17D3A] shrink-0" />
                <h3 className="text-[13px] font-bold text-[#1A2E26] tracking-[-0.01em]">{date}</h3>
                <span className="h-px flex-1 bg-[#F0E6D3] ml-2 hidden md:block" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((a) => {
                  const isOpen = openId === a.id
                  const graded = a.submission_status === "graded"
                  const submitted = a.submission_status === "submitted" || graded
                  const started = startedIds.has(a.id)
                  const overdue = isOverdue(a.due_date) && !submitted
                  const progressPct = graded ? 100 : submitted ? 80 : started ? 20 : 0
                  const tasksCompleted = graded ? "5/5" : submitted ? "4/5" : started ? "1/5" : "0/5"
                  const descriptionQuestions = parseQuestions(a.description)

                  // Button label adapts to submission state
                  const buttonLabel = submitted
                    ? "Review →"
                    : started
                    ? "Continue →"
                    : "Start Learning →"

                  return (
                    <div
                      key={a.id}
                      className={`rounded-[16px] border p-5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-all ${
                        overdue
                          ? "border-[#FCA5A5] bg-[#FFF5F5] hover:border-[#EF4444]"
                          : "border-[#F0E6D3] bg-white hover:border-[#E8E2D5]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-[#FFF7E8] text-[#C17D3A]">
                          {a.classroom_name}
                        </span>
                        <span style={submissionStatusStyle(a.submission_status)}>
                          {overdue && a.submission_status === "not_started"
                            ? "Overdue"
                            : started && a.submission_status === "not_started"
                            ? "In Progress"
                            : SUBMISSION_LABEL[a.submission_status]}
                        </span>
                      </div>

                      <h4 className="text-[15px] font-bold text-[#1A2E26] mb-1">{a.title}</h4>
                      <p className="text-[13px] text-[#6B7280] mb-4">
                        {descriptionPreview(a, descriptionQuestions.length)}
                      </p>

                      {/* Real Progress Bar */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-[12px] font-semibold text-[#1A2E26]">
                          <span>Tasks completed: {tasksCompleted}</span>
                          <span>{progressPct}%</span>
                        </div>
                        <div className="w-full bg-[#F5EEE0] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-[#16332B] h-full rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#F0E6D3]">
                        <div className="text-[12px] font-medium text-[#8A7A60]">
                          Due: {formatDue(a.due_date)} · {a.points_possible} pts
                          {graded && a.points_earned !== null && ` (${a.points_earned}/${a.points_possible})`}
                        </div>
                        <button
                          type="button"
                          onClick={() => openAssignment(a)}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-[#16332B] hover:bg-[#11221C] text-white text-[13px] font-bold transition-colors cursor-pointer"
                        >
                          {isOpen ? "Close" : buttonLabel}
                        </button>
                      </div>

                      {/* Submission / Quiz Section */}
                      {isOpen && (
                        <div className="mt-4 pt-4 border-t border-[#F0E6D3]">
                          {graded && a.feedback && (
                            <div className="mb-3 rounded-[10px] border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-[13px] text-[#166534]">
                              <span className="font-semibold">Teacher feedback: </span>
                              {a.feedback}
                            </div>
                          )}

                          {/* Auth Warning for non-student sessions */}
                          {!isStudent && (
                            <div className="mb-3 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] p-3 text-[13px] text-[#92400E]">
                              <span className="font-semibold">Preview mode: </span>
                              Log in as a student to submit assignments. Teacher accounts can view but not submit.
                            </div>
                          )}

                          {/* Error display */}
                          {submitError && (
                            <div className="mb-3 rounded-[10px] border border-[#FCA5A5] bg-[#FEF2F2] p-3 text-[13px] text-[#991B1B]">
                              <span className="font-semibold">Error: </span>
                              {submitError}
                            </div>
                          )}

                          {a.submission_type === "mcq" && (a.sections?.length ?? 0) > 0 ? (
                            <McqQuiz assignment={a} onSubmitted={loadAssignments} />
                          ) : descriptionQuestions.length > 0 ? (
                            <DescriptionMcq assignment={a} questions={descriptionQuestions} onSubmitted={loadAssignments} />
                          ) : (
                            <>
                              <textarea
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                                rows={3}
                                placeholder="Type your answer here…"
                                disabled={submitted}
                                className="w-full resize-none rounded-[10px] border border-[#E8E2D5] bg-[#FBF9F4] p-3 text-[13px] outline-none focus:border-[#C17D3A] focus:bg-white transition-all disabled:opacity-60"
                              />
                              <div className="mt-3 flex justify-end">
                                <button
                                  type="button"
                                  disabled={submitting || submitted || !draft.trim()}
                                  onClick={() => turnIn(a.id)}
                                  className="cursor-pointer rounded-[10px] bg-[#C17D3A] hover:bg-[#A86B2F] text-white px-4 py-2 text-[13px] font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                                >
                                  {submitting ? "Submitting…" : submitted ? "Already submitted ✓" : a.submission_status === "not_started" ? "Turn it in" : "Update submission"}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[16px] border border-[#F0E6D3] bg-[#FBF9F4] p-6 text-center text-[#8A7A60] text-[14px]">
          No assignments found matching the selected subject or status filter.
        </div>
      )}
    </div>
  )
}
