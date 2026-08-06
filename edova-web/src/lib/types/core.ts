// App shell — navigation + identity primitives.

export type ViewKey =
  | "calendar"
  | "settings"
  | "knowledgeGraph"
  | "lessonPlanner"
  | "curriculumMap"
  | "assignmentTracker"
  | "assessmentBuilder"
  | "attendance"
  | "resources"
  | "announcements"
  | "parentCommunication"
  | "reports"
  | "learning"
  | "studentAssignments"
  | "wiki"

export type Role = "teacher" | "admin" | "student"

export interface NavItem {
  key: ViewKey
  label: string
  icon: string
  path: string
}
export interface NavGroup {
  label: string
  adminOnly?: boolean
  items: NavItem[]
}
