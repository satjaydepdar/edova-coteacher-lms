// Timetables + sections.

export interface MasterTimetableRow {
  id: string
  sectionId: string
  academicYear: string
  day: string
  period: number
  subject: string
  teacher: string
  room: string
}
export interface Section {
  id: string
  label: string
  grade: number
  section: string
}
