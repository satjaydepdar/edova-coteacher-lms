// Student Learning Hub.

// One auto-journaled wrong answer (from video quizzes, labs, …). id/date are
// stamped by the clerk API ("mis_…" / YYYY-MM-DD); optimistic local rows get
// a "local_<ts>" id until the server row replaces them. Components submit the
// rest.
export interface Mistake {
  id: string
  q: string
  yourAns: string
  correct: string
  chapter: string
  date: string
  solution: string
}
export type NewMistake = Omit<Mistake, "id" | "date">

// One video-quiz question — the shape of the clerk /api/learning/quiz payload
// and of VideoPlayerWithQuiz's built-in fallback set.
export interface QuizQuestion {
  q: string
  opts: string[]
  ans: number
  exp: string
}
