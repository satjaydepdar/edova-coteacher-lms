import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

export function StudyPlan() {
  return (
    <Card className="bg-white border-[#E5E7EB] rounded-[12px] border-l-4 border-l-[#D9A94E]">
      <CardHeader className="pb-3"><div className="flex justify-between items-center"><CardTitle className="font-[Poppins] text-[17px]">🗓 Today's Plan - The Virtual Tutor</CardTitle><Badge variant="secondary" className="font-mono">Cures decision fatigue</Badge></div></CardHeader>
      <CardContent className="flex gap-6">
        <label className="flex gap-2 items-start bg-[#F5F1E6] p-3 rounded-[8px] flex-1"><Checkbox /><div><p className="text-sm font-semibold">Watch 10-min video on Reflection</p><p className="text-xs text-[#6B7280]">10m • Science &gt; Light</p></div></label>
        <label className="flex gap-2 items-start bg-[#F5F1E6] p-3 rounded-[8px] flex-1"><Checkbox /><div><p className="text-sm font-semibold">Take 5-question quiz</p><p className="text-xs text-[#6B7280]">15m • +50 XP</p></div></label>
        <label className="flex gap-2 items-start bg-[#FBEBD6] border border-[#F3D6BA] p-3 rounded-[8px] flex-1"><Checkbox /><div><p className="text-sm font-semibold">Fix 3 mistakes in Journal</p><p className="text-xs text-[#8A4B1F]">12m • High impact</p></div></label>
      </CardContent>
    </Card>
  )
}
