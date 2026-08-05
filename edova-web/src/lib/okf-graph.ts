/**
 * OKF knowledge graph — the clerk's structured view of the bundle:
 * subjects → chapters → documents, each document carrying its shelf /
 * index / list status. Backed by GET /okf/graph on the clerk (:8001),
 * regenerated from the bundle on every call.
 */
import { clerkApi } from "./api-client"

export type OkfDocStatus = "ready" | "partial" | "missing"

export interface OkfGraphDocument {
  doc_id: string
  title: string
  subject: string
  chapter_id: string
  chapter_name: string
  doc_type: string
  topic_id: string
  shelved: boolean
  searchable: boolean
  listed: boolean
  expects_search: boolean
  status: OkfDocStatus
  s3_key: string
  ingested_at: string
}

/** Syllabus topic joined to the OKF chapter it belongs to ("" when the
 * chapter has no OKF shelf yet). */
export interface OkfGraphTopic {
  topic_id: string
  title: string
  subject: string
  chapter_id: string
}

export interface OkfGraphSummary {
  total: number
  shelved: number
  searchable: number
  listed: number
  ready: number
  partial: number
  missing: number
  manifest_count: number
  chapters: number
  subjects: number
  edges: number
}

export interface OkfGraph {
  generated_at: string
  bucket_prefix: string
  nodes: OkfGraphDocument[]
  topics: OkfGraphTopic[]
  summary: OkfGraphSummary
}

export function getOkfGraph() {
  return clerkApi.get<OkfGraph>("/okf/graph")
}

export type OkfMatchType = "subject" | "chapter" | "topic" | "document"

export interface OkfMatch {
  type: OkfMatchType
  id: string
  label: string
  subject: string
  chapter_id: string
  topic_id: string
  score: number
}

export function searchOkfGraph(q: string) {
  return clerkApi.get<{ query: string; matches: OkfMatch[] }>(`/okf/search?q=${encodeURIComponent(q)}`)
}
