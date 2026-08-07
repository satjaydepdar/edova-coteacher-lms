import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Bell, Search } from "lucide-react"
import { useAppStore, TEACHER_IDENTITY, ADMIN_IDENTITY, identityFromUser } from "@/store/app-store"
import { getTeacherActivity, type Activity } from "@/lib/dashboard-api"
import type { Role } from "@/lib/types"

/** "2h ago" — a submission feed is only useful if you can see at a glance
 * how stale it is. */
function timeAgo(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

export function Topbar() {
  const role = useAppStore((s) => s.role)
  const setRole = useAppStore((s) => s.setRole)
  const session = useAppStore((s) => s.session)
  const seenAt = useAppStore((s) => s.notificationsSeenAt)
  const markSeen = useAppStore((s) => s.markNotificationsSeen)
  const identity = session
    ? identityFromUser(session.user)
    : role === "admin" ? ADMIN_IDENTITY : TEACHER_IDENTITY
  const navigate = useNavigate()
  const location = useLocation()

  const [activity, setActivity] = useState<Activity[]>([])
  const [open, setOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  // Guest mode has no token, so there is nothing to fetch — the bell simply
  // stays empty rather than erroring on every page load.
  useEffect(() => {
    if (!session) { setActivity([]); return }
    getTeacherActivity().then(setActivity).catch(() => { /* bell stays empty */ })
  }, [session, location.pathname])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!bellRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [open])

  const unread = activity.filter(
    (a) => !seenAt || new Date(a.submitted_at) > new Date(seenAt),
  ).length

  const handleRole = (next: Role) => {
    setRole(next)
    // Leaving admin while on the admin-only Settings screen bounces to My Calendar.
    if (next === "teacher" && location.pathname === "/settings") {
      navigate("/calendar")
    }
  }

  const toggle = (r: Role, label: string) => {
    const active = role === r
    return (
      <button
        onClick={() => handleRole(r)}
        className="cursor-pointer rounded-full px-4 py-1.5 text-[14.5px] font-semibold transition-colors"
        style={{
          background: active ? "#16332B" : "transparent",
          color: active ? "#fff" : "#6B7280",
        }}
      >
        {label}
      </button>
    )
  }

  return (
    <header className="flex h-16 min-h-16 items-center justify-between border-b border-[#E5E1D2] bg-cream px-6">
      <div className="flex max-w-[480px] flex-1 items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <input
            placeholder="Search students, classes, assignments…"
            className="h-[38px] w-full rounded-[8px] border border-[#E5E1D2] bg-[#FAF8F2] pl-9 pr-3 text-[15px] outline-none placeholder:text-text-muted focus:border-gold"
          />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center rounded-full bg-[#F3EFE3] p-[3px]">
          {!session && toggle("teacher", "Teacher")}
          {!session && toggle("admin", "Admin")}
          {session && (
            <div className="rounded-full bg-[#16332B] px-4 py-1.5 text-[14.5px] font-semibold text-white">
              {role === "admin" ? "Admin" : role === "student" ? "Student" : "Teacher"}
            </div>
          )}
        </div>
        <div className="h-6 w-px bg-[#E5E1D2]" />
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => { setOpen((v) => !v); if (!open) markSeen() }}
            aria-label={unread ? `${unread} new submissions` : "Notifications"}
            className="relative flex size-[38px] cursor-pointer items-center justify-center rounded-[8px] border border-card-border bg-[#F9FAFB] transition-colors hover:bg-white"
          >
            <Bell className="size-[18px] text-ink" />
            {/* Badge only when something is actually new — a permanent red
                dot teaches people to ignore it. */}
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid min-w-[17px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-[46px] z-50 w-[320px] overflow-hidden rounded-[12px] border border-card-border bg-white shadow-lg">
              <div className="border-b border-card-border px-4 py-3 font-display text-[14px] font-semibold text-ink">
                Recent submissions
              </div>
              {activity.length === 0 ? (
                <p className="px-4 py-6 text-center text-[13px] text-text-secondary">
                  No submissions yet.
                </p>
              ) : (
                <div className="max-h-[320px] overflow-y-auto">
                  {activity.map((a, i) => (
                    <button
                      key={`${a.assignment_id}-${a.student_name}-${i}`}
                      onClick={() => {
                        setOpen(false)
                        navigate(`/assignment-tracker/${a.assignment_id}/evaluate`)
                      }}
                      className="flex w-full cursor-pointer items-start gap-3 border-b border-card-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-cream"
                    >
                      <div className="grid size-7 shrink-0 place-items-center rounded-full bg-cream text-[10px] font-bold text-ink">
                        {a.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] text-ink">
                          <span className="font-semibold">{a.student_name}</span> submitted{" "}
                          <span className="font-medium">{a.assignment_title}</span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-muted">
                          {timeAgo(a.submitted_at)}
                          {a.is_late && <span className="ml-1.5 text-warning">· late</span>}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex size-[38px] items-center justify-center rounded-full bg-[#16332B] text-[15px] font-bold text-white">
          {identity.initials}
        </div>
      </div>
    </header>
  )
}
