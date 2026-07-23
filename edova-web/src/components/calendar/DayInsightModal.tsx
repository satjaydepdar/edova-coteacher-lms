import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronUp, MessageSquare, UserPlus } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { PLANNED_COVERAGE_BY_CLASS } from "@/data/seed"
import { useSchoolStore } from "@/store/school-store"
import { EntryCard } from "./EntryCard"
import { dateKey } from "./utils"
import {
  classIdByName, getAtRisk, getFunnel, getMastery, getPlanSnapshot, getWeeklyCompliance,
} from "./insights"
import type { CalendarEntry } from "./types"

const WARNING = "#B45309"
const DANGER = "#DC2626"
const OK_GREEN = "#15803D"

const fieldLabel = "mb-1.5 text-[13px] font-semibold text-[#6B7280]"
const fieldInput =
  "h-[36px] w-full rounded-[8px] border border-[#E5E7EB] px-3 text-[13.5px] font-[inherit] outline-none bg-white"

interface DayInsightModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date | null
  entries: CalendarEntry[] // that day, already teacher-filtered
  classOptions: string[]
  onSave: (entry: CalendarEntry) => void
  onDelete: (id: string) => void
}

export function DayInsightModal({ open, onOpenChange, date, entries, classOptions, onSave, onDelete }: DayInsightModalProps) {
  const showFlash = useSchoolStore((s) => s.showFlash)

  const classTabs = useMemo(() => [...new Set(entries.map((e) => e.classSection))], [entries])
  const [activeTab, setActiveTab] = useState<string>("")
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ classSection: "", subjectChapter: "", assignment: "", percentCovered: 0 })

  // Reset tab + form whenever a different date is opened.
  useEffect(() => {
    setActiveTab(classTabs[0] ?? "")
    setFormOpen(classTabs.length === 0)
    setEditingId(null)
    setForm({ classSection: classTabs[0] ?? "", subjectChapter: "", assignment: "", percentCovered: 0 })
  }, [date, classTabs])

  if (!date) return null

  const tab = activeTab || classTabs[0] || ""
  const entry = entries.find((e) => e.classSection === tab)
  const classId = classIdByName(tab)

  const snapshot = getPlanSnapshot(tab, entry, PLANNED_COVERAGE_BY_CLASS)
  const variance = snapshot && snapshot.plannedPct !== null ? snapshot.taughtPct - snapshot.plannedPct : null
  const compliance = classId ? getWeeklyCompliance(classId, date) : []
  const funnel = classId ? getFunnel(classId, date) : null
  const atRisk = classId ? getAtRisk(classId, date) : []
  const mastery = classId ? getMastery(classId) : null

  function startEdit(e: CalendarEntry) {
    setEditingId(e.id)
    setForm({ classSection: e.classSection, subjectChapter: e.subjectChapter, assignment: e.assignment, percentCovered: e.percentCovered })
    setFormOpen(true)
  }

  function handleSave() {
    if (!form.classSection || !form.subjectChapter) return
    onSave({
      id: editingId ?? `entry_${Date.now()}`,
      date: dateKey(date!),
      ...form,
    })
    setEditingId(null)
    setForm({ classSection: tab, subjectChapter: "", assignment: "", percentCovered: 0 })
    setFormOpen(false)
  }

  const sectionTitle = "mb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-text-secondary"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[440px] max-w-[92vw] rounded-[16px] border p-5"
        style={{ background: "#FFFCF8", borderColor: "#E8DFD3", maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* header: date + variance badge */}
        <div className="mb-3 flex items-center justify-between gap-2 pr-5">
          <DialogTitle className="font-display text-[17px] font-bold text-ink">
            {date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })}
          </DialogTitle>
          {variance !== null && (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{
                background: variance < 0 ? "#FEF3C7" : "#DCFCE7",
                color: variance < 0 ? WARNING : OK_GREEN,
              }}
            >
              {variance < 0 ? `${Math.abs(variance)}% Behind` : variance > 0 ? `${variance}% Ahead` : "On track"}
            </span>
          )}
        </div>

        {/* class tabs */}
        {classTabs.length > 0 && (
          <div className="mb-4 flex gap-1.5 border-b border-[#E8DFD3] pb-2">
            {classTabs.map((c) => (
              <button
                key={c}
                onClick={() => { setActiveTab(c); setEditingId(null) }}
                className={`cursor-pointer rounded-[7px] px-2.5 py-1 text-[12px] font-semibold ${
                  tab === c ? "bg-ink text-sidebar-text" : "text-text-secondary hover:bg-[#F4F1EA]"
                }`}
              >
                {c.replace(" — Section ", " ")}
              </button>
            ))}
          </div>
        )}

        {/* Section 1 — plan snapshot */}
        <div className="mb-4">
          <div className={sectionTitle}>Plan snapshot</div>
          {snapshot ? (
            <div className="rounded-[10px] border border-card-border bg-white p-3">
              <div className="mb-1.5 text-[14px] font-semibold text-ink">{snapshot.topic}</div>
              <div className="flex items-center gap-2 text-[13px] text-text-secondary">
                <span>{snapshot.taughtPct}% taught</span>
                <span>·</span>
                {snapshot.plannedPct !== null ? (
                  <span>Planned: {snapshot.plannedPct}%</span>
                ) : (
                  <button className="cursor-pointer font-semibold text-okf hover:underline">
                    Set annual plan to see variance
                  </button>
                )}
              </div>
              <div className="relative mt-2">
                <Progress value={snapshot.taughtPct} className="h-2" />
                {snapshot.plannedPct !== null && (
                  <div
                    className="absolute top-[-3px] h-[14px] w-[2px] bg-[#B45309]"
                    style={{ left: `${snapshot.plannedPct}%` }}
                    title={`Planned ${snapshot.plannedPct}%`}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-card-border bg-white p-3 text-[13px] text-text-secondary">
              No plan entry for this class on this date — add one below to track coverage.
            </div>
          )}
          {compliance.length > 0 && (
            <div className="mt-2 text-[13px] text-text-secondary">
              This week:{" "}
              {compliance.map((c) => (
                <span key={c.title} className="mr-2 inline-block rounded-full px-2 py-[2px] text-[11.5px] font-semibold"
                  style={{
                    background: c.status === "done" ? "#DCFCE7" : c.status === "overdue" ? "#FEE2E2" : "#F3F4F6",
                    color: c.status === "done" ? OK_GREEN : c.status === "overdue" ? DANGER : "#4B5563",
                  }}>
                  {c.title} · {c.status === "done" ? "done" : c.status === "overdue" ? `overdue (${c.due})` : `due ${c.due}`}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Section 2 — class health */}
        {funnel ? (
          <div className="mb-4">
            <div className={sectionTitle}>Class health — {funnel.assignmentTitle}</div>
            <div className="rounded-[10px] border border-card-border bg-white p-3">
              {funnel.submitted === funnel.total && funnel.total > 0 ? (
                <div className="text-[14px] font-semibold text-ink">
                  🎉 All {funnel.total} submitted{funnel.avgScoreLast ? `! Avg ${funnel.avgScoreLast}` : ""}
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-semibold">
                    <span className="text-[#15803D]">{funnel.submitted} Submitted</span>
                    {funnel.late > 0 && <span style={{ color: WARNING }}>{funnel.late} Late</span>}
                    {funnel.notStarted > 0 && <span className="text-text-secondary">{funnel.notStarted} Not started</span>}
                    {funnel.missing > 0 && <span style={{ color: DANGER }}>{funnel.missing} Missing</span>}
                  </div>
                  <div className="mt-2 flex h-[8px] overflow-hidden rounded-full">
                    <div className="bg-[#15803D]" style={{ width: `${(funnel.submitted / funnel.total) * 100}%` }} />
                    <div style={{ width: `${(funnel.late / funnel.total) * 100}%`, background: WARNING }} />
                    <div className="bg-[#D1D5DB]" style={{ width: `${(funnel.notStarted / funnel.total) * 100}%` }} />
                    <div style={{ width: `${(funnel.missing / funnel.total) * 100}%`, background: DANGER }} />
                  </div>
                </>
              )}
              {funnel.avgScoreLast && (
                <div className="mt-2 text-[12.5px] text-text-secondary">Avg score last HW: {funnel.avgScoreLast}</div>
              )}
              {mastery && (
                <div className="mt-3 border-t border-card-border pt-2.5">
                  <div className="mb-1.5 text-[12.5px] font-semibold text-ink">Topic mastery</div>
                  <div className="flex h-[8px] overflow-hidden rounded-full">
                    <div className="bg-[#15803D]" style={{ width: `${(mastery.mastered / (mastery.mastered + mastery.developing + mastery.needsHelp)) * 100}%` }} />
                    <div className="bg-[#D9A94E]" style={{ width: `${(mastery.developing / (mastery.mastered + mastery.developing + mastery.needsHelp)) * 100}%` }} />
                    <div style={{ width: `${(mastery.needsHelp / (mastery.mastered + mastery.developing + mastery.needsHelp)) * 100}%`, background: DANGER }} />
                  </div>
                  <div className="mt-1.5 flex gap-3 text-[11.5px] text-text-secondary">
                    <span>{mastery.mastered} Mastered</span>
                    <span>{mastery.developing} Getting there</span>
                    <span>{mastery.needsHelp} Needs reteach</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : classId ? (
          <div className="mb-4 rounded-[10px] border border-dashed border-card-border bg-white p-3 text-[13px] text-text-secondary">
            Assignment given today? Check back tomorrow for submission status.
          </div>
        ) : null}

        {/* Section 3 — students at risk */}
        {atRisk.length > 0 && funnel && (
          <div className="mb-4">
            <div className={sectionTitle}>Students at risk</div>
            <div className="space-y-2">
              {atRisk.slice(0, 3).map(({ student, riskScore, bucket, reason }) => (
                <div key={student.id} className="rounded-[10px] border border-card-border bg-white p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[13.5px] font-semibold text-ink">{student.name}</span>
                      <span
                        className="ml-2 rounded-full px-2 py-[1px] text-[10.5px] font-bold"
                        style={{
                          background: bucket === "critical" ? "#FEE2E2" : bucket === "falling" ? "#FEF3C7" : "#F3F4F6",
                          color: bucket === "critical" ? DANGER : bucket === "falling" ? WARNING : "#4B5563",
                        }}
                      >
                        {bucket === "critical" ? "Critical" : bucket === "falling" ? "Falling behind" : "Watch"}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => showFlash("resource", `Message drafted for ${student.name}'s parent.`)}
                        className="cursor-pointer rounded-[6px] border border-card-border p-1.5 text-text-secondary hover:bg-[#F4F1EA]"
                        title="Message parent"
                      >
                        <MessageSquare className="size-3.5" />
                      </button>
                      <button
                        onClick={() => showFlash("resource", `Remedial assigned to ${student.name}.`)}
                        className="cursor-pointer rounded-[6px] border border-card-border p-1.5 text-text-secondary hover:bg-[#F4F1EA]"
                        title="Assign remedial"
                      >
                        <UserPlus className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-text-secondary">{reason} · risk {riskScore}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 4 — add entry, collapsed by default */}
        <div className="rounded-[10px] border border-card-border bg-white">
          <button
            onClick={() => setFormOpen(!formOpen)}
            className="flex w-full cursor-pointer items-center justify-between p-3 text-[13.5px] font-bold text-ink"
          >
            {editingId ? "Edit entry" : "Add entry"}
            {formOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </button>

          {formOpen && (
            <div className="border-t border-card-border p-3 pt-2.5">
              {entries.filter((e) => !tab || e.classSection === tab).map((e) => (
                <div key={e.id} className="mb-2">
                  <EntryCard entry={e} onEdit={() => startEdit(e)} onDelete={() => onDelete(e.id)} />
                </div>
              ))}

              <div className="mb-3">
                <div className={fieldLabel}>Class / Section</div>
                <Select value={form.classSection} onValueChange={(v) => setForm({ ...form, classSection: v })}>
                  <SelectTrigger className="h-[36px] w-full rounded-[8px] border-[#E5E7EB] text-[13.5px]">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="mb-3">
                <div className={fieldLabel}>Subject – Chapter</div>
                <input
                  className={fieldInput}
                  placeholder="e.g. Math – Quadratic Equations"
                  value={form.subjectChapter}
                  onChange={(e) => setForm({ ...form, subjectChapter: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <div className={fieldLabel}>Assignment / Homework / Exercise</div>
                <input
                  className={fieldInput}
                  placeholder="e.g. Exercise 4.2 Q1–Q5"
                  value={form.assignment}
                  onChange={(e) => setForm({ ...form, assignment: e.target.value })}
                />
              </div>
              <div className="mb-4">
                <div className={fieldLabel}>Topic Covered Till Date</div>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={100} value={form.percentCovered}
                    onChange={(e) => setForm({ ...form, percentCovered: Number(e.target.value) })}
                    className="flex-1 accent-[#1A2E1A]"
                  />
                  <span className="w-[36px] text-right text-[13px] font-semibold text-ink">{form.percentCovered}%</span>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={!form.classSection || !form.subjectChapter}>
                  {editingId ? "Save changes" : "Add entry"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
