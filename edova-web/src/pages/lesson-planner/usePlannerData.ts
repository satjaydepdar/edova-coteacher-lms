// Planner data cascade for the Lesson Planner: latest academic year →
// subject list for the chosen class → full syllabus tree for the chosen
// subject, plus the persisted plan library. The page keeps form state; this
// hook owns every fetch.
import { useEffect, useState } from "react"
import {
  getAcademicYears,
  getCurriculum,
  getLessonPlans,
  getSyllabus,
} from "@/lib/curriculum-api"
import type { SavedLessonPlanRecord, SyllabusUnitOut, ApiSavedPlan } from "@/lib/types"
import type { FlashKey } from "@/store/school-store"

export interface PlannerSubject {
  id: string
  name: string
}

export interface PlannerData {
  year: string
  subjects: PlannerSubject[]
  planSubjectId: string
  setPlanSubjectId: (id: string) => void
  syllabusUnits: SyllabusUnitOut[]
  savedLibrary: SavedLessonPlanRecord[]
  setSavedLibrary: React.Dispatch<React.SetStateAction<SavedLessonPlanRecord[]>>
}

export function usePlannerData(
  planClass: string,
  apiToRecord: (r: ApiSavedPlan) => SavedLessonPlanRecord,
  showFlash: (key: FlashKey, msg: string, ms?: number) => void,
): PlannerData {
  const [year, setYear] = useState("")
  const [subjects, setSubjects] = useState<PlannerSubject[]>([])
  const [planSubjectId, setPlanSubjectId] = useState("")
  const [syllabusUnits, setSyllabusUnits] = useState<SyllabusUnitOut[]>([])
  const [savedLibrary, setSavedLibrary] = useState<SavedLessonPlanRecord[]>([])

  // Latest academic year, then the subject list for the chosen class from
  // the curriculum API (currently only Class 10 Mathematics 041 exists).
  useEffect(() => {
    getAcademicYears()
      .then((rows) => setYear(rows[rows.length - 1]?.year_label ?? ""))
      .catch(() => showFlash("lesson", "Could not load academic years — is the API running on :8000?", 5000))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Load the persisted plan library so it survives reload and the "Saved
  // Plans (N)" count is correct on first paint.
  useEffect(() => {
    getLessonPlans()
      .then((rows) => setSavedLibrary(rows.map(apiToRecord)))
      .catch(() => { /* library stays empty if the API is down; save will surface the error */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!year) return
    getCurriculum(year, "CBSE", planClass)
      .then((d) => {
        const list = d.subjects.map((s) => ({ id: s.id, name: s.subject_name }))
        setSubjects(list)
        // Keep the current selection if it's still valid for this class (e.g.
        // one just restored by reopening a saved plan) — only default to the
        // first subject when nothing prior applies.
        setPlanSubjectId((prev) => (list.some((s) => s.id === prev) ? prev : list[0]?.id ?? ""))
      })
      .catch(() => setSubjects([]))
  }, [year, planClass])

  // Load the selected subject's full syllabus tree (units → chapters → topics)
  // so the Unit and Topic dropdowns can be driven from the database.
  useEffect(() => {
    setSyllabusUnits([])
    if (!planSubjectId) return
    getSyllabus(planSubjectId)
      .then((d) => setSyllabusUnits(d.units ?? []))
      .catch(() => setSyllabusUnits([]))
  }, [planSubjectId])

  return { year, subjects, planSubjectId, setPlanSubjectId, syllabusUnits, savedLibrary, setSavedLibrary }
}
