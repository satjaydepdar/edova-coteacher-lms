import { REPORTS } from "@/data/seed"

export default function Reports() {
  return (
    <div>
      <div className="mb-5">
        <div className="font-display text-[24px] font-bold text-ink">
          Reports
        </div>
        <div className="mt-0.5 text-[16px] text-text-secondary">
          Generate attendance, assessment, performance, and coverage reports.
        </div>
      </div>

      <div className="rounded-[12px] border border-card-border bg-cream px-5 py-2 shadow-card">
        {REPORTS.map((r) => (
          <div
            key={r.name}
            className="flex items-center justify-between border-b border-[#F1F5F9] py-3.5 last:border-0"
          >
            <div>
              <div className="text-[15.5px] font-semibold text-[#111827]">
                {r.name}
              </div>
              <div className="mt-0.5 text-[14px] text-text-secondary">
                {r.type} · Generated {r.generated}
              </div>
            </div>
            <div className="cursor-pointer text-[14.5px] font-semibold text-okf">
              Download →
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
