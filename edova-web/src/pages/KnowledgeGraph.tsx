import { useState } from "react"
import { PageHeader } from "@/components/common/PageHeader"

// Administration → Knowledge Graph. Embeds the OKF bundle health map served
// live by the Clerk (ncert_rag) at GET /okf/dashboard — regenerated from the
// bundle on every load, so it always reflects the latest uploads.
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8001"
const DASHBOARD_URL = `${API_BASE}/okf/dashboard`

export default function KnowledgeGraph() {
  const [key, setKey] = useState(0)

  return (
    <div className="flex h-[calc(100vh-100px)] flex-col">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Knowledge Graph"
          subtitle="Open Knowledge Format bundle health map — live node statuses, trust tiers, and chapter coverage."
        />
        <button
          onClick={() => setKey((k) => k + 1)}
          className="rounded-[6px] border border-card-border bg-white px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-card-border/30"
        >
          Refresh graph
        </button>
      </div>

      <div className="mt-3 flex-1 overflow-hidden rounded-[12px] border border-card-border bg-white shadow-sm">
        <iframe
          key={key}
          src={DASHBOARD_URL}
          title="OKF Bundle Health Map"
          className="h-full w-full border-0"
        />
      </div>
    </div>
  )
}
