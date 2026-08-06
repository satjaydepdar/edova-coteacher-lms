// Classes + students (seed-side roster view models).

export interface Klass {
  id: string
  name: string
  subject: string
  room: string
  students: number
  schedule: string
  sectionId: string
}

export type StudentStatus = "on-track" | "at-risk"
export interface Student {
  id: string
  name: string
  rollNo: string
  classId: string
  attendance: number
  avgGrade: string
  status: StudentStatus
}
