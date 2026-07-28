import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Role } from "@/lib/types"
import { login as apiLogin, logout as apiLogout, type SessionUser } from "@/lib/auth"

interface AppState {
  // Role toggle (Teacher / Admin) — drives sidebar admin group + identity.
  // Real login (below) sets this to match the logged-in account; Guest mode
  // leaves it as a free-standing preview toggle, same as always.
  role: Role
  setRole: (role: Role) => void

  // Real teacher/admin login (edova-backend /auth/*). null = not logged in
  // (Guest mode — today's demo experience, unchanged). Persisted so a real
  // login survives a reload.
  session: { token: string; user: SessionUser } | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void

  // Global academic context (persisted) — drives Syllabus Map, Course Progress, Settings.
  academicYear: string
  sectionId: string
  setAcademicYear: (year: string) => void
  setSectionId: (sectionId: string) => void

  // Chat widget
  chatOpen: boolean
  toggleChat: () => void
  setChatOpen: (open: boolean) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      role: "teacher",
      setRole: (role) => set({ role }),

      session: null,
      login: async (email, password) => {
        const { token, user } = await apiLogin(email, password)
        set({ session: { token, user }, role: user.role })
      },
      logout: () => {
        const token = get().session?.token
        set({ session: null, role: "teacher" })
        if (token) apiLogout(token).catch(() => { /* best-effort; local session is already cleared */ })
      },

      academicYear: "2026–27",
      sectionId: "sec_8a",
      setAcademicYear: (academicYear) => set({ academicYear }),
      setSectionId: (sectionId) => set({ sectionId }),

      chatOpen: false,
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
      setChatOpen: (chatOpen) => set({ chatOpen }),
    }),
    {
      name: "edova-app",
      partialize: (s) => ({
        role: s.role,
        session: s.session,
        academicYear: s.academicYear,
        sectionId: s.sectionId,
      }),
    }
  )
)

export const TEACHER_IDENTITY = {
  name: "Meenakshi Parameswaran",
  initials: "SM",
  roleLabel: "Mathematics Teacher",
}
export const ADMIN_IDENTITY = {
  name: "Principal A. Reyes",
  initials: "AR",
  roleLabel: "Administrator",
}

// Real-login identity display -- Sidebar/Topbar use this instead of the
// TEACHER_IDENTITY/ADMIN_IDENTITY placeholders once `session` is set.
export function identityFromUser(user: SessionUser) {
  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
  return {
    name: user.name,
    initials: initials || "?",
    roleLabel: user.role === "admin" ? "Administrator" : "Teacher",
  }
}
