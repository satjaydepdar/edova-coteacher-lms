// Resource assignments (edova-backend, :8003) -- a teacher assigning a
// catalogued Learning Resource (OKF video/PDF) straight to a class, read
// by the Student Learning Hub. Distinct from student-api.ts's homework
// assignments (grades/due dates/submissions): this is purely "this class
// can see this resource," nothing else.
import { backendApi } from "./api-client"

export interface NewResourceAssignment {
  resource_id: string
  resource_title: string
  resource_type: string
  chapter_number: number | null
  s3_key: string | null
}

export interface MyResourceAssignment {
  id: string
  resource_id: string
  resource_title: string
  resource_type: string
  chapter_number: number | null
  s3_key: string | null
  subject: string
  assigned_at: string
}

export function assignResourceToClassroom(classroomId: string, body: NewResourceAssignment) {
  return backendApi.post<MyResourceAssignment>(`/api/classrooms/${classroomId}/resource-assignments`, body)
}

export function getMyResourceAssignments() {
  return backendApi.get<MyResourceAssignment[]>("/api/students/me/resource-assignments")
}
