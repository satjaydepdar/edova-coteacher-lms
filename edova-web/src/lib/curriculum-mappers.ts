// Syllabus-tree (course-CRUD API, ragApi :8000) wire shapes + the mappers that turn them into
// the CurriculumUnit rows the views render. Extracted from school-store so
// the store slices stay thin and the mapping is unit-testable in isolation.
import { CLASSES } from "@/data/seed"
import type { CurriculumUnit } from "@/lib/types"

// Current teaching focus — the one class/section/subject whose real syllabus
// tree (clerk DB) is hydrated into the shared curriculum, so Syllabus Map /
// Course Progress / Settings > Syllabus all read and write the
// same server-backed data. Settings > Syllabus's Class/Section/Subject
// filters call setFocus to switch it; everything else just reads whatever is
// currently focused.
export interface Focus { year: string; board: string; classLabel: string; subject: string; section: string }

export const focusKey = (f: Focus) => `${f.year}|${f.board}|${f.classLabel}|${f.subject}|${f.section}`

// classId is a mock-CLASSES lookup key used only for display/cross-links
// (classNameById, timetable auto-planned-end, period-allocation checks) —
// reuse the matching CLASSES entry's id when one exists (preserves those
// features for the original focus) and fall back to a synthetic, readable id
// otherwise (any other real class won't have a matching mock timetable row).
export function classIdForFocus(f: Focus): string {
  return CLASSES.find((c) => c.name === `${f.classLabel} — ${f.section}` && c.subject === f.subject)?.id
    ?? `${f.classLabel} — ${f.section}`
}

// Wire shapes from the course-CRUD API.
export interface ApiTreeTopic { id: string; title: string }
export interface ApiTreeChapter { id: string; number: number | null; name: string; topics: ApiTreeTopic[] }
export interface ApiTreeUnit { id: string; name: string; marks: number | null; chapters: ApiTreeChapter[] }

export function weightageFromMarks(marks: number | null): string {
  if (marks == null) return "Medium"
  if (marks >= 15) return "High"
  if (marks >= 8) return "Medium"
  return "Low"
}

// API syllabus tree + taught-topic ids -> the CurriculumUnit rows the views
// render. Chapters flatten into the unit's topic list (mockup shape).
// Scheduling fields the API doesn't carry (term/planned dates/periods/
// planned %) are OMITTED — views render their existing empty-state fallbacks
// for those, so nothing fabricated ("Term 1"/""/0) leaks into exports or
// sibling grouping as if it were real data.
export function treeToUnits(units: ApiTreeUnit[], doneIds: Set<string>, focus: Focus): CurriculumUnit[] {
  const classId = classIdForFocus(focus)
  return units.map((u) => {
    const topics = u.chapters.flatMap((c) =>
      c.topics.map((t) => ({ id: t.id, name: t.title, done: doneIds.has(t.id) }))
    )
    const actual = topics.length
      ? Math.round((topics.filter((t) => t.done).length / topics.length) * 100)
      : 0
    return {
      id: u.id,
      subject: focus.subject,
      classId,
      academicYear: focus.year,
      unit: u.name,
      textbookRef: u.chapters.map((c) => c.name).join(", "),
      weightage: weightageFromMarks(u.marks),
      actual,
      topics,
    }
  })
}
