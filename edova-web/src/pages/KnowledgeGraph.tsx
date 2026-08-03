import { useState } from "react"
import { PageHeader } from "@/components/common/PageHeader"
import { CLERK_BASE_URL } from "@/lib/api-client"

// Administration → Knowledge Graph. Embeds the OKF bundle health map served
// live by the Clerk (ncert_rag) at GET /okf/dashboard — regenerated from the
// bundle on every load, so it always reflects the latest uploads.
const DASHBOARD_URL = `${CLERK_BASE_URL}/okf/dashboard`

export default function KnowledgeGraph() {
  const [reloadKey, setReloadKey] = useState(0)

  return (
    <div>
      <PageHeader
        title="Knowledge Graph"
        subtitle="Every document in the OKF library — shelved, searchable, and listed status at a glance."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="cursor-pointer rounded-[8px] border border-[#E5E7EB] bg-[#F9FAFB] px-[14px] py-2 text-[14.5px] font-semibold text-[#374151]"
            >
              ↻ Refresh
            </button>
            <a
              href={DASHBOARD_URL}
              target="_blank"
              rel="noreferrer"
              className="cursor-pointer rounded-[8px] bg-ink px-[16px] py-2.5 text-[15px] font-semibold text-sidebar-text no-underline"
            >
              Open full view ↗
            </a>
          </div>
        }
      />

      <div className="overflow-hidden rounded-[14px] border border-[#E5E1D2] bg-white shadow-sm">
        <iframe
          key={reloadKey}
          title="OKF Bundle Health Map"
          src={DASHBOARD_URL}
          className="h-[calc(100vh-190px)] min-h-[560px] w-full border-0"
        />
      </div>
    </div>
  )
}
