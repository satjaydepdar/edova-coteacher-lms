import { useState } from "react"
import { dateKey } from "./utils"
import { KIND_COLORS, KIND_TINTS, sortItems, type CalItem } from "./model"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MAX_VISIBLE = 3

interface MonthViewProps {
  month: Date // any date within the month to display
  today: Date
  itemsByDate: Record<string, CalItem[]>
  onDayClick: (date: Date) => void
}

export function MonthView({ month, today, itemsByDate, onDayClick }: MonthViewProps) {
  const [popoverKey, setPopoverKey] = useState<string | null>(null)

  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = new Date(first)
  start.setDate(1 - first.getDay()) // back up to Sunday
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

  return (
    <div className="overflow-hidden rounded-[12px] border border-card-border" onClick={() => popoverKey && setPopoverKey(null)}>
      <div className="grid grid-cols-7 border-b border-card-border bg-[#FAFAF7]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="px-3 py-2 text-[10.5px] font-bold uppercase tracking-[0.09em] text-text-muted">
            {w}
          </div>
        ))}
      </div>

      {Array.from({ length: 6 }, (_, row) => (
        <div key={row} className="grid grid-cols-7 border-t border-card-border first:border-t-0">
          {days.slice(row * 7, row * 7 + 7).map((date) => {
            const key = dateKey(date)
            const inMonth = date.getMonth() === month.getMonth()
            const isToday = sameDay(date, today)
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const items = sortItems(itemsByDate[key] ?? [])
            const visible = items.slice(0, MAX_VISIBLE)
            const hidden = items.length - visible.length
            const popoverOpen = popoverKey === key

            return (
              <div
                key={key}
                onClick={(e) => { e.stopPropagation(); onDayClick(date) }}
                className={`group relative min-h-[112px] cursor-pointer border-l border-card-border px-2 pb-1.5 pt-[7px] transition-colors first:border-l-0 hover:bg-[#F4F7F3] ${
                  isWeekend && inMonth ? "bg-[#FCFBF6]" : inMonth ? "bg-white" : "bg-[#FBFBFA]"
                } ${isToday ? "shadow-[inset_0_0_0_1.5px_#D9A94E] bg-[rgba(217,169,78,0.14)]" : ""}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  {isToday ? (
                    <span className="grid size-[22px] place-items-center rounded-full bg-ink text-[12px] font-bold text-sidebar-text">
                      {date.getDate()}
                    </span>
                  ) : (
                    <span className={`text-[12px] font-semibold ${inMonth ? "text-ink" : "text-[#C4C9C6]"}`}>
                      {date.getDate()}
                    </span>
                  )}
                  <span className="text-[10.5px] font-bold text-okf opacity-0 transition-opacity group-hover:opacity-100">＋</span>
                </div>

                {visible.map((item) => (
                  <div
                    key={item.id}
                    title={item.title}
                    className="mb-[3px] flex items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-[6px] border border-[#E5E7EB] py-[3px] pl-[6px] pr-[7px] shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    style={{
                      background: KIND_TINTS[item.kind],
                      borderLeft: `3px solid ${KIND_COLORS[item.kind]}`,
                    }}
                  >
                    {item.time && <span className="shrink-0 text-[10px] text-text-muted">{item.time}</span>}
                    <span className="truncate text-[11px] font-bold leading-[1.3] text-ink">{item.title}</span>
                  </div>
                ))}

                {hidden > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setPopoverKey(popoverOpen ? null : key) }}
                    className="cursor-pointer px-[7px] py-[1px] text-[10.5px] font-bold text-okf hover:underline"
                  >
                    +{hidden} more
                  </button>
                )}

                {popoverOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className={`absolute top-[34px] z-10 w-[228px] rounded-[10px] border border-card-border bg-white p-2.5 shadow-[0_10px_28px_rgba(19,35,31,0.14)] ${
                      date.getDay() >= 5 ? "right-[calc(100%+8px)]" : "left-[calc(100%+8px)]"
                    }`}
                  >
                    <div className="mb-2 text-[12px] font-bold text-ink">
                      {date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </div>
                    {items.map((item) => (
                      <div key={item.id} className="flex items-start gap-2 rounded-[7px] p-1.5 hover:bg-[#F4F7F3]">
                        <span className="mt-1 size-[8px] shrink-0 rounded-full" style={{ background: KIND_COLORS[item.kind] }} />
                        <div className="min-w-0">
                          <div className="text-[11.5px] font-semibold leading-snug text-ink">{item.title}</div>
                          {item.time && <div className="text-[10.5px] text-text-muted">{item.time}</div>}
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => { setPopoverKey(null); onDayClick(date) }}
                      className="mt-1 w-full cursor-pointer rounded-[7px] border border-dashed border-card-border py-1.5 text-[11px] font-semibold text-okf hover:border-okf"
                    >
                      ＋ Add entry this day
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
