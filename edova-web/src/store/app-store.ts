import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Role } from "@/lib/types"

interface AppState {
  // Role toggle (Teacher / Admin) — drives sidebar admin group + identity.
  role: Role
  setRole: (role: Role) => void

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
    (set) => ({
      role: "teacher",
      setRole: (role) => set({ role }),

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
