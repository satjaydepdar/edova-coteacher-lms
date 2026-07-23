import { Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dateKey, parseDateKey } from "./utils"
import type { CalendarViewKey } from "./types"

const VIEWS: { key: CalendarViewKey; label: string }[] = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
]

interface CalendarToolbarProps {
  view: CalendarViewKey
  onViewChange: (view: CalendarViewKey) => void
  date: Date
  onDateChange: (date: Date) => void
  onAddEntry: () => void
  teachers?: { id: string; name: string }[]
  teacherId?: string
  onTeacherChange?: (id: string) => void
}

export function CalendarToolbar({ view, onViewChange, date, onDateChange, onAddEntry, teachers, teacherId, onTeacherChange }: CalendarToolbarProps) {
  const title =
    view === "year"
      ? String(date.getFullYear())
      : date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
          ...(view === "day" ? { day: "numeric" } : {}),
        })

  return (
    <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
      <div className="font-display text-[18px] font-bold text-ink">{title}</div>
      <div className="flex flex-wrap items-center gap-2">
        {teachers && onTeacherChange && (
          <Select value={teacherId} onValueChange={onTeacherChange}>
            <SelectTrigger className="h-[34px] w-[190px] rounded-[8px] border-card-border text-[13px]">
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <input
          type="date"
          value={dateKey(date)}
          onChange={(e) => e.target.value && onDateChange(parseDateKey(e.target.value))}
          className="h-[34px] rounded-[8px] border border-card-border bg-white px-2.5 text-[13px] text-ink outline-none"
        />
        <div className="inline-flex gap-1 rounded-[8px] border border-card-border bg-white p-[3px]">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => onViewChange(v.key)}
              className={`cursor-pointer rounded-[6px] px-3.5 py-1.5 text-[13px] font-semibold ${
                view === v.key ? "bg-okf-bg text-okf" : "text-text-secondary"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          onClick={onAddEntry}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] bg-ink px-3.5 py-[7px] text-[13px] font-semibold text-sidebar-text"
        >
          <Plus className="size-3.5" />
          Add entry
        </button>
      </div>
    </div>
  )
}
