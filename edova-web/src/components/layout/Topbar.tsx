import { useLocation, useNavigate } from "react-router-dom"
import { Bell, Search } from "lucide-react"
import { useAppStore, TEACHER_IDENTITY, ADMIN_IDENTITY, identityFromUser } from "@/store/app-store"
import type { Role } from "@/lib/types"

export function Topbar() {
  const role = useAppStore((s) => s.role)
  const setRole = useAppStore((s) => s.setRole)
  const session = useAppStore((s) => s.session)
  const identity = session
    ? identityFromUser(session.user)
    : role === "admin" ? ADMIN_IDENTITY : TEACHER_IDENTITY
  const navigate = useNavigate()
  const location = useLocation()

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
          {toggle("teacher", "Teacher")}
          {toggle("admin", "Admin")}
        </div>
        <div className="h-6 w-px bg-[#E5E1D2]" />
        <button className="relative flex size-[38px] items-center justify-center rounded-[8px] border border-card-border bg-[#F9FAFB]">
          <Bell className="size-[18px] text-ink" />
          <span className="absolute right-[7px] top-[6px] size-[7px] rounded-full bg-danger" />
        </button>
        <div className="flex size-[38px] items-center justify-center rounded-full bg-[#16332B] text-[15px] font-bold text-white">
          {identity.initials}
        </div>
      </div>
    </header>
  )
}
