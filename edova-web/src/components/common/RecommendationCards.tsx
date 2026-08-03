import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { X } from "lucide-react"
import {
  dismissRecommendation,
  getRecommendations,
  markRecommendationSeen,
  type Recommendation,
} from "@/lib/memory-api"

// Proactive cards from the behavioral memory layer (rule-based v1 —
// ncert_rag/api/routers/memory.py). Student struggle cards on the Learning
// Hub, class digests on the teacher's Calendar landing. Dismiss persists
// server-side: a dismissed card never comes back (dedupe_key upsert).
export function RecommendationCards({ userId, role }: { userId: string; role: "student" | "teacher" }) {
  const [recs, setRecs] = useState<Recommendation[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false
    getRecommendations(userId, role)
      .then((rows) => {
        if (cancelled) return
        setRecs(rows)
        rows.filter((r) => r.status === "new").forEach((r) => markRecommendationSeen(r.id))
      })
      .catch(() => { /* memory service down — the page works fine without cards */ })
    return () => { cancelled = true }
  }, [userId, role])

  const dismiss = (id: string) => {
    setRecs((prev) => prev.filter((r) => r.id !== id))
    dismissRecommendation(id).catch(() => {})
  }

  if (recs.length === 0) return null

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
      {recs.map((r) => (
        <div
          key={r.id}
          className="rounded-[12px] border border-card-border bg-cream shadow-card"
          style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}
        >
          <span style={{ fontSize: 22 }}>{r.kind === "struggle_remedial" ? "📚" : "👥"}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#111827", marginBottom: 2 }}>{r.title}</div>
            <div style={{ fontSize: 14, color: "#6B7280" }}>{r.body}</div>
          </div>
          <button
            onClick={() => navigate(r.cta_url)}
            style={{
              fontSize: 14, fontWeight: 700, color: "#fff", background: "#3F6E62",
              padding: "8px 16px", borderRadius: 8, cursor: "pointer", border: "none",
              whiteSpace: "nowrap",
            }}
          >
            {r.cta_label}
          </button>
          <X
            size={16}
            style={{ color: "#9CA3AF", cursor: "pointer", flexShrink: 0 }}
            onClick={() => dismiss(r.id)}
          />
        </div>
      ))}
    </div>
  )
}
