import { useEffect, useState } from "react"
import { PageHeader } from "@/components/common/PageHeader"
import { submissionStatusStyle, SUBMISSION_LABEL } from "@/lib/styles"
import { getMyAssignments, submitMyAssignment, type MyAssignment } from "@/lib/student-api"

function formatDue(due: string | null): string {
  if (!due) return "No due date"
  return new Date(due).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState<MyAssignment[]>([])
  const [error, setError] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)

  function reload() {
    getMyAssignments().then(setAssignments).catch(() => setError(true))
  }

  useEffect(() => { reload() }, [])

  function openAssignment(a: MyAssignment) {
    setOpenId(openId === a.id ? null : a.id)
    setDraft(a.text_response ?? "")
  }

  async function turnIn(id: string) {
    setSubmitting(true)
    try {
      await submitMyAssignment(id, draft)
      setOpenId(null)
      reload()
    } catch {
      setError(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (error) {
    return (
      <div>
        <PageHeader title="My Assignments" />
        <div className="rounded-[12px] border border-card-border bg-cream p-5 text-[14px] text-text-secondary shadow-card">
          Couldn't load your assignments right now. Try again shortly.
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader title="My Assignments" subtitle="Your real homework, in one place." />
      {assignments.length === 0 && (
        <div className="rounded-[12px] border border-card-border bg-cream p-5 text-[14px] text-text-secondary shadow-card">
          Nothing assigned yet.
        </div>
      )}
      <div className="space-y-3">
        {assignments.map((a) => {
          const isOpen = openId === a.id
          const graded = a.submission_status === "graded"
          return (
            <div key={a.id} className="rounded-[12px] border border-card-border bg-cream shadow-card">
              <button
                type="button"
                onClick={() => openAssignment(a)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div className="min-w-0">
                  <div className="truncate text-[15px] font-semibold text-ink">{a.title}</div>
                  <div className="mt-0.5 text-[13px] text-text-secondary">
                    {a.classroom_name} · Due {formatDue(a.due_date)} · {a.points_possible} points
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {graded && (
                    <span className="text-[13.5px] font-semibold text-ink">
                      {a.points_earned}/{a.points_possible}
                    </span>
                  )}
                  <span style={submissionStatusStyle(a.submission_status)}>
                    {SUBMISSION_LABEL[a.submission_status]}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-card-border px-5 py-4">
                  {a.description && (
                    <p className="mb-3 text-[13.5px] leading-relaxed text-text-secondary">{a.description}</p>
                  )}
                  {graded && a.feedback && (
                    <div className="mb-3 rounded-[8px] border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-[13.5px] text-[#166534]">
                      <span className="font-semibold">Teacher feedback: </span>
                      {a.feedback}
                    </div>
                  )}
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={4}
                    placeholder="Type your answer here…"
                    className="w-full resize-none rounded-[8px] border border-card-border bg-white px-3.5 py-3 text-[14px] outline-none focus:ring-2 focus:ring-ring"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => turnIn(a.id)}
                      className="cursor-pointer rounded-[8px] px-4 py-2 text-[14px] font-semibold text-white disabled:opacity-60"
                      style={{ background: "#16332B" }}
                    >
                      {a.submission_status === "not_started" ? "Turn it in" : "Update submission"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
