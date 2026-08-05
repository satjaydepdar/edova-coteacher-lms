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

export interface ParsedQuestion {
  id: string
  label: string
  text: string
  options: string[]
}

export function parseAnswerKey(description?: string): Record<string, string> {
  if (!description) return {}
  const match = description.match(/__ANSWER_KEY__:\s*(\{.*?\})/)
  if (match) {
    try {
      return JSON.parse(match[1])
    } catch {
      return {}
    }
  }
  return {}
}

export function parseQuestions(description?: string): ParsedQuestion[] {
  if (!description) return []

  let cleanDesc = description.replace(/__ANSWER_KEY__:\s*\{.*?\}\s*/g, "").trim()
  if (!cleanDesc) return []

  cleanDesc = cleanDesc
    .replace(/\s+(\d+(\.\d+)?[\)\.]|Q\d+[\.\)])\s+/gi, "\n$1 ")
    .replace(/\s+([A-D][\)\.]|Option\s+[A-D])\s+/gi, "\n$1 ")

  const lines = cleanDesc
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  const list: ParsedQuestion[] = []
  let current: ParsedQuestion | null = null

  for (const line of lines) {
    const qMatch = line.match(/^(\d+(\.\d+)?[\)\.]|Q\d+[\.\)])\s*(.*)/i)
    const optMatch = line.match(/^([A-D][\)\.]|Option\s+[A-D])\s*(.*)/i)

    if (qMatch) {
      if (current) list.push(current)
      const cleanId = qMatch[1].trim().replace(/[\)\:]+$/, "").replace(/\.$/, "").replace(/^Q/i, "")
      current = {
        id: cleanId,
        label: qMatch[1],
        text: qMatch[3] || line,
        options: [],
      }
    } else if (optMatch && current) {
      current.options.push(line)
    } else if (current) {
      if (current.options.length > 0) {
        current.options.push(line)
      } else {
        current.text += " " + line
      }
    }
  }
  if (current) list.push(current)
  return list
}

export function isAnswerMatching(studentVal: string, correctVal: string): boolean {
  if (!studentVal || !correctVal) return false
  const s = studentVal.trim().toLowerCase()
  const c = correctVal.trim().toLowerCase()
  const sClean = s.replace(/^[a-d][\)\.]\s*/i, "").trim()
  const cClean = c.replace(/^[a-d][\)\.]\s*/i, "").trim()
  return s === c || sClean === cClean || s.includes(cClean) || c.includes(sClean) || sClean.includes(c) || cClean.includes(s)
}

export function getCorrectAnswerForQuestion(q: ParsedQuestion, idx: number, answerKey: Record<string, string>): string {
  if (!answerKey || Object.keys(answerKey).length === 0) return ""
  if (answerKey[q.id]) return answerKey[q.id]
  const secQKey = `1.${idx + 1}`
  if (answerKey[secQKey]) return answerKey[secQKey]
  const numKey = `${idx + 1}`
  if (answerKey[numKey]) return answerKey[numKey]
  const foundKey = Object.keys(answerKey).find(
    (k) => k === q.id || k.endsWith(`.${idx + 1}`) || k === String(idx + 1)
  )
  if (foundKey) return answerKey[foundKey]
  return ""
}

export function autoEvaluateSubmission(textResponse: string | undefined, description: string | undefined, totalPoints: number): number | null {
  if (!textResponse || !description) return null
  const answerKey = parseAnswerKey(description)
  const questions = parseQuestions(description)
  if (questions.length === 0 || Object.keys(answerKey).length === 0) return null

  try {
    const answersMap = JSON.parse(textResponse)
    if (typeof answersMap !== "object" || answersMap === null) return null

    let correct = 0
    questions.forEach((q, idx) => {
      const correctVal = getCorrectAnswerForQuestion(q, idx, answerKey)
      const studentVal = answersMap[q.id] || answersMap[`1.${idx + 1}`] || ""
      if (studentVal && isAnswerMatching(studentVal, correctVal)) {
        correct++
      }
    })

    return Math.round((correct / questions.length) * totalPoints * 10) / 10
  } catch {
    return null
  }
}
