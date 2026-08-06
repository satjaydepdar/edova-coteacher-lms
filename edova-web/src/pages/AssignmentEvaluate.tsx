import { useEffect, useMemo, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  Search,
  ArrowLeft,
  Move,
  PenTool,
  Type,
  CheckCircle2,
  XCircle,
  Star,
  Undo2,
  Trash2,
  ZoomIn,
  X,
} from "lucide-react"
import { CLASSES } from "@/data/seed"
import { useSchoolStore, resolveStudentDisplay } from "@/store/school-store"
import { assignmentTypeOf, autoEvaluateSubmission, parseAnswerKey as parseAnswerKeyFromDesc, parseQuestions as parseQuestionsFromDesc } from "@/lib/assignment-types"
import type { Submission } from "@/lib/types"

function isOptionSelected(optText: string, targetValue: string): boolean {
  if (!optText || !targetValue) return false
  const o = optText.trim().toLowerCase()
  const t = targetValue.trim().toLowerCase()
  const cleanOpt = o.replace(/^[a-d][\)\.]\s*/i, "").trim()
  return o === t || cleanOpt === t || o.includes(t) || t.includes(cleanOpt)
}

export default function AssignmentEvaluate() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const assignments = useSchoolStore((s) => s.assignments)
  const setSubmissionEvaluation = useSchoolStore((s) => s.setSubmissionEvaluation)
  const showFlash = useSchoolStore((s) => s.showFlash)
  const realStudents = useSchoolStore((s) => s.realStudents)
  const hydrateRealStudents = useSchoolStore((s) => s.hydrateRealStudents)
  useEffect(() => { hydrateRealStudents() }, [hydrateRealStudents])
  const hydrateAssignments = useSchoolStore((s) => s.hydrateAssignments)
  useEffect(() => {
    hydrateAssignments()
    const timer = setInterval(() => hydrateAssignments(), 3000)
    return () => clearInterval(timer)
  }, [hydrateAssignments])

  const assignment = assignments.find((a) => a.id === id)

  const [evalTab, setEvalTab] = useState<"evaluate" | "submit">("evaluate")
  const [search, setSearch] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [annotateMode, setAnnotateMode] = useState(false)
  const [showMarksModal, setShowMarksModal] = useState(false)
  const [givenMarks, setGivenMarks] = useState("")
  const [feedback, setFeedback] = useState("")

  // Ungraded, regardless of status -- there's no real student-submission
  // flow yet, so a real assignment's roster is always "not_started" and
  // gating evaluation on "submitted"/"late" would make it permanently empty.
  // Submissions list -- includes all students with submissions or grades
  const yetToEvaluate = useMemo(
    () => (assignment?.submissions ?? []).filter((s) => s.score != null || s.status === "submitted" || s.status === "late" || s.status === "graded"),
    [assignment]
  )
  const yetToSubmit = useMemo(
    () => (assignment?.submissions ?? []).filter((s) => s.score == null && (s.status === "not_started" || s.status === "missing")),
    [assignment]
  )

  const list = evalTab === "evaluate" ? (yetToEvaluate.length > 0 ? yetToEvaluate : assignment?.submissions ?? []) : yetToSubmit
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((s) => {
      const student = resolveStudentDisplay(s.studentId, realStudents)
      return student ? student.name.toLowerCase().includes(q) : false
    })
  }, [list, search, realStudents])

  const selected: Submission | undefined =
    (selectedStudentId && assignment?.submissions.find((s) => s.studentId === selectedStudentId)) ||
    (evalTab === "evaluate" ? (yetToEvaluate[0] || assignment?.submissions[0]) : undefined)
  const selectedStudent = selected ? resolveStudentDisplay(selected.studentId, realStudents) : undefined

  const evaluatedQuestions = useMemo(() => {
    if (!selected || !assignment) return []

    let answersMap: Record<string, string> = {}
    if (selected.textResponse) {
      try {
        const parsed = JSON.parse(selected.textResponse)
        if (typeof parsed === "object" && parsed !== null) {
          answersMap = parsed
        }
      } catch {
        // Not JSON
      }
    }

    const descAnswerKey = parseAnswerKeyFromDesc(assignment.description)
    const sectionAnswerKey: Record<string, string> = {}
    if (assignment.sections && Array.isArray(assignment.sections)) {
      assignment.sections.forEach((sec: any, sIdx: number) => {
        if (Array.isArray(sec.questions)) {
          sec.questions.forEach((q: any, qIdx: number) => {
            const qId = `${sIdx + 1}.${qIdx + 1}`
            if (Array.isArray(q.options)) {
              const correctOpt = q.options.find((opt: any) => opt?.correct === true)
              if (correctOpt) {
                sectionAnswerKey[qId] = typeof correctOpt === "string" ? correctOpt : (correctOpt?.text || "")
              }
            } else if (q.correctAnswer) {
              sectionAnswerKey[qId] = String(q.correctAnswer)
            }
          })
        }
      })
    }

    const answerKey = { ...descAnswerKey, ...sectionAnswerKey }

    const rawQuestions = parseQuestionsFromDesc(assignment.description)
    const sectionQuestions: { id: string; text: string; options: string[] }[] = []
    if (assignment.sections && Array.isArray(assignment.sections)) {
      assignment.sections.forEach((sec: any, sIdx: number) => {
        if (Array.isArray(sec.questions)) {
          sec.questions.forEach((q: any, qIdx: number) => {
            const qId = `${sIdx + 1}.${qIdx + 1}`
            const optionsList = Array.isArray(q.options)
              ? q.options.map((opt: any) => (typeof opt === "string" ? opt : opt?.text || ""))
              : []
            sectionQuestions.push({
              id: qId,
              text: q.text || `Question ${qId}`,
              options: optionsList,
            })
          })
        }
      })
    }

    let finalQuestions = sectionQuestions.length > 0 ? sectionQuestions : rawQuestions

    if (finalQuestions.length === 0 && Object.keys(answersMap).length > 0) {
      finalQuestions = Object.keys(answersMap).map((k) => ({
        id: k,
        text: `Question ${k}`,
        options: [],
      }))
    }

    return finalQuestions.map((q, idx) => {
      const studentAns = answersMap[q.id] || answersMap[`1.${idx + 1}`] || answersMap[String(idx + 1)] || ""
      const correctAns = answerKey[q.id] || answerKey[`1.${idx + 1}`] || answerKey[String(idx + 1)] || ""

      const sNorm = (studentAns || "").trim().toLowerCase()
      const cNorm = (correctAns || "").trim().toLowerCase()
      const isCorrect = Boolean(cNorm && sNorm && (cNorm.includes(sNorm) || sNorm.includes(cNorm)))

      return {
        id: q.id,
        text: q.text,
        options: q.options,
        studentAnswer: studentAns,
        correctAnswer: correctAns,
        isCorrect,
      }
    })
  }, [selected, assignment])

  function openMarksModal() {
    if (!selected) return
    setGivenMarks(selected.score != null ? String(selected.score) : String(assignment?.totalPoints ?? 100))
    setFeedback(selected.feedback || "")
    setShowMarksModal(true)
  }

  function saveEvaluation() {
    if (!assignment || !selected) return
    const score = Number(givenMarks)
    if (Number.isNaN(score)) return
    setSubmissionEvaluation(assignment.id, selected.studentId, score, feedback)
    showFlash("homework", `Evaluation saved for ${selectedStudent?.name ?? "student"}.`)
    setShowMarksModal(false)
    setAnnotateMode(false)
  }

  if (!assignment) {
    return (
      <div className="rounded-[12px] border border-card-border bg-cream p-6 text-[14px] text-text-secondary shadow-card">
        Assignment not found.{" "}
        <button className="font-semibold text-[var(--okf-text)]" onClick={() => navigate("/assignment-tracker")}>
          Back to Assignment Tracker
        </button>
      </div>
    )
  }

  const typeObj = assignmentTypeOf(assignment.type)
  const cls = CLASSES.find((c) => c.id === assignment.classId)

  return (
    <div className="-mx-8 -mt-7 flex min-h-[calc(100vh-56px)] flex-col bg-white">
      {/* header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-card-border bg-white px-3 md:px-5">
        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => navigate(`/assignment-tracker/${assignment.id}`)}
            className="grid h-8 w-8 place-items-center rounded-full border border-card-border"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="max-w-[160px] truncate text-[13px] font-semibold md:max-w-none md:text-[14px]">
            {assignment.title}
          </div>
          <span className="hidden rounded-full border border-[var(--okf-border)] bg-[var(--okf-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--okf-text)] md:inline-flex">
            {typeObj.title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {assignment.type === "mcq" ? (
            <div className="flex items-center gap-2">
              <span className="h-8 flex items-center rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-4 text-[12.5px] font-semibold text-[#166534]">
                ✓ Auto-Graded
              </span>
              <button
                onClick={openMarksModal}
                className="h-8 rounded-full bg-ink px-4 text-[12.5px] font-semibold text-sidebar-text"
              >
                Edit Marks
              </button>
            </div>
          ) : (
            selected && (annotateMode ? (
              <>
                <button
                  onClick={() => setAnnotateMode(false)}
                  className="h-8 rounded-full border border-card-border bg-white px-3 text-[12.5px] font-semibold"
                >
                  Discard
                </button>
                <button
                  onClick={openMarksModal}
                  className="h-8 rounded-full px-4 text-[12.5px] font-semibold text-white"
                  style={{ background: "#16332B" }}
                >
                  Save
                </button>
              </>
            ) : (
              <button
                onClick={() => setAnnotateMode(true)}
                className="h-8 rounded-full bg-ink px-4 text-[12.5px] font-semibold text-sidebar-text"
              >
                Evaluate
              </button>
            ))
          )}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[320px_1fr]">
        {/* sidebar */}
        <aside className="flex min-h-0 flex-col border-r border-card-border bg-white">
          <div className="border-b border-card-border p-3">
            <div className="flex gap-1 rounded-full bg-[#F3F4F6] p-1">
              <button
                onClick={() => {
                  setEvalTab("evaluate")
                  setSelectedStudentId(null)
                }}
                className="h-7 flex-1 rounded-full text-[12px] font-semibold transition"
                style={
                  evalTab === "evaluate"
                    ? { background: "#fff", border: "1px solid var(--edova-card-border)", color: "#111827" }
                    : { color: "var(--edova-text-secondary)" }
                }
              >
                Submissions ({yetToEvaluate.length})
              </button>
              <button
                onClick={() => {
                  setEvalTab("submit")
                  setSelectedStudentId(null)
                }}
                className="h-7 flex-1 rounded-full text-[12px] font-semibold transition"
                style={
                  evalTab === "submit"
                    ? { background: "#fff", border: "1px solid var(--edova-card-border)", color: "#111827" }
                    : { color: "var(--edova-text-secondary)" }
                }
              >
                Yet to Submit ({yetToSubmit.length})
              </button>
            </div>
            <div className="relative mt-3">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search student"
                className="h-9 w-full rounded-full border border-card-border bg-cream pl-8 pr-3 text-[13px] outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="flex-1 space-y-1 overflow-auto p-2">
            {filteredList.length === 0 && (
              <div className="p-4 text-center text-[12.5px] text-text-secondary">No students here.</div>
            )}
            {filteredList.map((s) => {
              const student = resolveStudentDisplay(s.studentId, realStudents)
              const isSelected = selected?.studentId === s.studentId
              return (
                <div
                  key={s.studentId}
                  onClick={() => evalTab === "evaluate" && setSelectedStudentId(s.studentId)}
                  className="flex gap-3 rounded-[12px] border p-3"
                  style={
                    evalTab === "evaluate"
                      ? isSelected
                        ? { borderColor: "rgba(217,169,78,0.55)", background: "rgba(217,169,78,0.12)", cursor: "pointer" }
                        : { borderColor: "var(--edova-card-border)", background: "#fff", cursor: "pointer" }
                      : { borderColor: "var(--edova-card-border)", background: "#fff", opacity: 0.7 }
                  }
                >
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-[13px] font-semibold text-ink">
                    {(student?.name ?? "?").charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold leading-tight">
                      {student ? student.name : s.studentId}
                    </div>
                    <div className="text-[11px] text-text-secondary">
                      {cls ? cls.name : assignment.classId} • {student?.rollNo}
                    </div>
                    {evalTab === "evaluate" ? (() => {
                      const effectiveScore = s.score ?? autoEvaluateSubmission(s.textResponse, assignment.description, assignment.totalPoints)
                      return (
                        <div className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          effectiveScore != null
                            ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]"
                            : "border-[#FCD34D] bg-[#FEF3C7] text-[#92400E]"
                        }`}>
                          {effectiveScore != null
                            ? `Auto-Graded: ${effectiveScore} / ${assignment.totalPoints}`
                            : s.status === "late"
                              ? "Submitted late"
                              : s.status === "submitted"
                                ? `Submitted ${s.submittedOn || ""}`
                                : "Awaiting grade"}
                        </div>
                      )
                    })() : (
                      <div className="mt-1.5 text-[11px] text-text-muted">
                        {s.status === "missing" ? "Missing" : "Not submitted"}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="border-t border-card-border p-3 text-[11px] text-text-muted">
            {evalTab === "evaluate"
              ? `${filteredList.length} student${filteredList.length === 1 ? "" : "s"} in submission list`
              : `${yetToSubmit.length} student${yetToSubmit.length === 1 ? "" : "s"} yet to submit`}
          </div>
        </aside>

        {/* viewer */}
        <div className="relative flex min-w-0 flex-col bg-[#F3F4F6]">
          {evalTab === "evaluate" && selected && (
            <div className="m-3 flex items-start justify-between gap-3 rounded-[12px] border border-[#BBF7D0] bg-[#F0FDF4] p-3 md:m-4">
              <div className="flex gap-2.5">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#BBF7D0] bg-[#DCFCE7] text-[#166534]">
                  <CheckCircle2 size={14} />
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold text-[#166534]">
                    {assignment.type === "mcq" ? "Auto-Graded MCQ Assessment" : "Submission Evaluated"}
                  </div>
                  <div className="mt-0.5 text-[12px] leading-snug text-[#15803D]">
                    {selected.score != null
                      ? `Marks: ${selected.score} / ${assignment.totalPoints} Marks recorded automatically.`
                      : `Total Points: ${assignment.totalPoints} Marks possible.`}
                  </div>
                </div>
              </div>
              <button onClick={openMarksModal} className="h-8 shrink-0 rounded-full bg-[#166534] px-3 text-[12px] font-semibold text-white">
                {selected.score != null ? "Edit Marks" : "Add Marks"}
              </button>
            </div>
          )}

          {!selected ? (
            <div className="grid flex-1 place-items-center text-[13px] text-text-secondary">
              {evalTab === "evaluate" ? "Select a student to review their submission." : "Nothing to evaluate yet — these students haven't submitted."}
            </div>
          ) : (
            <div className="flex flex-1 items-start justify-center overflow-auto p-3 md:p-6">
              <div className="relative w-full max-w-[760px] overflow-hidden rounded-[16px] border border-card-border bg-white shadow-card">
                {annotateMode && (
                  <div className="absolute left-3 top-3 z-10 flex flex-col gap-1.5 rounded-[12px] border border-card-border bg-white p-1.5 shadow-card">
                    {[Move, PenTool, Type, CheckCircle2, XCircle, Star, Undo2, Trash2, ZoomIn].map((Icon, idx) => (
                      <button
                        key={idx}
                        className="grid h-8 w-8 place-items-center rounded-[8px] text-text-secondary transition hover:bg-cream"
                      >
                        <Icon size={16} />
                      </button>
                    ))}
                  </div>
                )}

                <div className="relative p-6 md:p-10">
                  <div className="mx-auto max-w-[560px]">
                    <div className="border-b-2 border-ink pb-3 text-center">
                      <div className="text-[11px] font-semibold tracking-[0.2em]">{cls ? cls.name.toUpperCase() : "ASSIGNMENT"}</div>
                      <div className="mt-1 text-[18px] font-bold tracking-tight">{assignment.title.toUpperCase()}</div>
                      <div className="mt-1 text-[10px] text-text-secondary">
                        {cls?.name} • {assignment.subject} • {typeObj.title}
                      </div>
                    </div>

                    <div className="mt-6 space-y-5 text-[13.5px] leading-relaxed">
                      {evaluatedQuestions.length > 0 ? (
                        <div className="space-y-4">
                          {evaluatedQuestions.map((q, idx) => (
                            <div key={q.id || idx} className="rounded-[14px] border border-card-border bg-white p-4 shadow-xs space-y-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-[13.5px] text-ink">Q{idx + 1}</span>
                                  <span className="text-[11px] font-semibold text-text-muted">({q.id})</span>
                                </div>
                                {q.isCorrect ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-0.5 text-[11px] font-semibold text-[#166534]">
                                    <CheckCircle2 size={12} /> Correct Answer
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-[#FECACA] bg-[#FEF2F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#991B1B]">
                                    <XCircle size={12} /> Incorrect Answer
                                  </span>
                                )}
                              </div>

                              <p className="text-[13.5px] font-medium text-ink leading-relaxed">
                                {q.text}
                              </p>

                              {q.options && q.options.length > 0 ? (
                                <div className="space-y-1.5 pt-1">
                                  {q.options.map((opt, oIdx) => {
                                    const isStudentChoice = isOptionSelected(opt, q.studentAnswer)
                                    const isCorrectChoice = isOptionSelected(opt, q.correctAnswer)

                                    let optionStyle = "border-card-border bg-cream/50 text-ink"
                                    let icon = null

                                    if (isStudentChoice && isCorrectChoice) {
                                      optionStyle = "border-[#86EFAC] bg-[#DCFCE7] text-[#14532D] font-semibold"
                                      icon = <CheckCircle2 size={14} className="text-[#166534] shrink-0" />
                                    } else if (isStudentChoice && !isCorrectChoice) {
                                      optionStyle = "border-[#FCA5A5] bg-[#FEE2E2] text-[#7F1D1D] font-semibold"
                                      icon = <XCircle size={14} className="text-[#991B1B] shrink-0" />
                                    } else if (isCorrectChoice) {
                                      optionStyle = "border-[#A7F3D0] bg-[#ECFDF5] text-[#065F46] font-semibold"
                                      icon = <Star size={14} className="text-[#166534] shrink-0" />
                                    }

                                    return (
                                      <div key={oIdx} className={`flex items-center justify-between rounded-[10px] border p-2.5 text-[12.5px] ${optionStyle}`}>
                                        <div className="flex items-center gap-2">
                                          {icon}
                                          <span>{opt}</span>
                                        </div>
                                        {isStudentChoice && (
                                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 border border-current shadow-2xs">
                                            Student Answer
                                          </span>
                                        )}
                                        {!isStudentChoice && isCorrectChoice && (
                                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/80 border border-current shadow-2xs">
                                            Correct Answer
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[12.5px]">
                                  <div className={`rounded-[10px] border p-3 ${q.isCorrect ? "border-[#86EFAC] bg-[#DCFCE7] text-[#14532D]" : "border-[#FCA5A5] bg-[#FEE2E2] text-[#7F1D1D]"}`}>
                                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">Student Answer</div>
                                    <div className="mt-1 font-semibold">{q.studentAnswer || "No answer provided"}</div>
                                  </div>
                                  <div className="rounded-[10px] border border-[#A7F3D0] bg-[#ECFDF5] p-3 text-[#065F46]">
                                    <div className="text-[10px] font-bold uppercase tracking-wider opacity-75">Correct Answer</div>
                                    <div className="mt-1 font-semibold">{q.correctAnswer || "N/A"}</div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : selected.textResponse ? (
                        <div className="rounded-[12px] border border-card-border bg-[#F9FAFB] p-5 whitespace-pre-wrap font-sans text-ink">
                          {selected.textResponse}
                        </div>
                      ) : (
                        <div className="relative grid h-[140px] place-items-center overflow-hidden rounded-[12px] border border-dashed border-[#D1D5DB] bg-[#F9FAFB] text-[12px] text-text-muted">
                          <div className="text-center">
                            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-ink text-2xl">📄</div>
                            <div className="mt-2">{selectedStudent?.name ?? "Student"}'s work is not yet submitted or empty.</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-8 flex justify-between border-t border-card-border pt-3 text-[10px] text-text-muted">
                      <span>Student: {selectedStudent ? selectedStudent.name : selected.studentId}</span>
                      <span>Page 1 of 1</span>
                    </div>
                  </div>
                </div>

                <div className="flex h-11 items-center justify-between border-t border-card-border bg-cream px-3">
                  <div className="text-[11px] text-text-secondary">Zoom 100% • 1 page</div>
                  <div className="flex items-center gap-1.5">
                    <button className="grid h-7 w-7 place-items-center rounded-full border border-card-border bg-white">
                      <ZoomIn size={14} />
                    </button>
                    <button
                      onClick={openMarksModal}
                      className="h-7 rounded-full px-3 text-[11px] font-semibold text-white"
                      style={{ background: "#16332B" }}
                    >
                      Add Marks
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MARKS MODAL */}
      {showMarksModal && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[rgba(26,46,53,0.5)] backdrop-blur-[2px]" onClick={() => setShowMarksModal(false)} />
          <div className="relative w-full max-w-[420px] rounded-[20px] border border-card-border bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-[16px] font-bold">Evaluate Submission</h3>
              <button onClick={() => setShowMarksModal(false)} className="grid h-8 w-8 place-items-center rounded-full border border-card-border">
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[13px] font-semibold">Marks</label>
                <div className="relative mt-2">
                  <input
                    value={givenMarks}
                    onChange={(e) => setGivenMarks(e.target.value)}
                    className="h-11 w-full rounded-[8px] border border-card-border px-3.5 pr-[70px] text-[14px] outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="absolute right-1 top-1 grid h-9 place-items-center rounded-full border border-card-border bg-cream px-3 text-[12px] text-text-secondary">
                    / {assignment.totalPoints}
                  </span>
                </div>
              </div>
              <div>
                <label className="text-[13px] font-semibold">Feedback</label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="mt-2 w-full resize-none rounded-[8px] border border-card-border px-3.5 py-3 text-[14px] outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowMarksModal(false)} className="h-10 rounded-full border border-card-border bg-white px-4 text-[13px] font-semibold">
                Cancel
              </button>
              <button onClick={saveEvaluation} className="h-10 rounded-full px-5 text-[13px] font-semibold text-white" style={{ background: "#16332B" }}>
                Save Evaluation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
