"use client"
import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"

type Assignment = {
  id: string
  title: string
  subject: string
  chapter: string
  dueLabel: string // "Today 5PM" | "Tomorrow" | "Overdue"
  status: "overdue" | "due_today" | "due_soon"
}

type Props = {
  assignments?: Assignment[]
  onGoToChapter: (chapter: string, subject: string) => void
  onStartRecommended?: () => void
}

// Dummy recommended tasks - replace with your system plan
const RECOMMENDED = [
  { id: "r1", title: "Watch 10-min video on Reflection", meta: "10m • Science > Light", xp: "+10 XP" },
  { id: "r2", title: "Take 5-question quiz", meta: "15m • +50 XP", xp: "+50 XP" },
  { id: "r3", title: "Fix 3 mistakes in Journal", meta: "12m • High impact", xp: "+30 XP" },
]

export function StudyPlan({ assignments = [], onGoToChapter, onStartRecommended }: Props) {
  const [expanded, setExpanded] = useState(false)

  // Sort: overdue > due_today > due_soon
  const sorted = [...assignments].sort((a, b) => {
    const order = { overdue: 0, due_today: 1, due_soon: 2 }
    return order[a.status] - order[b.status]
  })

  const nextUp = sorted[0] // Single action - most urgent
  const remainingCount = Math.max(0, sorted.length - 1 + RECOMMENDED.length)
  const isTeacherTask = !!nextUp

  return (
    <Card className={`rounded-[12px] border bg-white ${isTeacherTask ? "border-l-4 border-l-[#DC2626] border-[#E5E7EB]" : "border-l-4 border-l-[#D9A94E] border-[#E5E7EB]"}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[14px]">🗓</span>
            <p className="font-[Poppins] font-bold text-[14px] text-[#13231F]">Today's Plan</p>
            <Badge variant="secondary" className="font-mono text-[10px] font-normal">Cures decision fatigue</Badge>
          </div>
          {sorted.length > 0 && (
            <Badge variant={nextUp.status === "overdue" ? "danger" : nextUp.status === "due_today" ? "danger" : "warning"} className="text-[11px]">
              {sorted.length} {sorted.length === 1 ? "assignment" : "assignments"}
            </Badge>
          )}
        </div>

        {/* SINGLE ACTION - Hero */}
        {nextUp ? (
          <div className="flex items-center justify-between gap-4 bg-[#F5F1E6] rounded-[8px] p-3">
            <div className="flex items-start gap-3">
              <Checkbox className="mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant={nextUp.status === "overdue" ? "danger" : nextUp.status === "due_today" ? "danger" : "warning"} className="text-[10px] h-5">
                    {nextUp.status === "overdue" ? "OVERDUE" : nextUp.status === "due_today" ? "DUE TODAY" : "DUE SOON"} • TEACHER
                  </Badge>
                  <span className="text-[11px] text-[#6B7280] font-mono">{nextUp.dueLabel}</span>
                </div>
                <p className="font-[Inter] font-semibold text-[14px] text-[#13231F] mt-1 leading-tight">{nextUp.title}</p>
                <p className="text-[12px] text-[#6B7280] mt-0.5">{nextUp.subject} • {nextUp.chapter}</p>
              </div>
            </div>
            <Button variant="gold" size="default" className="shrink-0 font-bold" onClick={() => onGoToChapter(nextUp.chapter, nextUp.subject)}>
              Start Now →
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 bg-[#F5F1E6] rounded-[8px] p-3">
            <div className="flex items-start gap-3">
              <Checkbox className="mt-0.5" />
              <div>
                <Badge variant="okf" className="text-[10px] h-5">RECOMMENDED</Badge>
                <p className="font-[Inter] font-semibold text-[14px] text-[#13231F] mt-1">{RECOMMENDED[0].title}</p>
                <p className="text-[12px] text-[#6B7280] mt-0.5">{RECOMMENDED[0].meta}</p>
              </div>
            </div>
            <Button variant="default" size="default" className="shrink-0" onClick={onStartRecommended}>
              Continue
            </Button>
          </div>
        )}

        {/* Collapsed trigger - small, muted */}
        {remainingCount > 0 && (
          <button onClick={() => setExpanded(!expanded)} className="mt-3 text-[12px] text-[#6B7280] hover:text-[#13231F] font-[Inter] flex items-center gap-1">
            <span>+{remainingCount} more {remainingCount === 1 ? "task" : "tasks"}</span>
            <span className="text-[10px]">{expanded ? "▲" : "▼"}</span>
          </button>
        )}

        {/* Expanded list - only on demand */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-[#E5E7EB] space-y-3 animate-in fade-in">
            {/* Remaining teacher assignments */}
            {sorted.slice(1).length > 0 && (
              <div>
                <p className="text-[11px] font-bold tracking-widest text-[#6B7280] mb-2">TEACHER ASSIGNED</p>
                <div className="space-y-2">
                  {sorted.slice(1).map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-white border border-[#E5E7EB] rounded-[8px] p-2.5">
                      <div className="flex items-start gap-2">
                        <Checkbox className="mt-0.5 scale-90" />
                        <div>
                          <p className="text-[13px] font-medium text-[#13231F] leading-tight">{a.title}</p>
                          <p className="text-[11px] text-[#6B7280]">{a.subject} • Due {a.dueLabel}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => onGoToChapter(a.chapter, a.subject)}>Go</Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended */}
            <div>
              <p className="text-[11px] font-bold tracking-widest text-[#6B7280] mb-2">RECOMMENDED FOR YOU</p>
              <div className="space-y-2">
                {(nextUp ? RECOMMENDED : RECOMMENDED.slice(1)).map(r => (
                  <div key={r.id} className="flex items-center justify-between bg-[#F5F1E6]/60 border border-transparent rounded-[8px] p-2.5">
                    <div className="flex items-start gap-2">
                      <Checkbox className="mt-0.5 scale-90" />
                      <div>
                        <p className="text-[13px] font-medium text-[#13231F] leading-tight">{r.title}</p>
                        <p className="text-[11px] text-[#6B7280]">{r.meta}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-mono text-[#6B7280]">{r.xp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}