import { KIND_COLORS, KIND_LABELS, type EventKind } from "./model"

const ORDER: EventKind[] = ["class", "exam", "homework", "holiday", "quiz", "meeting", "entry"]

export function CalendarLegend() {
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-text-secondary">
      {ORDER.map((kind) => (
        <span key={kind} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block size-[10px]"
            style={{
              background: KIND_COLORS[kind],
              borderRadius: kind === "quiz" || kind === "meeting" ? "50%" : 3,
              ...(kind === "entry" ? { background: "#E9F1EC", border: `1px solid ${KIND_COLORS.entry}` } : {}),
            }}
          />
          {KIND_LABELS[kind]}
        </span>
      ))}
    </div>
  )
}
