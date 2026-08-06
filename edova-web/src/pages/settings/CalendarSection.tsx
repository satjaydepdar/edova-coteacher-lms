// Academic Calendar tab: sorted entry grid. Pure render.
import type { AcademicCalendarItem } from "@/lib/types"
import { FlashBanner } from "@/components/common/FlashBanner"
import {
  FragmentKey,
  bodyCell,
  deleteLink,
  editLink,
  primaryBtn,
  th,
} from "./settings-utils"

export interface CalendarSectionProps {
  rows: AcademicCalendarItem[]
  onAddEntry: () => void
  onEditEntry: (id: string) => void
  onDeleteEntry: (id: string) => void
}

export function CalendarSection(p: CalendarSectionProps) {
  return (
    <div className="rounded-[12px] border border-card-border bg-cream p-5 shadow-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#111827" }}>Academic Calendar</div>
          <div style={{ fontSize: 13.5, color: "#6B7280", marginTop: 2 }}>Holidays and events reduce effective teaching days used by the Timetable's Period Allocation Summary.</div>
        </div>
        <button style={{ ...primaryBtn, whiteSpace: "nowrap" }} onClick={p.onAddEntry}>+ Add Entry</button>
      </div>

      <FlashBanner flashKey="calendar" />

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr 1fr 1fr" }}>
        {th("Date")}
        {th("Label")}
        {th("Type")}
        {th("Actions", { textAlign: "right" })}
        {p.rows.map((r) => (
          <FragmentKey key={r.id}>
            <div style={{ ...bodyCell, fontSize: 15.5, fontWeight: 600, color: "#111827" }}>{r.date}</div>
            <div style={bodyCell}>{r.label}</div>
            <div style={bodyCell}>{r.type}</div>
            <div style={{ ...bodyCell, justifyContent: "flex-end", whiteSpace: "nowrap" }}>
              {editLink(() => p.onEditEntry(r.id))}
              {deleteLink(() => p.onDeleteEntry(r.id))}
            </div>
          </FragmentKey>
        ))}
      </div>
    </div>
  )
}
