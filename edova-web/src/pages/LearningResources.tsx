import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import type {
  OkfResource,
  OkfResourceType,
  ResourceChapter,
  ResourceSubtopic,
  ResourceUnit,
} from "@/lib/types"
import { getAssetUrl } from "@/lib/media"
import { uploadLearningResource } from "@/lib/upload"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageHeader } from "@/components/common/PageHeader"
import { FlashBanner } from "@/components/common/FlashBanner"
import { SlideUpOverlay } from "@/components/common/SlideUpOverlay"
import { useSchoolStore } from "@/store/school-store"
import { cn } from "@/lib/utils"

// Redesign per Learning-Resources-Developer-Handoff-Notes.docx +
// Learning-resources-page.md + Learning-resources-css.md, restructured for
// scale: results are grouped into collapsible chapter "shelves", each with a
// coverage rail (one segment per subtopic — green full / amber partial /
// red-tint none) so the whole syllabus reads as a heat-map. Subtopics render
// as cards in a responsive grid; clicking a card opens a SlideUpOverlay
// detail panel with the resource rows, Assign/Undo, preview and Upload —
// per the handoff notes, no full-page modals. Filters + content are driven
// live by the Settings > Resource Library taxonomy (Class/Unit/Chapter/
// Subtopic).

const STATUS_CATEGORIES = ["Video", "Slides", "Quiz"] as const
type StatusCategory = (typeof STATUS_CATEGORIES)[number]
type CategoryStatus = "Assigned" | "Ready" | "Missing"

function categoryForType(type: OkfResourceType): StatusCategory {
  if (type === "Video") return "Video"
  if (type === "PPT") return "Slides"
  return "Quiz" // Worksheet, PDF, Quiz — practice/assessment material
}

function categoryStatus(
  resources: OkfResource[],
  category: StatusCategory,
  assignedIds: string[]
): CategoryStatus {
  const items = resources.filter(
    (r) => categoryForType(r.type) === category && (r.status ?? "ready") === "ready"
  )
  if (items.length === 0) return "Missing"
  if (items.some((r) => assignedIds.includes(r.id))) return "Assigned"
  return "Ready"
}

// Status pill palette (Learning-resources-css.md #2 colors, kept verbatim).
const STATUS_PILL_COLORS: Record<CategoryStatus, string> = {
  Ready: "bg-[#F0FDF4] text-[#16A34A]",
  Assigned: "bg-[#DCFCE7] text-[#15803D]",
  Missing: "bg-[#FEF2F2] text-[#DC2626]",
}

// Compact one-chip form of the old label+pill block, sized for subtopic
// cards in a grid: "Video · Ready" / "Slides · Missing".
function StatusPill({ category, status }: { category: StatusCategory; status: CategoryStatus }) {
  return (
    <span
      className={cn(
        "inline-block w-fit rounded-[4px] px-2 py-1 text-[11.5px] font-medium",
        STATUS_PILL_COLORS[status]
      )}
    >
      {category} · {status}
    </span>
  )
}

// Solid, high-contrast Assign button (css.md #5) — a visual payoff for the eye.
function AssignButton({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 rounded-[6px] bg-[#111827] px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-[#111827]/90"
    >
      Assign
    </button>
  )
}

function ResourceRow({
  resource,
  assigned,
  onAssign,
  onOpenPreview,
  onUndo,
}: {
  resource: OkfResource
  assigned: boolean
  onAssign: (id: string) => void
  onOpenPreview: (resource: OkfResource) => void
  onUndo: (id: string) => void
}) {
  if (resource.status === "processing") {
    return (
      <div className="animate-pulse text-[14px] font-medium text-text-secondary">
        {resource.title} • Processing by AI....
      </div>
    )
  }

  if (resource.status === "failed") {
    return (
      <div className="text-[14px] font-medium text-[#DC2626]">
        {resource.title} • Couldn't process this file.
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div
        className="min-w-0 flex-1 cursor-pointer"
        onClick={() => onOpenPreview(resource)}
      >
        <div className="text-[14px] font-medium text-[#111827] hover:underline">
          {resource.title}
        </div>
        <div className="mt-0.5 text-[12px] font-normal text-[#9CA3AF]">
          {resource.type} · {resource.meta} ·{" "}
          {resource.uploadedByTeacher ? "Uploaded by you" : "OKF Curated"}
        </div>
      </div>
      {assigned ? (
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-[12.5px] font-semibold text-success">
            Assigned
          </span>
          <span
            onClick={(e) => {
              e.stopPropagation()
              onUndo(resource.id)
            }}
            className="cursor-pointer text-[12.5px] font-semibold text-text-secondary underline underline-offset-2 hover:text-ink"
          >
            Undo
          </span>
        </div>
      ) : (
        <AssignButton
          onClick={(e) => {
            e.stopPropagation()
            onAssign(resource.id)
          }}
        />
      )}
    </div>
  )
}

function PreviewPanel({
  resource,
  assigned,
  onAssign,
}: {
  resource: OkfResource
  assigned: boolean
  onAssign: () => void
}) {
  const isVideo = resource.type === "Video"
  const status = resource.status ?? "ready"
  const previewUrl = resource.previewS3Key
    ? getAssetUrl(resource.previewS3Key)
    : null

  return (
    <div>
      <div className="mb-4">
        <div className="font-display text-[18px] font-bold text-ink">
          {resource.title}
        </div>
        <div className="mt-0.5 text-[13px] text-text-secondary">
          {resource.type} · {resource.meta}
        </div>
      </div>
      <div
        className={cn(
          "mb-5 flex items-center justify-center overflow-hidden rounded-[10px] border border-card-border bg-[#0B1220]",
          isVideo ? "aspect-video" : "min-h-[360px]"
        )}
      >
        {status === "processing" ? (
          <div className="text-[13.5px] text-white/70">
            Converting for preview…
          </div>
        ) : status === "failed" ? (
          <div className="text-[13.5px] text-white/70">
            Couldn't process this file. Try uploading it again.
          </div>
        ) : previewUrl ? (
          isVideo ? (
            // key={previewUrl} forces a fresh <video> element when the
            // student opens a different topic's video from the same panel.
            <video
              key={previewUrl}
              controls
              autoPlay
              controlsList="nodownload"
              className="h-full w-full"
            >
              <source src={previewUrl} />
            </video>
          ) : (
            <iframe
              key={previewUrl}
              src={previewUrl}
              title={resource.title}
              className="h-full w-full"
            />
          )
        ) : (
          // Seed/demo resource with no S3 file mapped yet.
          <div className="text-[13.5px] text-white/70">
            {isVideo ? "Video preview — playing" : "Document preview"}
          </div>
        )}
      </div>
      {assigned ? (
        <span className="text-[13.5px] font-semibold text-success">Assigned</span>
      ) : (
        <AssignButton onClick={onAssign} />
      )}
    </div>
  )
}

function FilterField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">
        {label}
      </div>
      {children}
    </div>
  )
}

const ALL = "all"

interface UploadTarget {
  subtopicId: string
  subtopicName: string
  category: StatusCategory
}

function UploadPanel({
  target,
  onCancel,
  onSubmit,
}: {
  target: UploadTarget
  onCancel: () => void
  onSubmit: (title: string, file: File) => void
}) {
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)

  const accept =
    target.category === "Video"
      ? ".mp4,.webm,.mov"
      : target.category === "Slides"
        ? ".ppt,.pptx,.pdf"
        : ".pdf,.doc,.docx,.md"

  return (
    <div>
      <div className="mb-4">
        <div className="font-display text-[18px] font-bold text-ink">
          Upload to OKF
        </div>
        <div className="mt-0.5 text-[13.5px] text-text-secondary">
          {target.subtopicName} · {target.category}
        </div>
      </div>

      <div className="mb-3.5">
        <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">
          Title
        </div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Practice Set A"
        />
      </div>

      <div className="mb-4">
        <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">
          File
        </div>
        <label className="block cursor-pointer rounded-[10px] border border-dashed border-card-border p-6 text-center text-[13.5px] text-text-secondary hover:border-ink/40">
          {file
            ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB`
            : `Click to choose a ${target.category === "Video" ? "video" : "file"} from your computer`}
          <input
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="flex justify-end gap-2 border-t border-card-border pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          disabled={!title || !file}
          onClick={() => onSubmit(title, file!)}
        >
          Upload
        </Button>
      </div>
    </div>
  )
}

export default function LearningResources() {
  const [searchParams] = useSearchParams()

  const resourceClasses = useSchoolStore((s) => s.resourceClasses)
  const resourceUnits = useSchoolStore((s) => s.resourceUnits)
  const resourceChapters = useSchoolStore((s) => s.resourceChapters)
  const resourceSubtopics = useSchoolStore((s) => s.resourceSubtopics)
  const okfAssignedByClass = useSchoolStore((s) => s.okfAssignedByClass)
  const assignOkfResources = useSchoolStore((s) => s.assignOkfResources)
  const undoOkfAssign = useSchoolStore((s) => s.undoOkfAssign)
  const addOkfUpload = useSchoolStore((s) => s.addOkfUpload)
  const markOkfUploadReady = useSchoolStore((s) => s.markOkfUploadReady)
  const markOkfUploadFailed = useSchoolStore((s) => s.markOkfUploadFailed)
  const showFlash = useSchoolStore((s) => s.showFlash)

  const [classFilter, setClassFilter] = useState(() => resourceClasses[0]?.id ?? ALL)
  const [unitFilter, setUnitFilter] = useState(ALL)
  const [chapterFilter, setChapterFilter] = useState(ALL)
  const [subTopicFilter, setSubTopicFilter] = useState(ALL)
  const [search, setSearch] = useState("")
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({})
  const [detailId, setDetailId] = useState<string | null>(null)
  const [preview, setPreview] = useState<OkfResource | null>(null)
  const [uploadTarget, setUploadTarget] = useState<UploadTarget | null>(null)

  // Joined view: every subtopic with its parent chapter + unit resolved.
  const flatSubtopics = useMemo(() => {
    const chapterById = new Map(resourceChapters.map((c) => [c.id, c]))
    const unitById = new Map(resourceUnits.map((u) => [u.id, u]))
    return resourceSubtopics.flatMap((subtopic) => {
      const chapter = chapterById.get(subtopic.chapterId)
      const unit = chapter ? unitById.get(chapter.unitId) : undefined
      return chapter && unit ? [{ subtopic, chapter, unit }] : []
    })
  }, [resourceSubtopics, resourceChapters, resourceUnits])

  const classScopedUnits = useMemo(
    () => (classFilter === ALL ? resourceUnits : resourceUnits.filter((u) => u.classId === classFilter)),
    [resourceUnits, classFilter]
  )

  const unitScopedChapters = useMemo(() => {
    const unitIds =
      unitFilter === ALL ? new Set(classScopedUnits.map((u) => u.id)) : new Set([unitFilter])
    return resourceChapters.filter((c) => unitIds.has(c.unitId))
  }, [resourceChapters, unitFilter, classScopedUnits])

  const chapterScopedSubtopics = useMemo(() => {
    const chapterIds =
      chapterFilter === ALL ? new Set(unitScopedChapters.map((c) => c.id)) : new Set([chapterFilter])
    return flatSubtopics.filter((row) => chapterIds.has(row.chapter.id))
  }, [flatSubtopics, chapterFilter, unitScopedChapters])

  const resolvedClassId = classFilter === ALL ? (resourceClasses[0]?.id ?? "") : classFilter

  const assignedIds = okfAssignedByClass[resolvedClassId] ?? []

  const filteredTopics = useMemo(() => {
    const q = search.trim().toLowerCase()
    return chapterScopedSubtopics.filter(({ subtopic, chapter }) => {
      if (subTopicFilter !== ALL && subtopic.id !== subTopicFilter) return false
      if (q) {
        const haystack = [subtopic.name, chapter.name, ...subtopic.resources.map((r) => r.title)]
          .join(" ")
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [chapterScopedSubtopics, subTopicFilter, search])

  const criteriaText = useMemo(() => {
    const parts: string[] = []
    if (classFilter !== ALL) {
      const c = resourceClasses.find((c) => c.id === classFilter)
      if (c) parts.push(c.name)
    }
    if (unitFilter !== ALL) {
      const u = resourceUnits.find((u) => u.id === unitFilter)
      if (u) parts.push(u.name)
    }
    if (chapterFilter !== ALL) {
      const ch = resourceChapters.find((c) => c.id === chapterFilter)
      if (ch) parts.push(`Chapter ${ch.number}: ${ch.name}`)
    }
    if (subTopicFilter !== ALL) {
      const found = flatSubtopics.find((t) => t.subtopic.id === subTopicFilter)
      if (found) parts.push(found.subtopic.name)
    }
    if (search.trim()) parts.push(`"${search.trim()}"`)
    return parts.length ? parts.join(" · ") : "All resources"
  }, [
    classFilter,
    unitFilter,
    chapterFilter,
    subTopicFilter,
    search,
    resourceClasses,
    resourceUnits,
    resourceChapters,
    flatSubtopics,
  ])

  // Deep link from Gradebook / Syllabus Map: open that chapter's shelf.
  useEffect(() => {
    const chId = searchParams.get("expandChapter")
    if (!chId) return
    setExpandedChapters((prev) => ({ ...prev, [chId]: true }))
  }, [searchParams])

  // Group the filtered rows into chapter shelves, preserving taxonomy order.
  const chapterGroups = useMemo(() => {
    const byChapter = new Map<
      string,
      { chapter: ResourceChapter; unit: ResourceUnit; subtopics: ResourceSubtopic[] }
    >()
    filteredTopics.forEach(({ subtopic, chapter, unit }) => {
      let group = byChapter.get(chapter.id)
      if (!group) {
        group = { chapter, unit, subtopics: [] }
        byChapter.set(chapter.id, group)
      }
      group.subtopics.push(subtopic)
    })
    return [...byChapter.values()]
  }, [filteredTopics])

  // Narrowed views auto-open their shelves; the broad view starts collapsed
  // so 20 chapters read as an overview instead of an endless scroll.
  const autoOpen =
    chapterFilter !== ALL || subTopicFilter !== ALL || !!search.trim() || chapterGroups.length === 1

  const detailRow = useMemo(
    () => (detailId ? flatSubtopics.find((r) => r.subtopic.id === detailId) ?? null : null),
    [detailId, flatSubtopics]
  )

  const openPreview = (resource: OkfResource) => setPreview(resource)

  const handleAssignOne = (resourceId: string) => {
    assignOkfResources(resolvedClassId, [resourceId])
    const className = resourceClasses.find((c) => c.id === resolvedClassId)?.name ?? "class"
    showFlash("resource", `Assigned to ${className} for tomorrow.`)
  }

  const handleUploadSubmit = (title: string, file: File) => {
    if (!uploadTarget) return
    const type: OkfResourceType =
      uploadTarget.category === "Video"
        ? "Video"
        : uploadTarget.category === "Slides"
          ? "PPT"
          : "Quiz"
    const resource: OkfResource = {
      id: `up_${uploadTarget.subtopicId}_${Date.now()}`,
      type,
      title,
      meta: file.name,
      okf_ref: "",
      status: "processing",
      uploadedByTeacher: true,
    }
    const subtopicId = uploadTarget.subtopicId
    addOkfUpload(subtopicId, resource)
    setUploadTarget(null)

    // Seed ids: sci10-ch05-t01 -> science/chapter sci10-ch05; else math.
    const subject = subtopicId.startsWith("sci") ? "science" : "math"
    const chapter = subtopicId.replace(/-t\d+$/, "")
    uploadLearningResource({
      file,
      title,
      subject,
      chapter,
      docType: type.toLowerCase(),
    })
      .then((res) =>
        markOkfUploadReady(
          subtopicId,
          resource.id,
          `${(file.size / 1048576).toFixed(1)} MB`,
          { previewS3Key: res.preview_s3_key, rawS3Key: res.s3_key },
        ),
      )
      .catch((err: Error) => {
        markOkfUploadFailed(subtopicId, resource.id)
        showFlash("resource", `Upload failed: ${err.message}`)
      })
  }

  return (
    <div>
      <PageHeader
        title="Learning Resources"
        subtitle="Teaching materials, worksheets, presentations, videos."
        actions={
          <div className="cursor-pointer rounded-[8px] bg-ink px-[18px] py-2.5 text-[15px] font-semibold text-sidebar-text">
            + Upload
          </div>
        }
      />

      <FlashBanner flashKey="resource" />

      <div className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-text-secondary">
        OKF Library
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <FilterField label="Class">
          <Select
            value={classFilter}
            onValueChange={(v) => {
              setClassFilter(v)
              setUnitFilter(ALL)
              setChapterFilter(ALL)
              setSubTopicFilter(ALL)
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-[130px] text-[13.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Classes</SelectItem>
              {resourceClasses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Unit">
          <Select
            value={unitFilter}
            onValueChange={(v) => {
              setUnitFilter(v)
              setChapterFilter(ALL)
              setSubTopicFilter(ALL)
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-[160px] text-[13.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Units</SelectItem>
              {classScopedUnits.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {classFilter === ALL
                    ? `${u.name} (${resourceClasses.find((c) => c.id === u.classId)?.name ?? ""})`
                    : u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="Chapter">
          <Select
            value={chapterFilter}
            onValueChange={(v) => {
              setChapterFilter(v)
              setSubTopicFilter(ALL)
            }}
          >
            <SelectTrigger className="h-8 w-auto min-w-[200px] text-[13.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Chapters</SelectItem>
              {unitScopedChapters.map((ch) => (
                <SelectItem key={ch.id} value={ch.id}>
                  Chapter {ch.number}: {ch.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField label="SubTopic">
          <Select value={subTopicFilter} onValueChange={setSubTopicFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[200px] text-[13.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Subtopics</SelectItem>
              {chapterScopedSubtopics.map(({ subtopic }) => (
                <SelectItem key={subtopic.id} value={subtopic.id}>
                  {subtopic.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </div>

      <div className="mb-3.5">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search resources by keyword or topic…"
          className="h-9 max-w-[420px] text-[13.5px]"
        />
      </div>

      <div className="mb-6 text-[13.5px] text-text-secondary">
        <span className="font-semibold text-text-muted">Showing: </span>
        {criteriaText}
        {resourceClasses.length > 0
          ? ` — select resources and assign them to ${resourceClasses.find((c) => c.id === resolvedClassId)?.name ?? ""}.`
          : " — no classes yet. Add them in Settings › Resource Library."}
      </div>

      {filteredTopics.length === 0 && (
        <div className="mb-4 rounded-[8px] bg-[#F9FAFB] px-4 py-6 text-center text-[13.5px] text-text-secondary">
          No topics match these filters. Clear a filter or search to see more.
        </div>
      )}

      <div>
        {chapterGroups.map(({ chapter, unit, subtopics }) => {
          const open = expandedChapters[chapter.id] ?? autoOpen
          // 0–3 non-missing formats per subtopic drives the coverage rail.
          const coverage = subtopics.map(
            (st) =>
              STATUS_CATEGORIES.filter(
                (cat) => categoryStatus(st.resources, cat, assignedIds) !== "Missing"
              ).length
          )
          const withResources = coverage.filter((n) => n > 0).length

          return (
            <section key={chapter.id} className="mb-7">
              <div
                onClick={() =>
                  setExpandedChapters((prev) => ({ ...prev, [chapter.id]: !open }))
                }
                className="group cursor-pointer select-none"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-okf">
                      Chapter {chapter.number}
                    </span>
                    <span className="font-display text-[16px] font-bold text-ink">
                      {chapter.name}
                    </span>
                    <span className="truncate text-[12px] text-text-muted">
                      {unit.name}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-3">
                    <span className="text-[12.5px] text-text-secondary">
                      {withResources === 0
                        ? "No resources yet"
                        : `${withResources} of ${subtopics.length} topics have resources`}
                    </span>
                    <span className="text-[12.5px] font-semibold text-text-secondary underline-offset-2 group-hover:text-ink group-hover:underline">
                      {open
                        ? "Hide"
                        : `Show ${subtopics.length} ${subtopics.length === 1 ? "topic" : "topics"}`}
                    </span>
                  </div>
                </div>
                {/* Coverage rail: one segment per subtopic. */}
                <div className="mt-2 flex h-[6px] gap-[3px]">
                  {subtopics.map((st, i) => (
                    <div
                      key={st.id}
                      title={`${st.name} — ${coverage[i]}/3 formats covered`}
                      className={cn(
                        "flex-1 rounded-full",
                        coverage[i] === 3
                          ? "bg-[#16A34A]"
                          : coverage[i] > 0
                            ? "bg-[#F59E0B]"
                            : "bg-[#FECACA]"
                      )}
                    />
                  ))}
                </div>
              </div>

              {open && (
                <div className="mt-3.5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {subtopics.map((st) => {
                    const readyCount = st.resources.filter(
                      (r) => (r.status ?? "ready") === "ready"
                    ).length
                    return (
                      <div
                        key={st.id}
                        onClick={() => setDetailId(st.id)}
                        className="cursor-pointer rounded-[12px] border border-card-border bg-white p-4 transition-[border-color,box-shadow] hover:border-ink/25 hover:shadow-[0_2px_10px_rgba(17,24,39,0.06)]"
                      >
                        <div className="text-[14.5px] font-semibold leading-snug text-ink">
                          {st.name}
                        </div>
                        <div className="mt-1 text-[12px] text-text-muted">
                          {readyCount === 0
                            ? "No resources yet — open to upload"
                            : `${readyCount} ${readyCount === 1 ? "resource" : "resources"}`}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {STATUS_CATEGORIES.map((cat) => (
                            <StatusPill
                              key={cat}
                              category={cat}
                              status={categoryStatus(st.resources, cat, assignedIds)}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {/* Subtopic detail: resource rows per format, Assign/Undo, upload CTA.
          Rendered before the preview/upload overlays so those stack on top. */}
      <SlideUpOverlay open={!!detailRow} onClose={() => setDetailId(null)}>
        {detailRow && (
          <div>
            <div className="mb-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-okf">
                Chapter {detailRow.chapter.number} · {detailRow.chapter.name}
              </div>
              <div className="mt-1 font-display text-[18px] font-bold text-ink">
                {detailRow.subtopic.name}
              </div>
            </div>
            <div className="flex flex-col gap-5">
              {STATUS_CATEGORIES.map((cat) => {
                const items = detailRow.subtopic.resources.filter(
                  (r) => categoryForType(r.type) === cat
                )
                const status = categoryStatus(
                  detailRow.subtopic.resources,
                  cat,
                  assignedIds
                )
                return (
                  <div key={cat}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-ink">{cat}</span>
                      <span
                        className={cn(
                          "inline-block rounded-[4px] px-2 py-0.5 text-[11px] font-medium",
                          STATUS_PILL_COLORS[status]
                        )}
                      >
                        {status}
                      </span>
                    </div>
                    {items.length === 0 ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[8px] bg-[#F9FAFB] px-3.5 py-3">
                        <span className="text-[13px] text-text-secondary">
                          No {cat.toLowerCase()} in the OKF library yet.
                        </span>
                        <span
                          onClick={() =>
                            setUploadTarget({
                              subtopicId: detailRow.subtopic.id,
                              subtopicName: detailRow.subtopic.name,
                              category: cat,
                            })
                          }
                          className="cursor-pointer text-[12.5px] font-bold text-okf"
                        >
                          Upload to OKF
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 rounded-[8px] bg-[#F9FAFB] p-3.5">
                        {items.map((r) => (
                          <ResourceRow
                            key={r.id}
                            resource={r}
                            assigned={assignedIds.includes(r.id)}
                            onAssign={handleAssignOne}
                            onOpenPreview={openPreview}
                            onUndo={(id) => undoOkfAssign(resolvedClassId, [id])}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </SlideUpOverlay>

      <SlideUpOverlay open={!!preview} onClose={() => setPreview(null)}>
        {preview && (
          <PreviewPanel
            resource={preview}
            assigned={assignedIds.includes(preview.id)}
            onAssign={() => handleAssignOne(preview.id)}
          />
        )}
      </SlideUpOverlay>

      <SlideUpOverlay
        open={!!uploadTarget}
        onClose={() => setUploadTarget(null)}
      >
        {uploadTarget && (
          <UploadPanel
            target={uploadTarget}
            onCancel={() => setUploadTarget(null)}
            onSubmit={handleUploadSubmit}
          />
        )}
      </SlideUpOverlay>
    </div>
  )
}
