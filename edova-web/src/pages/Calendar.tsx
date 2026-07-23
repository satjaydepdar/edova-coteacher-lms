import { useMemo, useState } from "react"
import { CALENDAR_EVENTS, CLASSES, EXAMS, APP_TODAY, TEACHERS } from "@/data/seed"
import { dayLabelForDate, parseShortDate } from "@/lib/dates"
import type { CalendarEvent } from "@/lib/types"
import { CalendarToolbar } from "@/components/calendar/CalendarToolbar"
import { CalendarLegend } from "@/components/calendar/CalendarLegend"
import { MonthView } from "@/components/calendar/MonthView"
import { TimeGrid } from "@/components/calendar/TimeGrid"
import { YearView } from "@/components/calendar/YearView"
import { DayInsightModal } from "@/components/calendar/DayInsightModal"
import { dateKey, parseTimeOfDay } from "@/components/calendar/utils"
import { kindForSchedule, makeItem, type CalItem } from "@/components/calendar/model"
import { type CalendarEntry, type CalendarViewKey } from "@/components/calendar/types"

function classNameById(id: string) {
  return CLASSES.find((c) => c.id === id)?.name ?? id
}

type MergedEvent = CalendarEvent & { _sort: number }

function mergedEvents(): MergedEvent[] {
  const nonExam = CALENDAR_EVENTS.filter((e) => e.type !== "exam").map((e) => ({
    ...e,
    _sort: parseShortDate(e.date).getTime(),
  }))
  const examEvents = EXAMS.map((ex) => {
    const d = parseShortDate(ex.date)
    return {
      date: ex.date,
      day: dayLabelForDate(d),
      title: `${classNameById(ex.classId)} — ${ex.title}`,
      type: "exam" as const,
      time: ex.type === "Quiz" || ex.type === "Unit Test" ? "9:00 AM" : "All day",
      teacherId: ex.teacherId,
      _sort: d.getTime(),
    }
  })
  return [...nonExam, ...examEvents].sort((a, b) => a._sort - b._sort)
}

// Hardcoded sample plan entries so the Class/Section + Subject–Chapter +
// Assignment + % Covered feature has something to show on first load.
const SAMPLE_ENTRIES: CalendarEntry[] = [
  {
    id: "sample_1",
    date: "2026-07-09",
    classSection: CLASSES[0]?.name ?? "Class 8 — Section A",
    subjectChapter: "Mathematics – Linear Equations",
    assignment: "Exercise 4.2, Q1–Q5",
    percentCovered: 62,
    teacherId: "t_me",
  },
  {
    id: "sample_2",
    date: "2026-07-14",
    classSection: CLASSES[2]?.name ?? "Class 7 — Section A",
    subjectChapter: "Mathematics – Geometry Basics",
    assignment: "Homework: angle-pairs worksheet",
    percentCovered: 40,
    teacherId: "t_me",
  },
  {
    id: "sample_3",
    date: "2026-07-10",
    classSection: "Class 9 — Section C",
    subjectChapter: "Science – Life Processes",
    assignment: "Nutrition diagram worksheet",
    percentCovered: 35,
    teacherId: "t_ri",
  },
]

export default function Calendar() {
  const scheduleEvents = useMemo(() => mergedEvents(), [])
  const classOptions = useMemo(() => [...new Set(CLASSES.map((c) => c.name))], [])

  const [view, setView] = useState<CalendarViewKey>("month")
  const [currentDate, setCurrentDate] = useState<Date>(APP_TODAY)
  const [entries, setEntries] = useState<CalendarEntry[]>(SAMPLE_ENTRIES)
  const [modalDate, setModalDate] = useState<Date | null>(null)
  const [teacherId, setTeacherId] = useState(TEACHERS[0].id)

  const visibleForTeacher = (ownerId: string | undefined) =>
    ownerId !== undefined && (ownerId === teacherId || ownerId === "all")

  // Unified view-model: schedule events + plan entries, filtered to the
  // selected teacher (school-wide "all" rows show on every calendar).
  const itemsByDate = useMemo(() => {
    const map: Record<string, CalItem[]> = {}
    scheduleEvents
      .filter((ev) => visibleForTeacher(ev.teacherId))
      .forEach((ev) => {
        const key = dateKey(parseShortDate(ev.date))
        const t = parseTimeOfDay(ev.time)
        ;(map[key] ??= []).push(
          makeItem(`sched_${ev.date}_${ev.title}`, kindForSchedule(ev.type, ev.title), ev.title,
                   t ? ev.time : undefined, ev._sort + (t ? t.hours * 60 + t.minutes : 0)),
        )
      })
    entries
      .filter((en) => visibleForTeacher(en.teacherId))
      .forEach((en) => {
        ;(map[en.date] ??= []).push(
          makeItem(en.id, "entry", `${en.classSection} · ${en.subjectChapter}`, undefined, 0),
        )
      })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleEvents, entries, teacherId])

  const entriesByDate = useMemo(() => {
    const map: Record<string, CalendarEntry[]> = {}
    entries.filter((en) => visibleForTeacher(en.teacherId)).forEach((en) => {
      ;(map[en.date] ??= []).push(en)
    })
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, teacherId])

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
    const owned = { ...entry, teacherId }
    setEntries((prev) => {
      const idx = prev.findIndex((e) => e.id === entry.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = owned
        return copy
      }
      return [...prev, owned]
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

      <CalendarToolbar
        view={view}
        onViewChange={setView}
        date={currentDate}
        onDateChange={setCurrentDate}
        onAddEntry={() => setModalDate(currentDate)}
        teachers={TEACHERS}
        teacherId={teacherId}
        onTeacherChange={setTeacherId}
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
    </div>
  )
}
