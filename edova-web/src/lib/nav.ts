import type { NavGroup, ViewKey } from "./types"

// Nav grouping + emoji icons from _decomp/app.js NAV_GROUPS; route paths from
// the design handoff README (the mockup itself has no router).
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Home",
    items: [
      { key: "calendar", label: "My Calendar", icon: "📅", path: "/calendar" },
    ],
  },
  {
    label: "Administration",
    items: [
      { key: "settings", label: "Settings", icon: "⚙️", path: "/settings" },
      { key: "knowledgeGraph", label: "Knowledge Graph", icon: "🗂️", path: "/knowledge-graph" },
    ],
  },
  {
    label: "Planning",
    items: [
      { key: "lessonPlanner", label: "Lesson Planner", icon: "📝", path: "/lesson-planner" },
      { key: "curriculumMap", label: "Syllabus Map", icon: "🗺️", path: "/curriculum-map" },
    ],
  },
  {
    label: "Teaching",
    items: [
      { key: "assignmentTracker", label: "Assignment Tracker", icon: "📋", path: "/assignment-tracker" },
      { key: "assessmentBuilder", label: "Assessment Builder", icon: "🧮", path: "/assessment-builder" },
      { key: "resources", label: "Learning Resources", icon: "📁", path: "/resources" },
    ],
  },
  {
    label: "Student",
    items: [
      { key: "learning", label: "Learning Hub", icon: "🎓", path: "/learning" },
      // Slug mirrors STUDENT_ID from lib/learning-api.ts ("stu_demo") — there's
      // no auth yet, so this always points at the one demo student's wiki.
      { key: "wiki", label: "My Wiki", icon: "📔", path: "/wiki/student-stu_demo" },
    ],
  },
  {
    label: "Communication",
    items: [
      { key: "announcements", label: "Student Communication", icon: "📣", path: "/announcements" },
      { key: "parentCommunication", label: "Parent Communication", icon: "💬", path: "/parent-communication" },
      { key: "reports", label: "Reports", icon: "📄", path: "/reports" },
    ],
  },
]

export const VIEW_LABELS: Record<string, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.label]))
)

export const PATH_BY_VIEW: Record<ViewKey, string> = Object.fromEntries(
  NAV_GROUPS.flatMap((g) => g.items.map((i) => [i.key, i.path]))
) as Record<ViewKey, string>
