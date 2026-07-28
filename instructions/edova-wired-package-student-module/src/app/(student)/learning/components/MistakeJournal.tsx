import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function MistakeJournal({ mistakes }: { mistakes: any[] }) {
  return (
    <Card className="bg-[#F5F1E6] border-[#E5E7EB] rounded-[12px]">
      <CardHeader><CardTitle className="font-[Poppins] text-[24px] text-[#13231F]">📉 Mistake Journal - The Fix-It Tool</CardTitle><p className="text-sm text-[#6B7280] font-[Inter]">Auto-generated personal notebook of every wrong answer. Turns failures into targeted revision.</p></CardHeader>
      <CardContent className="space-y-3">
        {mistakes.map(m=>(
          <div key={m.id} className="bg-white border border-[#E5E7EB] rounded-[8px] p-4 flex justify-between gap-4">
            <div><p className="font-[Inter] font-semibold text-[14px] text-[#13231F]">{m.q}</p><div className="flex gap-2 mt-2"><Badge variant="danger">Your: {m.yourAns}</Badge><Badge variant="success">Correct: {m.correct}</Badge><Badge variant="outline" className="font-mono">{m.chapter}</Badge></div><p className="text-xs mt-2 text-[#6B7280]">Solution: {m.solution}</p></div>
            <div className="text-right"><Badge variant="outline" className="font-mono text-[11px]">{m.date}</Badge><Button variant="gold" size="sm" className="mt-2 w-full">Practice Again</Button></div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
