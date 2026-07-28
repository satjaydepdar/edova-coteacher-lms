import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { Mistake } from "@/lib/types"

export function MistakeJournal({ mistakes }: { mistakes: Mistake[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[24px]">📉 Mistake Journal - The Fix-It Tool</CardTitle>
        <CardDescription>Auto-generated personal notebook of every wrong answer. Turns failures into targeted revision.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {mistakes.map((m) => (
          <div key={m.id} className="flex justify-between gap-4 rounded-[8px] border border-card-border bg-white p-4">
            <div>
              <p className="text-[14px] font-semibold text-ink">{m.q}</p>
              <div className="mt-2 flex gap-2">
                <Badge variant="danger">Your: {m.yourAns}</Badge>
                <Badge variant="success">Correct: {m.correct}</Badge>
                <Badge variant="outline" className="font-mono">{m.chapter}</Badge>
              </div>
              <p className="mt-2 text-xs text-text-secondary">Solution: {m.solution}</p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="font-mono text-[11px]">{m.date}</Badge>
              <Button variant="gold" size="sm" className="mt-2 w-full">Practice Again</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
