// Announcements, teacher tasks, behavior notes, parent messaging.

export interface Announcement {
  id: string
  title: string
  body: string
  date: string
  audience: string
}

export type Priority = "high" | "medium" | "low"
export interface Task {
  id: string
  title: string
  due: string
  priority: Priority
  done: boolean
}

export type BehaviorType = "positive" | "incident"
export interface BehaviorNote {
  student: string
  classId: string
  type: BehaviorType
  note: string
  date: string
}

export interface ParentMessage {
  parent: string
  student: string
  last: string
  date: string
  unread: boolean
}
