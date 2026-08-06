// Calendar slice — real calendar events (edova-backend), additive on top of
// Calendar.tsx's existing fake CALENDAR_EVENTS/EXAMS, never replacing them.
// Requires a real session (Guest mode never fetches).
import type { StateCreator } from "zustand"
import { backendApi } from "@/lib/api-client"

let calendarEventsHydration: Promise<void> | null = null

export interface RealCalendarEvent {
  id: string
  title: string
  eventType: string
  startAt: string
  isAllDay: boolean
}

interface ApiCalendarEventRow {
  id: string; title: string; event_type: string; start_at: string; is_all_day: boolean
}

const rowToEvent = (r: ApiCalendarEventRow): RealCalendarEvent => ({
  id: r.id, title: r.title, eventType: r.event_type, startAt: r.start_at, isAllDay: r.is_all_day,
})

export interface CalendarSlice {
  realCalendarEvents: RealCalendarEvent[]
  hydrateCalendarEvents: () => Promise<void>
  createCalendarEvent: (input: {
    title: string
    eventType: string
    startAt: string
    isAllDay: boolean
  }) => Promise<void>
}

export const createCalendarSlice: StateCreator<CalendarSlice, [], [], CalendarSlice> = (set) => ({
  realCalendarEvents: [],
  hydrateCalendarEvents: () => {
    // No session yet (Guest mode, or not-logged-in-yet on a page that
    // mounts before session hydration) -- nothing to fetch, and don't
    // cache a permanent no-op so a later call (after login) can retry.
    if (!backendApi.token) return Promise.resolve()
    if (!calendarEventsHydration) {
      calendarEventsHydration = (async () => {
        const rows = await backendApi.get<ApiCalendarEventRow[]>("/api/calendar-events")
        set({ realCalendarEvents: rows.map(rowToEvent) })
      })().catch((err) => {
        calendarEventsHydration = null // retry on next call
        console.warn("calendar events hydration failed:", err)
      })
    }
    return calendarEventsHydration
  },
  createCalendarEvent: async (input) => {
    if (!backendApi.token) throw new Error("not signed in")
    const row = await backendApi.post<ApiCalendarEventRow>("/api/calendar-events", {
      title: input.title,
      event_type: input.eventType,
      start_at: input.startAt,
      is_all_day: input.isAllDay,
      visibility: "school",
    })
    set((s) => ({ realCalendarEvents: [...s.realCalendarEvents, rowToEvent(row)] }))
  },
})
