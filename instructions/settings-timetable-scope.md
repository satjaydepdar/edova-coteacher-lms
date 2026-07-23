# Settings → Teacher Timetable — Scope (post-Calendar)

Status: **scope, ready to build.** The calendar is done; this is the missing data
source it was designed to read from.

## 1. Goal

Teachers (or admin) define, per teacher: **which subject + class-section they
teach, in which periods, on which days** — and the calendar renders those as its
recurring "class" events, replacing the handful of hardcoded seed events.

Today: calendar class events come from `CALENDAR_EVENTS` seed (static, one-off
dates). After this: recurring weekly periods per teacher, generated from
Settings data.

## 2. What exists already (do not rebuild)

- `Settings.tsx` has a **Master Timetable** concept: `MT_SECTIONS`,
  `MT_PERIODS`, `MT_DAYS`, `MT_GRID_STRUCTURE`, `PERIOD_TIME_LABELS`,
  `masterTimetable` modal with `sectionId, academicYear, day, period, subject,
  teacher, room` — section × day × period grid (noted in db/README as
  frontend-only, Phase 3 reconciliation).
- `Calendar.tsx` reads `itemsByDate` from one seam — swapping the source is a
  one-function change (`mergedEvents()`).
- Teacher scoping (`teacherId` on events) is live; `TEACHERS` list exists.
- `db/` has a `schedules` table design (recurring-block model) for later.

## 3. The data model (frontend now, backend-ready later)

```ts
interface TeacherPeriod {
  id: string
  teacherId: string        // scoped, like calendar events
  day: "Monday" | ... | "Friday"   // weekday, recurring weekly
  period: number           // 1..N (MT_PERIODS)
  time: string             // "9:00 AM" — from PERIOD_TIME_LABELS
  classSection: string     // "Class 8 — Section A"
  subjectChapter: string   // "Mathematics – Linear Equations" (free text now, taxonomy later)
  room?: string
}
```

Calendar derives recurring `class` items for every date in the visible
month/week/day whose weekday matches. Exams/homework/holidays/meetings stay as
they are (one-off entries).

## 4. Settings UI (new section: "Teacher Timetable")

- Per-teacher tab or selector (Admin sees all; Teacher sees own).
- Grid: rows = periods (with PERIOD_TIME_LABELS), columns = Mon–Fri.
- Cell click → assign subject + class-section (+ room) via the existing modal
  pattern (`openAdd`/`openEdit` in Settings.tsx conventions).
- Cell shows: subject short name + section + (room). Filled vs empty is
  visually obvious (ink chip vs dashed outline).
- Data stored in the school store (persisted slice), replacing nothing that
  exists — additive.

## 5. Calendar integration

- `mergedEvents()` → `mergedEvents(teacherPeriods)`: expands each TeacherPeriod
  into `CalItem`s (kind "class") for matching weekdays in the viewed range.
- Teacher filter unchanged — periods carry teacherId.
- Click a class event → entry modal as today (plan entries stay separate).

## 6. Build order

1. `TeacherPeriod` type + seed timetable for the 3 demo teachers (Meenakshi
   gets a realistic Mon–Fri math schedule; R. Iyer science; K. Nair math 8B/9C).
2. Settings "Teacher Timetable" section (grid + assign/edit/clear modal).
3. Calendar: recurring expansion + drop the static class seed events.
4. Verify: week view shows daily classes per teacher; teacher switch changes
   them; build green.

## 7. Explicitly out of scope

- Substitution/leave handling, room-conflict detection, bulk import,
  copy-from-last-year (db README lists these as Phase 3+).
- Backend persistence — store-persisted for now; `db/schedules` wiring comes
  with Track 2.
