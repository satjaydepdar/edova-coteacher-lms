// Class → Subject → syllabus-tree cascade driven by the master-syllabus DB
// (curriculum API on :8000 — the same source the Lesson Planner uses).
// Selecting a class loads its subjects; selecting a subject loads its
// units → chapters → topics for the Chapter/Topic dropdowns.
import { useEffect, useState } from "react"
import { getAcademicYears, getCurriculum, getSyllabus } from "@/lib/curriculum-api"
import type { SyllabusUnitOut } from "@/lib/types"

export interface CascadeSubject {
  id: string
  name: string
}

export function useSyllabusCascade(classLabel: string) {
  const [year, setYear] = useState("")
  const [subjects, setSubjects] = useState<CascadeSubject[]>([])
  const [subjectId, setSubjectId] = useState("")
  const [units, setUnits] = useState<SyllabusUnitOut[]>([])

  useEffect(() => {
    getAcademicYears()
      .then((rows) => setYear(rows[rows.length - 1]?.year_label ?? ""))
      .catch(() => { /* cascade stays empty if the API is down */ })
  }, [])

  useEffect(() => {
    if (!year || !classLabel) return
    getCurriculum(year, "CBSE", classLabel)
      .then((d) => {
        const list = d.subjects.map((s) => ({ id: s.id, name: s.subject_name }))
        setSubjects(list)
        setSubjectId((prev) => (list.some((s) => s.id === prev) ? prev : (list[0]?.id ?? "")))
      })
      .catch(() => {
        setSubjects([])
        setSubjectId("")
      })
  }, [year, classLabel])

  useEffect(() => {
    setUnits([])
    if (!subjectId) return
    getSyllabus(subjectId)
      .then((d) => setUnits(d.units ?? []))
      .catch(() => setUnits([]))
  }, [subjectId])

  return { subjects, subjectId, setSubjectId, units }
}
