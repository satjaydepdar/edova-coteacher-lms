// School calendar — events + academic-calendar items.

export type CalendarEventType =
  | "exam"
  | "meeting"
  | "class"
  | "deadline"
  | "holiday"
export interface CalendarEvent {
  date: string
  day: string
  title: string
  type: CalendarEventType
  time: string
  /** Owning teacher; "all" = school-wide, shown on every teacher's calendar. */
  teacherId: string
}

export interface AcademicCalendarItem {
  id: string
  date: string
  label: string
  type: "Holiday" | "Event"
}
