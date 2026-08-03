import { useEffect, useMemo, useState } from "react"
import { CLASSES, APP_TODAY } from "@/data/seed"
import { parseShortDate } from "@/lib/dates"
import { useAppStore } from "@/store/app-store"
import { useSchoolStore } from "@/store/school-store"
import { CalendarToolbar } from "@/components/calendar/CalendarToolbar"
import { RecommendationCards } from "@/components/common/RecommendationCards"
import { CalendarLegend } from "@/components/calendar/CalendarLegend"
import { MonthView } from "@/components/calendar/MonthView"
import { TimeGrid } from "@/components/calendar/TimeGrid"
import { YearView } from "@/components/calendar/YearView"
import { DayInsightModal } from "@/components/calendar/DayInsightModal"
import { AddSchoolEventModal } from "@/components/calendar/AddSchoolEventModal"
import { dateKey } from "@/components/calendar/utils"
import { makeItem, type CalItem, type EventKind } from "@/components/calendar/model"
import { type CalendarEntry, type CalendarViewKey } from "@/components/calendar/types"

// Real calendar_events.event_type -> the display vocabulary already defined
// in model.ts. "event" (general) has no dedicated kind, so it falls back to
// "class" -- the closest neutral look.
const REAL_EVENT_KIND: Record<string, EventKind> = {
  meeting: "meeting",
  holiday: "holiday",
  exam: "exam",
  event: "class",
}

export default function Calendar() {
  const classOptions = useMemo(() => [...new Set(CLASSES.map((c) => c.name))], [])

  const [view, setView] = useState<CalendarViewKey>("month")
  const [currentDate, setCurrentDate] = useState<Date>(APP_TODAY)
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [modalDate, setModalDate] = useState<Date | null>(null)
  const [addEventOpen, setAddEventOpen] = useState(false)

  // Real assignment due dates + real calendar events, only for a real
  // (non-Guest) session. Guest mode makes no real fetches.
  const session = useAppStore((s) => s.session)
  const assignments = useSchoolStore((s) => s.assignments)
  const realClassroomIdByFakeId = useSchoolStore((s) => s.realClassroomIdByFakeId)
  const realCalendarEvents = useSchoolStore((s) => s.realCalendarEvents)
  const hydrateAssignments = useSchoolStore((s) => s.hydrateAssignments)
  const hydrateCalendarEvents = useSchoolStore((s) => s.hydrateCalendarEvents)
  useEffect(() => {
    if (session) {
      hydrateAssignments()
      hydrateCalendarEvents()
    }
  }, [session, hydrateAssignments, hydrateCalendarEvents])

  // Unified view-model: teacher plan entries + real due dates + real
  // calendar events (no fake school schedule anymore).
  const itemsByDate = useMemo(() => {
    const map: Record<string, CalItem[]> = {}
    entries.forEach((en) => {
      ;(map[en.date] ??= []).push(
        makeItem(en.id, "entry", `${en.classSection} · ${en.subjectChapter}`, undefined, 0),
      )
    })
    if (session) {
      const realClassIds = new Set(Object.keys(realClassroomIdByFakeId))
      assignments
        .filter((a) => realClassIds.has(a.classId) && a.due)
        .forEach((a) => {
          const d = parseShortDate(a.due)
          ;(map[dateKey(d)] ??= []).push(
            makeItem(`due_${a.id}`, "homework", `Due: ${a.title}`, undefined, d.getTime()),
          )
        })
      realCalendarEvents.forEach((ev) => {
        const d = new Date(ev.startAt)
        ;(map[dateKey(d)] ??= []).push(
          makeItem(`cal_${ev.id}`, REAL_EVENT_KIND[ev.eventType] ?? "class", ev.title, undefined, d.getTime()),
        )
      })
    }
    return map
  }, [entries, session, assignments, realClassroomIdByFakeId, realCalendarEvents])

  const entriesByDate = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {}
    entries.forEach((en) => {
      ;(map[en.date] ??= []).push(en)
    })
    return map
  }, [entries])

  function weekDays(center: Date): Date[] {
    const start = new Date(center)
    start.setDate(center.getDate() - center.getDay())
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }

  function handleSaveEntry(entry: CalendarEntry) {
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = entry
        return copy
      }
      return [...prev, entry]
    })
  }

  function handleDeleteEntry(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }

  const modalKey = modalDate ? dateKey(modalDate) : null

  return (
    <div>
      <div className="mb-1 font-display text-[24px] font-bold text-ink">My Calendar</div>
      <div className="mb-5 text-[16px] text-text-secondary">
        Teaching schedule, meetings, holidays, and exams.
      </div>

      {/* Class insights — proactive digests from the behavioral memory layer
          (students struggling per chapter, from quiz-mistake events) */}
      <RecommendationCards userId={session?.user.id ?? "teacher_demo"} role="teacher" />

      <CalendarToolbar
        view={view}
        onViewChange={setView}
        date={currentDate}
        onDateChange={setCurrentDate}
        onAddEntry={() => setModalDate(currentDate)}
        onAddSchoolEvent={session ? () => setAddEventOpen(true) : undefined}
      />

      <CalendarLegend />

      {view === "year" ? (
        <YearView
          date={currentDate}
          today={APP_TODAY}
          itemsByDate={itemsByDate}
          onDayClick={setModalDate}
          onYearChange={(y) => setCurrentDate(new Date(y, 3, 1))}
        />
      ) : view === "month" ? (
        <MonthView month={currentDate} today={APP_TODAY} itemsByDate={itemsByDate} onDayClick={setModalDate} />
      ) : (
        <TimeGrid
          days={view === "week" ? weekDays(currentDate) : [currentDate]}
          today={APP_TODAY}
          itemsByDate={itemsByDate}
          onSlotClick={setModalDate}
        />
      )}

      <DayInsightModal
        open={modalDate !== null}
        onOpenChange={(open) => !open && setModalDate(null)}
        date={modalDate}
        entries={modalKey ? entriesByDate[modalKey] ?? [] : []}
        classOptions={classOptions}
        onSave={handleSaveEntry}
        onDelete={handleDeleteEntry}
      />

      {session && (
        <AddSchoolEventModal
          open={addEventOpen}
          onOpenChange={setAddEventOpen}
          date={currentDate}
        />
      )}
    </div>
  )
}
