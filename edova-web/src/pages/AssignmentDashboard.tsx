import { useMemo, useRef, useState, useEffect } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, File, CheckCircle2, MoreHorizontal, Trash2 } from "lucide-react"
import { CLASSES } from "@/data/seed"
import { parseShortDate } from "@/lib/dates"
import { useSchoolStore } from "@/store/school-store"
import { assignmentTypeOf } from "@/lib/assignment-types"
import { getResourceUrl } from "@/lib/media"
import type { Assignment } from "@/lib/types"

function dueDiffDays(due: string, dueIso?: string): number {
  const dueDate = dueIso ? new Date(dueIso) : parseShortDate(due)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)
  return Math.round((dueDate.getTime() - today.getTime()) / 86400000)
}
function urgencyLabel(diff: number): string {
  if (diff < 0) return `Overdue ${-diff}d`
  if (diff === 0) return "Due today"
  return `Due in ${diff}d`
}
function submittedCount(a: Assignment): number {
  return a.submissions.filter((s) => s.status === "submitted" || s.status === "late").length
}
function evaluatedCount(a: Assignment): number {
  return a.submissions.filter((s) => s.score != null).length
}

export default function AssignmentDashboard() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const assignments = useSchoolStore((s) => s.assignments)
  const deleteAssignment = useSchoolStore((s) => s.deleteAssignment)
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const hydrateAssignments = useSchoolStore((s) => s.hydrateAssignments)
  useEffect(() => {
    hydrateAssignments()
    const timer = setInterval(() => hydrateAssignments(), 3000)
    return () => clearInterval(timer)
  }, [hydrateAssignments])

  // Close menu on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  async function handleDelete() {
    await deleteAssignment(id!)
    navigate("/assignment-tracker")
  }

  const assignment = assignments.find((a) => a.id === id)

  const others = useMemo(
    () => assignments.filter((a) => a.id !== id),
    [assignments, id]
  )
  const ongoing = others.filter((a) => a.status === "active").slice(0, 2)
  const completed = others.filter((a) => a.status === "graded").slice(0, 2)

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

  const cls = CLASSES.find((c) => c.id === assignment.classId)
  const typeObj = assignmentTypeOf(assignment.type)
  const total = assignment.submissions.length
  const submitted = submittedCount(assignment)
  const evaluated = evaluatedCount(assignment)
  const diff = dueDiffDays(assignment.due, assignment.dueIso)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-card-border bg-cream p-4 md:p-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/assignment-tracker")}
            className="grid h-8 w-8 place-items-center rounded-full border border-card-border bg-white"
          >
            <ArrowLeft size={16} />
          </button>
          <span
            className="inline-flex h-7 items-center gap-2 rounded-full border px-3 text-[12px] font-semibold"
            style={
              assignment.status === "active"
                ? { background: "#ECFDF5", borderColor: "#A7F3D0", color: "#065F46" }
                : { background: "#F3F4F6", borderColor: "#E5E7EB", color: "#374151" }
            }
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: assignment.status === "active" ? "#10B981" : "#9CA3AF" }} />
            {assignment.status === "active" ? urgencyLabel(diff) : assignment.status}
          </span>
          <span className="hidden text-[12px] text-text-muted md:inline-flex">
            ID {assignment.id.slice(-6).toUpperCase()} • Created {assignment.createdOn}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button className="h-8 rounded-full border border-card-border bg-white px-3 text-[12.5px] font-semibold">Share</button>
          {/* ⋯ Menu */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setShowMenu((v) => !v)}
              className="grid h-8 w-8 place-items-center rounded-full border border-card-border bg-white transition hover:bg-cream"
            >
              <MoreHorizontal size={16} />
            </button>
            {showMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-[12px] border border-card-border bg-white shadow-xl">
                <button
                  onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={14} />
                  Delete Assignment
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-[340px] rounded-[20px] border border-card-border bg-white p-6 shadow-2xl">
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Trash2 size={18} className="text-red-600" />
            </div>
            <h3 className="mt-3 text-[15px] font-bold text-ink">Delete Assignment?</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-text-secondary">
              <span className="font-semibold text-ink">"{assignment.title}"</span> will be permanently removed for all students. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-[8px] border border-card-border py-2 text-[13px] font-semibold transition hover:bg-cream"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 rounded-[8px] bg-red-600 py-2 text-[13px] font-semibold text-white transition hover:bg-red-700"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-[20px] border border-card-border bg-cream p-6 shadow-card md:p-7">
            <h2 className="font-display text-[20px] font-bold leading-tight text-ink">{assignment.title}</h2>
            {assignment.description && (
              <p className="mt-3 text-[13.5px] leading-relaxed text-[#4B5563]">{assignment.description}</p>
            )}

            {assignment.attachments && assignment.attachments.length > 0 && (
              <div className="mt-6">
                <div className="text-[12px] font-bold uppercase tracking-wide text-text-secondary">Attachments</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {assignment.attachments.map((att) => {
                    const url = getResourceUrl({ s3_key: att.s3Key ?? null, external_url: att.externalUrl })
                    const Tag = url ? "a" : "div"
                    return (
                      <Tag
                        key={att.name}
                        {...(url ? { href: url, target: "_blank", rel: "noreferrer" } : {})}
                        className="inline-flex h-10 items-center gap-2 rounded-[12px] border border-card-border bg-white px-3 text-[13px]"
                      >
                        <div className="grid h-8 w-8 place-items-center rounded-[8px] border border-[var(--okf-border)] bg-[var(--okf-bg)] text-[var(--okf-text)]">
                          <File size={16} />
                        </div>
                        {att.name} <span className="text-[11px] text-text-muted">{att.size}</span>
                      </Tag>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {ongoing.length > 0 && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[14px] font-semibold">Ongoing Assignments</h3>
                <button onClick={() => navigate("/assignment-tracker")} className="text-[12px] font-semibold text-[var(--okf-text)]">
                  View all
                </button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {ongoing.map((a) => {
                  const d = dueDiffDays(a.due, a.dueIso)
                  const c = CLASSES.find((x) => x.id === a.classId)
                  return (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/assignment-tracker/${a.id}`)}
                      className="cursor-pointer rounded-[16px] border border-[#BBF7D0] bg-[#F0FDF4] p-4"
                    >
                      <div className="flex items-start justify-between">
                        <span className="rounded-full border border-[#BBF7D0] bg-white px-2 py-0.5 text-[11px] font-semibold">
                          {a.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-[11px] font-semibold text-[#065F46]">{urgencyLabel(d)}</span>
                      </div>
                      <div className="mt-3 text-[14px] font-semibold leading-tight">{a.title}</div>
                      <div className="mt-1 text-[12px] text-text-secondary">
                        {c ? c.name : a.classId} • {a.totalPoints} Marks
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="rounded-[20px] border border-card-border bg-cream p-5 shadow-card">
            <h3 className="mb-4 text-[14px] font-semibold">Overall Statistics</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { k: "Given", v: total, sub: "students" },
                { k: "Submitted", v: submitted, sub: total ? `${Math.round((submitted / total) * 100)}% submitted` : "—" },
                { k: "Evaluated", v: evaluated, sub: "graded" },
              ].map((s) => (
                <div key={s.k} className="rounded-[14px] border border-card-border bg-white p-4">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">{s.k}</div>
                  <div className="mt-1 text-[22px] font-bold">{s.v}</div>
                  <div className="mt-0.5 text-[11px] text-text-muted">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[20px] border border-card-border bg-cream p-5 shadow-card">
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="rounded-[12px] border border-card-border bg-white p-3.5">
                <div className="text-[11px] font-semibold uppercase text-text-secondary">Total Marks</div>
                <div className="mt-1 text-[18px] font-bold">{assignment.totalPoints}</div>
              </div>
              <div className="rounded-[12px] border border-card-border bg-white p-3.5">
                <div className="text-[11px] font-semibold uppercase text-text-secondary">Type</div>
                <div className="mt-1 inline-flex rounded-full border border-[var(--okf-border)] bg-[var(--okf-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--okf-text)]">
                  {typeObj.title}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text-secondary">Class</div>
              <span className="rounded-full border border-card-border bg-white px-2.5 py-1 text-[12px]">
                {cls ? cls.name : assignment.classId}
              </span>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-[12px] border border-card-border p-3">
              <div className="text-[12px]">
                <span className="text-text-secondary">Due:</span> <span className="font-semibold">{assignment.due}</span>
              </div>
              <span className="rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2 py-0.5 text-[11px] font-semibold text-[#065F46]">
                {diff < 0 ? "Overdue" : "On track"}
              </span>
            </div>
            <button
              onClick={() => navigate(`/assignment-tracker/${assignment.id}/evaluate`)}
              className="mt-4 h-10 w-full rounded-full text-[13px] font-semibold text-white"
              style={{ background: "#16332B" }}
            >
              Evaluate Submissions
            </button>
          </div>

          {completed.length > 0 && (
            <div className="rounded-[20px] border border-card-border bg-cream p-5 shadow-card">
              <h4 className="mb-3 text-[13px] font-semibold">Completed</h4>
              <div className="space-y-2.5">
                {completed.map((a) => {
                  const returned = a.submissions.filter((s) => s.score != null).length
                  return (
                    <div
                      key={a.id}
                      onClick={() => navigate(`/assignment-tracker/${a.id}`)}
                      className="flex cursor-pointer gap-3 rounded-[12px] border border-transparent p-2.5 transition hover:border-card-border hover:bg-white"
                    >
                      <div className="grid h-8 w-8 place-items-center rounded-[8px] bg-[#F3F4F6]">
                        <CheckCircle2 size={16} className="text-text-secondary" />
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold leading-tight">{a.title}</div>
                        <div className="mt-0.5 text-[11px] text-text-muted">Returned to {returned} students</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
