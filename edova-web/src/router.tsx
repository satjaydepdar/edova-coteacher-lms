import { createBrowserRouter, Navigate } from "react-router-dom"
import { AppLayout } from "@/components/layout/AppLayout"
import Login from "@/pages/Login"
import Calendar from "@/pages/Calendar"
import Settings from "@/pages/Settings"
import KnowledgeGraph from "@/pages/KnowledgeGraph"
import LessonPlanner from "@/pages/LessonPlanner"
import SyllabusMap from "@/pages/SyllabusMap"
import AssignmentTracker from "@/pages/AssignmentTracker"
import AssignmentWizard from "@/pages/AssignmentWizard"
import AssignmentDashboard from "@/pages/AssignmentDashboard"
import AssignmentEvaluate from "@/pages/AssignmentEvaluate"
import AssessmentBuilder from "@/pages/AssessmentBuilder"
import Attendance from "@/pages/Attendance"
import LearningResources from "@/pages/LearningResources"
import Announcements from "@/pages/Announcements"
import ParentCommunication from "@/pages/ParentCommunication"
import Reports from "@/pages/Reports"
import LearningHub from "@/pages/LearningHub"
import WikiPage from "@/pages/WikiPage"

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/calendar" replace /> },
      { path: "calendar", element: <Calendar /> },
      { path: "settings", element: <Settings /> },
      { path: "knowledge-graph", element: <KnowledgeGraph /> },
      { path: "lesson-planner", element: <LessonPlanner /> },
      { path: "curriculum-map", element: <SyllabusMap /> },
      { path: "assignment-tracker", element: <AssignmentTracker /> },
      { path: "assignment-tracker/new", element: <AssignmentWizard /> },
      { path: "assignment-tracker/:id", element: <AssignmentDashboard /> },
      { path: "assignment-tracker/:id/evaluate", element: <AssignmentEvaluate /> },
      // Old routes absorbed into the combined Assignment Tracker page.
      { path: "assignments", element: <Navigate to="/assignment-tracker" replace /> },
      { path: "homework-tracker", element: <Navigate to="/assignment-tracker" replace /> },
      { path: "assessment-builder", element: <AssessmentBuilder /> },
      { path: "attendance", element: <Attendance /> },
      { path: "resources", element: <LearningResources /> },
      { path: "announcements", element: <Announcements /> },
      { path: "parent-communication", element: <ParentCommunication /> },
      { path: "reports", element: <Reports /> },
      { path: "learning", element: <LearningHub /> },
      { path: "wiki/:slug", element: <WikiPage /> },
      { path: "*", element: <Navigate to="/calendar" replace /> },
    ],
  },
])
