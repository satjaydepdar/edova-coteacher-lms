import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CLASSES, APP_TODAY } from "@/data/seed"
import { parseShortDate, dayLabelForDate } from "@/lib/dates"
import {
  assignmentStatusStyle,
  barFill,
  coverageBarColor,
  dueUrgencyStyle,
  riskCountStyle,
  submissionStatusStyle,
  SUBMISSION_LABEL,
  type DueUrgency,
} from "@/lib/styles"
import { useSchoolStore, resolveStudentDisplay } from "@/store/school-store"
import { FlashBanner } from "@/components/common/FlashBanner"
import type { Assignment } from "@/lib/types"

// ---- Due-date urgency (derived from `due` vs APP_TODAY; NOT the workflow
// AssignmentStatus, which stays active/closed/graded and drives scoring). ----

function dueDiffDays(due: string): number {
  return Math.round((parseShortDate(due).getTime() - APP_TODAY.getTime()) / 86400000)
}
function urgencyOf(diff: number): DueUrgency {
  if (diff < 0) return "overdue"
  if (diff === 0) return "today"
  if (diff <= 2) return "soon"
  return "upcoming"
}
function urgencyLabel(diff: number): string {
  if (diff < 0) return `Overdue ${-diff}d`
  if (diff === 0) return "Due today"
  return `Due in ${diff}d`
}

function submittedCount(a: Assignment): number {
  return a.submissions.filter((s) => s.status === "submitted" || s.status === "late").length
}

const rosterHeaderCell: React.CSSProperties = {
  padding: "8px 12px",
  borderBottom: "1px solid #E5E7EB",
  fontSize: 13,
  color: "#6B7280",
  fontWeight: 600,
}

const statCard =
  "min-w-[120px] flex-1 rounded-[12px] border border-card-border bg-cream px-4 py-3 shadow-card"
const statLabel = "text-[13px] font-semibold text-text-secondary"
const statValue = "mt-0.5 font-display text-[22px] font-bold"

export default function AssignmentTracker() {
  const navigate = useNavigate()
  const [classFilter, setClassFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const assignments = useSchoolStore((s) => s.assignments)
  const setSubmissionScore = useSchoolStore((s) => s.setSubmissionScore)
  const showFlash = useSchoolStore((s) => s.showFlash)
  const realStudents = useSchoolStore((s) => s.realStudents)
  const hydrateRealStudents = useSchoolStore((s) => s.hydrateRealStudents)
  useEffect(() => { hydrateRealStudents() }, [hydrateRealStudents])
  const hydrateAssignments = useSchoolStore((s) => s.hydrateAssignments)
  const refreshAssignments = useSchoolStore((s) => s.refreshAssignments)
  useEffect(() => { hydrateAssignments() }, [hydrateAssignments])

  // Live-ish updates: re-pull from the backend every 30s while the page is
  // open, so student submissions / new assignments appear without a reload.
  useEffect(() => {
    const timer = setInterval(() => { refreshAssignments() }, 30000)
    return () => clearInterval(timer)
  }, [refreshAssignments])

  // ---- Summary stats. Every number is derived from the live `assignments`
  // array / roster lengths — never a hardcoded count that could drift. The
  // two clusters use different units (assignments vs student submissions)
  // and are labeled as such so they can't be misread as one denominator. ----
  const stats = useMemo(() => {
    const diffs = assignments.map((a) => dueDiffDays(a.due))
    const submitted = assignments.reduce((sum, a) => sum + submittedCount(a), 0)
    const slots = assignments.reduce((sum, a) => sum + a.submissions.length, 0)
    return {
      total: assignments.length,
      overdue: diffs.filter((d) => d < 0).length,
      dueToday: diffs.filter((d) => d === 0).length,
      upcoming: diffs.filter((d) => d > 0).length,
      submitted,
      slots,
      rate: slots ? Math.round((submitted / slots) * 100) : 0,
    }
  }, [assignments])

  // ---- Students needing attention: across ALL assignments due today or
  // earlier, any submission still not_started or missing. Worst first.
  // (A per-student "last active Nd ago" staleness signal was considered but
  // dropped: Submission has no activity timestamp for unsubmitted work —
  // adding it needs a real activity-log data source first.) ----
  const atRisk = useMemo(() => {
    const map = new Map<string, { name: string; titles: string[] }>()
    for (const a of assignments) {
      if (dueDiffDays(a.due) > 0) continue
      for (const sub of a.submissions) {
        if (sub.status !== "not_started" && sub.status !== "missing") continue
        const student = resolveStudentDisplay(sub.studentId, realStudents)
        const entry = map.get(sub.studentId) ?? {
          name: student ? student.name : sub.studentId,
          titles: [],
        }
        entry.titles.push(a.title)
        map.set(sub.studentId, entry)
      }
    }
    return [...map.values()].sort((x, y) => y.titles.length - x.titles.length)
  }, [assignments, realStudents])

  // Class filter pills — only classes that actually have assignments.
  const classOptions = useMemo(() => {
    const ids = new Set(assignments.map((a) => a.classId))
    return CLASSES.filter((c) => ids.has(c.id))
  }, [assignments])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return assignments
      .filter(
        (a) =>
          (classFilter === "all" || a.classId === classFilter) &&
          a.title.toLowerCase().includes(q)
      )
      .slice()
      .sort((a, b) => dueDiffDays(a.due) - dueDiffDays(b.due) || a.title.localeCompare(b.title))
  }, [assignments, classFilter, search])

  const selected = visible.find((a) => a.id === selectedId) ?? visible[0] ?? null

  // Bar chart data: submission progress per visible assignment, worst first.
  const chart = useMemo(
    () =>
      visible
        .map((a) => ({
          a,
          pct: a.submissions.length
            ? Math.round((submittedCount(a) / a.submissions.length) * 100)
            : 0,
        }))
        .sort((x, y) => x.pct - y.pct),
    [visible]
  )

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="mb-1 font-display text-[24px] font-bold text-ink">
            Assignment Tracker
          </div>
          <div className="text-[16px] text-text-secondary">
            Create and distribute assignments, then track submissions and score them — in one
            place.
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/assignment-tracker/new")}
          className="cursor-pointer rounded-[8px] px-[18px] py-2.5 text-[15px] font-semibold text-white"
          style={{ background: "#16332B" }}
        >
          + New Assignment
        </button>
      </div>

      <FlashBanner flashKey="homework" />

      {/* ---- Summary stats: two clusters with explicitly different units ---- */}
      <div className="mb-5 flex flex-wrap items-stretch gap-6">
        <div className="flex-[3] basis-[420px]">
          <div className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
            Assignments <span className="font-semibold normal-case tracking-normal">— counts assignments</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className={statCard}>
              <div className={statLabel}>Total</div>
              <div className={`${statValue} text-ink`}>{stats.total}</div>
            </div>
            <div className={statCard}>
              <div className={statLabel}>Overdue</div>
              <div className={statValue} style={{ color: "#DC2626" }}>
                {stats.overdue}
              </div>
            </div>
            <div className={statCard}>
              <div className={statLabel}>Due Today</div>
              <div className={statValue} style={{ color: "#B45309" }}>
                {stats.dueToday}
              </div>
            </div>
            <div className={statCard}>
              <div className={statLabel}>Upcoming</div>
              <div className={`${statValue} text-ink`}>{stats.upcoming}</div>
            </div>
          </div>
        </div>
        <div className="flex-[2] basis-[280px]">
          <div className="mb-1.5 text-[12px] font-bold uppercase tracking-[0.06em] text-text-secondary">
            Submissions <span className="font-semibold normal-case tracking-normal">— counts student submissions</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className={statCard}>
              <div className={statLabel}>Submitted</div>
              <div className={`${statValue} text-ink`}>
                {stats.submitted}
                <span className="text-[15px] font-semibold text-text-muted"> / {stats.slots}</span>
              </div>
            </div>
            <div className={statCard}>
              <div className={statLabel}>Completion Rate</div>
              <div className={`${statValue} text-ink`}>{stats.rate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Students needing attention (past-due or due-today, not handed in) ---- */}
      <div
        className="mb-5 rounded-[12px] p-4"
        style={
          atRisk.length
            ? { background: "#FEF2F2", border: "1px solid #FECACA" }
            : { background: "#F0FDF4", border: "1px solid #BBF7D0" }
        }
      >
        <div className="mb-1 flex items-baseline gap-2">
          <div className="text-[15.5px] font-bold text-[#111827]">
            {atRisk.length
              ? `${atRisk.length} student${atRisk.length === 1 ? "" : "s"} need${atRisk.length === 1 ? "s" : ""} attention`
              : "Nobody is behind on past-due work right now"}
          </div>
          <div className="text-[13px] text-text-secondary">
            behind on assignments due today or earlier, across all classes
          </div>
        </div>
        {atRisk.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2.5">
            {atRisk.map((r) => (
              <div
                key={r.name}
                className="flex items-center gap-2.5 rounded-[10px] border border-[#FECACA] bg-white px-3 py-2"
              >
                <div>
                  <div className="text-[14px] font-bold text-[#111827]">{r.name}</div>
                  <div className="max-w-[320px] truncate text-[12.5px] text-text-secondary">
                    {r.titles.join(" · ")}
                  </div>
                </div>
                <span style={riskCountStyle(r.titles.length)}>{r.titles.length}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Filters: class pills + title search ---- */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {[{ id: "all", name: `All classes · ${assignments.length}` }, ...classOptions].map(
          (c) => {
            const on = classFilter === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setClassFilter(c.id)}
                className="cursor-pointer rounded-full border px-3.5 py-1.5 text-[13.5px] font-semibold"
                style={
                  on
                    ? { background: "#16332B", borderColor: "#16332B", color: "#FFFFFF" }
                    : { background: "#FFFFFF", borderColor: "#E5E7EB", color: "#374151" }
                }
              >
                {c.name}
              </button>
            )
          }
        )}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assignments…"
          className="ml-auto h-[36px] w-[230px] rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-[14px] font-[inherit] outline-none"
        />
        <button
          type="button"
          onClick={() => refreshAssignments()}
          title="Pull the latest submissions and assignments from the server"
          className="h-[36px] cursor-pointer rounded-[8px] border border-[#E5E7EB] bg-white px-3 text-[14px] font-semibold text-text-secondary"
        >
          ↻ Refresh
        </button>
      </div>

      {/* ---- Assignment list (left) + roster detail (right) ---- */}
      <div
        className="mb-5 grid gap-5"
        style={{ gridTemplateColumns: "minmax(300px, 1.05fr) 1.6fr", alignItems: "start" }}
      >
        <div className="rounded-[12px] border border-card-border bg-cream px-4 py-1 shadow-card">
          {visible.length === 0 && (
            <div className="py-6 text-center text-[14px] text-text-secondary">
              No assignments match the current filters.
            </div>
          )}
          {visible.map((a) => {
            const cls = CLASSES.find((c) => c.id === a.classId)
            const diff = dueDiffDays(a.due)
            const sub = submittedCount(a)
            const total = a.submissions.length
            const pct = total ? Math.round((sub / total) * 100) : 0
            const isOn = selected?.id === a.id
            return (
              <div
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className="-mx-2 my-1.5 cursor-pointer rounded-[10px] px-3 py-3"
                style={
                  isOn
                    ? { background: "rgba(217, 169, 78, 0.14)", border: "1px solid rgba(217, 169, 78, 0.45)" }
                    : { border: "1px solid transparent" }
                }
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <div className="truncate text-[15px] font-semibold text-[#111827]">
                    {a.title}
                  </div>
                  <span style={dueUrgencyStyle(urgencyOf(diff))}>{urgencyLabel(diff)}</span>
                </div>
                <div className="mb-2 text-[13.5px] text-text-secondary">
                  {cls ? cls.name : a.classId} · Due {a.due} · {sub}/{total} submitted
                </div>
                <div
                  style={{
                    width: "100%",
                    height: 6,
                    background: "#EDE9DC",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div style={barFill(pct, coverageBarColor(pct))} />
                </div>
              </div>
            )
          })}
        </div>

        {selected ? (
          <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card">
            {(() => {
              const a = selected
              const cls = CLASSES.find((c) => c.id === a.classId)
              const diff = dueDiffDays(a.due)
              const sub = submittedCount(a)
              const total = a.submissions.length
              const pct = total ? Math.round((sub / total) * 100) : 0
              return (
                <div>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <div className="text-[18px] font-bold text-[#111827]">{a.title}</div>
                    <div className="flex items-center gap-2">
                      <span style={dueUrgencyStyle(urgencyOf(diff))}>{urgencyLabel(diff)}</span>
                      <span style={assignmentStatusStyle(a.status)}>{a.status}</span>
                      <button
                        type="button"
                        onClick={() => navigate(`/assignment-tracker/${a.id}/evaluate`)}
                        className="cursor-pointer rounded-full px-3 py-1 text-[12.5px] font-semibold text-white"
                        style={{ background: "#16332B" }}
                      >
                        Evaluate
                      </button>
                    </div>
                  </div>
                  <div className="mb-3 text-[14px] text-text-secondary">
                    {cls ? cls.name : a.classId} · Due {a.due} (
                    {dayLabelForDate(parseShortDate(a.due))}) · {a.totalPoints} points ·{" "}
                    {sub}/{total} submitted
                  </div>
                  <div
                    className="mb-4"
                    style={{
                      width: "100%",
                      height: 8,
                      background: "#EDE9DC",
                      borderRadius: 999,
                      overflow: "hidden",
                    }}
                  >
                    <div style={barFill(pct, coverageBarColor(pct))} />
                  </div>

                  <div
                    className="overflow-hidden rounded-[10px] border border-[#E5E7EB]"
                    style={{ background: "#FBFAF6" }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr" }}>
                      <div style={rosterHeaderCell}>Student</div>
                      <div style={rosterHeaderCell}>Status</div>
                      <div style={rosterHeaderCell}>Completed On</div>
                      <div style={rosterHeaderCell}>Score / {a.totalPoints}</div>

                      {a.submissions.map((s) => {
                        const student = resolveStudentDisplay(s.studentId, realStudents)
                        // Any roster student can be scored directly -- there's no
                        // real student-submission flow yet, so gating on
                        // "submitted"/"late" would make grading impossible.
                        const value = s.score == null ? "" : String(s.score)
                        return (
                          <div key={s.studentId} style={{ display: "contents" }}>
                            <div
                              className="flex items-center text-[14.5px] font-semibold text-[#111827]"
                              style={{ padding: "9px 12px", borderBottom: "1px solid #F1F5F9" }}
                            >
                              {student ? student.name : s.studentId}
                            </div>
                            <div
                              className="flex items-center"
                              style={{ padding: "9px 12px", borderBottom: "1px solid #F1F5F9" }}
                            >
                              <span style={submissionStatusStyle(s.status)}>
                                {SUBMISSION_LABEL[s.status]}
                              </span>
                            </div>
                            <div
                              className="flex items-center text-[14px] text-[#374151]"
                              style={{ padding: "9px 12px", borderBottom: "1px solid #F1F5F9" }}
                            >
                              {s.submittedOn}
                            </div>
                            <div
                              className="flex items-center"
                              style={{ padding: "9px 12px", borderBottom: "1px solid #F1F5F9" }}
                            >
                              <input
                                type="number"
                                min={0}
                                value={value}
                                onChange={(e) =>
                                  setSubmissionScore(a.id, s.studentId, e.target.value)
                                }
                                className="h-8 w-[70px] rounded-[6px] border border-[#E5E7EB] px-2 text-[14px] outline-none"
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex justify-end p-3">
                      <button
                        type="button"
                        onClick={() => showFlash("homework", "Scores saved.")}
                        className="cursor-pointer rounded-[8px] px-4 py-2 text-[14px] font-semibold text-white"
                        style={{ background: "#16332B" }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        ) : (
          <div className="rounded-[12px] border border-card-border bg-cream p-5 text-[14px] text-text-secondary shadow-card">
            Select an assignment to see its roster.
          </div>
        )}
      </div>

      {/* ---- Submission progress chart, worst completion first ---- */}
      <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card">
        <div className="mb-3.5 text-[16px] font-bold text-[#111827]">
          Submission Progress by Assignment
        </div>
        {chart.length === 0 ? (
          <div className="text-[14px] text-text-secondary">
            No assignments match the current filters.
          </div>
        ) : (
          <div className="flex items-end gap-3">
            {chart.map(({ a, pct }) => (
              <div key={a.id} className="min-w-0 flex-1">
                <div className="mb-1 text-center text-[12.5px] font-bold text-[#374151]">
                  {pct}%
                </div>
                <div className="flex h-[120px] items-end">
                  <div
                    className="w-full cursor-pointer rounded-t-[4px]"
                    style={{ height: `${Math.max(pct, 3)}%`, background: coverageBarColor(pct) }}
                    onClick={() => setSelectedId(a.id)}
                    title={a.title}
                  />
                </div>
                <div className="mt-1.5 truncate text-center text-[12px] text-text-secondary">
                  {a.title}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 text-[13px] text-[#9CA3AF]">
          Sorted lowest completion first — the leftmost bar needs attention most. Click a bar to
          open its roster.
        </div>
      </div>

    </div>
  )
}
