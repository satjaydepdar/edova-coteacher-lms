"use client"
import { useState } from "react"
import { ChevronDown } from "lucide-react"
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

export type RecTask = { id: string; title: string; meta: string; xp: string }

type Props = {
  assignments?: Assignment[]
  // Real recommended tasks (memory-layer struggle cards + mistake journal),
  // built by the page. Empty = nothing to recommend.
  recommended?: RecTask[]
  onGoToChapter: (chapter: string, subject: string) => void
  onStartRecommended?: () => void
}

export function StudyPlan({ assignments = [], recommended = [], onGoToChapter, onStartRecommended }: Props) {
  // Whole-card accordion: closed by default so the plan doesn't eat vertical
  // space before a student has asked to see it. Separate from `showMore`,
  // which only matters once this is already open.
  const [open, setOpen] = useState(false)
  const [showMore, setShowMore] = useState(false)

  // Sort: overdue > due_today > due_soon
  const sorted = [...assignments].sort((a, b) => {
    const order = { overdue: 0, due_today: 1, due_soon: 2 }
    return order[a.status] - order[b.status]
  })

  const nextUp = sorted[0] // Single action - most urgent
  const remainingCount = Math.max(0, sorted.length - 1 + recommended.length)
  const isTeacherTask = !!nextUp
  const summary = sorted.length > 0
    ? `${sorted.length} ${sorted.length === 1 ? "task" : "tasks"} • ${nextUp.title}`
    : "All caught up"

  return (
    <Card className={`rounded-[12px] border bg-white ${isTeacherTask ? "border-l-4 border-l-[#DC2626] border-[#E5E7EB]" : "border-l-4 border-l-[#D9A94E] border-[#E5E7EB]"}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[14px]">🗓</span>
          <p className="font-[Poppins] font-bold text-[14px] text-[#13231F] shrink-0">Today's Plan</p>
          <span className="truncate text-[13px] text-[#6B7280]">{summary}</span>
        </div>
        <ChevronDown
          className={`size-4 shrink-0 text-[#6B7280] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
      <CardContent className="p-4 pt-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
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
        ) : recommended.length > 0 ? (
          <div className="flex items-center justify-between gap-4 bg-[#F5F1E6] rounded-[8px] p-3">
            <div className="flex items-start gap-3">
              <Checkbox className="mt-0.5" />
              <div>
                <Badge variant="okf" className="text-[10px] h-5">RECOMMENDED</Badge>
                <p className="font-[Inter] font-semibold text-[14px] text-[#13231F] mt-1">{recommended[0].title}</p>
                <p className="text-[12px] text-[#6B7280] mt-0.5">{recommended[0].meta}</p>
              </div>
            </div>
            <Button variant="default" size="default" className="shrink-0" onClick={onStartRecommended}>
              Continue
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-[#F5F1E6] rounded-[8px] p-3">
            <span className="text-[18px]">🎉</span>
            <p className="font-[Inter] font-semibold text-[14px] text-[#13231F]">All caught up — nothing pending right now.</p>
          </div>
        )}

        {/* Collapsed trigger - small, muted */}
        {remainingCount > 0 && (
          <button onClick={() => setShowMore(!showMore)} className="mt-3 text-[12px] text-[#6B7280] hover:text-[#13231F] font-[Inter] flex items-center gap-1">
            <span>+{remainingCount} more {remainingCount === 1 ? "task" : "tasks"}</span>
            <span className="text-[10px]">{showMore ? "▲" : "▼"}</span>
          </button>
        )}

        {/* Expanded list - only on demand */}
        {showMore && (
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
            {recommended.length > 0 && (
              <div>
                <p className="text-[11px] font-bold tracking-widest text-[#6B7280] mb-2">RECOMMENDED FOR YOU</p>
                <div className="space-y-2">
                  {(nextUp ? recommended : recommended.slice(1)).map(r => (
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
            )}
          </div>
        )}
      </CardContent>
        </div>
      </div>
    </Card>
  )
}