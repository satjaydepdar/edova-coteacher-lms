import { FileText, PenLine, ListChecks, Video, Code2 } from "lucide-react"
import type { AssignmentType } from "@/lib/types"

// Assignment submission-method catalogue — shown on the wizard's first
// screen and used to label/icon assignments everywhere else (dashboard,
// evaluate header). Ported from the assign-evaluate-flow mockup.
export const ASSIGNMENT_TYPES: {
  id: AssignmentType
  title: string
  desc: string
  icon: typeof FileText
}[] = [
  {
    id: "written",
    title: "Written",
    desc: "Students submit handwritten work or typed documents as images or PDFs",
    icon: FileText,
  },
  {
    id: "pdf",
    title: "PDF Annotation",
    desc: "Students annotate directly on the PDF you provide",
    icon: PenLine,
  },
  {
    id: "mcq",
    title: "Online MCQ",
    desc: "Auto-graded quizzes with multiple choice, true/false and more",
    icon: ListChecks,
  },
  {
    id: "media",
    title: "Multimedia",
    desc: "Video, audio or presentation submissions for creative tasks",
    icon: Video,
  },
  {
    id: "coding",
    title: "Coding",
    desc: "In-browser code editor with test cases and auto evaluation",
    icon: Code2,
  },
]

export function assignmentTypeOf(id?: AssignmentType) {
  return ASSIGNMENT_TYPES.find((t) => t.id === id) ?? ASSIGNMENT_TYPES[0]
}
