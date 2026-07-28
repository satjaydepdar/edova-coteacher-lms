import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { useSchoolStore } from "@/store/school-store"
import { dateKey, parseDateKey } from "./utils"

// A small, standalone form for a *real* school event (meeting/holiday/exam/
// general) -- deliberately separate from DayInsightModal, which is a
// lesson-coverage dashboard, not a generic event-creation form.
const EVENT_TYPES = [
  { value: "meeting", label: "Meeting" },
  { value: "holiday", label: "Holiday" },
  { value: "exam", label: "Exam" },
  { value: "event", label: "General event" },
]

interface AddSchoolEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: Date
}

export function AddSchoolEventModal({ open, onOpenChange, date }: AddSchoolEventModalProps) {
  const createCalendarEvent = useSchoolStore((s) => s.createCalendarEvent)
  const showFlash = useSchoolStore((s) => s.showFlash)

  const [title, setTitle] = useState("")
  const [eventType, setEventType] = useState("meeting")
  const [eventDate, setEventDate] = useState(dateKey(date))
  const [isAllDay, setIsAllDay] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleSave() {
    if (!title.trim()) return
    setSaving(true)
    setError("")
    try {
      const startAt = isAllDay
        ? new Date(`${eventDate}T00:00:00`).toISOString()
        : new Date(`${eventDate}T09:00:00`).toISOString()
      await createCalendarEvent({ title: title.trim(), eventType, startAt, isAllDay })
      showFlash("calendar", `"${title.trim()}" added to the calendar.`)
      setTitle("")
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save this event")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[380px] max-w-[92vw] rounded-[16px] p-5">
        <DialogTitle className="mb-4 font-display text-[17px] font-bold text-ink">
          Add School Event
        </DialogTitle>

        <div className="mb-3">
          <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">Title</div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Staff Meeting"
            className="h-[38px] rounded-[8px] text-[13.5px]"
          />
        </div>

        <div className="mb-3">
          <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">Type</div>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="h-[38px] w-full rounded-[8px] text-[13.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="mb-3">
          <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">Date</div>
          <input
            type="date"
            value={eventDate}
            onChange={(e) => e.target.value && setEventDate(dateKey(parseDateKey(e.target.value)))}
            className="h-[38px] w-full rounded-[8px] border border-card-border bg-white px-3 text-[13.5px] text-ink outline-none"
          />
        </div>

        <label className="mb-4 flex items-center gap-2 text-[13px] text-text-secondary">
          <input type="checkbox" checked={isAllDay} onChange={(e) => setIsAllDay(e.target.checked)} />
          All day
        </label>

        {error && (
          <p className="mb-3 rounded-[8px] bg-[#FBEBD6] px-3 py-2 text-[12.5px] text-[#8A4B1F]">{error}</p>
        )}

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!title.trim() || saving}>
            {saving ? "Saving…" : "Add Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
