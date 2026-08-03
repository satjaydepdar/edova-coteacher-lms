import { KIND_META, type EventKind } from "./model"

const ORDER = Object.keys(KIND_META) as EventKind[]

export function CalendarLegend() {
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-text-secondary">
      {ORDER.map((kind) => {
        const meta = KIND_META[kind]
        return (
          <span key={kind} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block size-[10px]"
              style={{
                background: meta.legend.outline ? meta.tint : meta.color,
                borderRadius: meta.legend.round ? "50%" : 3,
                ...(meta.legend.outline ? { border: `1px solid ${meta.color}` } : {}),
              }}
            />
            {meta.label}
          </span>
        )
      })}
    </div>
  )
}
