import { Pencil, Trash2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import type { CalendarEntry } from "./types"

export function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: CalendarEntry
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-[10px] border border-card-border bg-white p-3">
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="inline-block rounded-full bg-okf-bg px-2 py-[2px] text-[11px] font-semibold text-okf">
            {entry.classSection}
          </div>
          <div className="mt-1 truncate text-[13.5px] font-semibold text-ink">{entry.subjectChapter}</div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            aria-label="Edit entry"
            className="cursor-pointer rounded-[6px] p-1 text-text-secondary hover:bg-muted"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={onDelete}
            aria-label="Delete entry"
            className="cursor-pointer rounded-[6px] p-1 text-text-secondary hover:bg-muted"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
      {entry.assignment && <div className="mb-2 text-[12.5px] text-text-secondary">{entry.assignment}</div>}
      <div className="flex items-center gap-2">
        <Progress value={entry.percentCovered} className="h-1.5" />
        <span className="shrink-0 text-[11px] font-semibold text-text-secondary">{entry.percentCovered}%</span>
      </div>
    </div>
  )
}
