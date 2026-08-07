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
                        {a.description || "Your teacher has assigned you homework. Complete it before the deadline."}
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
