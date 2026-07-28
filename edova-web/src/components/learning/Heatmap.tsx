import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const DATA = [
  { subj: "Mathematics", ch: ["Algebra", "Geometry", "Trig", "Stats"], vals: [2, 1, 0, 2] },
  { subj: "Science", ch: ["Light", "Force", "Atoms", "Bio"], vals: [0, 2, 1, 2] },
  { subj: "English", ch: ["Grammar", "Poetry", "Writing"], vals: [2, 1, 0] },
]
const COLORS = [
  "border-danger/20 bg-danger/12 text-danger",
  "border-warning/20 bg-warning/15 text-warning-strong",
  "border-success/20 bg-success/12 text-success",
]
const LABELS = ["Weak", "Average", "Strong"]

export function Heatmap() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[24px]">🟥🟩 Strengths & Weaknesses Heatmap</CardTitle>
        <CardDescription>The Self-Awareness Mirror - Red=Weak click to improve, Green=Strong</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {DATA.map((row) => (
            <div key={row.subj} className="flex items-center gap-3">
              <span className="w-[100px] font-display text-sm">{row.subj}</span>
              <div className="flex gap-2">
                {row.ch.map((c, i) => (
                  <div key={c} className={`flex h-[56px] w-[110px] flex-col items-center justify-center rounded-[8px] border ${COLORS[row.vals[i]]}`}>
                    <span className="text-xs font-bold">{c}</span>
                    <span className="text-[10px]">{LABELS[row.vals[i]]}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex gap-2">
          <Badge variant="danger">Red = Needs work</Badge>
          <Badge variant="warning">Yellow = Average</Badge>
          <Badge variant="success">Green = Strong</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
