/**
 * Course-CRUD API — academic years, curriculums + subjects, master-syllabus
 * trees, saved lesson plans, class sections + per-topic taught progress.
 *
 * Served by the Postgres RAG app (ragApi, :8000), which took over the clerk
 * course contract: SAME paths, SAME wire shapes as clerk (data migrated
 * SQLite → Postgres). The resources catalog moved too — its subject ids are
 * Postgres UUIDs, which clerk's SQLite can no longer resolve.
 */
import { ragApi } from "./api-client"
import type {
  AcademicYearOut,
  ApiSavedPlan,
  CatalogResource,
  ClassSectionOut,
  CurriculumOut,
  CurriculumSubjectOut,
  NewLessonPlan,
  NewSubjectBody,
  SectionProgressOut,
  SyllabusOut,
  SyllabusUnitIn,
  TopicTickOut,
} from "./types"

// ---- academic years + curriculum cards ----

export function getAcademicYears() {
  return ragApi.get<AcademicYearOut[]>("/api/academic-years")
}

/** Distinct classes that have a curriculum row for this year/board. */
export function getCurriculumClasses(year: string, board: string) {
  return ragApi.get<string[]>(
    `/api/curriculums/classes?year=${encodeURIComponent(year)}&board=${encodeURIComponent(board)}`,
  )
}

/** Get-or-create the curriculum card for a year/board/class combo. */
export function getCurriculum(year: string, board: string, classLabel: string) {
  return ragApi.get<CurriculumOut>(
    `/api/curriculums?year=${encodeURIComponent(year)}&board=${encodeURIComponent(board)}&class=${encodeURIComponent(classLabel)}`,
  )
}

export function addSubject(curriculumId: string, body: NewSubjectBody) {
  return ragApi.post<CurriculumSubjectOut>(`/api/curriculums/${curriculumId}/subjects`, body)
}

export function deleteSubject(curriculumId: string, subjectId: string) {
  return ragApi.del<{ status: string }>(`/api/curriculums/${curriculumId}/subjects/${subjectId}`)
}

// ---- master-syllabus tree ----

export function getSyllabus(subjectId: string) {
  return ragApi.get<SyllabusOut>(`/api/curriculum-subjects/${subjectId}/syllabus`)
}

/** Replace the subject's whole syllabus tree atomically. */
export function putSyllabus(subjectId: string, body: { units: SyllabusUnitIn[] }) {
  return ragApi.put<SyllabusOut>(`/api/curriculum-subjects/${subjectId}/syllabus`, body)
}

// ---- saved lesson plans ----

export function getLessonPlans() {
  return ragApi.get<ApiSavedPlan[]>("/api/lesson-plans")
}

export function saveLessonPlan(body: NewLessonPlan) {
  return ragApi.post<ApiSavedPlan>("/api/lesson-plans", body)
}

export function updateLessonPlan(planId: string, body: NewLessonPlan) {
  return ragApi.put<ApiSavedPlan>(`/api/lesson-plans/${planId}`, body)
}

export function deleteLessonPlan(planId: string) {
  return ragApi.del<void>(`/api/lesson-plans/${planId}`)
}

// ---- class sections + per-topic taught progress ----

/** Distinct sections for a class across all its subjects. */
export function getClassSections(year: string, board: string, classLabel: string) {
  return ragApi.get<string[]>(
    `/api/class-sections/sections?year=${encodeURIComponent(year)}&board=${encodeURIComponent(board)}&class=${encodeURIComponent(classLabel)}`,
  )
}

/** Get-or-create the section for year/board/class/subject. */
export function getOrCreateClassSection(
  year: string,
  board: string,
  classLabel: string,
  subject: string,
  section = "Section A",
) {
  return ragApi.get<ClassSectionOut>(
    `/api/class-sections?year=${encodeURIComponent(year)}` +
      `&board=${encodeURIComponent(board)}&class=${encodeURIComponent(classLabel)}` +
      `&subject=${encodeURIComponent(subject)}&section=${encodeURIComponent(section)}`,
  )
}

export function getSectionProgress(sectionId: string) {
  return ragApi.get<SectionProgressOut>(`/api/class-sections/${sectionId}/progress`)
}

/** Tick/untick a taught topic (sparse: a row present means taught). */
export function tickSectionTopic(sectionId: string, topicId: string, done: boolean, taughtOn?: string) {
  return ragApi.put<TopicTickOut>(`/api/class-sections/${sectionId}/topics/${topicId}`, {
    done,
    taught_on: taughtOn,
  })
}

// ---- resources catalog (ragApi :8000 — moved with course CRUD; subject ids are PG UUIDs) ----

export function getSubjectResources(subjectId: string) {
  return ragApi.get<CatalogResource[]>(`/api/curriculum-subjects/${subjectId}/resources`)
}
