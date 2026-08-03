// Saved-assessments API (ncert_rag :8000, migration 0028) — persists the
// Assessment Builder's bank so saved assessments survive reload. Wire-shape
// mappers live here; the store slice stays free of field-name knowledge.
import { ragApi } from "@/lib/api-client"
import type { AssessmentBankItem, AssessmentSection } from "@/lib/types"

interface ApiSavedAssessment {
  id: string
  title: string
  class_id: string | null
  subject: string
  term: string
  academic_year: string
  objective: string
  topic_label: string
  total_points: number
  sections: AssessmentSection[]
  created_at: string
  updated_at: string
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatOn(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? "" : `${MONTH_ABBR[d.getMonth()]} ${d.getDate()}`
}

export function apiToBankItem(r: ApiSavedAssessment): AssessmentBankItem {
  const sections = r.sections ?? []
  return {
    id: r.id,
    title: r.title,
    classId: r.class_id ?? "",
    subject: r.subject,
    term: r.term,
    academicYear: r.academic_year,
    totalPoints: r.total_points,
    sectionCount: sections.length,
    questionCount: sections.reduce((a, s) => a + (s.questions?.length ?? 0), 0),
    createdOn: formatOn(r.created_at),
    sections,
    objective: r.objective,
    topicLabel: r.topic_label,
  }
}

function bankItemToBody(item: AssessmentBankItem) {
  return {
    title: item.title,
    class_id: item.classId || null,
    subject: item.subject,
    term: item.term,
    academic_year: item.academicYear,
    objective: item.objective ?? "",
    topic_label: item.topicLabel ?? "",
    total_points: item.totalPoints,
    sections: item.sections,
  }
}

export function fetchSavedAssessments() {
  return ragApi.get<ApiSavedAssessment[]>("/api/saved-assessments")
}

export function createSavedAssessment(item: AssessmentBankItem) {
  return ragApi.post<ApiSavedAssessment>("/api/saved-assessments", bankItemToBody(item))
}

export function updateSavedAssessment(id: string, item: AssessmentBankItem) {
  return ragApi.put<ApiSavedAssessment>(`/api/saved-assessments/${id}`, bankItemToBody(item))
}
