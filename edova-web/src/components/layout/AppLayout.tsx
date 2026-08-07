import { Navigate, Outlet, useNavigate, Link, useLocation } from "react-router-dom"
import { LogOut } from "lucide-react"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { ChatWidget } from "@/components/chat/ChatWidget"
import { useAppStore, identityFromUser } from "@/store/app-store"

// A student has no business seeing the teacher dashboard chrome (Assignment
// Tracker, Attendance, Administration, ...) -- just the page content behind
// a minimal header. Route-level access control (stopping a student who
// manually types a teacher URL) is a later hardening pass, not this one.
function StudentShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = useAppStore((s) => s.session)
  const logout = useAppStore((s) => s.logout)
  if (!session) return null
  const identity = identityFromUser(session.user)
  const studentNav = [
    { label: "Learning Hub", path: "/learning" },
    { label: "My Assignments", path: "/my-assignments" },
    { label: "My Wiki", path: `/wiki/student-${session.user.id}` },
  ]

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="flex h-14 items-center justify-between border-b border-card-border bg-cream px-6">
        <div className="flex items-center gap-2">
          <img 
            src="/logo-cropped.png" 
            alt="Edova Logo" 
            className="h-10 w-auto object-contain"
          />
        </div>
        <nav className="flex items-center gap-4">
          {studentNav.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`text-[13px] font-semibold transition-colors hover:text-ink ${
                location.pathname === item.path ? "text-ink" : "text-text-secondary"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-semibold text-text-secondary">{identity.name}</span>
          <button
            onClick={() => { logout(); navigate("/login") }}
            aria-label="Log out"
            className="grid size-8 cursor-pointer place-items-center rounded-[8px] text-text-secondary transition-colors hover:bg-muted hover:text-ink"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>
      <main className="px-6 py-6">
        <Outlet />
      </main>
      <ChatWidget />
    </div>
  )
}

export function AppLayout() {
  // A real (persisted) session or a for-this-page-load Guest choice both
  // grant entry; neither exists yet on a fresh visit/reload -> /login.
  const session = useAppStore((s) => s.session)
  const guestMode = useAppStore((s) => s.guestMode)
  if (!session && !guestMode) {
    return <Navigate to="/welcome" replace />
  }

  if (session?.user.role === "student") {
    return <StudentShell />
  }

  return (
    <div className="flex min-h-screen w-full bg-white text-ink">
      <Sidebar />
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-visible">
        <Topbar />
        <main className="flex-1 overflow-y-auto px-8 pb-16 pt-7">
          <Outlet />
        </main>
      </div>
      <ChatWidget />
    </div>
  )
}
