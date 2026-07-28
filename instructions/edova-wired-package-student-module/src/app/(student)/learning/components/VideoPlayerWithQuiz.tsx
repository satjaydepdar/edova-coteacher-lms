"use client"
import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FlagButton } from "./FlagButton"

const QUESTIONS = [
  { q: "What is the law of reflection?", opts: ["i = r", "i > r", "i < r"], ans: 0, exp: "Angle of incidence equals angle of reflection" },
  { q: "Type of reflection on smooth surface?", opts: ["Diffuse", "Regular", "Scattered"], ans: 1, exp: "Smooth surface gives regular reflection" },
  { q: "Incident ray 45°, reflected?", opts: ["30°", "45°", "90°"], ans: 1, exp: "i = r so 45°" },
]

export function VideoPlayerWithQuiz({ addXP, onMistake }: any) {
  const [ended, setEnded] = useState(false)
  const [qi, setQi] = useState(0)
  const [score, setScore] = useState(0)
  const [showBadge, setShowBadge] = useState(false)

  const handleAnswer = (idx: number) => {
    if(idx === QUESTIONS[qi].ans) { setScore(s=>s+1); setShowBadge(true); addXP(20); setTimeout(()=>setShowBadge(false),1500) }
    else { onMistake({ id: Date.now(), q: QUESTIONS[qi].q, yourAns: QUESTIONS[qi].opts[idx], correct: QUESTIONS[qi].opts[QUESTIONS[qi].ans], chapter: "Light", date: new Date().toISOString().slice(0,10), solution: QUESTIONS[qi].exp }) }
    if(qi < QUESTIONS.length-1) setQi(qi+1)
  }

  return (
    <div className="space-y-4">
      <Card className="bg-[#F5F1E6] border-[#E5E7EB] rounded-[12px] overflow-hidden">
        <div className="aspect-video bg-[#13231F] flex items-center justify-center relative">
          <span className="text-[#FBF7EE] font-[Poppins] text-lg">▶ Science - Reflection Video</span>
          <div className="absolute bottom-3 left-3 right-3 h-1 bg-white/20 rounded"><div className="h-full w-[68%] bg-[#D9A94E] rounded"/></div>
          <FlagButton context="Video 02:14 - Laws of reflection" className="absolute top-3 right-3" />
        </div>
        <CardContent className="p-4 flex justify-between items-center">
          <span className="text-sm text-[#6B7280] font-[Inter]">10 min • Watched 7:14</span>
          <Button variant="gold" size="sm" onClick={()=>{ setEnded(true); addXP(10)}}>Simulate Video End</Button>
        </CardContent>
      </Card>

      {ended && (
        <Card className="bg-[#F5F1E6] border-[#E5E7EB] rounded-[12px] animate-in slide-in-from-bottom-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="font-[Poppins] text-[17px] text-[#13231F]">Test your learning</CardTitle>
            <Badge variant="secondary">{qi+1} / {QUESTIONS.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="font-[Inter] text-[15px] text-[#13231F]">{QUESTIONS[qi].q}</p>
            <div className="grid gap-2">
              {QUESTIONS[qi].opts.map((o,i)=> (
                <Button key={i} variant="outline" className="justify-start h-auto py-3 bg-white hover:bg-[#FBF7EE]" onClick={()=>handleAnswer(i)}>{o}</Button>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <FlagButton context={`Quiz Q${qi+1}: ${QUESTIONS[qi].q}`} />
              <Badge variant="success" className="gap-1">Badges: {score} 🏅</Badge>
            </div>
            {showBadge && <div className="text-center py-2 animate-bounce"><Badge variant="success">+ Badge Earned! ⭐</Badge></div>}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
