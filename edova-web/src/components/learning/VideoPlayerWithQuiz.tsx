import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FlagButton } from "./FlagButton"
import type { NewMistake, QuizQuestion } from "@/lib/types"

// Unlock the quiz once mostly watched rather than waiting for the literal
// last frame — a student who's seen the content shouldn't be stuck over a
// few seconds of trailing credits/silence.
const UNLOCK_THRESHOLD = 0.9
// No catalogued video for this chapter yet: there's nothing real to track
// progress on, so a short simulated watch timer stands in for it — this
// keeps the demo path honestly "auto-unlocking," not a manual fake button.
const SIMULATED_WATCH_SECONDS = 8

// Used when the clerk quiz API is unreachable (questions === undefined) —
// matches the seeded "Laws of Reflection" quiz so the degraded path still
// teaches the same content.
const FALLBACK_QUESTIONS: QuizQuestion[] = [
  { q: "What is the law of reflection?", opts: ["i = r", "i > r", "i < r"], ans: 0, exp: "Angle of incidence equals angle of reflection" },
  { q: "Type of reflection on smooth surface?", opts: ["Diffuse", "Regular", "Scattered"], ans: 1, exp: "Smooth surface gives regular reflection" },
  { q: "Incident ray 45°, reflected?", opts: ["30°", "45°", "90°"], ans: 1, exp: "i = r so 45°" },
]

interface Props {
  // undefined = quiz unknown (API down) → fallback set; [] = topic has no
  // quiz → quiz card hidden.
  questions?: QuizQuestion[]
  chapter: string
  videoUrl?: string
  addXP: (v: number) => void
  onMistake: (m: NewMistake) => void
}

export function VideoPlayerWithQuiz({ questions, chapter, videoUrl, addXP, onMistake }: Props) {
  const quiz = questions ?? FALLBACK_QUESTIONS
  const [ended, setEnded] = useState(false)
  const [simulatedProgress, setSimulatedProgress] = useState(0)
  const [qi, setQi] = useState(0)
  const [score, setScore] = useState(0)
  const [showBadge, setShowBadge] = useState(false)

  const handleUnlock = () => {
    if (ended) return
    setEnded(true)
    addXP(10)
  }

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    if (video.duration && video.currentTime / video.duration >= UNLOCK_THRESHOLD) {
      handleUnlock()
    }
  }

  // No real video for this chapter: simulate a short watch timer so the demo
  // path still auto-unlocks at 90%, instead of needing a manual button.
  // Self-contained (own "already unlocked" flag, not the outer `ended` state)
  // so the effect only needs to depend on videoUrl/addXP, both stable across
  // re-renders — depending on `ended` or the handleUnlock closure would
  // restart this timer from zero on unrelated re-renders.
  useEffect(() => {
    if (videoUrl) return
    const start = Date.now()
    let unlocked = false
    const id = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - start) / (SIMULATED_WATCH_SECONDS * 1000)) * 100)
      setSimulatedProgress(pct)
      if (!unlocked && pct / 100 >= UNLOCK_THRESHOLD) {
        unlocked = true
        setEnded(true)
        addXP(10)
        clearInterval(id)
      }
    }, 200)
    return () => clearInterval(id)
  }, [videoUrl, addXP])

  const handleAnswer = (idx: number) => {
    const current = quiz[qi]
    if (idx === current.ans) {
      setScore((s) => s + 1)
      setShowBadge(true)
      addXP(20)
      setTimeout(() => setShowBadge(false), 1500)
    } else {
      onMistake({
        q: current.q,
        yourAns: current.opts[idx],
        correct: current.opts[current.ans],
        chapter,
        solution: current.exp,
      })
    }
    if (qi < quiz.length - 1) setQi(qi + 1)
  }

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        {videoUrl ? (
          <div className="relative bg-ink">
            <video
              controls
              src={videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onEnded={handleUnlock}
              className="aspect-video w-full"
            />
            <FlagButton context={`Video - ${chapter}`} className="absolute right-3 top-3" />
          </div>
        ) : (
          <div className="relative flex aspect-video items-center justify-center bg-ink">
            <span className="font-display text-lg text-sidebar-text">▶ {chapter} Video</span>
            <div className="absolute bottom-3 left-3 right-3 h-1 rounded bg-white/20">
              <div
                className="h-full rounded bg-gold transition-[width] duration-200"
                style={{ width: `${ended ? 100 : simulatedProgress}%` }}
              />
            </div>
            <FlagButton context={`Video 02:14 - ${chapter}`} className="absolute right-3 top-3" />
          </div>
        )}
        <CardContent className="flex items-center justify-between p-4">
          <span className="text-sm text-text-secondary">
            {quiz.length > 0
              ? ended
                ? "Watched ✓"
                : "Watch the video to unlock the quiz"
              : ended
                ? "Watched ✓"
                : "Watch the lesson video"}
          </span>
        </CardContent>
      </Card>

      {ended && quiz.length > 0 && (
        <Card className="animate-in slide-in-from-bottom-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Test your learning</CardTitle>
            <Badge variant="secondary">{qi + 1} / {quiz.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-[15px] text-ink">{quiz[qi].q}</p>
            <div className="grid gap-2">
              {quiz[qi].opts.map((o, i) => (
                <Button key={i} variant="outline" className="h-auto justify-start bg-white py-3 hover:bg-cream" onClick={() => handleAnswer(i)}>
                  {o}
                </Button>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2">
              <FlagButton context={`Quiz Q${qi + 1}: ${quiz[qi].q}`} />
              <Badge variant="success" className="gap-1">Badges: {score} 🏅</Badge>
            </div>
            {showBadge && (
              <div className="py-2 text-center animate-bounce">
                <Badge variant="success">+ Badge Earned! ⭐</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
