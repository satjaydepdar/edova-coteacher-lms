import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FlashBanner } from "@/components/common/FlashBanner"
import { useSchoolStore } from "@/store/school-store"
import { uploadLearningResource } from "@/lib/upload"
import type { OkfResourceType } from "@/lib/types"

// Settings > Resource Library — admin view of catalogued learning-resource
// files, grouped under the REAL Master Data syllabus tree instead of a
// separately hand-typed Class/Unit/Chapter/Subtopic taxonomy (that taxonomy
// was a fully disconnected duplicate; see project memory). Resource files
// come from the third-brain pipeline + this page's own Upload action, both
// landing in the same manifest.json the clerk API reads back via
// GET /api/curriculum-subjects/{subject_id}/resources, matched to real
// chapters by chapter number (see api.py's _global_chapter_ref for the
// math/science id-shape handling).
const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8001"

const CLASS_OPTIONS = ["LKG", "UKG", ...Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`)]
const BOARD_OPTIONS = ["CBSE", "ICSE", "State"]
const DOC_TYPES = ["chapter_content", "worksheet", "video", "quiz"]

interface SubjectRow { id: string; subject_name: string }
interface CurriculumResponse { id: string; subjects: SubjectRow[] }
interface ChapterOut { id: string; number: number | null; name: string }
interface UnitOut { id: string; name: string; chapters: ChapterOut[] }
interface SyllabusResponse { units: UnitOut[] }

interface CatalogResource {
  id: string
  title: string
  type: OkfResourceType
  doc_type?: string
  chapter_number: number
  s3_key?: string
  preview_s3_key?: string
  status: string
}

export default function ResourceLibrary() {
  const showFlash = useSchoolStore((s) => s.showFlash)

  const [yearOptions, setYearOptions] = useState<string[]>([])
  const [year, setYear] = useState("")
  const [board, setBoard] = useState(BOARD_OPTIONS[0])
  const [cls, setCls] = useState("Class 10")

  const [curriculum, setCurriculum] = useState<CurriculumResponse | null>(null)
  const [subjectId, setSubjectId] = useState("")

  const [units, setUnits] = useState<UnitOut[]>([])
  const [resources, setResources] = useState<CatalogResource[]>([])
  const [loading, setLoading] = useState(false)
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({})
  const [uploadingChapter, setUploadingChapter] = useState<number | null>(null)
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadDocType, setUploadDocType] = useState(DOC_TYPES[0])
  const [uploading, setUploading] = useState(false)

  const subjects = useMemo(() => curriculum?.subjects ?? [], [curriculum])
  const subjectName = subjects.find((s) => s.id === subjectId)?.subject_name ?? ""

  useEffect(() => {
    fetch(`${API_BASE}/api/academic-years`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((rows: { year_label: string }[]) => {
        const labels = rows.map((r) => r.year_label)
        setYearOptions(labels)
        setYear((prev) => prev || labels[labels.length - 1] || "")
      })
      .catch(() => showFlash("resource", "Could not load academic years — is the API running on :8001?", 5000))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCurriculum = useCallback(() => {
    if (!year) return
    fetch(`${API_BASE}/api/curriculums?year=${encodeURIComponent(year)}&board=${encodeURIComponent(board)}&class=${encodeURIComponent(cls)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: CurriculumResponse) => {
        setCurriculum(d)
        setSubjectId((prev) => (d.subjects.some((s) => s.id === prev) ? prev : (d.subjects[0]?.id ?? "")))
      })
      .catch(() => {
        setCurriculum(null)
        showFlash("resource", "Could not load curriculum — is the API running on :8001?", 5000)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, board, cls])

  useEffect(() => { loadCurriculum() }, [loadCurriculum])

  const loadResources = useCallback(() => {
    if (!subjectId) { setResources([]); return }
    fetch(`${API_BASE}/api/curriculum-subjects/${subjectId}/resources`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((rows: CatalogResource[]) => setResources(rows))
      .catch(() => showFlash("resource", "Could not load catalogued resources.", 5000))
  }, [subjectId, showFlash])

  useEffect(() => {
    if (!subjectId) { setUnits([]); return }
    setLoading(true)
    fetch(`${API_BASE}/api/curriculum-subjects/${subjectId}/syllabus`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: SyllabusResponse) => setUnits(d.units))
      .catch(() => showFlash("resource", "Could not load syllabus detail.", 5000))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId])

  useEffect(() => { loadResources() }, [loadResources])

  const chapterCount = useMemo(() => units.reduce((a, u) => a + u.chapters.length, 0), [units])

  // Chapter numbers aren't guaranteed unique across units — Master Data's
  // "+ Add Chapter" default restarts numbering at 1 per unit, so once an
  // admin adds a unit beyond the originally-seeded content, several chapters
  // can legitimately share the same number (e.g. two "Ch. 1"s). Matching
  // resources by number alone would then attach the same file to every
  // chapter that shares it — wrong, not just imprecise. So: only resolve a
  // resource to a chapter when its number is unique within this subject's
  // tree; ambiguous numbers show 0 resources rather than guessing.
  const ambiguousChapterNumbers = useMemo(() => {
    const counts = new Map<number, number>()
    for (const u of units) {
      for (const c of u.chapters) {
        if (c.number != null) counts.set(c.number, (counts.get(c.number) ?? 0) + 1)
      }
    }
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([number]) => number))
  }, [units])

  const resourcesByChapter = useMemo(() => {
    const m = new Map<number, CatalogResource[]>()
    for (const r of resources) {
      if (ambiguousChapterNumbers.has(r.chapter_number)) continue
      m.set(r.chapter_number, [...(m.get(r.chapter_number) ?? []), r])
    }
    return m
  }, [resources, ambiguousChapterNumbers])

  const startUpload = (chapterNumber: number) => {
    setUploadingChapter(chapterNumber)
    setUploadTitle("")
    setUploadDocType(DOC_TYPES[0])
  }

  const submitUpload = async (file: File | undefined) => {
    if (!file || uploadingChapter == null || !subjectName) return
    setUploading(true)
    try {
      await uploadLearningResource({
        file,
        title: uploadTitle.trim() || file.name,
        subject: subjectName,
        chapter: `Chapter ${uploadingChapter}`,
        docType: uploadDocType,
      })
      showFlash("resource", "Uploaded — cataloguing complete.")
      setUploadingChapter(null)
      loadResources()
    } catch (e) {
      showFlash("resource", `Upload failed: ${e instanceof Error ? e.message : "unknown error"}`, 5000)
    } finally {
      setUploading(false)
    }
  }

  const labelCls = "mb-1.5 text-[12px] font-semibold text-text-secondary"
  const iconBtn = "grid size-7 cursor-pointer place-items-center rounded-[8px] border border-card-border text-text-secondary hover:bg-muted"

  return (
    <div>
      <FlashBanner flashKey="resource" />

      {/* context bar */}
      <div className="mb-5 mt-3 flex flex-wrap items-end gap-3 rounded-[12px] border border-card-border bg-white p-4">
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>Academic Year</span>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-[40px] w-[140px] rounded-[10px] border-card-border text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>Board</span>
          <Select value={board} onValueChange={setBoard}>
            <SelectTrigger className="h-[40px] w-[120px] rounded-[10px] border-card-border text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>{BOARD_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>Class</span>
          <Select value={cls} onValueChange={setCls}>
            <SelectTrigger className="h-[40px] w-[130px] rounded-[10px] border-card-border text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>{CLASS_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelCls}>Subject</span>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="h-[40px] w-[220px] rounded-[10px] border-card-border text-[13px]"><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      {/* tree card */}
      <div className="overflow-hidden rounded-[14px] border border-card-border bg-white">
        <div className="border-b border-card-border bg-[#FCFCFF] px-5 py-4">
          <div className="text-[14.5px] font-bold text-ink">
            {subjectName || "Resource Library"}
            <span className="ml-2 font-normal text-text-secondary">{cls} · {board} · {year}</span>
          </div>
          <div className="mt-0.5 text-[12px] text-text-secondary">
            {units.length} units • {chapterCount} chapters • {resources.length} catalogued resource(s)
          </div>
        </div>

        <div className="p-5">
          {!subjectId && (
            <div className="py-8 text-center text-[13px] text-text-secondary">
              {curriculum ? "Select a subject to see its chapters and catalogued resources." : "Loading…"}
            </div>
          )}
          {subjectId && loading && <div className="py-8 text-center text-[13px] text-text-secondary">Loading…</div>}
          {subjectId && !loading && units.length === 0 && (
            <div className="py-8 text-center text-[13px] text-text-secondary">
              No syllabus detail for this subject yet — build it in Settings &gt; Master Data first.
            </div>
          )}

          {subjectId && !loading && units.map((u) => {
            const collapsed = collapsedUnits[u.id] ?? false
            return (
              <div key={u.id} className="mb-3 overflow-hidden rounded-[12px] border border-card-border">
                <div className="flex items-center gap-3 bg-[#F9FAFB] px-4 py-3">
                  <button
                    onClick={() => setCollapsedUnits((m) => ({ ...m, [u.id]: !collapsed }))}
                    className="cursor-pointer text-text-secondary" aria-label={collapsed ? "Expand unit" : "Collapse unit"}
                  >
                    {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  <span className="text-[13.5px] font-bold text-ink">{u.name}</span>
                  <span className="text-[12px] text-text-secondary">{u.chapters.length} chapter(s)</span>
                </div>

                {!collapsed && (
                  <div className="px-4 py-3">
                    {u.chapters.map((c) => {
                      const ambiguous = c.number != null && ambiguousChapterNumbers.has(c.number)
                      const chapterResources = c.number != null ? (resourcesByChapter.get(c.number) ?? []) : []
                      return (
                        <div key={c.id} className="mb-2 rounded-[10px] border border-[#F1F2F6] p-3 last:mb-0">
                          <div className="flex items-center gap-3">
                            <span className="w-[52px] shrink-0 font-mono text-[12.5px] font-semibold text-text-secondary">
                              {c.number != null ? `Ch. ${c.number}` : "—"}
                            </span>
                            <span className="flex-1 text-[13px] font-semibold text-ink">{c.name}</span>
                            {ambiguous ? (
                              <span className="text-[12px] text-text-secondary" title="Another chapter in this subject shares chapter number, so resources can't be matched safely — give it a unique number in Master Data.">
                                number reused elsewhere
                              </span>
                            ) : (
                              <span className="text-[12px] text-text-secondary">{chapterResources.length} resource(s)</span>
                            )}
                            {c.number != null && !ambiguous && (
                              <button onClick={() => startUpload(c.number as number)} className={iconBtn} aria-label="Upload resource">
                                <Upload className="size-3.5" />
                              </button>
                            )}
                          </div>
                          {chapterResources.length > 0 && (
                            <div className="mt-1.5 space-y-1 pl-[64px]">
                              {chapterResources.map((r) => (
                                <div key={r.id} className="flex items-center gap-2 text-[12px] text-text-secondary">
                                  <span className="rounded-[4px] bg-[#F1F5F9] px-1.5 py-0.5 font-mono text-[11px]">{r.type}</span>
                                  <span>{r.title}</span>
                                  {r.status !== "ready" && <span className="text-[#B45309]">({r.status})</span>}
                                </div>
                              ))}
                            </div>
                          )}
                          {uploadingChapter === c.number && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-[8px] bg-[#F9FAFB] p-2 pl-[64px]">
                              <Input
                                value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)}
                                placeholder="Resource title (optional)" className="h-[32px] w-[200px] rounded-[8px] text-[12.5px]"
                              />
                              <Select value={uploadDocType} onValueChange={setUploadDocType}>
                                <SelectTrigger className="h-[32px] w-[150px] rounded-[8px] text-[12.5px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                              </Select>
                              <input
                                type="file" disabled={uploading}
                                onChange={(e) => submitUpload(e.target.files?.[0])}
                                className="text-[12.5px]"
                              />
                              <Button variant="outline" className="h-[32px] rounded-[8px] text-[12.5px]" onClick={() => setUploadingChapter(null)} disabled={uploading}>
                                Cancel
                              </Button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
