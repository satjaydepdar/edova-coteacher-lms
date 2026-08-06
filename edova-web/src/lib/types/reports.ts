// Reports + exams.

export interface Report {
  name: string
  type: string
  generated: string
}

export type ExamType = "Quiz" | "Unit Test" | "Exam" | "Final"
export interface Exam {
  id: string
  title: string
  classId: string
  date: string
  type: string
  weight: string
  duration: number
  coverageUnitIds: string[]
  revisionAllocated: number
  revisionUsed: number
  /** Owning teacher; "all" = school-wide. */
  teacherId: string
}
