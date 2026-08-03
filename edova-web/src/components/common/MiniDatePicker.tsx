// Hand-rolled month-grid date picker used by the Assignment Wizard's
// due-date field. Self-contained: the app clock drives the displayed month.
import { useMemo, useState } from "react"
import { Calendar as CalIcon, Clock } from "lucide-react"
import { APP_TODAY, MONTH_SHORT } from "@/lib/dates"

export interface MiniDatePickerProps {
  day: number
  onChange: (day: number) => void
}

export function MiniDatePicker({ day, onChange }: MiniDatePickerProps) {
  const [open, setOpen] = useState(false)

  const monthLabel = `${MONTH_SHORT[APP_TODAY.getMonth()]} ${APP_TODAY.getFullYear()}`
  const daysInMonth = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth() + 1, 0).getDate()
  const leadingBlanks = useMemo(() => {
    const firstOfMonth = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), 1).getDay()
    return (firstOfMonth + 6) % 7 // Monday-first
  }, [])
  const dueLabel = `${day} ${MONTH_SHORT[APP_TODAY.getMonth()]}, 11:59 PM`

  return (
    <div className="relative mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between rounded-[8px] border border-card-border bg-white px-3.5 text-left text-[13.5px]"
      >
        <span className="inline-flex items-center gap-2">
          <CalIcon size={16} className="text-text-secondary" /> {dueLabel}
        </span>
        <Clock size={16} className="text-text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-[300px] rounded-[16px] border border-card-border bg-white p-4 shadow-lg">
          <div className="mb-3 flex items-center justify-between">
            <div className="text-[13px] font-semibold">{monthLabel}</div>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-text-muted">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <div key={d} className="grid h-7 place-items-center">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }).map((_, i) => (
              <div key={`b${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const d = i + 1
              const selected = d === day
              return (
                <button
                  key={i}
                  onClick={() => {
                    onChange(d)
                    setOpen(false)
                  }}
                  className="grid h-8 place-items-center rounded-full text-[12px] transition hover:bg-cream"
                  style={
                    selected
                      ? { background: "#16332B", color: "#fff", fontWeight: 600 }
                      : { color: "#111827" }
                  }
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
