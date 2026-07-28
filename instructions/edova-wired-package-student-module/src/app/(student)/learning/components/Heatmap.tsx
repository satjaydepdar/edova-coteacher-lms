import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

const DATA = [
  { subj: "Mathematics", ch: ["Algebra","Geometry","Trig","Stats"], vals: [2,1,0,2] },
  { subj: "Science", ch: ["Light","Force","Atoms","Bio"], vals: [0,2,1,2] },
  { subj: "English", ch: ["Grammar","Poetry","Writing"], vals: [2,1,0] },
]
const COLORS = ["bg-[rgba(220,38,38,.15)] text-[#DC2626] border-[#DC2626]/20", "bg-[rgba(245,158,11,.15)] text-[#D97706]", "bg-[rgba(22,163,74,.12)] text-[#16A34A]"]
const LABELS = ["Weak","Average","Strong"]

export function Heatmap() {
  return (
    <Card className="bg-[#F5F1E6] border-[#E5E7EB] rounded-[12px]">
      <CardHeader><CardTitle className="font-[Poppins] text-[24px]">🟥🟩 Strengths & Weaknesses Heatmap</CardTitle><p className="text-sm text-[#6B7280]">The Self-Awareness Mirror - Red=Weak click to improve, Green=Strong</p></CardHeader>
      <CardContent>
        <div className="grid gap-4">
          {DATA.map(row=>(
            <div key={row.subj} className="flex gap-3 items-center"><span className="w-[100px] font-[Poppins] text-sm">{row.subj}</span><div className="flex gap-2">{row.ch.map((c,i)=>(<div key={c} className={`w-[110px] h-[56px] rounded-[8px] border flex flex-col items-center justify-center ${COLORS[row.vals[i]]}`}><span className="text-xs font-bold">{c}</span><span className="text-[10px]">{LABELS[row.vals[i]]}</span></div>))}</div></div>
          ))}
        </div>
        <div className="flex gap-2 mt-6"><Badge variant="danger">Red = Needs work</Badge><Badge variant="warning">Yellow = Average</Badge><Badge variant="success">Green = Strong</Badge></div>
      </CardContent>
    </Card>
  )
}
