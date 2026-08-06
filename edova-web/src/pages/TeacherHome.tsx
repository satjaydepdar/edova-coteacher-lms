import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertCircle, ArrowRightCircle, ArrowUpDown, CalendarClock, CalendarDays,
  Clock, FileCheck2, FilePlus, GraduationCap, MapPin, NotebookPen,
  RefreshCw, Search, Sparkles, TrendingUp, UserCheck, Users,
} from "lucide-react"
import { PageHeader } from "@/components/common/PageHeader"
import { useAppStore } from "@/store/app-store"
import { getTeacherDashboard, type TeacherDashboard } from "@/lib/dashboard-api"
import {
  DEMO_ATTENDANCE_TREND, DEMO_AVG_ATTENDANCE, DEMO_MASTERY_ROWS,
  DEMO_MASTERY_TOPICS, DEMO_TODAY_SCHEDULE, MASTERY_STYLE,
} from "@/data/dashboard-demo"

// Administration → Home. The teacher landing page: everything below is
// served by GET /api/teachers/me/dashboard (edova-backend), scoped to the
// classrooms this teacher holds an active co-teaching assignment on.
//
// Three panels have no data source in the system yet (attendance, today's
// schedule, topic mastery) — they render an explicit "Not tracked yet"
// state rather than a plausible-looking number. NotTracked below is the one
// place that look is defined, so when a real endpoint lands you delete a
// usage rather than hunt down invented values.

const card = "rounded-[12px] border border-card-border bg-white shadow-card"
const cardHead = "flex items-center justify-between border-b border-card-border px-5 py-4"
const headTitle = "flex items-center gap-2 font-display text-[17px] font-semibold text-ink"
const th =
  "border-b border-card-border bg-cream px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-text-secondary"

/** Left edge colour carries the severity, so the panel is scannable without
 * reading a word of it. */
const SEVERITY_ACCENT: Record<string, string> = {
  high: "border-l-danger",
  medium: "border-l-warning",
  low: "border-l-card-border",
}

/** Shown wherever the schema has a column but nothing in the stack writes or
 * reads it yet. Deliberately dull — it must never read as a real value. */
function NotTracked({ hint, className = "" }: { hint: string; className?: string }) {
  return (
    <span
      title={hint}
      className={`inline-flex items-center gap-1.5 text-text-muted ${className}`}
    >
      <span className="text-[15px] font-medium">—</span>
      <span className="rounded-[4px] bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
        Not tracked
      </span>
    </span>
  )
}

/** Marks a panel whose numbers come from data/dashboard-demo.ts rather than
 * the server. Small on purpose — visible to anyone reading the screen
 * closely, invisible from across a demo room. Delete the tag along with the
 * placeholder data when the real endpoint lands. */
function SampleTag({ hint }: { hint: string }) {
  return (
    <span
      title={hint}
      className="rounded-[4px] border border-card-border bg-cream px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted"
    >
      Sample
    </span>
  )
}

function MetricCard({
  label, icon, children,
}: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
            {label}
          </p>
          <div className="mt-2">{children}</div>
        </div>
        <div className="grid size-11 shrink-0 place-items-center rounded-full border border-card-border bg-white shadow-sm">
          {icon}
        </div>
      </div>
    </div>
  )
}

const metricValue = "font-display text-[28px] font-semibold leading-none text-ink"

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-6 text-center text-[13px] text-text-secondary">{children}</p>
}

export default function TeacherHome() {
  const navigate = useNavigate()
  const session = useAppStore((s) => s.session)
  const [data, setData] = useState<TeacherDashboard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)

  // "" = every class this teacher holds. Selecting one re-fetches rather than
  // filtering client-side, because the server has to recompute the averages —
  // a class average can't be filtered out of an already-averaged number.
  const [scope, setScope] = useState("")
  const [classSearch, setClassSearch] = useState("")
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getTeacherDashboard(scope || undefined)
      .then((d) => { if (!cancelled) { setData(d); setError(null) } })
      .catch((e: Error) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [reloadKey, scope])

  // The server already scoped these when `scope` is set, so there is nothing
  // left to filter here.
  const statusRows = data?.assignment_status ?? []

  const classRows = useMemo(() => {
    if (!data) return []
    const term = classSearch.trim().toLowerCase()
    const rows = term
      ? data.classes.filter((c) =>
          `${c.name} ${c.subject} ${c.section ?? ""}`.toLowerCase().includes(term))
      : data.classes
    // Classes with no syllabus section sort last either way — a missing
    // number isn't a low one.
    return [...rows].sort((a, b) => {
      if (a.taught_pct == null) return 1
      if (b.taught_pct == null) return -1
      return sortAsc ? a.taught_pct - b.taught_pct : b.taught_pct - a.taught_pct
    })
  }, [data, classSearch, sortAsc])

  // Only co-teachers who actually left a note — an empty handoff is noise.
  const handoffs = useMemo(
    () =>
      (data?.classes ?? []).flatMap((c) =>
        c.co_teachers
          .filter((t) => t.handoff_notes)
          .map((teacher) => ({
            teacher,
            className: `Class ${c.class_level} — ${c.section}`,
          })),
      ),
    [data],
  )

  const firstName = (data?.teacher_name ?? session?.user.name ?? "").split(" ")[0]

  if (loading && !data) {
    return (
      <div>
        <PageHeader title="Home" subtitle="Loading your classes…" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-[12px] bg-cream" />
          ))}
        </div>
      </div>
    )
  }

  // Guest mode is not a failure -- it's a visitor who hasn't signed in. Every
  // other page fakes its way through on seed data, but this one is scoped to
  // "the classes YOU teach", which a guest doesn't have. Say that plainly and
  // hand them the way forward, instead of a red error they can't act on.
  if (error === "not signed in") {
    return (
      <div>
        <PageHeader title="Home" subtitle="Your teaching day at a glance." />
        <div className={`${card} p-10 text-center`}>
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-cream">
            <Users className="text-gold" size={22} />
          </div>
          <p className="font-display text-[17px] font-semibold text-ink">
            Sign in to see your dashboard
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] text-text-secondary">
            You&apos;re browsing as a Guest. This page shows the classes, grading queue
            and students assigned to you personally, so it needs a real teacher account.
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-5 cursor-pointer rounded-[8px] bg-ink px-5 py-2.5 text-[13px] font-semibold text-sidebar-text transition-opacity hover:opacity-90"
          >
            Sign in
          </button>
          <p className="mt-4 text-[12px] text-text-muted">
            Exploring instead?{" "}
            <button
              onClick={() => navigate("/calendar")}
              className="cursor-pointer font-semibold text-gold hover:text-ink"
            >
              Go to My Calendar
            </button>
          </p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <PageHeader title="Home" subtitle="Your teaching day at a glance." />
        <div className={`${card} p-8 text-center`}>
          <AlertCircle className="mx-auto mb-3 text-danger" size={28} />
          <p className="font-display text-[16px] font-semibold text-ink">
            Could not load your dashboard
          </p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-text-secondary">
            {error}. Is edova-backend running on port 8003?
          </p>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-4 cursor-pointer rounded-[8px] border border-card-border bg-white px-4 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-cream"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  const { metrics, upcoming, action_items } = data

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-7">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Welcome back"}
        subtitle="Your classes, grading queue, and what needs attention today."
        actions={
          <>
            {/* Scopes the entire page. With several classes, an average across
                all of them hides the one that needs attention. */}
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="cursor-pointer rounded-[8px] border border-card-border bg-white px-3 py-2 text-[13px] font-semibold text-ink focus:border-gold focus:outline-none"
            >
              <option value="">All my classes</option>
              {data.class_options.map((o) => (
                <option key={o.classroom_id} value={o.classroom_id}>{o.label}</option>
              ))}
            </select>
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              disabled={loading}
              className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-card-border bg-white px-3 py-2 text-[13px] font-semibold text-ink transition-colors hover:bg-cream disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </>
        }
      />

      {/* ---- Quick actions ----
          The page is otherwise read-only; without these every next step means
          hunting through the sidebar. */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Take attendance", icon: <UserCheck size={15} />, to: "/attendance" },
          { label: "New assignment", icon: <FilePlus size={15} />, to: "/assignment-tracker/new" },
          { label: "Plan a lesson", icon: <NotebookPen size={15} />, to: "/lesson-planner" },
        ].map((a) => (
          <button
            key={a.to}
            onClick={() => navigate(a.to)}
            className="flex cursor-pointer items-center gap-2 rounded-[8px] border border-card-border bg-cream px-4 py-2.5 text-[13px] font-semibold text-ink transition-all hover:border-gold hover:bg-white hover:shadow-sm"
          >
            <span className="text-gold">{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* ---- Quick metrics ----
          Five, deliberately. Each one has to answer a question a teacher
          actually acts on: what am I teaching, what do I owe, how are they
          doing, are they handing work in, are they turning up. "Total
          students" was cut -- it never changes, nobody acts on it, and the
          per-class counts are in the classes table below anyway. */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Today's Schedule" icon={<CalendarClock size={20} className="text-gold" />}>
          <p className={metricValue}>
            {metrics.classes_today ?? DEMO_TODAY_SCHEDULE.length}{" "}
            <span className="text-[13px] font-normal text-text-secondary">classes</span>
          </p>
          {metrics.classes_today == null && (
            <>
              <p className="mt-1.5 text-[11px] text-text-secondary">
                next at {DEMO_TODAY_SCHEDULE[0].time}
              </p>
              <div className="mt-1.5">
                <SampleTag hint="Placeholder — nothing reads the schedules table yet (db/migrations 0008)." />
              </div>
            </>
          )}
        </MetricCard>

        <MetricCard label="Pending Grading" icon={<FileCheck2 size={20} className="text-warning" />}>
          <p className={metricValue}>{metrics.pending_grading}</p>
          <p className="mt-1.5 text-[11px] text-text-secondary">submitted, not yet graded</p>
        </MetricCard>

        <MetricCard label="Class Average" icon={<GraduationCap size={20} className="text-gold" />}>
          {metrics.class_average == null ? (
            <>
              <p className={`${metricValue} text-text-muted`}>—</p>
              <p className="mt-1.5 text-[11px] text-text-secondary">nothing graded yet</p>
            </>
          ) : (
            <>
              <p className={metricValue}>{metrics.class_average}%</p>
              <p className="mt-1.5 text-[11px] text-text-secondary">across all scored work</p>
            </>
          )}
        </MetricCard>

        <MetricCard label="Submission Rate" icon={<FileCheck2 size={20} className="text-success" />}>
          {metrics.submission_rate == null ? (
            <>
              <p className={`${metricValue} text-text-muted`}>—</p>
              <p className="mt-1.5 text-[11px] text-text-secondary">nothing due yet</p>
            </>
          ) : (
            <>
              <p className={metricValue}>{metrics.submission_rate}%</p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white">
                <div
                  className={`h-full rounded-full ${metrics.submission_rate >= 80 ? "bg-success" : metrics.submission_rate >= 50 ? "bg-warning" : "bg-danger/70"}`}
                  style={{ width: `${metrics.submission_rate}%` }}
                />
              </div>
            </>
          )}
        </MetricCard>

        {/* Falls back to placeholder data until an attendance endpoint exists;
            the moment the API returns a real number, that number wins and the
            Sample tag disappears on its own. */}
        <MetricCard label="Avg Attendance" icon={<UserCheck size={20} className="text-success" />}>
          <div className="flex items-baseline gap-2">
            <p className={metricValue}>{metrics.avg_attendance ?? DEMO_AVG_ATTENDANCE}%</p>
            <span className="flex items-center gap-0.5 text-[11px] font-medium text-success">
              <TrendingUp size={11} /> {DEMO_ATTENDANCE_TREND}%
            </span>
          </div>
          {metrics.avg_attendance == null && (
            <div className="mt-1.5">
              <SampleTag hint="Placeholder — nothing writes or reads the attendance table yet (db/migrations 0008)." />
            </div>
          )}
        </MetricCard>
      </div>

      <div className="grid grid-cols-1 gap-7 lg:grid-cols-3">
        {/* ================= Left column ================= */}
        <div className="space-y-7 lg:col-span-2">
          {/* ---- Assignment submission status ---- */}
          <section className={card}>
            <div className={cardHead}>
              {/* No per-panel class filter: the switcher in the page header
                  scopes the whole page, and two competing filters would let
                  this panel disagree with the metrics above it. */}
              <h2 className={headTitle}>Recent Assignments Status</h2>
            </div>

            {statusRows.length === 0 ? (
              <EmptyNote>No assignments published for this selection yet.</EmptyNote>
            ) : (
              <div className="space-y-3.5 p-5">
                {statusRows.map((a) => {
                  const total = a.on_time + a.late + a.missing
                  const pct = (n: number) => (total ? (n / total) * 100 : 0)
                  return (
                    <button
                      key={a.assignment_id}
                      onClick={() => navigate(`/assignment-tracker/${a.assignment_id}`)}
                      className="group block w-full cursor-pointer text-left"
                    >
                      <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <span className="truncate text-[13px] font-medium text-ink group-hover:text-gold">
                          {a.title}
                        </span>
                        <span className="shrink-0 text-[11px] text-text-secondary">
                          {a.on_time + a.late}/{total} submitted
                        </span>
                      </div>
                      <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
                        <div className="bg-success" style={{ width: `${pct(a.on_time)}%` }} />
                        <div className="bg-warning" style={{ width: `${pct(a.late)}%` }} />
                        <div className="bg-danger/70" style={{ width: `${pct(a.missing)}%` }} />
                      </div>
                    </button>
                  )
                })}
                <div className="flex items-center justify-end gap-4 border-t border-card-border pt-3 text-[11px] text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <i className="size-2.5 rounded-sm bg-success" /> On time
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="size-2.5 rounded-sm bg-warning" /> Late
                  </span>
                  <span className="flex items-center gap-1.5">
                    <i className="size-2.5 rounded-sm bg-danger/70" /> Missing
                  </span>
                </div>
              </div>
            )}
          </section>

          {/* ---- My classes ---- */}
          <section className={card}>
            <div className={cardHead}>
              <h2 className={headTitle}>My Classes Overview</h2>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-text-muted" />
                <input
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                  placeholder="Search classes…"
                  className="w-48 rounded-[6px] border border-card-border bg-cream py-2 pl-9 pr-3 text-[12px] text-ink placeholder:text-text-muted focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            {classRows.length === 0 ? (
              <EmptyNote>
                {data.classes.length === 0
                  ? "You have no classes assigned yet."
                  : "No classes match that search."}
              </EmptyNote>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className={th}>Class &amp; Section</th>
                      <th className={th}>Subject</th>
                      <th className={th}>Students</th>
                      <th className={`${th} cursor-pointer hover:text-ink`}>
                        <button
                          onClick={() => setSortAsc((v) => !v)}
                          className="flex cursor-pointer items-center gap-1 uppercase"
                        >
                          Taught% <ArrowUpDown size={12} />
                        </button>
                      </th>
                      <th className={th}>Planned%</th>
                      <th className={th} />
                    </tr>
                  </thead>
                  <tbody>
                    {classRows.map((c) => (
                      <tr
                        key={c.classroom_id}
                        className="cursor-pointer transition-colors hover:bg-cream/60"
                        onClick={() => navigate("/curriculum-map")}
                      >
                        <td className="border-b border-card-border px-5 py-4">
                          <div className="text-[13px] font-medium text-ink">
                            Class {c.class_level} — {c.section}
                          </div>
                          {/* The co-teaching relationship this product is
                              named after — stored since day one, shown here
                              for the first time. */}
                          {c.co_teachers.length > 0 && (
                            <div className="mt-1.5 flex items-center gap-1.5">
                              {c.co_teachers.map((t) => (
                                <span
                                  key={t.teacher_id}
                                  title={
                                    t.handoff_notes
                                      ? `${t.name} (${t.role_type.replace("_", " ")}) — “${t.handoff_notes}”`
                                      : `${t.name} (${t.role_type.replace("_", " ")})`
                                  }
                                  className="grid size-5 place-items-center rounded-full bg-okf-bg text-[9px] font-bold text-okf-text ring-1 ring-okf-border"
                                >
                                  {t.initials}
                                </span>
                              ))}
                              <span className="text-[10px] text-text-muted">
                                co-teaching
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="border-b border-card-border px-5 py-4">
                          <span className="rounded-[6px] border border-okf-border bg-okf-bg px-2.5 py-1 text-[11px] font-medium text-okf-text">
                            {c.subject}
                          </span>
                        </td>
                        <td className="border-b border-card-border px-5 py-4 text-[13px] text-text-secondary">
                          {c.student_count}
                        </td>
                        <td className="border-b border-card-border px-5 py-4">
                          {c.taught_pct == null ? (
                            <NotTracked hint="This classroom has no matching section in the master syllabus tree, so no taught % can be computed." />
                          ) : (
                            <div className="flex items-center gap-3">
                              <span className="w-9 text-[13px] font-medium text-ink">
                                {c.taught_pct}%
                              </span>
                              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                                <div
                                  className={`h-full ${c.taught_pct >= 60 ? "bg-success" : c.taught_pct >= 30 ? "bg-warning" : "bg-danger/70"}`}
                                  style={{ width: `${c.taught_pct}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="border-b border-card-border px-5 py-4">
                          {c.planned_pct == null ? (
                            <NotTracked hint="No expected-progress % is derived from section_unit_pacing yet." />
                          ) : (
                            <span className="text-[13px] font-medium text-ink">{c.planned_pct}%</span>
                          )}
                        </td>
                        <td className="border-b border-card-border px-5 py-4">
                          <ArrowRightCircle size={18} className="text-text-muted" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* ---- Topic mastery ---- */}
          {/* Placeholder grid: grades are stored per assignment, not per
              syllabus topic, so there is no real mastery figure to read yet. */}
          <section className={card}>
            <div className={cardHead}>
              <h2 className={headTitle}>Topic Mastery Heatmap</h2>
              <SampleTag hint="Placeholder — grades are stored per assignment, not per syllabus topic, so per-topic mastery can't be computed yet." />
            </div>
            <div className="overflow-x-auto p-5">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr>
                    <th className="border-b border-card-border pb-2 text-left text-[11px] font-semibold text-text-secondary">
                      Student
                    </th>
                    {DEMO_MASTERY_TOPICS.map((t) => (
                      <th
                        key={t}
                        className="border-b border-card-border px-2 pb-2 text-[10px] font-semibold text-text-secondary"
                      >
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEMO_MASTERY_ROWS.map((row) => (
                    <tr key={row.student} className="transition-colors hover:bg-cream/60">
                      <td className="whitespace-nowrap py-2 pr-4 text-[12px] font-medium text-ink">
                        {row.student}
                      </td>
                      {row.levels.map((lvl, i) => (
                        <td key={`${row.student}-${i}`} className="px-2 py-2">
                          <div
                            title={`${DEMO_MASTERY_TOPICS[i]} — ${MASTERY_STYLE[lvl].label}`}
                            className={`mx-auto size-5 rounded ${MASTERY_STYLE[lvl].bg}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 flex items-center justify-end gap-4 border-t border-card-border pt-3 text-[10px] text-text-secondary">
                {(["mastered", "developing", "struggling"] as const).map((lvl) => (
                  <span key={lvl} className="flex items-center gap-1.5">
                    <i className={`size-2.5 rounded-sm ${MASTERY_STYLE[lvl].bg}`} />
                    {MASTERY_STYLE[lvl].label}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>

        {/* ================= Right column ================= */}
        <div className="space-y-6">
          {/* ---- Upcoming ---- */}
          <section className={card}>
            <div className={cardHead}>
              <h2 className={headTitle}>
                <CalendarDays size={18} className="text-gold" /> Upcoming
              </h2>
              <button
                onClick={() => navigate("/calendar")}
                className="cursor-pointer text-[12px] font-semibold text-gold transition-colors hover:text-ink"
              >
                My Calendar →
              </button>
            </div>
            {upcoming.length === 0 ? (
              <EmptyNote>Nothing scheduled coming up.</EmptyNote>
            ) : (
              <div className="space-y-4 p-5">
                {upcoming.map((e) => {
                  const d = new Date(e.start_at)
                  return (
                    <div key={e.id} className="flex items-start gap-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-[6px] border border-card-border bg-cream shadow-sm">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-danger">
                          {d.toLocaleString("en-IN", { month: "short" })}
                        </span>
                        <span className="-mt-0.5 text-[13px] font-semibold text-ink">
                          {String(d.getDate()).padStart(2, "0")}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-[13px] font-semibold text-ink">{e.title}</h4>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-secondary">
                          <Clock size={11} />
                          {e.is_all_day
                            ? "All day"
                            : d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 text-[11px] capitalize text-text-secondary">
                          <MapPin size={11} /> {e.event_type}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* ---- Co-teacher handoff ----
              What your co-teacher left you since you last taught. In a
              co-teaching product this is the highest-value thing on the page
              and it was sitting unread in a database column. */}
          {handoffs.length > 0 && (
            <section className={card}>
              <div className={cardHead}>
                <h2 className={headTitle}>
                  <Users size={18} className="text-okf-text" /> Co-teacher Handoff
                </h2>
              </div>
              <div className="space-y-4 p-5">
                {handoffs.map(({ teacher, className }) => (
                  <div key={teacher.teacher_id} className="flex items-start gap-3">
                    <div className="grid size-8 shrink-0 place-items-center rounded-full bg-okf-bg text-[11px] font-bold text-okf-text ring-1 ring-okf-border">
                      {teacher.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-ink">
                        {teacher.name}
                        <span className="ml-1.5 font-normal capitalize text-text-muted">
                          {teacher.role_type.replace("_", " ")} · {className}
                        </span>
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                        {teacher.handoff_notes}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---- Action items ---- */}
          <section className={card}>
            <div className={cardHead}>
              <h2 className={headTitle}>
                <Sparkles size={18} className="text-gold" /> AI Recommendations
              </h2>
            </div>
            {action_items.length === 0 ? (
              <EmptyNote>Nothing needs your attention. Nicely done.</EmptyNote>
            ) : (
              <div className="space-y-3 p-5">
                {action_items.map((a, i) => (
                  <div
                    key={`${a.kind}-${a.assignment_id ?? "class"}-${i}`}
                    className={`rounded-[10px] border-l-[3px] border border-card-border bg-cream p-3.5 ${SEVERITY_ACCENT[a.severity]}`}
                  >
                    <h4 className="text-[13px] font-semibold text-ink">{a.title}</h4>
                    {/* Finding then suggestion, in that order — a teacher
                        needs to trust what was observed before acting on it. */}
                    <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">
                      {a.finding}
                    </p>
                    <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-ink">
                      {a.suggestion}
                    </p>
                    <button
                      onClick={() => navigate(a.cta_url)}
                      className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-[6px] border border-card-border bg-white px-3 py-1.5 text-[11px] font-semibold text-ink transition-colors hover:border-gold hover:bg-gold hover:text-white"
                    >
                      {a.cta_label} <ArrowRightCircle size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
