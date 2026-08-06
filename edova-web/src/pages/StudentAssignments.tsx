import { useEffect, useState } from "react"
import { PageHeader } from "@/components/common/PageHeader"
import { submissionStatusStyle, SUBMISSION_LABEL } from "@/lib/styles"
import { getMyAssignments, submitMyAssignment, type MyAssignment } from "@/lib/student-api"
import { useSchoolStore } from "@/store/school-store"
import { useAppStore } from "@/store/app-store"

function formatDue(due: string | null): string {
  if (!due) return "No due date"
  return new Date(due).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

interface ParsedQuestion {
  id: string
  label: string
  text: string
  options: string[]
}

// Parse the answer key embedded in the description by AssessmentBuilder
function parseAnswerKey(description: string): Record<string, string> {
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

function parseQuestions(description: string): ParsedQuestion[] {
  if (!description) return []

  // 1. Strip __ANSWER_KEY__:{...} block completely
  let cleanDesc = description.replace(/__ANSWER_KEY__:\s*\{.*?\}\s*/g, "").trim()
  if (!cleanDesc) return []

  // 2. Pre-process text: insert newlines before question numbers and options if they were collapsed onto one line
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

function isAnswerMatching(studentVal: string, correctVal: string): boolean {
  if (!studentVal || !correctVal) return false
  const s = studentVal.trim().toLowerCase()
  const c = correctVal.trim().toLowerCase()
  const sClean = s.replace(/^[a-d][\)\.]\s*/i, "").trim()
  const cClean = c.replace(/^[a-d][\)\.]\s*/i, "").trim()
  return s === c || sClean === cClean || s.includes(cClean) || c.includes(sClean) || sClean.includes(c) || cClean.includes(s)
}

function getCorrectAnswerForQuestion(q: ParsedQuestion, idx: number, answerKey: Record<string, string>): string {
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

// Extract display text from an option string like "A) Some text" -> "Some text"
function optionDisplayText(opt: string): string {
  return opt.replace(/^[A-D][\)\.]\s*/i, "").trim()
}

function getAnswersForAssignment(a: MyAssignment, activeAnswersMap: Record<string, string>, isOpen: boolean): Record<string, string> {
  if (isOpen && Object.keys(activeAnswersMap).length > 0) {
    return activeAnswersMap
  }
  if (a.text_response) {
    try {
      const parsed = JSON.parse(a.text_response)
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {}
  }
  const saved = localStorage.getItem(`edova_answers_${a.id}`)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed
      }
    } catch {}
  }
  return {}
}

export default function StudentAssignments() {
  const [assignments, setAssignments] = useState<MyAssignment[]>([])
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [answersMap, setAnswersMap] = useState<Record<string, string>>({})
  const [singleDraft, setSingleDraft] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [currentQIndexMap, setCurrentQIndexMap] = useState<Record<string, number>>({})
  const [submittedQMap, setSubmittedQMap] = useState<Record<string, Record<string, boolean>>>({})

  function reload() {
    const getStoreAssignments = (): MyAssignment[] => {
      const storeAssignments = useSchoolStore.getState().assignments || []
      return storeAssignments.map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description || "",
        due_date: a.dueIso || a.due || null,
        points_possible: a.totalPoints || 10,
        submission_type: a.type || "video",
        classroom_name: a.classId || "Class 10",
        submission_status: "not_started",
        submitted_at: null,
        text_response: null,
        points_earned: null,
        feedback: null,
      }))
    }

    getMyAssignments()
      .then((apiAssignments) => {
        const localItems = getStoreAssignments()
        const mergedMap = new Map<string, MyAssignment>()
        localItems.forEach((item) => mergedMap.set(item.id, item))
        apiAssignments.forEach((item) => mergedMap.set(item.id, item))
        setAssignments(Array.from(mergedMap.values()))
      })
      .catch(() => {
        const localItems = getStoreAssignments()
        setAssignments(localItems)
      })
  }

  useEffect(() => { reload() }, [])

  function openAssignment(a: MyAssignment) {
    if (openId === a.id) {
      setOpenId(null)
      return
    }
    setOpenId(a.id)

    let parsed: Record<string, string> = {}
    if (a.text_response) {
      try {
        parsed = JSON.parse(a.text_response)
      } catch {
        parsed = { main: a.text_response }
      }
    } else {
      const saved = localStorage.getItem(`edova_answers_${a.id}`)
      if (saved) {
        try {
          parsed = JSON.parse(saved)
        } catch {}
      }
    }

    let savedSubmittedQs: Record<string, boolean> = {}
    const savedQs = localStorage.getItem(`edova_submitted_qs_${a.id}`)
    if (savedQs) {
      try { savedSubmittedQs = JSON.parse(savedQs) } catch {}
    }

    setSubmittedQMap((prev) => ({ ...prev, [a.id]: savedSubmittedQs }))
    if (currentQIndexMap[a.id] == null) {
      setCurrentQIndexMap((prev) => ({ ...prev, [a.id]: 0 }))
    }

    setAnswersMap(parsed)
    setSingleDraft(a.text_response ?? "")
  }

  function updateQuestionAnswer(aId: string, qKey: string, val: string) {
    setAnswersMap((prev) => {
      const next = { ...prev, [qKey]: val }
      localStorage.setItem(`edova_answers_${aId}`, JSON.stringify(next))
      return next
    })
  }

  function submitSingleQuestion(a: MyAssignment, qId: string, questions: ParsedQuestion[]) {
    const nextForA = { ...(submittedQMap[a.id] || {}), [qId]: true }
    setSubmittedQMap((prev) => ({ ...prev, [a.id]: nextForA }))
    localStorage.setItem(`edova_submitted_qs_${a.id}`, JSON.stringify(nextForA))

    // If all questions are submitted, trigger overall turnIn
    const allDone = questions.every((q) => nextForA[q.id])
    if (allDone) {
      turnIn(a, questions)
    }
  }

  async function turnIn(a: MyAssignment, questions: ParsedQuestion[]) {
    setSubmitting(true)
    try {
      let payload = singleDraft
      let calculatedScore: number | null = null

      if (questions.length > 0) {
        // Build submission payload: map question id -> selected option display text
        const answerKey = parseAnswerKey(a.description)
        payload = JSON.stringify(answersMap)

        if (Object.keys(answerKey).length > 0) {
          // We have a real answer key — grade against it
          let correct = 0
          questions.forEach((q, idx) => {
            const correctVal = getCorrectAnswerForQuestion(q, idx, answerKey)
            const studentVal = answersMap[q.id] || ""

            if (isAnswerMatching(studentVal, correctVal)) {
              correct++
            }
          })
          calculatedScore = Math.round((correct / questions.length) * a.points_possible * 10) / 10
        }
      }

      const sessionUser = useAppStore.getState().session?.user
      const studentId = sessionUser?.id || "s1"
      useSchoolStore.getState().recordStudentSubmission(a.id, studentId, payload, calculatedScore)

      if (calculatedScore !== null) {
        localStorage.setItem(`edova_score_${a.id}`, String(calculatedScore))
        localStorage.setItem(`edova_score_${studentId}_${a.id}`, String(calculatedScore))
      }
      localStorage.setItem(`edova_submitted_${a.id}`, "true")

      try {
        await submitMyAssignment(a.id, payload)
      } catch {
        // Best effort backend sync
      }

      setSubmitError(null)
      setOpenId(null)
      reload()
    } catch (err: any) {
      setSubmitError("Submission failed. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }



  return (
    <div>
      <PageHeader title="My Assignments" subtitle="Your real homework, in one place." />
      {submitError && (
        <div className="mb-4 flex items-center justify-between rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-[13.5px] text-[#991B1B]">
          <span>⚠️ {submitError}</span>
          <button onClick={() => setSubmitError(null)} className="ml-4 font-bold text-[#991B1B] hover:opacity-70">✕</button>
        </div>
      )}
      {assignments.length === 0 && (
        <div className="rounded-[12px] border border-card-border bg-cream p-5 text-[14px] text-text-secondary shadow-card">
          Nothing assigned yet.
        </div>
      )}
      <div className="space-y-3">
        {assignments.map((a) => {
          const isOpen = openId === a.id
          const aAnswers = getAnswersForAssignment(a, answersMap, isOpen)
          const isLocallySubmitted = localStorage.getItem(`edova_submitted_${a.id}`) === "true"
          const isSubmitted =
            a.submission_status === "submitted" ||
            a.submission_status === "late" ||
            a.submission_status === "graded" ||
            isLocallySubmitted

          const questions = parseQuestions(a.description)
          const isAssessment =
            a.submission_type === "mcq" ||
            a.title.toLowerCase().includes("assessment") ||
            a.title.toLowerCase().includes("quiz") ||
            questions.length > 0

          const answerKey = parseAnswerKey(a.description)
          let calculatedLiveScore: number | null = null
          if (questions.length > 0 && Object.keys(answerKey).length > 0) {
            let correct = 0
            let answeredCount = 0
            questions.forEach((qItem, idx) => {
              const correctVal = getCorrectAnswerForQuestion(qItem, idx, answerKey)
              const studentVal = aAnswers[qItem.id] || ""
              if (studentVal) {
                answeredCount++
                if (isAnswerMatching(studentVal, correctVal)) {
                  correct++
                }
              }
            })
            if (answeredCount > 0 || isSubmitted) {
              calculatedLiveScore = Math.round((correct / questions.length) * a.points_possible * 10) / 10
            }
          }

          const savedScore = localStorage.getItem(`edova_score_${a.id}`)
          const parsedSavedScore = savedScore !== null ? parseFloat(savedScore) : null
          const currentStudentId = useAppStore.getState().session?.user.id || "s1"
          const storeAssignment = useSchoolStore.getState().assignments.find((x) => x.id === a.id)
          const storeSub = storeAssignment?.submissions.find((s) => s.studentId === currentStudentId)
          const storeScore = storeSub?.score

          const displayScore = a.points_earned ?? storeScore ?? parsedSavedScore ?? calculatedLiveScore
          const isGraded = displayScore !== null || a.submission_status === "graded" || (isSubmitted && isAssessment)

          return (
            <div key={a.id} className="rounded-[12px] border border-card-border bg-cream shadow-card">
              <button
                type="button"
                onClick={() => openAssignment(a)}
                className="flex w-full cursor-pointer items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[15px] font-semibold text-ink">{a.title}</span>
                    <span className="rounded-full border border-card-border bg-white px-2.5 py-0.5 text-[11px] font-semibold text-text-secondary">
                      {isAssessment ? "Online Assessment" : a.submission_type}
                    </span>
                  </div>
                  <div className="mt-0.5 text-[13px] text-text-secondary">
                    {a.classroom_name} · Due {formatDue(a.due_date)} · {a.points_possible} points
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {displayScore != null && (
                    <span className="text-[14px] font-bold text-[#15803D]">
                      {displayScore}/{a.points_possible}
                    </span>
                  )}
                  <span style={submissionStatusStyle(isGraded ? "graded" : a.submission_status)}>
                    {isGraded ? "Graded" : SUBMISSION_LABEL[a.submission_status]}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-card-border px-5 py-4">
                  {isGraded && a.feedback && (
                    <div className="mb-4 rounded-[8px] border border-[#BBF7D0] bg-[#F0FDF4] p-3 text-[13.5px] text-[#166534]">
                      <span className="font-semibold">Teacher feedback: </span>
                      {a.feedback}
                    </div>
                  )}

                  {questions.length > 0 ? (
                    <div className="mb-4">
                      {(() => {
                        const qIdx = currentQIndexMap[a.id] ?? 0
                        const safeQIdx = Math.max(0, Math.min(qIdx, questions.length - 1))
                        const q = questions[safeQIdx]
                        const val = aAnswers[q.id] || ""
                        const hasOptions = q.options.length >= 2
                        const correctAnswerText = getCorrectAnswerForQuestion(q, safeQIdx, answerKey).trim().toLowerCase()

                        const isThisQSubmitted = isSubmitted || !!submittedQMap[a.id]?.[q.id]
                        const isCurrentQCorrect = isThisQSubmitted && !!val && isAnswerMatching(val, correctAnswerText)
                        const hasAnsweredCurrent = !!val.trim()
                        const isLastQ = safeQIdx === questions.length - 1

                        return (
                          <div>
                            {/* Step Indicator Header */}
                            <div className="mb-4 flex items-center justify-between border-b border-card-border pb-3">
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-[#16332B] px-3 py-1 text-[12px] font-bold text-white">
                                  Question {safeQIdx + 1} of {questions.length}
                                </span>
                                {isThisQSubmitted && (
                                  isCurrentQCorrect ? (
                                    <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.5 text-[11px] font-semibold text-[#15803D]">
                                      ✓ Correct Answer
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-[#FEF2F2] px-2.5 py-0.5 text-[11px] font-semibold text-[#991B1B]">
                                      ✕ Wrong Answer
                                    </span>
                                  )
                                )}
                              </div>
                              {/* Question dot navigation */}
                              <div className="flex items-center gap-1.5">
                                {questions.map((qItem, i) => {
                                  const qStudentAns = aAnswers[qItem.id] || ""
                                  const qCorrectAns = getCorrectAnswerForQuestion(qItem, i, answerKey)
                                  const qDone = isSubmitted || !!submittedQMap[a.id]?.[qItem.id] || !!qStudentAns
                                  const isQCorrect = qDone && !!qStudentAns && isAnswerMatching(qStudentAns, qCorrectAns)
                                  const isQWrong = qDone && !!qStudentAns && !isQCorrect
                                  const isCurr = i === safeQIdx

                                  let dotClass = "bg-white text-text-secondary border border-card-border hover:bg-cream"
                                  if (isCurr) {
                                    dotClass = "bg-[#16332B] text-white ring-2 ring-[#16332B] ring-offset-1"
                                  } else if (isQWrong) {
                                    dotClass = "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                                  } else if (isQCorrect) {
                                    dotClass = "bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]"
                                  } else if (qDone) {
                                    dotClass = "bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]"
                                  }

                                  return (
                                    <button
                                      key={qItem.id}
                                      type="button"
                                      onClick={() => setCurrentQIndexMap((prev) => ({ ...prev, [a.id]: i }))}
                                      className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold transition ${dotClass}`}
                                    >
                                      {i + 1}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>

                            {/* Single Question View */}
                            <div className="rounded-[10px] border border-card-border bg-white p-4 shadow-sm">
                              <div className="mb-2 text-[14.5px] font-semibold text-ink">
                                {q.label} {q.text}
                              </div>
                              {hasOptions ? (
                                <div className="space-y-2 mt-3">
                                  {q.options.map((optRaw, oIdx) => {
                                    const optText = optionDisplayText(optRaw)
                                    const isSelected = val === optRaw || val === optText
                                    const isCorrectAnswer = correctAnswerText && (
                                      optText.toLowerCase().includes(correctAnswerText) ||
                                      correctAnswerText.includes(optText.toLowerCase())
                                    )

                                    let cardStyle: string
                                    let icon: string | null = null
                                    if (isThisQSubmitted) {
                                      if (isCorrectAnswer) {
                                        cardStyle = "border-[#15803D] bg-[#F0FDF4] font-semibold text-[#15803D] cursor-default"
                                        icon = "✓"
                                      } else if (isSelected && !isCorrectAnswer) {
                                        cardStyle = "border-[#EF4444] bg-[#FEF2F2] font-semibold text-[#991B1B] cursor-default"
                                        icon = "✗"
                                      } else {
                                        cardStyle = "border-card-border bg-cream opacity-40 cursor-default"
                                      }
                                    } else if (isSelected) {
                                      cardStyle = "border-[#16332B] bg-[#ECFDF5] font-semibold text-[#065F46] cursor-pointer"
                                    } else {
                                      cardStyle = "border-card-border bg-cream hover:bg-white cursor-pointer"
                                    }

                                    return (
                                      <label
                                        key={oIdx}
                                        onClick={() => !isThisQSubmitted && updateQuestionAnswer(a.id, q.id, optText)}
                                        className={`flex items-center justify-between gap-3 rounded-[8px] border p-3 text-[13.5px] transition ${cardStyle}`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <input
                                            type="radio"
                                            name={`q_${a.id}_${safeQIdx}`}
                                            disabled={isThisQSubmitted}
                                            checked={isSelected}
                                            onChange={() => !isThisQSubmitted && updateQuestionAnswer(a.id, q.id, optText)}
                                            className="h-4 w-4 accent-[#16332B]"
                                          />
                                          <span>{optText || optRaw}</span>
                                        </div>
                                        {isThisQSubmitted && icon && (
                                          <span className={`text-[13px] font-bold ${isCorrectAnswer ? "text-[#15803D]" : "text-[#EF4444]"}`}>
                                            {icon} {isCorrectAnswer ? "Correct Answer" : "Wrong"}
                                          </span>
                                        )}
                                      </label>
                                    )
                                  })}
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  value={val}
                                  disabled={isThisQSubmitted}
                                  onChange={(e) => updateQuestionAnswer(a.id, q.id, e.target.value)}
                                  placeholder="Type your answer here…"
                                  className="mt-2 h-10 w-full rounded-[8px] border border-card-border bg-cream px-3 text-[13.5px] outline-none focus:bg-white focus:ring-2 focus:ring-ring disabled:opacity-75"
                                />
                              )}
                            </div>

                            {/* Action Controls: Previous, Submit Answer, Next */}
                            <div className="mt-4 flex items-center justify-between border-t border-card-border pt-4">
                              <button
                                type="button"
                                disabled={safeQIdx === 0}
                                onClick={() => setCurrentQIndexMap((prev) => ({ ...prev, [a.id]: safeQIdx - 1 }))}
                                className="rounded-[8px] border border-card-border bg-white px-4 py-2 text-[13.5px] font-semibold text-text-secondary hover:bg-cream disabled:opacity-40 transition"
                              >
                                ← Previous
                              </button>

                              <div className="flex items-center gap-2">
                                {!isThisQSubmitted ? (
                                  <button
                                    type="button"
                                    disabled={!hasAnsweredCurrent || submitting}
                                    onClick={() => submitSingleQuestion(a, q.id, questions)}
                                    className="rounded-[8px] bg-[#16332B] px-5 py-2 text-[13.5px] font-semibold text-white hover:bg-[#112721] disabled:opacity-50 transition"
                                  >
                                    Submit Answer
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  disabled={!isThisQSubmitted || isLastQ}
                                  onClick={() => setCurrentQIndexMap((prev) => ({ ...prev, [a.id]: safeQIdx + 1 }))}
                                  className="rounded-[8px] bg-[#16332B] px-5 py-2 text-[13.5px] font-semibold text-white hover:bg-[#112721] disabled:opacity-40 transition"
                                >
                                  Next →
                                </button>
                              </div>
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  ) : (
                    <div className="mb-4">
                      {a.description && (
                        <p className="mb-3 text-[13.5px] leading-relaxed text-text-secondary whitespace-pre-wrap">{a.description}</p>
                      )}
                      <textarea
                        value={singleDraft}
                        disabled={isSubmitted}
                        onChange={(e) => setSingleDraft(e.target.value)}
                        rows={4}
                        placeholder="Type your answer here…"
                        className="w-full resize-none rounded-[8px] border border-card-border bg-white px-3.5 py-3 text-[14px] outline-none focus:ring-2 focus:ring-ring disabled:opacity-75 disabled:bg-cream"
                      />
                    </div>
                  )}

                  {questions.length === 0 && (
                    <div className="mt-3 flex justify-end items-center gap-3">
                      {isSubmitted && (
                        <span className="text-[12.5px] font-semibold text-[#065F46]">
                          ✓ Submitted — Evaluation complete
                        </span>
                      )}
                      <button
                        type="button"
                        disabled={submitting || isSubmitted}
                        onClick={() => turnIn(a, questions)}
                        className="rounded-[8px] px-5 py-2 text-[14px] font-semibold text-white disabled:opacity-60 transition"
                        style={{ background: isSubmitted ? "#059669" : "#16332B", cursor: isSubmitted ? "default" : "pointer" }}
                      >
                        {isSubmitted ? "Submitted" : "Submit Assignment"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

