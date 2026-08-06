import { useCallback, useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FlashBanner } from "@/components/common/FlashBanner"
import { useSchoolStore } from "@/store/school-store"
import { addSubject, getAcademicYears, getCurriculum, getSyllabus, putSyllabus } from "@/lib/curriculum-api"
import type { CurriculumOut, SyllabusUnitOut } from "@/lib/types"

// Settings > Master Data — admin CRUD for the per-subject syllabus detail
// tree (units with marks → chapters → topics), DB-backed via the course-CRUD
// API (syllabus_units / syllabus_chapters / syllabus_topics, migration
// 0017). Each academic year + board + class + subject combo owns its own
// tree, so CBSE and ICSE syllabi stay fully independent.
//
// Editing model: the whole tree is edited client-side as a draft; Save
// issues one PUT that replaces the tree atomically (and the API recomputes
// the Curriculum tab's unit→marks summary from it).
const CLASS_OPTIONS = ["LKG", "UKG", ...Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`)]
const BOARD_OPTIONS = ["CBSE", "ICSE", "State"]

// ---- Draft shapes (client-side editable copy; `key` is a stable React key) ----

interface DraftChapter { key: string; number: string; name: string; topics: string[] }
interface DraftUnit { key: string; number: string; name: string; marks: string; chapters: DraftChapter[] }

let draftKeyCounter = 0
const newKey = () => `new_${++draftKeyCounter}`

function toDraft(units: SyllabusUnitOut[]): DraftUnit[] {
  return units.map((u) => ({
    key: u.id,
    number: u.number == null ? "" : String(u.number),
    name: u.name,
    marks: u.marks == null ? "" : String(u.marks),
    chapters: u.chapters.map((c) => ({
      key: c.id,
      number: c.number == null ? "" : String(c.number),
      name: c.name,
      topics: c.topics.map((t) => t.title),
    })),
  }))
}

// ---- Edit-dialog state ----

interface UnitDialog { key: string | null; number: string; name: string; marks: string } // key null = adding
interface ChapterDialog { unitKey: string; key: string | null; number: string; name: string; topicsText: string }

// Add Subject dialog — single entry point for creating subjects (moved from
// the Curriculum tab). Chapters stays a manual field: boards differ, and the
// declared count stands until a saved syllabus tree recomputes it.
interface SubjectDialog { code: string; name: string; type: "Core" | "Elective"; marks: string; chapters: string }
const EMPTY_SUBJECT: SubjectDialog = { code: "", name: "", type: "Core", marks: "", chapters: "" }

export default function MasterData() {
  const showFlash = useSchoolStore((s) => s.showFlash)

  const [yearOptions, setYearOptions] = useState<string[]>([])
  const [year, setYear] = useState("")
  const [board, setBoard] = useState(BOARD_OPTIONS[0])
  const [cls, setCls] = useState("Class 10")

  const [curriculum, setCurriculum] = useState<CurriculumOut | null>(null)
  const [subjectId, setSubjectId] = useState("")

  const [draft, setDraft] = useState<DraftUnit[]>([])
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({})

  const [unitDialog, setUnitDialog] = useState<UnitDialog | null>(null)
  const [chapterDialog, setChapterDialog] = useState<ChapterDialog | null>(null)
  const [subjectDialog, setSubjectDialog] = useState<SubjectDialog | null>(null)
  const [savingSubject, setSavingSubject] = useState(false)

  const subjects = useMemo(() => curriculum?.subjects ?? [], [curriculum])
  const chapterCount = useMemo(() => draft.reduce((a, u) => a + u.chapters.length, 0), [draft])
  const topicCount = useMemo(() => draft.reduce((a, u) => a + u.chapters.reduce((b, c) => b + c.topics.length, 0), 0), [draft])

  // Academic year dropdown comes from the DB, newest year selected by default.
  useEffect(() => {
    getAcademicYears()
      .then((rows) => {
        const labels = rows.map((r) => r.year_label)
        setYearOptions(labels)
        setYear((prev) => prev || labels[labels.length - 1] || "")
      })
      .catch(() => showFlash("masterdata", "Could not load academic years — is the API running on :8000?", 5000))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Curriculum card for the year/board/class combo (get-or-create on the API).
  const loadCurriculum = useCallback(() => {
    if (!year) return
    getCurriculum(year, board, cls)
      .then((d) => {
        setCurriculum(d)
        setSubjectId((prev) => (d.subjects.some((s) => s.id === prev) ? prev : (d.subjects[0]?.id ?? "")))
      })
      .catch(() => {
        setCurriculum(null)
        showFlash("masterdata", "Could not load curriculum — is the API running on :8000?", 5000)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, board, cls])

  useEffect(() => { loadCurriculum() }, [loadCurriculum])

  // Syllabus tree for the selected subject.
  const loadSyllabus = useCallback(() => {
    if (!subjectId) { setDraft([]); setDirty(false); return }
    setLoading(true)
    getSyllabus(subjectId)
      .then((d) => { setDraft(toDraft(d.units)); setDirty(false) })
      .catch(() => showFlash("masterdata", "Could not load syllabus detail.", 5000))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId])

  useEffect(() => { loadSyllabus() }, [loadSyllabus])

  // Guard against silently dropping unsaved edits on a context switch.
  const confirmDiscard = () => !dirty || window.confirm("Discard unsaved syllabus changes?")
  const changeContext = (setter: (v: string) => void) => (v: string) => { if (confirmDiscard()) setter(v) }

  // ---- subject creation (feeds both Master Data and the Curriculum tab) ----

  const saveSubject = async () => {
    if (!subjectDialog || !curriculum) return
    setSavingSubject(true)
    try {
      const created = await addSubject(curriculum.id, {
        subject_code: subjectDialog.code.trim(),
        subject_name: subjectDialog.name.trim(),
        subject_type: subjectDialog.type,
        credits: 0,
        total_marks: subjectDialog.marks.trim() === "" ? null : Number(subjectDialog.marks),
        total_chapters: subjectDialog.chapters.trim() === "" ? null : Number(subjectDialog.chapters),
        syllabus_json: {},
      })
      setSubjectDialog(null)
      showFlash("masterdata", "Subject added — now build its units, chapters and topics below.")
      loadCurriculum()
      setSubjectId(created.id)
    } catch (e) {
      showFlash("masterdata", `Could not add subject: ${e instanceof Error ? e.message : "unknown error"}`, 5000)
    } finally {
      setSavingSubject(false)
    }
  }

  // ---- draft mutations ----

  const saveUnitDialog = () => {
    if (!unitDialog) return
    const name = unitDialog.name.trim()
    if (!name) return
    if (unitDialog.key == null) {
      setDraft((d) => [...d, { key: newKey(), number: unitDialog.number, name, marks: unitDialog.marks, chapters: [] }])
    } else {
      setDraft((d) => d.map((u) => (u.key === unitDialog.key ? { ...u, number: unitDialog.number, name, marks: unitDialog.marks } : u)))
    }
    setDirty(true)
    setUnitDialog(null)
  }

  const deleteUnit = (key: string) => {
    const unit = draft.find((u) => u.key === key)
    if (!unit) return
    if (!window.confirm(`Delete unit "${unit.name}" and its ${unit.chapters.length} chapter(s)?`)) return
    setDraft((d) => d.filter((u) => u.key !== key))
    setDirty(true)
  }

  const saveChapterDialog = () => {
    if (!chapterDialog) return
    const name = chapterDialog.name.trim()
    if (!name) return
    const topics = chapterDialog.topicsText.split("\n").map((t) => t.trim()).filter(Boolean)
    setDraft((d) => d.map((u) => {
      if (u.key !== chapterDialog.unitKey) return u
      if (chapterDialog.key == null) {
        return { ...u, chapters: [...u.chapters, { key: newKey(), number: chapterDialog.number, name, topics }] }
      }
      return {
        ...u,
        chapters: u.chapters.map((c) => (c.key === chapterDialog.key ? { ...c, number: chapterDialog.number, name, topics } : c)),
      }
    }))
    setDirty(true)
    setChapterDialog(null)
  }

  const deleteChapter = (unitKey: string, key: string) => {
    const unit = draft.find((u) => u.key === unitKey)
    const chapter = unit?.chapters.find((c) => c.key === key)
    if (!unit || !chapter) return
    if (!window.confirm(`Delete chapter "${chapter.name}" and its ${chapter.topics.length} topic(s)?`)) return
    setDraft((d) => d.map((u) => (u.key === unitKey ? { ...u, chapters: u.chapters.filter((c) => c.key !== key) } : u)))
    setDirty(true)
  }

  // ---- save ----

  const save = async () => {
    if (!subjectId) return
    setSaving(true)
    try {
      const d = await putSyllabus(subjectId, {
        units: draft
          .filter((u) => u.name.trim())
          .map((u) => ({
            number: u.number.trim() === "" ? null : Number(u.number),
            name: u.name.trim(),
            marks: u.marks.trim() === "" ? null : Number(u.marks),
            chapters: u.chapters
              .filter((c) => c.name.trim())
              .map((c) => ({
                number: c.number.trim() === "" ? null : Number(c.number),
                name: c.name.trim(),
                topics: c.topics,
              })),
          })),
      })
      setDraft(toDraft(d.units))
      setDirty(false)
      showFlash("masterdata", "Syllabus saved.")
    } catch (e) {
      showFlash("masterdata", `Could not save syllabus: ${e instanceof Error ? e.message : "unknown error"}`, 5000)
    } finally {
      setSaving(false)
    }
  }

  const inputCls = "h-[40px] rounded-[10px] text-[13px]"
  const labelCls = "mb-1.5 text-[12px] font-semibold text-text-secondary"
  const iconBtn = "grid size-7 cursor-pointer place-items-center rounded-[8px] border border-card-border text-text-secondary hover:bg-muted"

  return (
    <div>
      <FlashBanner flashKey="masterdata" />

      {/* context bar */}
      <div className="mb-5 mt-3 flex flex-wrap items-end justify-between gap-3 rounded-[12px] border border-card-border bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Academic Year</span>
            <Select value={year} onValueChange={changeContext(setYear)}>
              <SelectTrigger className="h-[40px] w-[140px] rounded-[10px] border-card-border text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Board</span>
            <Select value={board} onValueChange={changeContext(setBoard)}>
              <SelectTrigger className="h-[40px] w-[120px] rounded-[10px] border-card-border text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>{BOARD_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Class</span>
            <Select value={cls} onValueChange={changeContext(setCls)}>
              <SelectTrigger className="h-[40px] w-[130px] rounded-[10px] border-card-border text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>{CLASS_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Subject</span>
            <div className="flex items-center gap-2">
              <Select value={subjectId} onValueChange={changeContext(setSubjectId)}>
                <SelectTrigger className="h-[40px] w-[220px] rounded-[10px] border-card-border text-[13px]"><SelectValue placeholder="Select subject" /></SelectTrigger>
                <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="outline" className="h-[40px] rounded-[10px] whitespace-nowrap" onClick={() => setSubjectDialog({ ...EMPTY_SUBJECT })} disabled={!curriculum}>
                <Plus className="size-4" /> Add Subject
              </Button>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {dirty && <span className="text-[12.5px] font-semibold text-[#B45309]">Unsaved changes</span>}
          {dirty && (
            <Button variant="outline" className="h-[40px] rounded-[10px]" onClick={() => { if (confirmDiscard()) loadSyllabus() }} disabled={saving}>
              Discard
            </Button>
          )}
          <Button className="h-[40px] rounded-[10px]" onClick={save} disabled={!dirty || saving || !subjectId}>
            {saving ? "Saving…" : "Save Syllabus"}
          </Button>
        </div>
      </div>

      {/* tree card */}
      <div className="overflow-hidden rounded-[14px] border border-card-border bg-white">
        <div className="flex items-center justify-between border-b border-card-border bg-[#FCFCFF] px-5 py-4">
          <div>
            <div className="text-[14.5px] font-bold text-ink">
              {subjects.find((s) => s.id === subjectId)?.subject_name ?? "Syllabus Detail"}
              <span className="ml-2 font-normal text-text-secondary">{cls} · {board} · {year}</span>
            </div>
            <div className="mt-0.5 text-[12px] text-text-secondary">
              {draft.length} units • {chapterCount} chapters • {topicCount} topics
            </div>
          </div>
          <Button className="h-8 rounded-[8px] text-[12.5px]" onClick={() => setUnitDialog({ key: null, number: "", name: "", marks: "" })} disabled={!subjectId}>
            <Plus className="size-4" /> Add Unit
          </Button>
        </div>

        <div className="p-5">
          {!subjectId && (
            <div className="py-8 text-center text-[13px] text-text-secondary">
              {curriculum
                ? "No subjects in this curriculum yet — add one with + Add Subject, then enter its units, chapters and topics here."
                : "Loading…"}
            </div>
          )}
          {subjectId && loading && <div className="py-8 text-center text-[13px] text-text-secondary">Loading…</div>}
          {subjectId && !loading && draft.length === 0 && (
            <div className="py-8 text-center text-[13px] text-text-secondary">
              No syllabus detail yet — start with + Add Unit.
            </div>
          )}

          {subjectId && !loading && draft.map((u) => {
            const collapsed = collapsedUnits[u.key] ?? false
            return (
              <div key={u.key} className="mb-3 overflow-hidden rounded-[12px] border border-card-border">
                {/* unit header */}
                <div className="flex items-center gap-3 bg-[#F9FAFB] px-4 py-3">
                  <button
                    onClick={() => setCollapsedUnits((m) => ({ ...m, [u.key]: !collapsed }))}
                    className="cursor-pointer text-text-secondary" aria-label={collapsed ? "Expand unit" : "Collapse unit"}
                  >
                    {collapsed ? <ChevronRight className="size-4" /> : <ChevronDown className="size-4" />}
                  </button>
                  <div className="flex-1">
                    {u.number.trim() && (
                      <span className="mr-2 font-mono text-[12.5px] font-semibold text-text-secondary">Unit {u.number}</span>
                    )}
                    <span className="text-[13.5px] font-bold text-ink">{u.name}</span>
                    <span className="ml-3 text-[12px] text-text-secondary">
                      {u.marks.trim() ? `${u.marks} marks` : "no marks"} • {u.chapters.length} chapter(s)
                    </span>
                  </div>
                  <button onClick={() => setUnitDialog({ key: u.key, number: u.number, name: u.name, marks: u.marks })} className={iconBtn} aria-label="Edit unit">
                    <Pencil className="size-3.5" />
                  </button>
                  <button onClick={() => deleteUnit(u.key)} className={iconBtn} aria-label="Delete unit">
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                {/* chapters */}
                {!collapsed && (
                  <div className="px-4 py-3">
                    {u.chapters.map((c) => (
                      <div key={c.key} className="mb-2 rounded-[10px] border border-[#F1F2F6] p-3 last:mb-0">
                        <div className="flex items-center gap-3">
                          <span className="w-[52px] shrink-0 font-mono text-[12.5px] font-semibold text-text-secondary">
                            {c.number.trim() ? `Ch. ${c.number}` : "—"}
                          </span>
                          <span className="flex-1 text-[13px] font-semibold text-ink">{c.name}</span>
                          <span className="text-[12px] text-text-secondary">{c.topics.length} topic(s)</span>
                          <button
                            onClick={() => setChapterDialog({ unitKey: u.key, key: c.key, number: c.number, name: c.name, topicsText: c.topics.join("\n") })}
                            className={iconBtn} aria-label="Edit chapter"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                          <button onClick={() => deleteChapter(u.key, c.key)} className={iconBtn} aria-label="Delete chapter">
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        {c.topics.length > 0 && (
                          <div className="mt-1.5 pl-[64px] text-[12px] leading-5 text-text-secondary">
                            {c.topics.map((t, ti) => `${c.number.trim() ? `${c.number}.${ti + 1}` : ti + 1}. ${t}`).join("  ·  ")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* add subject dialog */}
      {subjectDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0F172A]/25 p-4" onClick={() => setSubjectDialog(null)}>
          <div className="w-[520px] max-w-full rounded-[14px] border border-card-border bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.08)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
              <div>
                <div className="text-[15px] font-bold text-ink">Add Subject</div>
                <div className="mt-0.5 text-[12px] text-text-secondary">{cls} - {board} ({year})</div>
              </div>
              <button onClick={() => setSubjectDialog(null)} className={iconBtn} aria-label="Close"><X className="size-4" /></button>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <div className={labelCls}>Subject Code</div>
                  <Input autoFocus value={subjectDialog.code} onChange={(e) => setSubjectDialog({ ...subjectDialog, code: e.target.value })}
                    placeholder="e.g. 041" className={`${inputCls} font-mono`} aria-label="Subject code" />
                </div>
                <div>
                  <div className={labelCls}>Subject Type</div>
                  <Select value={subjectDialog.type} onValueChange={(v) => setSubjectDialog({ ...subjectDialog, type: v as SubjectDialog["type"] })}>
                    <SelectTrigger className="h-[40px] rounded-[10px] text-[13px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Core">Core</SelectItem>
                      <SelectItem value="Elective">Elective</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <div className={labelCls}>Subject Name</div>
                  <Input value={subjectDialog.name} onChange={(e) => setSubjectDialog({ ...subjectDialog, name: e.target.value })}
                    placeholder="e.g. Mathematics Standard" className={inputCls} aria-label="Subject name" />
                </div>
                <div>
                  <div className={labelCls}>Marks</div>
                  <Input type="number" min={0} value={subjectDialog.marks} onChange={(e) => setSubjectDialog({ ...subjectDialog, marks: e.target.value })}
                    placeholder="e.g. 100" className={inputCls} aria-label="Marks" />
                </div>
                <div>
                  <div className={labelCls}>Chapters</div>
                  <Input type="number" min={0} value={subjectDialog.chapters} onChange={(e) => setSubjectDialog({ ...subjectDialog, chapters: e.target.value })}
                    placeholder="e.g. 14" className={inputCls} aria-label="Chapters" />
                </div>
              </div>
              <div className="text-[12px] text-text-secondary">
                After saving, the subject appears in the Subject dropdown — select it and build its units, chapters and topics below. Saving a syllabus tree later recomputes the chapter count from the tree.
              </div>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-card-border px-6 py-4">
              <Button variant="outline" className="h-[40px] rounded-[10px]" onClick={() => setSubjectDialog(null)} disabled={savingSubject}>Cancel</Button>
              <Button className="h-[40px] rounded-[10px]" onClick={saveSubject}
                disabled={savingSubject || !subjectDialog.code.trim() || !subjectDialog.name.trim()}>
                {savingSubject ? "Saving…" : "Save Subject"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* unit dialog */}
      {unitDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0F172A]/25 p-4" onClick={() => setUnitDialog(null)}>
          <div className="w-[440px] max-w-full rounded-[14px] border border-card-border bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.08)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
              <div className="text-[15px] font-bold text-ink">{unitDialog.key == null ? "Add Unit" : "Edit Unit"}</div>
              <button onClick={() => setUnitDialog(null)} className={iconBtn} aria-label="Close"><X className="size-4" /></button>
            </div>
            <div className="px-6 py-5">
              <div className="mb-4 grid grid-cols-[110px_1fr] gap-3">
                <div>
                  <div className={labelCls}>Unit Number</div>
                  <Input type="number" min={1} value={unitDialog.number} onChange={(e) => setUnitDialog({ ...unitDialog, number: e.target.value })}
                    placeholder="1" className={inputCls} aria-label="Unit number" />
                </div>
                <div>
                  <div className={labelCls}>Unit Name</div>
                  <Input autoFocus value={unitDialog.name} onChange={(e) => setUnitDialog({ ...unitDialog, name: e.target.value })}
                    placeholder="e.g. Algebra" className={inputCls} aria-label="Unit name" />
                </div>
              </div>
              <div className={labelCls}>Unit Marks</div>
              <Input type="number" min={0} value={unitDialog.marks} onChange={(e) => setUnitDialog({ ...unitDialog, marks: e.target.value })}
                placeholder="e.g. 20" className={inputCls} aria-label="Unit marks" />
              {unitDialog.key != null && (
                <button
                  onClick={() => {
                    const unit = draft.find((u) => u.key === unitDialog.key)
                    setChapterDialog({ unitKey: unitDialog.key!, key: null, number: String((unit?.chapters.length ?? 0) + 1), name: "", topicsText: "" })
                    setUnitDialog(null)
                  }}
                  className="mt-4 cursor-pointer text-[12.5px] font-semibold text-okf hover:underline"
                >
                  + Add Chapter
                </button>
              )}
            </div>
            <div className="flex justify-end gap-2.5 border-t border-card-border px-6 py-4">
              <Button variant="outline" className="h-[40px] rounded-[10px]" onClick={() => setUnitDialog(null)}>Cancel</Button>
              <Button className="h-[40px] rounded-[10px]" onClick={saveUnitDialog} disabled={!unitDialog.name.trim()}>
                {unitDialog.key == null ? "Add Unit" : "Save Unit"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* chapter dialog */}
      {chapterDialog && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#0F172A]/25 p-4" onClick={() => setChapterDialog(null)}>
          <div className="flex max-h-[90vh] w-[520px] max-w-full flex-col overflow-hidden rounded-[14px] border border-card-border bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.08)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-card-border px-6 py-4">
              <div className="text-[15px] font-bold text-ink">{chapterDialog.key == null ? "Add Chapter" : "Edit Chapter"}</div>
              <button onClick={() => setChapterDialog(null)} className={iconBtn} aria-label="Close"><X className="size-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div className="mb-4 grid grid-cols-[110px_1fr] gap-3">
                <div>
                  <div className={labelCls}>Chapter No.</div>
                  <Input type="number" min={1} value={chapterDialog.number} onChange={(e) => setChapterDialog({ ...chapterDialog, number: e.target.value })}
                    placeholder="1" className={inputCls} aria-label="Chapter number" />
                </div>
                <div>
                  <div className={labelCls}>Chapter Name</div>
                  <Input autoFocus value={chapterDialog.name} onChange={(e) => setChapterDialog({ ...chapterDialog, name: e.target.value })}
                    placeholder="e.g. Real Numbers" className={inputCls} aria-label="Chapter name" />
                </div>
              </div>
              <div className={labelCls}>Topics — one per line</div>
              <textarea
                value={chapterDialog.topicsText}
                onChange={(e) => setChapterDialog({ ...chapterDialog, topicsText: e.target.value })}
                placeholder={"1. Fundamental Theorem of Arithmetic\n2. Proofs of Irrationality"}
                rows={8}
                className="w-full rounded-[10px] border border-card-border p-3 font-inherit text-[13px] leading-6 outline-none focus:border-okf"
                aria-label="Topics"
              />
              <div className="mt-1 text-[12px] text-text-secondary">
                {chapterDialog.topicsText.split("\n").filter((t) => t.trim()).length} topic(s)
              </div>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-card-border px-6 py-4">
              <Button variant="outline" className="h-[40px] rounded-[10px]" onClick={() => setChapterDialog(null)}>Cancel</Button>
              <Button className="h-[40px] rounded-[10px]" onClick={saveChapterDialog} disabled={!chapterDialog.name.trim()}>
                {chapterDialog.key == null ? "Add Chapter" : "Save Chapter"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
