import { useCallback, useEffect, useMemo, useState } from "react"
import { Download, Pencil, Search, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FlashBanner } from "@/components/common/FlashBanner"
import { useSchoolStore } from "@/store/school-store"
import { getAcademicYears, getCurriculum, deleteSubject as apiDeleteSubject } from "@/lib/curriculum-api"

// Settings > Curriculum — DB-backed (academic_years / curriculums /
// curriculum_subjects via the course-CRUD API). Layout matches
// instructions/update- settings.png.

interface Subject {
  id: string
  code: string
  name: string
  type: "Core" | "Elective"
  credits: number
  marks: number | null
  chapters: number | null
  syllabus: Record<string, number>
}

interface CurriculumData {
  id: string
  year_label: string
  board: string
  class_label: string
  updated_at: string
  subjects: Subject[]
}

const CLASS_OPTIONS = ["LKG", "UKG", ...Array.from({ length: 10 }, (_, i) => `Class ${i + 1}`)]
const BOARD_OPTIONS = ["CBSE", "ICSE", "State"]

const TYPE_BADGE: Record<Subject["type"], string> = {
  Core: "bg-[#E0E7FF] text-[#4338CA]",
  Elective: "bg-[#FFEDD5] text-[#C2410C]",
}

// BM25 (k1=1.5, b=0.75) over per-subject documents built from
// code + name + type + syllabus unit names — so a topic query like
// "trigonometry" surfaces the subject whose syllabus contains it.
const tokenize = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? []

function bm25Scores(docs: string[][], queryTokens: string[]): number[] {
  const nDocs = docs.length
  const avgdl = docs.reduce((a, d) => a + d.length, 0) / Math.max(nDocs, 1)
  const df = new Map<string, number>()
  for (const d of docs) for (const t of new Set(d)) df.set(t, (df.get(t) ?? 0) + 1)
  return docs.map((d) => {
    const tf = new Map<string, number>()
    for (const t of d) tf.set(t, (tf.get(t) ?? 0) + 1)
    let score = 0
    for (const q of queryTokens) {
      const n = df.get(q) ?? 0
      if (n === 0) continue
      const idf = Math.log(1 + (nDocs - n + 0.5) / (n + 0.5))
      const f = tf.get(q) ?? 0
      score += (idf * f * 2.5) / (f + 1.5 * (1 - 0.75 + (0.75 * d.length) / avgdl))
    }
    return score
  })
}

export default function Curriculum() {
  const showFlash = useSchoolStore((s) => s.showFlash)

  const [yearOptions, setYearOptions] = useState<string[]>([])
  const [year, setYear] = useState("")
  const [board, setBoard] = useState(BOARD_OPTIONS[0])
  const [cls, setCls] = useState("Class 5")
  const [query, setQuery] = useState("")
  const [collapsed, setCollapsed] = useState(false)
  const [drawerSubject, setDrawerSubject] = useState<Subject | null>(null)

  const [curriculum, setCurriculum] = useState<CurriculumData | null>(null)
  const [loading, setLoading] = useState(false)

  // Academic year dropdown comes from the DB, newest year selected by default.
  useEffect(() => {
    getAcademicYears()
      .then((rows) => {
        const labels = rows.map((r) => r.year_label)
        setYearOptions(labels)
        setYear((prev) => prev || labels[labels.length - 1] || "")
      })
      .catch(() => showFlash("curriculum", "Could not load academic years — is the API running on :8000?", 5000))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCurriculum = useCallback(() => {
    if (!year) return
    setLoading(true)
    getCurriculum(year, board, cls)
      .then((d) =>
        setCurriculum({
          ...d,
          subjects: d.subjects.map((r) => ({
            id: r.id,
            code: r.subject_code,
            name: r.subject_name,
            type: r.subject_type,
            credits: r.credits,
            marks: r.total_marks,
            chapters: r.total_chapters,
            syllabus: r.syllabus_json,
          })),
        }),
      )
      .catch(() => {
        setCurriculum(null)
        showFlash("curriculum", "Could not load curriculum — is the API running on :8000?", 5000)
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, board, cls])

  useEffect(() => { loadCurriculum() }, [loadCurriculum])

  const subjects = useMemo(() => curriculum?.subjects ?? [], [curriculum])
  const visible = useMemo(() => {
    const q = query.trim()
    if (!q) return subjects
    const docs = subjects.map((s) =>
      tokenize(`${s.code} ${s.name} ${s.type} ${Object.keys(s.syllabus).join(" ")}`),
    )
    const scores = bm25Scores(docs, tokenize(q))
    return subjects
      .map((s, i) => ({ s, score: scores[i] }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.s)
  }, [subjects, query])
  const updatedLabel = curriculum
    ? `Updated ${new Date(curriculum.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`
    : ""

  const deleteSubject = async (s: Subject) => {
    if (!curriculum || !window.confirm(`Delete ${s.name} (${s.code}) from this curriculum?`)) return
    try {
      await apiDeleteSubject(curriculum.id, s.id)
      loadCurriculum()
      showFlash("curriculum", "Subject deleted.")
    } catch (e) {
      showFlash("curriculum", `Could not delete subject: ${e instanceof Error ? e.message : "unknown error"}`, 5000)
    }
  }

  return (
    <div>
      <FlashBanner flashKey="curriculum" />

      {/* filters */}
      <div className="mb-5 mt-3 flex flex-wrap items-end justify-between gap-3 rounded-[12px] border border-card-border bg-white p-4">
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Academic Year</span>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-[40px] w-[140px] rounded-[10px] border-card-border text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>{yearOptions.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Board</span>
            <Select value={board} onValueChange={setBoard}>
              <SelectTrigger className="h-[40px] w-[120px] rounded-[10px] border-card-border text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>{BOARD_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[12px] font-semibold text-text-secondary">Class</span>
            <Select value={cls} onValueChange={setCls}>
              <SelectTrigger className="h-[40px] w-[130px] rounded-[10px] border-card-border text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>{CLASS_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-text-muted" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by Subject Name / Code"
              className="h-[40px] w-[250px] rounded-[10px] border-card-border bg-[#F9FAFB] pl-9 text-[13px]"
            />
          </div>
          <Button variant="outline" className="h-[40px] rounded-[10px]">Download</Button>
        </div>
      </div>

      {/* class card */}
      <div className="overflow-hidden rounded-[14px] border border-card-border bg-white">
        <div className="flex items-center justify-between border-b border-card-border bg-[#FCFCFF] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#FFEDD5] font-bold text-[#EA580C]">
              {cls.replace("Class ", "").replace("LKG", "L").replace("UKG", "U")}
            </div>
            <div>
              <div className="text-[14.5px] font-bold text-ink">{cls} - {board} ({year})</div>
              <div className="mt-0.5 text-[12px] text-text-secondary">
                {subjects.length} subjects • {updatedLabel}
              </div>
            </div>
          </div>
          <Button variant="outline" className="h-8 rounded-[8px] text-[12.5px]" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "Expand" : "Collapse"}
          </Button>
        </div>

        {!collapsed && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[#F9FAFB]">
                  {["S.No", "Subject Code", "Subject Name", "Subject Type", "Marks", "Chapters", "Syllabus", "Action"].map((h) => (
                    <th key={h} className="text-cap whitespace-nowrap border-b border-card-border px-4 py-3 text-left uppercase tracking-[0.06em] text-text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((s, i) => (
                  <tr key={s.id} className="text-body border-b border-[#F1F2F6] last:border-0">
                    <td className="px-4 py-3.5 text-text-secondary">{i + 1}</td>
                    <td className="px-4 py-3.5 font-mono text-[12.5px] font-semibold text-ink">{s.code}</td>
                    <td className="text-body-strong px-4 py-3.5 text-ink">{s.name}</td>
                    <td className="px-4 py-3.5">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${TYPE_BADGE[s.type]}`}>{s.type}</span>
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">{s.marks ?? "-"}</td>
                    <td className="px-4 py-3.5 text-text-secondary">{s.chapters ?? "-"}</td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => setDrawerSubject(s)} className="cursor-pointer font-semibold text-okf hover:underline">
                        View
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex gap-1.5">
                        <button className="grid size-7 cursor-pointer place-items-center rounded-[8px] border border-card-border text-text-secondary hover:bg-muted" aria-label="Edit subject">
                          <Pencil className="size-3.5" />
                        </button>
                        <button onClick={() => deleteSubject(s)} className="grid size-7 cursor-pointer place-items-center rounded-[8px] border border-card-border text-text-secondary hover:bg-muted" aria-label="Delete subject">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {visible.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-text-secondary">
                    {loading ? "Loading…" : query ? `No subjects match "${query}".` : "No subjects yet for this class — add one in the Master Data tab."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* syllabus drawer */}
      {drawerSubject && (
        <div className="fixed inset-0 z-40 bg-[#0F172A]/25" onClick={() => setDrawerSubject(null)} />
      )}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-[400px] max-w-full flex-col border-l border-card-border bg-white shadow-[-20px_0_40px_rgba(0,0,0,0.08)] transition-transform duration-300 ${
          drawerSubject ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {drawerSubject && (
          <>
            <div className="flex items-center justify-between border-b border-card-border p-5">
              <div>
                <div className="text-[15px] font-bold text-ink">{drawerSubject.name}</div>
                <div className="text-[12px] text-text-secondary">{drawerSubject.code} • {cls}</div>
              </div>
              <button onClick={() => setDrawerSubject(null)} className="grid size-7 cursor-pointer place-items-center rounded-[8px] border border-card-border text-text-secondary hover:bg-muted" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-3 text-[12px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                Unit-wise marks (theory{drawerSubject.marks ? ` — ${drawerSubject.marks} total incl. internal` : ""})
              </div>
              {Object.entries(drawerSubject.syllabus).map(([unit, marks], i) => (
                <div key={unit} className="mb-2.5 flex items-center justify-between rounded-[10px] border border-card-border p-3">
                  <div className="text-[13px] font-bold text-ink">Unit {i + 1}: {unit}</div>
                  <span className="rounded-full bg-[#E0E7FF] px-2 py-1 text-[11px] font-semibold text-[#4338CA]">{marks} marks</span>
                </div>
              ))}
              {Object.keys(drawerSubject.syllabus).length === 0 && (
                <div className="text-[13px] text-text-secondary">No syllabus breakdown recorded for this subject.</div>
              )}
              <Button className="mt-3 w-full"><Download className="size-4" /> Download Syllabus PDF</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
