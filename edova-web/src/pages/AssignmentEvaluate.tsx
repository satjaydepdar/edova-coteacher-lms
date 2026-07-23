import { useMemo, useState } from "react"
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
  Clock,
} from "lucide-react"
import { CLASSES, STUDENTS } from "@/data/seed"
import { useSchoolStore } from "@/store/school-store"
import { assignmentTypeOf } from "@/lib/assignment-types"
import type { Submission } from "@/lib/types"

export default function AssignmentEvaluate() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const assignments = useSchoolStore((s) => s.assignments)
  const setSubmissionEvaluation = useSchoolStore((s) => s.setSubmissionEvaluation)
  const showFlash = useSchoolStore((s) => s.showFlash)

  const assignment = assignments.find((a) => a.id === id)

  const [evalTab, setEvalTab] = useState<"evaluate" | "submit">("evaluate")
  const [search, setSearch] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [annotateMode, setAnnotateMode] = useState(false)
  const [showMarksModal, setShowMarksModal] = useState(false)
  const [givenMarks, setGivenMarks] = useState("")
  const [feedback, setFeedback] = useState("")

  const yetToEvaluate = useMemo(
    () =>
      (assignment?.submissions ?? []).filter(
        (s) => (s.status === "submitted" || s.status === "late") && s.score == null
      ),
    [assignment]
  )
  const yetToSubmit = useMemo(
    () => (assignment?.submissions ?? []).filter((s) => s.status === "not_started" || s.status === "missing"),
    [assignment]
  )

  const list = evalTab === "evaluate" ? yetToEvaluate : yetToSubmit
  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return list
    return list.filter((s) => {
      const student = STUDENTS.find((st) => st.id === s.studentId)
      return student ? student.name.toLowerCase().includes(q) : false
    })
  }, [list, search])

  const selected: Submission | undefined =
    (selectedStudentId && assignment?.submissions.find((s) => s.studentId === selectedStudentId)) ||
    (evalTab === "evaluate" ? yetToEvaluate[0] : undefined)
  const selectedStudent = selected ? STUDENTS.find((st) => st.id === selected.studentId) : undefined

  function openMarksModal() {
    if (!selected) return
    setGivenMarks(selected.score != null ? String(selected.score) : "")
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
    setSelectedStudentId(null)
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
          {selected &&
            (annotateMode ? (
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
            ))}
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
                Yet to Evaluate ({yetToEvaluate.length})
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
              const student = STUDENTS.find((st) => st.id === s.studentId)
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
                    {evalTab === "evaluate" ? (
                      <div className="mt-1.5 inline-flex rounded-full border border-[#FCD34D] bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#92400E]">
                        {s.status === "late" ? "Submitted late" : `Submitted ${s.submittedOn || ""}`}
                      </div>
                    ) : (
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
              ? `${yetToEvaluate.length} student${yetToEvaluate.length === 1 ? "" : "s"} awaiting evaluation`
              : `${yetToSubmit.length} student${yetToSubmit.length === 1 ? "" : "s"} yet to submit`}
          </div>
        </aside>

        {/* viewer */}
        <div className="relative flex min-w-0 flex-col bg-[#F3F4F6]">
          {evalTab === "evaluate" && selected && !annotateMode && (
            <div className="m-3 flex items-start justify-between gap-3 rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] p-3 md:m-4">
              <div className="flex gap-2.5">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#FDE68A] bg-[#FEF3C7] text-[#92400E]">
                  <Clock size={14} />
                </div>
                <div>
                  <div className="text-[12.5px] font-semibold text-[#92400E]">Evaluation pending</div>
                  <div className="mt-0.5 text-[12px] leading-snug text-[#B45309]">
                    Add marks and feedback after reviewing the submission.
                  </div>
                </div>
              </div>
              <button onClick={() => setAnnotateMode(true)} className="h-8 shrink-0 rounded-full bg-ink px-3 text-[12px] font-semibold text-sidebar-text">
                Evaluate
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

                    <div className="mt-6 space-y-5 text-[13px] leading-relaxed">
                      <div className="relative grid h-[140px] place-items-center overflow-hidden rounded-[12px] border border-dashed border-[#D1D5DB] bg-[#F9FAFB] text-[12px] text-text-muted">
                        <div className="text-center">
                          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-2 border-ink text-2xl">📄</div>
                          <div className="mt-2">{selectedStudent?.name ?? "Student"}'s submitted work</div>
                        </div>
                      </div>
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
