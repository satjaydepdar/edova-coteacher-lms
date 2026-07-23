import { dateKey, parseTimeOfDay } from "./utils"
import { KIND_COLORS, KIND_TINTS, sortItems, type CalItem } from "./model"

const START_HOUR = 7
const END_HOUR = 18
const SLOT_PX = 48

interface TimeGridProps {
  days: Date[] // 1 day (Day view) or 7 (Week view)
  today: Date
  itemsByDate: Record<string, CalItem[]>
  onSlotClick: (date: Date) => void
}

export function TimeGrid({ days, today, itemsByDate, onSlotClick }: TimeGridProps) {
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

  return (
    <div className="overflow-hidden rounded-[12px] border border-card-border">
      {/* day headers */}
      <div className="grid border-b border-card-border bg-[#FAFAF7]" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
        <div />
        {days.map((d) => (
          <div key={dateKey(d)} className={`px-3 py-2 text-center ${sameDay(d, today) ? "bg-[rgba(217,169,78,0.14)]" : ""}`}>
            <div className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-text-muted">
              {d.toLocaleDateString("en-US", { weekday: "short" })}
            </div>
            {sameDay(d, today) ? (
              <span className="mt-0.5 inline-grid size-[22px] place-items-center rounded-full bg-ink text-[12px] font-bold text-sidebar-text">
                {d.getDate()}
              </span>
            ) : (
              <div className="text-[13px] font-semibold text-ink">{d.getDate()}</div>
            )}
          </div>
        ))}
      </div>

      {/* time slots — all-day band removed per design review; untimed items
          (plan entries, holidays) still show in Month view and the day popup */}

      {/* time slots */}
      <div className="relative grid" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}>
        <div>
          {hours.map((h) => (
            <div key={h} className="pr-2 text-right text-[10px] leading-none text-text-muted" style={{ height: SLOT_PX }}>
              {h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`}
            </div>
          ))}
        </div>
        {days.map((d) => {
          const key = dateKey(d)
          const timed = sortItems(itemsByDate[key] ?? []).filter((it) => parseTimeOfDay(it.time ?? ""))
          return (
            <div
              key={key}
              onClick={() => onSlotClick(d)}
              className={`relative cursor-pointer border-l border-card-border ${sameDay(d, today) ? "bg-[rgba(217,169,78,0.08)]" : ""}`}
            >
              {hours.map((h) => (
                <div key={h} className="border-b border-[#F1F3F0]" style={{ height: SLOT_PX }} />
              ))}
              {timed.map((item) => {
                const t = parseTimeOfDay(item.time ?? "")!
                const top = ((t.hours - START_HOUR) * 60 + t.minutes) / 60 * SLOT_PX
                if (top < 0 || top > (END_HOUR - START_HOUR) * SLOT_PX - 24) return null
                return (
                  <div
                    key={item.id}
                    title={item.title}
                    className="absolute left-1 right-1 overflow-hidden rounded-[6px] border border-[#E5E7EB] px-[7px] py-[3px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    style={{
                      top,
                      height: 42,
                      background: KIND_TINTS[item.kind],
                      borderLeft: `3px solid ${KIND_COLORS[item.kind]}`,
                    }}
                  >
                    <div className="truncate text-[11px] font-bold leading-[1.3] text-ink">{item.title}</div>
                    {item.time && <div className="text-[10px] text-text-muted">{item.time}</div>}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
