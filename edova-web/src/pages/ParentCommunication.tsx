import { PARENT_MESSAGES } from "@/data/seed"

export default function ParentCommunication() {
  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="font-display text-[24px] font-bold text-ink">
            Parent Communication
          </div>
          <div className="mt-0.5 text-[16px] text-text-secondary">
            Send updates, homework notifications, and progress reports.
          </div>
        </div>
        <div
          className="cursor-pointer rounded-[8px] px-[18px] py-2.5 text-[15px] font-semibold text-white"
          style={{ background: "#16332B" }}
        >
          + New Message
        </div>
      </div>

      <div className="rounded-[12px] border border-card-border bg-cream px-5 py-2 shadow-card">
        {PARENT_MESSAGES.map((m) => (
          <div
            key={m.parent}
            className="flex items-start gap-3.5 border-b border-[#F1F5F9] py-4 last:border-0"
          >
            <div className="flex size-[38px] flex-shrink-0 items-center justify-center rounded-full bg-okf-bg text-[15px] font-bold text-okf">
              {m.parent.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div className="text-[15.5px] font-bold text-[#111827]">
                  {m.parent}
                </div>
                <div className="text-[14px] text-text-muted">re: {m.student}</div>
              </div>
              <div className="mt-0.5 text-[15px] text-[#374151]">{m.last}</div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-[13.5px] text-text-muted">{m.date}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
