import { useMemo, useState } from "react"
import { submitQuiz, type MyAssignment, type QuizSubmitResult } from "@/lib/student-api"
import { recordMemoryEvent } from "@/lib/memory-api"
import { currentStudentId } from "@/lib/learning-api"

// The MCQ quiz runner (My Assignments → Online MCQ assignment). One attempt:
// after submitting, the card reopens as a read-only review with the score,
// per-question ✓/✗, the right answer, and the answer-key explanation.
// Scoring happens server-side; the review here just renders it.

interface GradableQuestion {
  id: string
  text: string
  points: number
  options: { label: string; text: string; correct: boolean }[]
}

function gradableQuestions(a: MyAssignment): GradableQuestion[] {
  return (a.sections ?? []).flatMap((sec) =>
    (sec.questions ?? [])
      .filter((q) => (q.options?.length ?? 0) > 0)
      .map((q) => ({
        id: q.id,
        text: q.text,
        points: q.marks ?? sec.pointsPer ?? 1,
        options: q.options!.map((o) => ({ label: o.label, text: o.text, correct: o.correct })),
      })),
  )
}

export function McqQuiz({ assignment, onSubmitted }: { assignment: MyAssignment; onSubmitted: () => void }) {
  const questions = useMemo(() => gradableQuestions(assignment), [assignment])
  const [selections, setSelections] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizSubmitResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Already submitted → review mode from the stored answers (server already graded).
  const submitted = assignment.submission_status !== "not_started"
  const storedSelections = useMemo(
    () => Object.fromEntries((assignment.answers ?? []).map((a) => [a.question_id, a.selected])),
    [assignment.answers],
  )
  const reviewSelections = result ? selections : storedSelections
  const resultByQid = useMemo(
    () => new Map((result?.results ?? []).map((r) => [r.question_id, r])),
    [result],
  )

  const answeredAll = questions.every((q) => selections[q.id])

  async function submit() {
    setSubmitting(true)
    try {
      const answers = questions.map((q) => ({ question_id: q.id, selected: selections[q.id] }))
      const res = await submitQuiz(assignment.id, answers)
      setResult(res)
      // Memory hook: each wrong answer feeds the struggle card + the class's
      // common-mistake pool (chapter = the assessment's topic tag).
      const chapter = assignment.topic_label || assignment.title
      const questionById = new Map(questions.map((q) => [q.id, q]))
      for (const r of res.results) {
        if (r.correct) continue
        const q = questionById.get(r.question_id)
        recordMemoryEvent({
          user_id: currentStudentId(),
          role: "student",
          event_type: "quiz_mistake",
          chapter,
          payload: { q: q?.text ?? "", yourAns: selections[r.question_id] ?? "" },
        })
      }
      onSubmitted()
    } finally {
      setSubmitting(false)
    }
  }

  const showReview = submitted || result !== null
  const scoreText = result
    ? `You scored ${result.score} / ${result.max_score}`
    : assignment.points_earned != null
      ? `You scored ${assignment.points_earned} / ${assignment.points_possible}`
      : null

  return (
    <div>
      {showReview && scoreText && (
        <div
          className="mb-4 rounded-[10px] px-4 py-3 text-[15px] font-bold"
          style={{ background: "#E9F1EC", border: "1px solid #BFE0D3", color: "#16332B" }}
        >
          {scoreText}
        </div>
      )}

      <div className="space-y-4">
        {questions.map((q, qi) => {
          const selected = showReview ? reviewSelections[q.id] : selections[q.id]
          // After a fresh submit the server's per-question results drive the
          // review; on a later visit, correctness is re-derived from the
          // stored answers + the correct flags in the question data.
          const selOpt = q.options.find((o) => o.label === selected || o.text === selected)
          const review = resultByQid.get(q.id) ?? (showReview && selOpt
            ? { correct: selOpt.correct, correct_answer: q.options.find((o) => o.correct)?.text ?? "", explanation: "" }
            : undefined)
          return (
            <div key={q.id}>
              <div className="mb-2 text-[14.5px] font-semibold text-ink">
                {qi + 1}. {q.text}
                <span className="ml-2 text-[12px] font-semibold text-text-muted">{q.points} pts</span>
                {showReview && (
                  <span className="ml-2 text-[12px] font-bold" style={{ color: review ? (review.correct ? "#16A34A" : "#DC2626") : "#6B7280" }}>
                    {review ? (review.correct ? "✓ Correct" : "✗ Wrong") : ""}
                  </span>
                )}
              </div>
              <div className="grid gap-2">
                {q.options.map((o) => {
                  const isSelected = selected === o.label || selected === o.text
                  let style: React.CSSProperties = { border: "1px solid #E5E1D2", background: "#fff" }
                  if (showReview && o.correct) {
                    style = { border: "1px solid #16A34A", background: "#F0FDF4" }
                  } else if (showReview && isSelected && review && !review.correct) {
                    style = { border: "1px solid #DC2626", background: "#FEF2F2" }
                  } else if (!showReview && isSelected) {
                    style = { border: "1px solid #16332B", background: "#E9F1EC" }
                  }
                  return (
                    <button
                      key={o.label}
                      type="button"
                      disabled={showReview}
                      onClick={() => setSelections((s) => ({ ...s, [q.id]: o.label }))}
                      className="flex items-center gap-3 rounded-[10px] px-4 py-2.5 text-left text-[14px] transition"
                      style={{ ...style, cursor: showReview ? "default" : "pointer" }}
                    >
                      <span
                        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[12px] font-bold"
                        style={{
                          background: isSelected ? "#16332B" : "#F3EFE3",
                          color: isSelected ? "#fff" : "#3D5A60",
                        }}
                      >
                        {o.label}
                      </span>
                      <span className="text-ink">{o.text}</span>
                      {showReview && o.correct && <span className="ml-auto text-[12px] font-bold text-[#16A34A]">Right answer</span>}
                    </button>
                  )
                })}
              </div>
              {showReview && review?.explanation && (
                <div className="mt-2 rounded-[8px] bg-[#F5F1E6] px-3.5 py-2.5 text-[13px] text-text-secondary">
                  💡 {review.explanation}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {!showReview && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={!answeredAll || submitting}
            onClick={submit}
            className="cursor-pointer rounded-[8px] px-5 py-2.5 text-[14px] font-semibold text-white disabled:opacity-50"
            style={{ background: "#16332B" }}
          >
            {submitting ? "Scoring…" : "Submit Quiz"}
          </button>
        </div>
      )}
    </div>
  )
}
