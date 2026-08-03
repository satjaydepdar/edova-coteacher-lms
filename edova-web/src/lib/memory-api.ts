// Behavioral memory layer (ncert_rag :8000, migration 0027) — rule-based v1.
//
// Events are dual-written fire-and-forget alongside the clerk calls that
// produce them (quiz mistakes, wiki notes): memory capture must never block
// or fail the action it observes, hence the swallowed catch everywhere.
// Recommendations are generated server-side on read from the event log.
import { ragApi } from "@/lib/api-client"

export type MemoryEventType = "quiz_mistake" | "note_saved" | "quiz_generated"

export interface Recommendation {
  id: string
  kind: "struggle_remedial" | "class_struggle_digest"
  title: string
  body: string
  cta_label: string
  cta_url: string
  chapter: string | null
  status: "new" | "seen"
  created_at: string
}

// Fire-and-forget by design — the .catch(() => {}) lives here so callers
// can't forget it.
export function recordMemoryEvent(e: {
  user_id: string
  role: "student" | "teacher"
  event_type: MemoryEventType
  chapter?: string | null
  topic_id?: string | null
  subject?: string | null
  payload?: Record<string, unknown>
}) {
  ragApi.post("/api/memory/events", e).catch(() => {})
}

export interface CommonMistake {
  question: string | null
  wrong: string
  n: number
}

// Real wrong answers for a chapter — feeds AI quiz distractors (Skill 1).
export function getCommonMistakes(chapter: string, limit = 5) {
  return ragApi.get<CommonMistake[]>(
    `/api/memory/common-mistakes?chapter=${encodeURIComponent(chapter)}&limit=${limit}`,
  )
}

export function getRecommendations(userId: string, role: "student" | "teacher") {
  return ragApi.get<Recommendation[]>(
    `/api/memory/recommendations?user_id=${encodeURIComponent(userId)}&role=${role}`,
  )
}

export function markRecommendationSeen(recId: string) {
  return ragApi.post(`/api/memory/recommendations/${recId}/seen`, {}).catch(() => {})
}

export function dismissRecommendation(recId: string) {
  return ragApi.post(`/api/memory/recommendations/${recId}/dismiss`, {})
}
