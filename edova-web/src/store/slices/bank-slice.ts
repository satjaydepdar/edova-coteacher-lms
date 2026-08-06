// Bank slice — master timetable, assessment bank, and the OKF Library
// per-class assignment tracker (Learning Resources page).
import type { StateCreator } from "zustand"
import { MASTER_TIMETABLE, ASSESSMENT_BANK_SEED } from "@/data/seed"
import type { MasterTimetableRow, AssessmentBankItem } from "@/lib/types"
import {
  apiToBankItem,
  createSavedAssessment,
  fetchSavedAssessments,
  updateSavedAssessment,
} from "@/lib/assessments-api"

export interface BankSlice {
  // Timetable + assessment bank (mutators added as those views are wired).
  masterTimetable: MasterTimetableRow[]
  setMasterTimetable: (rows: MasterTimetableRow[]) => void
  assessmentBank: AssessmentBankItem[]
  // Loads the persisted bank from the backend (saved_assessments, migration
  // 0028). On failure the in-memory bank is kept untouched.
  hydrateAssessments: () => Promise<void>
  // Optimistic local add + async persist; resolves to the final id (the real
  // backend id when the POST succeeds, otherwise the local one — same
  // graceful-fallback posture as publishAssignment).
  addAssessmentBankItem: (item: AssessmentBankItem) => Promise<string>
  updateAssessmentBankItem: (id: string, item: AssessmentBankItem) => Promise<void>

  // OKF Library assignment — Learning Resources page (Developer Handoff Notes).
  // Assignment is tracked per class label (e.g. "Class 10") since the same
  // resource can be Ready for one class and already Assigned for another.
  okfAssignedByClass: Record<string, string[]>
  assignOkfResources: (classId: string, resourceIds: string[]) => void
  undoOkfAssign: (classId: string, resourceIds: string[]) => void
}

export const createBankSlice: StateCreator<BankSlice, [], [], BankSlice> = (set) => ({
  masterTimetable: MASTER_TIMETABLE,
  setMasterTimetable: (rows) => set({ masterTimetable: rows }),
  assessmentBank: ASSESSMENT_BANK_SEED,
  hydrateAssessments: async () => {
    try {
      const rows = await fetchSavedAssessments()
      set({ assessmentBank: rows.map(apiToBankItem) })
    } catch { /* backend down — keep whatever is in memory */ }
  },
  addAssessmentBankItem: async (item) => {
    set((s) => ({ assessmentBank: [item, ...s.assessmentBank] }))
    try {
      const saved = { ...apiToBankItem(await createSavedAssessment(item)), createdOn: item.createdOn }
      set((s) => ({ assessmentBank: s.assessmentBank.map((b) => (b.id === item.id ? saved : b)) }))
      return saved.id
    } catch {
      return item.id
    }
  },
  updateAssessmentBankItem: async (id, item) => {
    set((s) => ({ assessmentBank: s.assessmentBank.map((b) => (b.id === id ? item : b)) }))
    try {
      await updateSavedAssessment(id, item)
    } catch { /* backend down — the local update still stands for this session */ }
  },

  okfAssignedByClass: {},
  assignOkfResources: (classId, resourceIds) =>
    set((s) => {
      const existing = s.okfAssignedByClass[classId] ?? []
      const merged = Array.from(new Set([...existing, ...resourceIds]))
      return { okfAssignedByClass: { ...s.okfAssignedByClass, [classId]: merged } }
    }),
  undoOkfAssign: (classId, resourceIds) =>
    set((s) => {
      const existing = s.okfAssignedByClass[classId] ?? []
      const remaining = existing.filter((id) => !resourceIds.includes(id))
      return { okfAssignedByClass: { ...s.okfAssignedByClass, [classId]: remaining } }
    }),
})
