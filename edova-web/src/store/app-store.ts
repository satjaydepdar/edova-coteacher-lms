import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Role } from "@/lib/types"
import { login as apiLogin, logout as apiLogout, type SessionUser } from "@/lib/auth"
import { setSessionToken, setSessionUser } from "@/lib/api-client"

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
  login: (email: string, password: string, expectedRole?: Role) => Promise<void>
  logout: () => void

  // "Continue as Guest" for this page load only -- deliberately NOT
  // persisted, so a fresh reload shows /login again (real sessions persist
  // via `session` above; guests re-choose each reload, same one-click cost
  // every time).
  guestMode: boolean
  continueAsGuest: () => void

  // Global academic context (persisted) — drives Syllabus Map, Course Progress, Settings.
  academicYear: string
  sectionId: string
  setAcademicYear: (year: string) => void
  setSectionId: (sectionId: string) => void

  // Chat widget
  chatOpen: boolean
  toggleChat: () => void
  setChatOpen: (open: boolean) => void

  // When the notification bell was last opened (ISO). Anything submitted
  // after this counts as unread. Persisted, so "unread" survives a reload
  // instead of every refresh re-announcing the same submissions.
  notificationsSeenAt: string | null
  markNotificationsSeen: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      role: "teacher",
      setRole: (role) => set({ role }),

      session: null,
      login: async (email, password, expectedRole) => {
        const { token, user } = await apiLogin(email, password)
        if (expectedRole && user.role !== expectedRole) {
          throw new Error("Invalid credentials")
        }
        set({ session: { token, user }, role: user.role })
      },
      logout: () => {
        const token = get().session?.token
        set({ session: null, role: "teacher" })
        if (token) apiLogout(token).catch(() => { /* best-effort; local session is already cleared */ })
      },

      guestMode: false,
      continueAsGuest: () => set({ guestMode: true }),

      academicYear: "2026–27",
      sectionId: "sec_8a",
      setAcademicYear: (academicYear) => set({ academicYear }),
      setSectionId: (sectionId) => set({ sectionId }),

      chatOpen: false,
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
      setChatOpen: (chatOpen) => set({ chatOpen }),

      notificationsSeenAt: null,
      markNotificationsSeen: () => set({ notificationsSeenAt: new Date().toISOString() }),
    }),
    {
      name: "edova-app",
      partialize: (s) => ({
        role: s.role,
        session: s.session,
        academicYear: s.academicYear,
        sectionId: s.sectionId,
        notificationsSeenAt: s.notificationsSeenAt,
      }),
      // Push the persisted session back into the gateways on reload so authed
      // calls carry the bearer without the data layer reading this store.
      onRehydrateStorage: () => (state) => {
        setSessionToken(state?.session?.token ?? null)
        setSessionUser(state?.session?.user ?? null)
      },
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
export const STUDENT_IDENTITY = {
  name: "Student Demo",
  initials: "SD",
  roleLabel: "Student",
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
    roleLabel: user.role === "admin" ? "Administrator" : user.role === "student" ? "Student" : "Teacher",
  }
}
