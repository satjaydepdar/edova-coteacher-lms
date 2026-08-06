import { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { FlagButton } from "./FlagButton"
import { LabPlayer } from "./LabPlayer"
import type { NewMistake } from "@/lib/types"

interface Props {
  addXP: (v: number) => void
  onMistake: (m: NewMistake) => void
  chapter: string
  /** S3-resolved URL of this chapter/topic's catalogued lab (doc_type "lab"), if any. */
  labUrl?: string
}

export function LabExercise({ addXP, onMistake, chapter, labUrl }: Props) {
  const [angle, setAngle] = useState(45)
  const [ans, setAns] = useState("")
  const [ok, setOk] = useState<boolean | null>(null)

  // A real catalogued lab for this chapter/topic takes over; otherwise fall
  // back to the built-in demo below (same degrade-gracefully pattern as the
  // chapter PDF/video when nothing's catalogued yet).
  if (labUrl) {
    return <LabPlayer labUrl={labUrl} chapter={chapter} addXP={addXP} onMistake={onMistake} />
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Interactive Lab - Drag to place incident ray</CardTitle>
        </CardHeader>
        <CardContent>
          <svg viewBox="0 0 300 200" className="h-[200px] w-full rounded-[8px] border border-card-border bg-white">
            <line x1="0" y1="100" x2="300" y2="100" stroke="var(--edova-card-border)" strokeWidth="2" />
            <line x1="150" y1="100" x2={150 + 80 * Math.cos((angle - 90) * Math.PI / 180)} y2={100 + 80 * Math.sin((angle - 90) * Math.PI / 180)} stroke="var(--edova-ink)" strokeWidth="3" />
            <line x1="150" y1="100" x2={150 + 80 * Math.cos((90 - angle) * Math.PI / 180)} y2={100 + 80 * Math.sin((90 - angle) * Math.PI / 180)} stroke="var(--edova-gold)" strokeWidth="3" strokeDasharray="6 4" />
            <circle cx="150" cy="100" r="4" fill="var(--edova-ink)" />
          </svg>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm">Angle:</span>
            <Input type="range" min="10" max="80" value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="flex-1" />
            <Badge variant="secondary" className="font-mono">{angle}°</Badge>
          </div>
          <FlagButton context={`Lab angle ${angle}°`} className="mt-3" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Hands-on Check</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">If incident is {angle}°, what is reflected?</p>
          <div className="flex gap-2">
            <Input value={ans} onChange={(e) => setAns(e.target.value)} placeholder="e.g. 45" className="bg-white" />
            <Button variant="default" onClick={() => { const o = Number(ans) === angle; setOk(o); if (o) addXP(30) }}>Check</Button>
          </div>
          {ok !== null && (
            <Badge variant={ok ? "success" : "danger"}>
              {ok ? "Correct! +30 XP Lab Master" : "Try again, remember i=r"}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
