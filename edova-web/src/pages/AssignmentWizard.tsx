import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Check,
  ChevronDown,
  X,
  Upload,
  Calendar as CalIcon,
  Clock,
  Sparkles,
  Paperclip,
  Plus,
  File,
  Type,
  PenTool,
  ArrowLeft,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Layers,
  Library,
  Video,
} from "lucide-react"
import { CLASSES, STUDENTS } from "@/data/seed"
import { useSchoolStore } from "@/store/school-store"
import { useAppStore } from "@/store/app-store"
import { ASSIGNMENT_TYPES } from "@/lib/assignment-types"
import { getSubjects, getResources, type LearningResource } from "@/lib/learning-api"
import { getResourceUrl } from "@/lib/media"
import type { Assignment, AssignmentAttachment, AssignmentType } from "@/lib/types"

type Step = "type" | "create1" | "create2"

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]
const APP_TODAY = new Date(2026, 6, 9)
const SUBJECTS = Array.from(new Set(CLASSES.map((c) => c.subject)))

// edova-backend (Step 3 of the real classes/students migration) -- optional.
// Not every class has a real classroom yet (only Class 10 -- Section A --
// Mathematics does today), and the service itself may not be running. Either
// case is a silent, graceful fallback to the CLASSES/STUDENTS seed data
// exactly as before -- never a crash, never a visible error.
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL ?? "http://localhost:8003"

interface RealStudent { id: string; name: string; rollNo: string }

function fetchRealRosterByClassId(): Promise<Record<string, RealStudent[]>> {
  return fetch(`${BACKEND_API_URL}/api/classrooms`)
    .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
    .then((classrooms: { id: string; class_level: number; section: string | null; subject: string }[]) =>
      Promise.all(
        classrooms.map((rc) => {
          // Match on meaning (subject + class level + section), not exact name
          // string -- the backend and the seed data don't share a punctuation
          // convention ("Class 10 -- Section A" vs "Class 10 — Section A").
          const cls = CLASSES.find(
            (c) =>
              c.subject === rc.subject &&
              c.name.includes(`Class ${rc.class_level}`) &&
              (!rc.section || c.name.includes(rc.section)),
          )
          if (!cls) return null
          return fetch(`${BACKEND_API_URL}/api/classrooms/${rc.id}/students`)
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then(
              (
                students: { id: string; student_number: string; first_name: string; last_name: string }[],
              ): [string, RealStudent[]] => [
                cls.id,
                students.map((s) => ({ id: s.id, name: `${s.first_name} ${s.last_name}`, rollNo: s.student_number })),
              ],
            )
            .catch(() => null)
        }),
      ),
    )
    .then((pairs) => Object.fromEntries(pairs.filter((p): p is [string, RealStudent[]] => p !== null)))
    .catch((err) => {
      console.warn("real classroom roster fetch failed, falling back to seed data:", err)
      return {}
    })
}

const fieldLabel = "text-[13.5px] font-semibold text-text-secondary"
const fieldInput =
  "mt-2 w-full h-11 px-3.5 rounded-[8px] border border-card-border bg-white text-[14px] font-[inherit] outline-none focus:ring-2 focus:ring-ring"

export default function AssignmentWizard() {
  const navigate = useNavigate()
  const publishAssignment = useSchoolStore((s) => s.publishAssignment)
  const showFlash = useSchoolStore((s) => s.showFlash)
  const academicYear = useAppStore((s) => s.academicYear)

  const [step, setStep] = useState<Step>("type")
  const [selectedType, setSelectedType] = useState<AssignmentType>("written")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [attachments, setAttachments] = useState<AssignmentAttachment[]>([])
  const [showUpload, setShowUpload] = useState(false)
  const [uploadTab, setUploadTab] = useState("Library")
  const [libraryResources, setLibraryResources] = useState<LearningResource[]>([])
  const [libraryLoading, setLibraryLoading] = useState(false)

  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([CLASSES[0].id])
  const [subject, setSubject] = useState(CLASSES[0].subject)
  const [marks, setMarks] = useState("20")
  const [schedule, setSchedule] = useState(false)
  const [dueDay, setDueDay] = useState<number>(APP_TODAY.getDate() + 7)
  const [showCalendar, setShowCalendar] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [realRosterByClassId, setRealRosterByClassId] = useState<Record<string, RealStudent[]>>({})

  useEffect(() => {
    fetchRealRosterByClassId().then(setRealRosterByClassId)
  }, [])

  const selectedTypeObj = ASSIGNMENT_TYPES.find((t) => t.id === selectedType)!
  const availableClasses = CLASSES.filter((c) => !selectedClassIds.includes(c.id))

  const monthLabel = `${MONTH_SHORT[APP_TODAY.getMonth()]} ${APP_TODAY.getFullYear()}`
  const daysInMonth = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth() + 1, 0).getDate()
  const leadingBlanks = useMemo(() => {
    const firstOfMonth = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), 1).getDay()
    return (firstOfMonth + 6) % 7 // Monday-first
  }, [])
  const dueLabel = `${dueDay} ${MONTH_SHORT[APP_TODAY.getMonth()]}, 11:59 PM`

  useEffect(() => {
    if (!showUpload || uploadTab !== "Library") return
    setLibraryLoading(true)
    getSubjects()
      .then(({ subjects }) => subjects.find((s) => s.subject_name === subject))
      .then((match) => (match ? getResources(match.id) : []))
      .then((resources) => setLibraryResources(resources))
      .catch(() => setLibraryResources([]))
      .finally(() => setLibraryLoading(false))
  }, [showUpload, uploadTab, subject])

  function handleAttach() {
    setAttachments([{ name: "Worksheet Attachment.pdf", size: "342.33KB" }])
    setShowUpload(false)
  }

  function handleAttachResource(r: LearningResource) {
    setAttachments([{ name: r.title, size: r.type, s3Key: r.s3_key, externalUrl: r.external_url }])
    setShowUpload(false)
  }

  function toggleClass(id: string) {
    setSelectedClassIds((s) => s.filter((x) => x !== id))
  }
  function addClass(id: string) {
    if (id && !selectedClassIds.includes(id)) {
      setSelectedClassIds((s) => [...s, id])
      const cls = CLASSES.find((c) => c.id === id)
      if (cls && selectedClassIds.length === 0) setSubject(cls.subject)
    }
  }

  function handlePublish() {
    if (!title.trim() || selectedClassIds.length === 0) return
    const due = `${MONTH_SHORT[APP_TODAY.getMonth()]} ${dueDay}`
    const totalPoints = Number(marks) || 20
    let firstId = ""
    selectedClassIds.forEach((classId, idx) => {
      const cls = CLASSES.find((c) => c.id === classId)
      const realRoster = realRosterByClassId[classId]
      const roster = realRoster && realRoster.length > 0
        ? realRoster
        : STUDENTS.filter((st) => st.classId === classId)
      const submissions: Assignment["submissions"] = roster.map((st) => ({
        studentId: st.id,
        status: "not_started",
        submittedOn: "",
        score: null,
        feedback: "",
      }))
      const id = `a_${Date.now()}_${idx}`
      if (idx === 0) firstId = id
      const assignment: Assignment = {
        id,
        title,
        classId,
        subject: cls ? cls.subject : subject,
        term: "Term 2",
        academicYear,
        due,
        totalPoints,
        status: "active",
        sourceAssessmentId: null,
        publishedToStudents: true,
        createdOn: "Just now",
        submissions,
        type: selectedType,
        description,
        attachments,
      }
      publishAssignment(assignment)
    })
    showFlash("homework", `"${title}" published to ${selectedClassIds.length} class${selectedClassIds.length > 1 ? "es" : ""}.`)
    navigate(`/assignment-tracker/${firstId}`)
  }

  function goBack() {
    if (step === "create2") setStep("create1")
    else if (step === "create1") setStep("type")
    else navigate("/assignment-tracker")
  }

  return (
    <div className="-mx-8 -mt-7 min-h-[calc(100vh-56px)] bg-white">
      {/* header */}
      <header className="sticky top-0 z-30 border-b border-card-border bg-white/90 px-8 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="grid h-8 w-8 place-items-center rounded-full border border-card-border transition hover:bg-cream"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="font-display text-[15px] font-bold text-ink">New Assignment</div>
          </div>

          <div className="flex items-center gap-2">
            {step === "type" && (
              <div className="hidden items-center gap-1.5 rounded-full border border-card-border bg-cream px-3 h-8 text-[12px] text-text-secondary md:flex">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#16332B" }} />
                Step 1 of 3
              </div>
            )}
            {step !== "type" && (
              <>
                <button
                  onClick={() => navigate("/assignment-tracker")}
                  className="h-9 rounded-full px-4 text-[13px] font-semibold text-text-secondary hover:text-ink"
                >
                  Discard
                </button>
                <button
                  onClick={step === "create1" ? () => setStep("create2") : handlePublish}
                  className="h-9 rounded-full px-5 text-[13px] font-semibold text-white shadow-sm transition"
                  style={{ background: "#16332B" }}
                >
                  {step === "create1" ? "Next" : "Publish"}
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* STEP: TYPE SELECT */}
      {step === "type" && (
        <main className="mx-auto max-w-[960px] px-4 py-10 md:px-8">
          <div className="mb-8">
            <h1 className="font-display text-[24px] font-bold leading-tight text-ink md:text-[28px]">
              What type of assignment?
            </h1>
            <p className="mt-2 text-[14px] text-text-secondary">
              Choose how you want students to submit their work
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ASSIGNMENT_TYPES.map((t) => {
              const Icon = t.icon
              const active = selectedType === t.id
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedType(t.id)}
                  className="rounded-[16px] border p-5 text-left shadow-card transition-all hover:shadow"
                  style={
                    active
                      ? { borderColor: "rgba(217,169,78,0.6)", background: "rgba(217,169,78,0.12)" }
                      : { borderColor: "var(--edova-card-border)", background: "#fff" }
                  }
                >
                  <div
                    className="mb-4 grid h-10 w-10 place-items-center rounded-[12px]"
                    style={
                      active
                        ? { background: "#16332B", color: "#fff" }
                        : { background: "var(--edova-cream)", color: "var(--edova-text-secondary)", border: "1px solid var(--edova-card-border)" }
                    }
                  >
                    <Icon size={18} />
                  </div>
                  <div className="text-[14px] font-semibold text-ink">{t.title}</div>
                  <div className="mt-1.5 min-h-[36px] text-[12.5px] leading-[1.5] text-text-secondary">
                    {t.desc}
                  </div>
                  {active ? (
                    <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-[rgba(217,169,78,0.6)] bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#8a6d1f]">
                      <Check size={12} /> Selected
                    </div>
                  ) : (
                    <div className="mt-4 text-[11px] text-text-muted">Tap to select</div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={() => setStep("create1")}
              className="h-11 rounded-full px-7 text-[14px] font-semibold text-white shadow-sm transition"
              style={{ background: "#16332B" }}
            >
              Continue with {selectedTypeObj.title}
            </button>
          </div>
        </main>
      )}

      {/* STEP: CREATE 1 */}
      {step === "create1" && (
        <main className="mx-auto max-w-[760px] px-4 py-8 md:px-6">
          <div className="overflow-hidden rounded-[20px] border border-card-border bg-cream shadow-card">
            <div className="flex items-center justify-between gap-3 border-b border-card-border p-5 md:p-7">
              <div className="relative">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as AssignmentType)}
                  className="h-9 appearance-none rounded-full border border-card-border bg-white pl-3 pr-8 text-[13px] font-semibold text-ink"
                >
                  {ASSIGNMENT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} Assignment
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary" />
              </div>
              <button className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--okf-border)] bg-[var(--okf-bg)] px-3 text-[12px] font-semibold text-[var(--okf-text)]">
                <Sparkles size={14} /> Create With AI
              </button>
            </div>

            <div className="space-y-6 bg-white p-5 md:p-7">
              <div>
                <label className={fieldLabel}>Assignment Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={fieldInput}
                  placeholder="e.g. Plants and their needs"
                />
              </div>

              <div>
                <label className={fieldLabel}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="mt-2 w-full resize-none rounded-[8px] border border-card-border bg-white px-3.5 py-3 text-[14px] font-[inherit] leading-relaxed outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Add instructions..."
                />
                <div className="mt-2 flex gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-card-border bg-cream text-text-secondary">
                    <Type size={14} />
                  </span>
                  <span className="grid h-7 w-7 place-items-center rounded-full border border-card-border bg-cream text-text-secondary">
                    <PenTool size={14} />
                  </span>
                </div>
              </div>

              <div>
                <label className={fieldLabel}>Attachments</label>
                <div className="mt-2">
                  {attachments.length === 0 ? (
                    <button
                      onClick={() => setShowUpload(true)}
                      className="grid h-[88px] w-full place-items-center gap-1 rounded-[12px] border border-dashed border-[#D1D5DB] bg-[#FCFCFD] transition hover:bg-cream"
                    >
                      <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--okf-text)]">
                        <Paperclip size={16} /> Upload Attachment
                      </span>
                      <span className="text-[11px] text-text-muted">PDF, DOCX, Images up to 25MB</span>
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {attachments.map((a) => {
                        const url = getResourceUrl({ s3_key: a.s3Key ?? null, external_url: a.externalUrl })
                        const Tag = url ? "a" : "span"
                        return (
                          <Tag
                            key={a.name}
                            {...(url ? { href: url, target: "_blank", rel: "noreferrer" } : {})}
                            className="inline-flex h-9 items-center gap-2 rounded-full border border-[var(--okf-border)] bg-[var(--okf-bg)] px-3 text-[12.5px] font-semibold text-[var(--okf-text)]"
                          >
                            <File size={14} /> {a.name}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                setAttachments([])
                              }}
                              className="ml-1 grid h-5 w-5 place-items-center rounded-full bg-white"
                            >
                              <X size={12} />
                            </button>
                          </Tag>
                        )
                      })}
                      <button
                        onClick={() => setShowUpload(true)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-card-border bg-white px-3 text-[12.5px] font-semibold"
                      >
                        <Plus size={14} /> Add more
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-card-border px-5 py-4 md:px-7">
              <span className="text-[12px] text-text-muted">Auto-saved • Draft</span>
              <span className="text-[12px] text-text-secondary">Step 1 of 2 • Details</span>
            </div>
          </div>
        </main>
      )}

      {/* STEP: CREATE 2 */}
      {step === "create2" && (
        <main className="mx-auto max-w-[760px] px-4 py-8 md:px-6">
          <div className="overflow-hidden rounded-[20px] border border-card-border bg-cream shadow-card">
            <div className="space-y-7 bg-white p-5 md:p-7">
              <div>
                <label className={fieldLabel}>Choose Classes</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedClassIds.map((id) => {
                    const cls = CLASSES.find((c) => c.id === id)
                    if (!cls) return null
                    return (
                      <span
                        key={id}
                        className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[var(--okf-border)] bg-[var(--okf-bg)] pl-3 pr-1.5 text-[12.5px] font-semibold text-[var(--okf-text)]"
                      >
                        {cls.name}
                        <button
                          onClick={() => toggleClass(id)}
                          className="grid h-5 w-5 place-items-center rounded-full border border-card-border bg-white"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    )
                  })}
                  <div className="relative">
                    <select
                      onChange={(e) => addClass(e.target.value)}
                      defaultValue=""
                      className="h-8 rounded-full border border-card-border bg-white pl-3 pr-7 text-[12.5px]"
                    >
                      <option value="" disabled>
                        + Add class
                      </option>
                      {availableClasses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className={fieldLabel}>Choose Subject</label>
                  <div className="relative mt-2">
                    <select
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="h-11 w-full appearance-none rounded-[8px] border border-card-border bg-white pl-3.5 pr-9 text-[14px] outline-none focus:ring-2 focus:ring-ring"
                    >
                      {SUBJECTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" />
                  </div>
                </div>

                <div>
                  <label className={fieldLabel}>End Date &amp; Time</label>
                  <div className="relative mt-2">
                    <button
                      onClick={() => setShowCalendar((v) => !v)}
                      className="flex h-11 w-full items-center justify-between rounded-[8px] border border-card-border bg-white px-3.5 text-left text-[13.5px]"
                    >
                      <span className="inline-flex items-center gap-2">
                        <CalIcon size={16} className="text-text-secondary" /> {dueLabel}
                      </span>
                      <Clock size={16} className="text-text-muted" />
                    </button>

                    {showCalendar && (
                      <div className="absolute right-0 z-20 mt-2 w-[300px] rounded-[16px] border border-card-border bg-white p-4 shadow-lg">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-[13px] font-semibold">{monthLabel}</div>
                        </div>
                        <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] text-text-muted">
                          {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                            <div key={d} className="grid h-7 place-items-center">{d}</div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: leadingBlanks }).map((_, i) => (
                            <div key={`b${i}`} />
                          ))}
                          {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1
                            const selected = day === dueDay
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  setDueDay(day)
                                  setShowCalendar(false)
                                }}
                                className="grid h-8 place-items-center rounded-full text-[12px] transition hover:bg-cream"
                                style={
                                  selected
                                    ? { background: "#16332B", color: "#fff", fontWeight: 600 }
                                    : { color: "#111827" }
                                }
                              >
                                {day}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className={fieldLabel}>Total Marks</label>
                  <input value={marks} onChange={(e) => setMarks(e.target.value)} className={fieldInput} />
                </div>
                <div className="flex h-11 items-end justify-between rounded-[8px] border border-card-border bg-cream px-3.5">
                  <div>
                    <div className="text-[11px] text-text-secondary">Schedule for later</div>
                    <div className="-mt-0.5 text-[12.5px] font-semibold">
                      {schedule ? "Enabled" : "Publish now"}
                    </div>
                  </div>
                  <button
                    onClick={() => setSchedule(!schedule)}
                    className="relative h-6 w-10 rounded-full transition"
                    style={{ background: schedule ? "#16332B" : "var(--edova-card-border)" }}
                  >
                    <span
                      className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition"
                      style={{ left: schedule ? 18 : 2 }}
                    />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between border-t border-card-border px-5 py-4 md:px-7">
              <span className="text-[12px] text-text-secondary">Step 2 of 2 • Configuration</span>
              <span className="text-[12px] text-text-muted">You can edit after publishing</span>
            </div>
          </div>
        </main>
      )}

      {/* UPLOAD MODAL */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6">
          <div className="absolute inset-0 bg-[rgba(26,46,53,0.5)] backdrop-blur-[2px]" onClick={() => setShowUpload(false)} />
          <div className="relative flex max-h-[88vh] w-full max-w-[880px] flex-col overflow-hidden rounded-[20px] border border-card-border bg-white shadow-xl">
            <div className="flex h-[56px] shrink-0 items-center justify-between border-b border-card-border px-5">
              <div className="text-[14px] font-semibold">Upload Attachment</div>
              <button onClick={() => setShowUpload(false)} className="grid h-8 w-8 place-items-center rounded-full border border-card-border hover:bg-cream">
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-1 overflow-auto border-b border-card-border px-5 pt-3">
              {[
                { l: "Library", ic: Library },
                { l: "Upload", ic: Upload },
                { l: "PDF Question Paper", ic: FileText },
                { l: "Drive", ic: HardDrive },
                { l: "Unsplash", ic: ImageIcon },
                { l: "Pexels", ic: Layers },
              ].map((t) => {
                const active = uploadTab === t.l
                return (
                  <button
                    key={t.l}
                    onClick={() => setUploadTab(t.l)}
                    className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 text-[12.5px] font-semibold transition"
                    style={
                      active
                        ? { background: "#16332B", color: "#fff", borderColor: "#16332B" }
                        : { background: "#fff", borderColor: "var(--edova-card-border)", color: "var(--edova-text-secondary)" }
                    }
                  >
                    <t.ic size={14} /> {t.l}
                  </button>
                )
              })}
            </div>

            {uploadTab === "Library" ? (
              <div className="flex-1 overflow-auto p-4 md:p-6">
                {libraryLoading ? (
                  <div className="p-6 text-center text-[13px] text-text-secondary">Loading {subject} resources…</div>
                ) : libraryResources.length === 0 ? (
                  <div className="p-6 text-center text-[13px] text-text-secondary">
                    No catalogued resources for {subject} yet — add them via Resource Library first.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {libraryResources.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => handleAttachResource(r)}
                        className="flex items-center gap-3 rounded-[12px] border border-card-border bg-white p-3 text-left transition hover:bg-cream"
                      >
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[8px] border border-[var(--okf-border)] bg-[var(--okf-bg)] text-[var(--okf-text)]">
                          {r.type === "Video" ? <Video size={16} /> : <File size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-ink">{r.title}</div>
                          <div className="text-[11px] text-text-muted">
                            {r.type}{r.chapter_number != null ? ` • Chapter ${r.chapter_number}` : ""}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : uploadTab === "Upload" ? (
              <div className="flex-1 overflow-auto p-4 md:p-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer rounded-[14px] border-2 border-dashed border-[#D1D5DB] bg-white p-8 text-center transition hover:bg-cream"
                >
                  <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-full border border-[var(--okf-border)] bg-[var(--okf-bg)] text-[var(--okf-text)]">
                    <Upload size={18} />
                  </div>
                  <div className="text-[13px] font-semibold">Drag &amp; drop files here</div>
                  <div className="mt-1 text-[11px] text-text-muted">PDF, DOCX, PNG up to 25MB</div>
                  <button className="mt-3 h-8 rounded-full px-4 text-[12px] font-semibold text-white" style={{ background: "#16332B" }}>
                    Choose files
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" />
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button onClick={() => setShowUpload(false)} className="h-9 rounded-full border border-card-border bg-white px-4 text-[13px] font-semibold">
                    Cancel
                  </button>
                  <button onClick={handleAttach} className="h-9 rounded-full px-5 text-[13px] font-semibold text-white" style={{ background: "#16332B" }}>
                    Attach file
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 items-center justify-center p-10 text-[13px] text-text-secondary">
                {uploadTab} integration coming soon.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
