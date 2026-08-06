import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import type { CatalogResource, CurriculumOut, OkfResourceType, SyllabusUnitOut } from "@/lib/types"
import { getAcademicYears, getCurriculum, getSubjectResources, getSyllabus } from "@/lib/curriculum-api"
import { getAssetUrl } from "@/lib/media"
import { ambiguousChapterNumbers, groupResourcesByChapter, type DisplayResource } from "@/lib/resource-grouping"
import { useResourceUpload, type UploadTarget } from "./learning-resources/useResourceUpload"
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

// Rebuilt on the real Master Data syllabus tree + the catalogued-resources
// API (see Settings > Resource Library / ResourceLibrary.tsx and api.py's
// GET /api/curriculum-subjects/{id}/resources) instead of a separately
// hand-typed Class/Unit/Chapter/Subtopic taxonomy — see project memory for
// why those were merged. The pipeline only catalogues resources at the
// CHAPTER level (never per-topic — there is no topic id anywhere in the
// third-brain bundle/manifest), so this page groups resources by chapter;
// topics render as plain context text under each chapter, not as their own
// resource-bearing cards like the old "Subtopic" model had.
const CLASS_OPTIONS = ["LKG", "UKG", ...Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`)]
const BOARD_OPTIONS = ["CBSE", "ICSE", "State"]

const STATUS_CATEGORIES = ["Video", "Slides", "Quiz"] as const
type StatusCategory = (typeof STATUS_CATEGORIES)[number]
type CategoryStatus = "Assigned" | "Ready" | "Missing"

function categoryForType(type: OkfResourceType): StatusCategory {
  if (type === "Video") return "Video"
  if (type === "PPT") return "Slides"
  return "Quiz" // Worksheet, PDF, Quiz — practice/assessment material
}

function categoryStatus(resources: DisplayResource[], category: StatusCategory, assignedIds: string[]): CategoryStatus {
  const items = resources.filter((r) => categoryForType(r.type) === category && r.status === "ready")
  if (items.length === 0) return "Missing"
  if (items.some((r) => assignedIds.includes(r.id))) return "Assigned"
  return "Ready"
}

const STATUS_PILL_COLORS: Record<CategoryStatus, string> = {
  Ready: "bg-[#F0FDF4] text-[#16A34A]",
  Assigned: "bg-[#DCFCE7] text-[#15803D]",
  Missing: "bg-[#FEF2F2] text-[#DC2626]",
}

function StatusPill({ category, status }: { category: StatusCategory; status: CategoryStatus }) {
  return (
    <span className={cn("inline-block w-fit rounded-[4px] px-2 py-1 text-[11.5px] font-medium", STATUS_PILL_COLORS[status])}>
      {category} · {status}
    </span>
  )
}

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
  resource, assigned, onAssign, onOpenPreview, onUndo,
}: {
  resource: DisplayResource
  assigned: boolean
  onAssign: (id: string) => void
  onOpenPreview: (resource: DisplayResource) => void
  onUndo: (id: string) => void
}) {
  if (resource.status === "processing") {
    return <div className="animate-pulse text-[14px] font-medium text-text-secondary">{resource.title} • Processing by AI....</div>
  }
  if (resource.status === "failed") {
    return <div className="text-[14px] font-medium text-[#DC2626]">{resource.title} • Couldn't process this file.</div>
  }
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1 cursor-pointer" onClick={() => onOpenPreview(resource)}>
        <div className="text-[14px] font-medium text-[#111827] hover:underline">{resource.title}</div>
        <div className="mt-0.5 text-[12px] font-normal text-[#9CA3AF]">
          {resource.type} · {resource.meta} · {resource.uploadedByTeacher ? "Uploaded by you" : "OKF Curated"}
        </div>
      </div>
      {assigned ? (
        <div className="flex shrink-0 items-center gap-2.5">
          <span className="text-[12.5px] font-semibold text-success">Assigned</span>
          <span
            onClick={(e) => { e.stopPropagation(); onUndo(resource.id) }}
            className="cursor-pointer text-[12.5px] font-semibold text-text-secondary underline underline-offset-2 hover:text-ink"
          >
            Undo
          </span>
        </div>
      ) : (
        <AssignButton onClick={(e) => { e.stopPropagation(); onAssign(resource.id) }} />
      )}
    </div>
  )
}

function PreviewPanel({
  resource, assigned, onAssign, expanded, onToggleExpand,
}: {
  resource: DisplayResource
  assigned: boolean
  onAssign: () => void
  expanded: boolean
  onToggleExpand: () => void
}) {
  const isVideo = resource.type === "Video"
  const previewUrl = resource.previewS3Key ? getAssetUrl(resource.previewS3Key) : null

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="font-display text-[18px] font-bold text-ink">{resource.title}</div>
          <div className="mt-0.5 text-[13px] text-text-secondary">{resource.type} · {resource.meta}</div>
        </div>
        {!isVideo && previewUrl && (
          <button
            onClick={onToggleExpand}
            className="shrink-0 rounded-[6px] border border-card-border px-2.5 py-1 text-[12px] font-medium text-text-secondary hover:bg-[#F9FAFB]"
          >
            {expanded ? "⤡ Collapse" : "⤢ Expand"}
          </button>
        )}
      </div>
      {/* Explicit height (not min-h + h-full) -- an iframe/video with h-full
          inside an indefinite-height flex box collapses to the browser's
          intrinsic default instead of filling it. */}
      <div
        className={cn(
          "mb-5 flex items-center justify-center overflow-hidden rounded-[10px] border border-card-border bg-[#0B1220]",
          isVideo ? "aspect-video" : expanded ? "h-[75vh]" : "h-[420px]",
        )}
      >
        {resource.status === "processing" ? (
          <div className="text-[13.5px] text-white/70">Converting for preview…</div>
        ) : resource.status === "failed" ? (
          <div className="text-[13.5px] text-white/70">Couldn't process this file. Try uploading it again.</div>
        ) : previewUrl ? (
          isVideo ? (
            <video key={previewUrl} controls autoPlay controlsList="nodownload" className="h-full w-full">
              <source src={previewUrl} />
            </video>
          ) : (
            <iframe key={previewUrl} src={previewUrl} title={resource.title} className="h-full w-full" />
          )
        ) : (
          <div className="text-[13.5px] text-white/70">{isVideo ? "Video preview — playing" : "Document preview"}</div>
        )}
      </div>
      {assigned ? <span className="text-[13.5px] font-semibold text-success">Assigned</span> : <AssignButton onClick={onAssign} />}
    </div>
  )
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] font-semibold uppercase tracking-[0.04em] text-text-muted">{label}</div>
      {children}
    </div>
  )
}

const ALL = "all"

function UploadPanel({ target, onCancel, onSubmit }: { target: UploadTarget; onCancel: () => void; onSubmit: (title: string, file: File) => void }) {
  const [title, setTitle] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const accept = target.category === "Video" ? ".mp4,.webm,.mov" : target.category === "Slides" ? ".ppt,.pptx,.pdf" : ".pdf,.doc,.docx,.md"

  return (
    <div>
      <div className="mb-4">
        <div className="font-display text-[18px] font-bold text-ink">Upload to OKF</div>
        <div className="mt-0.5 text-[13.5px] text-text-secondary">{target.chapterName} · {target.category}</div>
      </div>
      <div className="mb-3.5">
        <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">Title</div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Practice Set A" />
      </div>
      <div className="mb-4">
        <div className="mb-1.5 text-[13px] font-semibold text-text-secondary">File</div>
        <label className="block cursor-pointer rounded-[10px] border border-dashed border-card-border p-6 text-center text-[13.5px] text-text-secondary hover:border-ink/40">
          {file ? `${file.name} · ${(file.size / 1048576).toFixed(1)} MB` : `Click to choose a ${target.category === "Video" ? "video" : "file"} from your computer`}
          <input type="file" accept={accept} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </div>
      <div className="flex justify-end gap-2 border-t border-card-border pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button disabled={!title || !file} onClick={() => onSubmit(title, file!)}>Upload</Button>
      </div>
    </div>
  )
}

export default function LearningResources() {
  const [searchParams] = useSearchParams()
  const okfAssignedByClass = useSchoolStore((s) => s.okfAssignedByClass)
  const assignOkfResources = useSchoolStore((s) => s.assignOkfResources)
  const undoOkfAssign = useSchoolStore((s) => s.undoOkfAssign)
  const showFlash = useSchoolStore((s) => s.showFlash)

  const [yearOptions, setYearOptions] = useState<string[]>([])
  const [year, setYear] = useState("")
  const [board, setBoard] = useState(BOARD_OPTIONS[0])
  const [cls, setCls] = useState("Class 10")

  const [curriculum, setCurriculum] = useState<CurriculumOut | null>(null)
  const [subjectId, setSubjectId] = useState("")

  const [units, setUnits] = useState<SyllabusUnitOut[]>([])
  const [resources, setResources] = useState<CatalogResource[]>([])

  const [unitFilter, setUnitFilter] = useState(ALL)
  const [chapterFilter, setChapterFilter] = useState(ALL)
  const [search, setSearch] = useState("")
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({})
  const [detailChapterId, setDetailChapterId] = useState<string | null>(null)
  const [preview, setPreview] = useState<DisplayResource | null>(null)
  const [previewExpanded, setPreviewExpanded] = useState(false)

  const subjects = useMemo(() => curriculum?.subjects ?? [], [curriculum])
  const subjectName = subjects.find((s) => s.id === subjectId)?.subject_name ?? ""

  useEffect(() => {
    getAcademicYears()
      .then((rows) => {
        const labels = rows.map((r) => r.year_label)
        setYearOptions(labels)
        setYear((prev) => prev || labels[labels.length - 1] || "")
      })
      .catch(() => showFlash("resource", "Could not load academic years — is the API running on :8000?", 5000))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCurriculum = useCallback(() => {
    if (!year) return
    getCurriculum(year, board, cls)
      .then((d) => {
        setCurriculum(d)
        setSubjectId((prev) => (d.subjects.some((s) => s.id === prev) ? prev : (d.subjects[0]?.id ?? "")))
      })
      .catch(() => {
        setCurriculum(null)
        showFlash("resource", "Could not load curriculum — is the API running on :8000?", 5000)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, board, cls])

  useEffect(() => { loadCurriculum() }, [loadCurriculum])

  const loadResources = useCallback(() => {
    if (!subjectId) { setResources([]); return }
    getSubjectResources(subjectId)
      .then((rows) => setResources(rows))
      .catch(() => showFlash("resource", "Could not load catalogued resources.", 5000))
  }, [subjectId, showFlash])

  const { pendingUploads, uploadTarget, setUploadTarget, resetPending, handleUploadSubmit } =
    useResourceUpload(subjectName, loadResources, showFlash)

  useEffect(() => {
    if (!subjectId) { setUnits([]); setUnitFilter(ALL); setChapterFilter(ALL); return }
    getSyllabus(subjectId)
      .then((d) => setUnits(d.units))
      .catch(() => showFlash("resource", "Could not load syllabus detail.", 5000))
    setUnitFilter(ALL)
    setChapterFilter(ALL)
    resetPending()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId])

  useEffect(() => { loadResources() }, [loadResources])

  // Same safeguard as ResourceLibrary.tsx: chapter numbers aren't guaranteed
  // unique across units (see lib/resource-grouping.ts).
  const ambiguousNums = useMemo(() => ambiguousChapterNumbers(units), [units])

  const resourcesByChapter = useMemo(
    () => groupResourcesByChapter(resources, pendingUploads, ambiguousNums),
    [resources, pendingUploads, ambiguousNums],
  )

  // Flat chapter list with resolved unit + resource-based filtering.
  const allChapters = useMemo(
    () => units.flatMap((u) => u.chapters.map((c) => ({ chapter: c, unit: u }))),
    [units]
  )

  // Deep link from Syllabus Map's "OKF Curriculum Alignment" panel
  // (SyllabusMap.tsx's viewChapter). That panel still tracks its own
  // separate, unwired OKF_LIBRARY chapter ids (a distinct feature from this
  // page's real Master Data chapters), so this only expands a chapter when
  // the id happens to match one already loaded here — otherwise it's a
  // harmless no-op rather than an error.
  useEffect(() => {
    const chId = searchParams.get("expandChapter")
    if (!chId || !allChapters.some((row) => row.chapter.id === chId)) return
    setExpandedChapters((prev) => ({ ...prev, [chId]: true }))
  }, [searchParams, allChapters])

  const unitScopedChapters = useMemo(
    () => (unitFilter === ALL ? allChapters : allChapters.filter((row) => row.unit.id === unitFilter)),
    [allChapters, unitFilter]
  )

  const assignedIds = okfAssignedByClass[cls] ?? []

  const filteredChapters = useMemo(() => {
    const q = search.trim().toLowerCase()
    return unitScopedChapters.filter(({ chapter }) => {
      if (chapterFilter !== ALL && chapter.id !== chapterFilter) return false
      if (q) {
        const chapterResources = chapter.number != null ? (resourcesByChapter.get(chapter.number) ?? []) : []
        const haystack = [chapter.name, ...chapter.topics.map((t) => t.title), ...chapterResources.map((r) => r.title)].join(" ").toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [unitScopedChapters, chapterFilter, search, resourcesByChapter])

  const criteriaText = useMemo(() => {
    const parts: string[] = []
    if (unitFilter !== ALL) {
      const u = units.find((u) => u.id === unitFilter)
      if (u) parts.push(u.name)
    }
    if (chapterFilter !== ALL) {
      const found = allChapters.find((row) => row.chapter.id === chapterFilter)
      if (found) parts.push(`Chapter ${found.chapter.number}: ${found.chapter.name}`)
    }
    if (search.trim()) parts.push(`"${search.trim()}"`)
    return parts.length ? parts.join(" · ") : "All resources"
  }, [unitFilter, chapterFilter, search, units, allChapters])

  const autoOpen = chapterFilter !== ALL || !!search.trim() || filteredChapters.length === 1

  const detailRow = useMemo(
    () => (detailChapterId ? allChapters.find((row) => row.chapter.id === detailChapterId) ?? null : null),
    [detailChapterId, allChapters]
  )
  const detailResources = detailRow?.chapter.number != null ? (resourcesByChapter.get(detailRow.chapter.number) ?? []) : []

  const openPreview = (resource: DisplayResource) => { setPreview(resource); setPreviewExpanded(false) }

  const handleAssignOne = (resourceId: string) => {
    assignOkfResources(cls, [resourceId])
    showFlash("resource", `Assigned to ${cls} for tomorrow.`)
  }

  return (
    <div>
      <PageHeader title="Learning Resources" subtitle="Teaching materials, worksheets, presentations, videos." />

      <FlashBanner flashKey="resource" />

      <div className="mb-2.5 text-[13px] font-bold uppercase tracking-[0.04em] text-text-secondary">OKF Library</div>

      <div className="mb-3 flex flex-wrap items-end gap-3">
        <FilterField label="Academic Year">
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-8 w-auto min-w-[110px] text-[13.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Board">
          <Select value={board} onValueChange={setBoard}>
            <SelectTrigger className="h-8 w-auto min-w-[100px] text-[13.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>{BOARD_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Class">
          <Select value={cls} onValueChange={setCls}>
            <SelectTrigger className="h-8 w-auto min-w-[110px] text-[13.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>{CLASS_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Subject">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="h-8 w-auto min-w-[160px] text-[13.5px]"><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}</SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Unit">
          <Select value={unitFilter} onValueChange={(v) => { setUnitFilter(v); setChapterFilter(ALL) }}>
            <SelectTrigger className="h-8 w-auto min-w-[160px] text-[13.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Units</SelectItem>
              {units.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </FilterField>
        <FilterField label="Chapter">
          <Select value={chapterFilter} onValueChange={setChapterFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[200px] text-[13.5px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All Chapters</SelectItem>
              {unitScopedChapters.map(({ chapter }) => (
                <SelectItem key={chapter.id} value={chapter.id}>{chapter.number != null ? `Chapter ${chapter.number}: ` : ""}{chapter.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </div>

      <div className="mb-3.5">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search resources by keyword or topic…" className="h-9 max-w-[420px] text-[13.5px]" />
      </div>

      <div className="mb-6 text-[13.5px] text-text-secondary">
        <span className="font-semibold text-text-muted">Showing: </span>
        {criteriaText}
        {subjectName ? ` — select resources and assign them to ${cls}.` : " — select a subject to see its chapters."}
      </div>

      {subjectId && filteredChapters.length === 0 && (
        <div className="mb-4 rounded-[8px] bg-[#F9FAFB] px-4 py-6 text-center text-[13.5px] text-text-secondary">
          No chapters match these filters. Clear a filter or search to see more.
        </div>
      )}

      <div>
        {filteredChapters.map(({ chapter, unit }) => {
          const open = expandedChapters[chapter.id] ?? autoOpen
          const chapterResources = chapter.number != null ? (resourcesByChapter.get(chapter.number) ?? []) : []
          const ambiguous = chapter.number != null && ambiguousNums.has(chapter.number)

          return (
            <section key={chapter.id} className="mb-7">
              <div onClick={() => setExpandedChapters((prev) => ({ ...prev, [chapter.id]: !open }))} className="group cursor-pointer select-none">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                    {chapter.number != null && <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-okf">Chapter {chapter.number}</span>}
                    <span className="font-display text-[16px] font-bold text-ink">{chapter.name}</span>
                    <span className="truncate text-[12px] text-text-muted">{unit.name}</span>
                  </div>
                  <div className="flex shrink-0 items-baseline gap-3">
                    <span className="text-[12.5px] text-text-secondary">
                      {ambiguous ? "Chapter number reused elsewhere" : chapterResources.length === 0 ? "No resources yet" : `${chapterResources.length} resource(s)`}
                    </span>
                    <span className="text-[12.5px] font-semibold text-text-secondary underline-offset-2 group-hover:text-ink group-hover:underline">
                      {open ? "Hide" : "Show"}
                    </span>
                  </div>
                </div>
              </div>

              {open && (
                <div className="mt-3.5 rounded-[12px] border border-card-border bg-white p-4">
                  {chapter.topics.length > 0 && (
                    <div className="mb-3 text-[12.5px] text-text-muted">
                      Topics: {chapter.topics.map((t) => t.title).join(" · ")}
                    </div>
                  )}
                  {ambiguous ? (
                    <div className="text-[13px] text-text-secondary">
                      Another chapter in this subject shares this chapter number, so resources can't be matched safely — fix the numbering in Settings &gt; Master Data.
                    </div>
                  ) : (
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      {STATUS_CATEGORIES.map((cat) => <StatusPill key={cat} category={cat} status={categoryStatus(chapterResources, cat, assignedIds)} />)}
                    </div>
                  )}
                  {!ambiguous && (
                    <button onClick={() => setDetailChapterId(chapter.id)} className="mt-2 text-[12.5px] font-semibold text-okf hover:underline">
                      View resources
                    </button>
                  )}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <SlideUpOverlay open={!!detailRow} onClose={() => setDetailChapterId(null)}>
        {detailRow && (
          <div>
            <div className="mb-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-okf">
                {detailRow.chapter.number != null && `Chapter ${detailRow.chapter.number} · `}{detailRow.unit.name}
              </div>
              <div className="mt-1 font-display text-[18px] font-bold text-ink">{detailRow.chapter.name}</div>
            </div>
            <div className="flex flex-col gap-5">
              {STATUS_CATEGORIES.map((cat) => {
                const items = detailResources.filter((r) => categoryForType(r.type) === cat)
                const status = categoryStatus(detailResources, cat, assignedIds)
                return (
                  <div key={cat}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-ink">{cat}</span>
                      <span className={cn("inline-block rounded-[4px] px-2 py-0.5 text-[11px] font-medium", STATUS_PILL_COLORS[status])}>{status}</span>
                    </div>
                    {items.length === 0 ? (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[8px] bg-[#F9FAFB] px-3.5 py-3">
                        <span className="text-[13px] text-text-secondary">No {cat.toLowerCase()} in the OKF library yet.</span>
                        {detailRow.chapter.number != null && (
                          <span
                            onClick={() => setUploadTarget({ chapterNumber: detailRow.chapter.number as number, chapterName: detailRow.chapter.name, category: cat })}
                            className="cursor-pointer text-[12.5px] font-bold text-okf"
                          >
                            Upload to OKF
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 rounded-[8px] bg-[#F9FAFB] p-3.5">
                        {items.map((r) => (
                          <ResourceRow key={r.id} resource={r} assigned={assignedIds.includes(r.id)} onAssign={handleAssignOne} onOpenPreview={openPreview} onUndo={(id) => undoOkfAssign(cls, [id])} />
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

      <SlideUpOverlay open={!!preview} onClose={() => setPreview(null)} wide={previewExpanded}>
        {preview && (
          <PreviewPanel
            resource={preview}
            assigned={assignedIds.includes(preview.id)}
            onAssign={() => handleAssignOne(preview.id)}
            expanded={previewExpanded}
            onToggleExpand={() => setPreviewExpanded((v) => !v)}
          />
        )}
      </SlideUpOverlay>

      <SlideUpOverlay open={!!uploadTarget} onClose={() => setUploadTarget(null)}>
        {uploadTarget && <UploadPanel target={uploadTarget} onCancel={() => setUploadTarget(null)} onSubmit={handleUploadSubmit} />}
      </SlideUpOverlay>
    </div>
  )
}
