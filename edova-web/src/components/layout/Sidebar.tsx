import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import { NAV_GROUPS } from "@/lib/nav"
import { useAppStore, TEACHER_IDENTITY, ADMIN_IDENTITY, STUDENT_IDENTITY, identityFromUser } from "@/store/app-store"

export function Sidebar() {
  const navigate = useNavigate()
  const role = useAppStore((s) => s.role)
  const session = useAppStore((s) => s.session)
  const logout = useAppStore((s) => s.logout)
  const identity = session
    ? identityFromUser(session.user)
    : role === "admin" ? ADMIN_IDENTITY : role === "student" ? STUDENT_IDENTITY : TEACHER_IDENTITY
  const groups = NAV_GROUPS.filter(
    (g) => (!g.adminOnly || role === "admin") && (!g.teacherOnly || role === "teacher") && (!g.studentOnly || role === "student")
  )

  // Main modules are collapsed by default; clicking a module header reveals
  // its submodule list without navigating.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ Teaching: true, Home: true })
  const toggleGroup = (label: string) =>
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }))

  return (
    <aside className="sticky top-0 flex h-screen w-[260px] min-w-[260px] flex-col bg-sidebar border-r border-white/8">
      {/* Logo */}
      <div className="flex h-16 items-center justify-center border-b border-white/8">
        <img 
          src="/logo-cropped.png" 
          alt="Edova Logo" 
          className="h-14 w-auto object-contain brightness-0 invert"
        />
      </div>

      {/* Nav */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
        {groups.map((group) => {
          const isOpen = !!expanded[group.label]
          return (
            <div key={group.label} className="mb-2">
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center gap-1.5 rounded-[6px] px-2 py-2 text-left text-[13px] font-bold uppercase tracking-[0.06em] text-[#A8C5A0] transition-colors hover:text-[#C9DDC4]"
              >
                <span className="w-3 text-[10px]">{isOpen ? "▾" : "▸"}</span>
                <span className="flex-1">{group.label}</span>
              </button>
              {isOpen && (
                <div className="mb-3">
                  {group.items.map((item) => {
                    const toPath = item.key === "wiki" && role === "student" && session?.user?.id 
                      ? `/wiki/student-${session.user.id}` 
                      : item.path;
                    return (
                    <NavLink
                      key={item.key}
                      to={toPath}
                      className="mb-0.5 flex cursor-pointer items-center gap-2.5 rounded-[8px] px-3 py-2.5 pl-8 text-[15.5px] transition-colors"
                      style={({ isActive }) => ({
                        fontWeight: isActive ? 700 : 500,
                        background: isActive ? "rgba(127,191,122,.16)" : "transparent",
                        boxShadow: isActive
                          ? "inset 0 0 0 1px rgba(127,191,122,.35)"
                          : "none",
                        color: isActive ? "#7FBF7A" : "#E8E4DC",
                      })}
                    >
                      <span className="flex-1">{item.label}</span>
                    </NavLink>
                    );
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* User footer */}
      <div className="flex items-center gap-2.5 border-t border-white/8 px-5 py-3.5">
        <div className="flex size-[34px] items-center justify-center rounded-full bg-gold text-[15px] font-bold text-ink">
          {identity.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold text-sidebar-text">
            {identity.name}
          </div>
          <div className="text-[13px] text-white/45">{identity.roleLabel}</div>
        </div>
        {session && (
          <button
            onClick={() => { logout(); navigate("/login") }}
            aria-label="Log out"
            className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-[8px] text-white/45 transition-colors hover:bg-white/8 hover:text-sidebar-text"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  )
}
