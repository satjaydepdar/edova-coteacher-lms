import { dateKey } from "./utils"
import { KIND_COLORS, sortItems, type CalItem } from "./model"

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"]

/** CBSE academic year starts in April — flip if the school starts June/July. */
const ACADEMIC_YEAR_START_MONTH = 3 // 0-indexed: April

interface YearViewProps {
  date: Date // any date within the academic year to display
  today: Date
  itemsByDate: Record<string, CalItem[]>
  onDayClick: (date: Date) => void
  onYearChange: (startYear: number) => void
}

export function YearView({ date, today, itemsByDate, onDayClick, onYearChange }: YearViewProps) {
  // Academic year that contains `date`: starts ACADEMIC_YEAR_START_MONTH.
  const startYear =
    date.getMonth() >= ACADEMIC_YEAR_START_MONTH ? date.getFullYear() : date.getFullYear() - 1

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = ACADEMIC_YEAR_START_MONTH + i
    return { year: startYear + Math.floor(m / 12), month: m % 12 }
  })

  const yearOptions = [startYear - 1, startYear, startYear + 1]
  const yearLabel = (y: number) => `${y}–${String(y + 1).slice(2)}`

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-text-secondary">
        Academic year
        <select
          value={startYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="h-[32px] rounded-[8px] border border-card-border bg-white px-2 text-[13px] text-ink outline-none"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{yearLabel(y)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {months.map(({ year, month }) => (
          <MiniMonth
            key={`${year}-${month}`}
            year={year}
            month={month}
            today={today}
            itemsByDate={itemsByDate}
            onDayClick={onDayClick}
          />
        ))}
      </div>
    </div>
  )
}

function MiniMonth({
  year,
  month,
  today,
  itemsByDate,
  onDayClick,
}: {
  year: number
  month: number
  today: Date
  itemsByDate: Record<string, CalItem[]>
  onDayClick: (date: Date) => void
}) {
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="overflow-hidden rounded-[10px] border border-card-border bg-white">
      {/* month header band — the image's card identity, in our ink */}
      <div className="bg-ink px-2.5 py-1.5 text-[12.5px] font-bold text-sidebar-text">
        {MONTH_NAMES[month]}, {year}
      </div>

      <div className="p-2">
        <div className="mb-0.5 grid grid-cols-7 gap-[2px]">
          {WEEKDAY_INITIALS.map((w, i) => (
            <div key={i} className="text-center text-[9px] font-bold text-text-muted">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-[2px]">
          {cells.map((day, i) => {
            if (day === null) return <div key={i} className="h-[26px]" />
            const date = new Date(year, month, day)
            const isToday = date.toDateString() === today.toDateString()
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            // up to 3 event-kind dots for this day, solids first
            const kinds = [...new Set(sortItems(itemsByDate[dateKey(date)] ?? []).map((it) => it.kind))].slice(0, 3)

            return (
              <button
                key={i}
                onClick={() => onDayClick(date)}
                className={`relative flex h-[26px] cursor-pointer items-center justify-center rounded-[4px] text-[11px] font-semibold transition-colors ${
                  isToday
                    ? "bg-ink font-bold text-sidebar-text"
                    : isWeekend
                      ? "bg-[#F6F4EC] text-ink hover:bg-[#EDEAE0]"
                      : "text-ink hover:bg-[#F4F7F3]"
                }`}
              >
                {day}
                {kinds.length > 0 && (
                  <span className="absolute inset-x-0 bottom-[2px] flex justify-center gap-[2px]">
                    {kinds.map((k) => (
                      <span key={k} className="size-[3px] rounded-full" style={{ background: KIND_COLORS[k] }} />
                    ))}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
