import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

export function StudyPlan() {
  return (
    <Card className="border-l-4 border-l-gold bg-white">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>🗓 Today's Plan - The Virtual Tutor</CardTitle>
          <Badge variant="secondary" className="font-mono">Cures decision fatigue</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex gap-6">
        <label className="flex flex-1 items-start gap-2 rounded-[8px] bg-cream p-3">
          <Checkbox />
          <div>
            <p className="text-sm font-semibold">Watch 10-min video on Reflection</p>
            <p className="text-xs text-text-secondary">10m • Science &gt; Light</p>
          </div>
        </label>
        <label className="flex flex-1 items-start gap-2 rounded-[8px] bg-cream p-3">
          <Checkbox />
          <div>
            <p className="text-sm font-semibold">Take 5-question quiz</p>
            <p className="text-xs text-text-secondary">15m • +50 XP</p>
          </div>
        </label>
        <label className="flex flex-1 items-start gap-2 rounded-[8px] border border-weak-border bg-weak-bg p-3">
          <Checkbox />
          <div>
            <p className="text-sm font-semibold">Fix 3 mistakes in Journal</p>
            <p className="text-xs text-weak-text">12m • High impact</p>
          </div>
        </label>
      </CardContent>
    </Card>
  )
}
