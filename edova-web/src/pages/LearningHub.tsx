import { useEffect, useMemo, useRef, useState } from "react"
import { VideoPlayerWithQuiz } from "@/components/learning/VideoPlayerWithQuiz"
import { PdfViewerWithNotes } from "@/components/learning/PdfViewerWithNotes"
import { LabExercise } from "@/components/learning/LabExercise"
import { Mindmap } from "@/components/learning/Mindmap"
import { MistakeJournal } from "@/components/learning/MistakeJournal"
import { Heatmap } from "@/components/learning/Heatmap"
import { StudyPlan } from "@/components/learning/StudyPlan"
import { StudyMaterial } from "@/components/learning/StudyMaterial"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLearningStore } from "@/store/learning-store"
import { useAppStore } from "@/store/app-store"
import { RecommendationCards } from "@/components/common/RecommendationCards"
import { getMyAssignments, type MyAssignment } from "@/lib/student-api"
import { getRecommendations } from "@/lib/memory-api"
import type { RecTask } from "@/components/learning/StudyPlan"
import { APP_TODAY } from "@/lib/dates"
import {
  currentStudentId,
  getQuiz,
  getResources,
  getStudentSubjects,
  getSubjects,
  getSyllabus,
  type LearningResource,
  type LearningSubject,
  type SyllabusChapter,
  type SyllabusTopic,
  type SyllabusUnit,
} from "@/lib/learning-api"
import { getAssetUrl } from "@/lib/media"
import type { QuizQuestion } from "@/lib/types"

// Degraded path when the clerk API is unreachable: the dropdowns collapse to
// the one seeded demo selection (chapter 9 carries the seeded quiz + PDF).
const FALLBACK_SUBJECT: LearningSubject = { id: "fallback-subject", subject_name: "Science" }
const FALLBACK_CHAPTER: SyllabusChapter = {
  id: "fallback-chapter",
  number: 9,
  name: "Light — Reflection and Refraction",
  topics: [],
}
const FALLBACK_TOPIC: SyllabusTopic = { id: "fallback-topic", title: "Laws of Reflection" }

// Placeholder shown only in Guest mode (no student session) — logged-in
// students see their real assignments instead (fetched below).
const ASSIGNMENTS = [
  {
    id: "a1",
    title: "Light - Worksheet",
    subject: "Science",
    chapter: FALLBACK_CHAPTER.name,
    dueLabel: "Today 5PM",
    status: "due_today" as const,
  },
]

type StudyAssignment = {
  id: string
  title: string
  subject: string
  chapter: string
  dueLabel: string
  status: "overdue" | "due_today" | "due_soon"
}

// MyAssignment (backend) -> the StudyPlan strip's shape. Returns null for
// work already turned in — the strip is a to-do list, not a history.
function toStudyAssignment(a: MyAssignment): StudyAssignment | null {
  if (a.submission_status !== "not_started") return null
  const subject = a.classroom_name.split("·").pop()?.trim() ?? ""
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  const today = new Date(APP_TODAY.getFullYear(), APP_TODAY.getMonth(), APP_TODAY.getDate())
  const due = a.due_date ? new Date(a.due_date) : null
  const dueDay = due ? new Date(due.getFullYear(), due.getMonth(), due.getDate()) : null
  const diff = dueDay ? Math.round((dueDay.getTime() - today.getTime()) / 86400000) : null
  const status = diff !== null && diff < 0 ? ("overdue" as const) : diff === 0 ? ("due_today" as const) : ("due_soon" as const)
  const dueLabel =
    diff === null ? "No due date"
    : diff < 0 ? "Overdue"
    : diff === 0 ? "Today"
    : diff === 1 ? "Tomorrow"
    : `${MONTHS[dueDay!.getMonth()]} ${dueDay!.getDate()}`
  return { id: a.id, title: a.title, subject, chapter: a.topic_label || subject, dueLabel, status }
}



export default function LearningHub() {
  const [activeView, setActiveView] = useState<"learning" | "journal" | "heatmap">("learning")
  const [tab, setTab] = useState("learn")
  // Default: 55/45 video/reading split. Theater: 72/28, for when the video
  // is what needs the room (a diagram, a worked example) rather than the text.
  const [videoFocus, setVideoFocus] = useState(false)
  const { streak, mistakes, hydrate, addXP, addMistake } = useLearningStore()

  // Real teacher-assigned homework for logged-in students; Guest mode keeps
  // the placeholder above. `null` = not loaded / not a student session.
  const session = useAppStore((s) => s.session)
  const [realAssignments, setRealAssignments] = useState<StudyAssignment[] | null>(null)
  useEffect(() => {
    if (session?.user.role !== "student") return
    getMyAssignments()
      .then((rows) => setRealAssignments(rows.map(toStudyAssignment).filter((a) => a !== null)))
      .catch(() => { /* keep placeholder */ })
  }, [session])

  // Real recommended tasks: memory-layer struggle cards (works for the demo
  // student in Guest mode too) + the live mistake journal.
  const [recTasks, setRecTasks] = useState<RecTask[]>([])
  useEffect(() => {
    getRecommendations(currentStudentId(), "student")
      .then((recs) => {
        const tasks: RecTask[] = recs
          .filter((r) => r.kind === "struggle_remedial" && r.chapter)
          .map((r) => ({
            id: r.id,
            title: `Revisit ${r.chapter}`,
            meta: "You struggled here • High impact",
            xp: "+30 XP",
          }))
        if (mistakes.length > 0) {
          tasks.push({
            id: "mistake-journal",
            title: `Fix ${Math.min(3, mistakes.length)} mistake${mistakes.length === 1 ? "" : "s"} in Journal`,
            meta: "High impact • Mistake Journal",
            xp: "+30 XP",
          })
        }
        setRecTasks(tasks.slice(0, 4))
      })
      .catch(() => { /* no recommendations — strip just hides */ })
  }, [mistakes.length])

  // Content tree from the clerk API; each level falls back to the seeded
  // Science/Light/Laws-of-Reflection selection while unloaded or unreachable.
  const [subjects, setSubjects] = useState<LearningSubject[]>([])
  const [subjectId, setSubjectId] = useState(FALLBACK_SUBJECT.id)
  const [units, setUnits] = useState<SyllabusUnit[]>([])
  const [chapterId, setChapterId] = useState(FALLBACK_CHAPTER.id)
  const [topicId, setTopicId] = useState(FALLBACK_TOPIC.id)
  const [resources, setResources] = useState<LearningResource[]>([])
  // null = quiz unknown (API down) → player uses its built-in fallback set;
  // [] = topic has no quiz → player hides the quiz card.
  const [quiz, setQuiz] = useState<QuizQuestion[] | null>(null)
  // Set by goToChapter when a jump targets a different subject — the new
  // subject's chapters don't exist yet, so the syllabus-loaded effect below
  // picks this chapter once they're in, instead of its usual default.
  const pendingChapterNameRef = useRef<string | null>(null)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Subjects for the fixed demo curriculum or the student's real classes.
  useEffect(() => {
    Promise.all([
      getStudentSubjects().catch(() => ({ subjects: [] })),
      getSubjects()
    ]).then(([enrolledRes, allRes]) => {
      const enrolledNames = new Set(enrolledRes.subjects.map(s => s.subject_name.toLowerCase()))
      
      // If student has no enrollments (e.g. guest mode), show all or fallback
      let available = allRes.subjects
      if (enrolledNames.size > 0) {
        available = available.filter(s => enrolledNames.has(s.subject_name.toLowerCase()))
      }
      
      // If none match, fallback to the all available
      if (available.length === 0) available = allRes.subjects

      setSubjects(available)
      const science = available.find((s) => s.subject_name === FALLBACK_SUBJECT.subject_name) ?? available[0]
      if (science) setSubjectId(science.id)
    }).catch(() => { /* keep the fallback subject */ })
  }, [])

  // Syllabus tree of the picked subject; default to the Light chapter (or the
  // first chapter for any other subject) and its Laws of Reflection topic.
  useEffect(() => {
    if (subjectId === FALLBACK_SUBJECT.id) return
    setUnits([])
    const pendingChapterName = pendingChapterNameRef.current
    pendingChapterNameRef.current = null
    getSyllabus(subjectId)
      .then((d) => {
        const loaded = d.units ?? []
        setUnits(loaded)
        const chapters = loaded.flatMap((u) => u.chapters)
        const chapter =
          (pendingChapterName && chapters.find((c) => c.name === pendingChapterName)) ||
          chapters.find((c) => c.name === FALLBACK_CHAPTER.name) ||
          chapters[0]
        if (chapter) {
          setChapterId(chapter.id)
          const topic = chapter.topics.find((t) => t.title === FALLBACK_TOPIC.title) ?? chapter.topics[0]
          setTopicId(topic ? topic.id : FALLBACK_TOPIC.id)
        }
      })
      .catch(() => setUnits([]))
  }, [subjectId])

  // Chapter-level resources (chapter PDF, video) of the picked subject.
  useEffect(() => {
    if (subjectId === FALLBACK_SUBJECT.id) {
      setResources([])
      return
    }
    getResources(subjectId)
      .then(setResources)
      .catch(() => setResources([]))
  }, [subjectId])

  // Quiz of the picked topic. The fallback topic id only exists when the API
  // is down, in which case the player's built-in questions apply (null).
  useEffect(() => {
    if (topicId === FALLBACK_TOPIC.id) {
      setQuiz(null)
      return
    }
    let cancelled = false
    getQuiz(topicId)
      .then((d) => { if (!cancelled) setQuiz(d.questions ?? []) })
      .catch(() => { if (!cancelled) setQuiz(null) })
    return () => { cancelled = true }
  }, [topicId])

  const subjectOptions = subjects.length > 0 ? subjects : [FALLBACK_SUBJECT]

  const chapters = useMemo(() => units.flatMap((u) => u.chapters), [units])
  const chapterOptions = chapters.length > 0 ? chapters : [FALLBACK_CHAPTER]
  const chapter = chapterOptions.find((c) => c.id === chapterId) ?? chapterOptions[0]

  const topicOptions = chapter.topics.length > 0 ? chapter.topics : [FALLBACK_TOPIC]
  const topic = topicOptions.find((t) => t.id === topicId) ?? topicOptions[0]

  const onChapterChange = (id: string) => {
    setChapterId(id)
    const next = chapterOptions.find((c) => c.id === id)
    const topics = next && next.topics.length > 0 ? next.topics : [FALLBACK_TOPIC]
    const laws = topics.find((t) => t.title === FALLBACK_TOPIC.title) ?? topics[0]
    setTopicId(laws.id)
  }

  // Wired to StudyPlan's "Start Now" / Heatmap's chapter cells — jumps the
  // breadcrumb selection straight to that subject/chapter and opens Learn.
  const goToChapter = (chapterName: string, subjectName: string) => {
    setActiveView("learning")
    setTab("learn")
    const targetSubject = subjectOptions.find((s) => s.subject_name === subjectName)
    if (!targetSubject || targetSubject.id === subjectId) {
      // Already on the right subject (or it couldn't be resolved) — its
      // chapters are already loaded, so switch directly.
      const match = chapterOptions.find((c) => c.name === chapterName)
      if (match) onChapterChange(match.id)
      return
    }
    // Different subject: its syllabus isn't loaded yet, so stash the target
    // chapter name for the syllabus-loaded effect to pick up once it is.
    pendingChapterNameRef.current = chapterName
    setSubjectId(targetSubject.id)
  }

  // Chapter PDF + video for the selection, straight from the subject's
  // catalogued resources (see LearningResources for the same catalog).
  // Prefer a resource tagged to the exact topic in view over a merely
  // chapter-matched one -- a chapter can have several resources, and the
  // topic tag is how a student finds the one that's actually about what
  // they're looking at.
  const chapterPdf =
    resources.find((r) => r.doc_type === "chapter_content" && r.topic_id === topicId && r.s3_key) ??
    resources.find((r) => r.doc_type === "chapter_content" && r.chapter_number === chapter.number && r.s3_key)
  const pdfUrl = chapterPdf?.s3_key ? getAssetUrl(chapterPdf.s3_key) : undefined
  const chapterVideo =
    resources.find((r) => r.type === "Video" && r.topic_id === topicId && r.s3_key) ??
    resources.find((r) => r.type === "Video" && r.chapter_number === chapter.number && r.s3_key)
  const videoUrl = chapterVideo?.s3_key ? getAssetUrl(chapterVideo.s3_key) : undefined
  const chapterLab =
    resources.find((r) => r.doc_type === "lab" && r.topic_id === topicId && r.s3_key) ??
    resources.find((r) => r.doc_type === "lab" && r.chapter_number === chapter.number && r.s3_key)
  // Cache-bust with the upload timestamp -- a lab file gets edited in place
  // at the same S3 key, and browsers otherwise keep serving whatever they
  // first cached for that URL even after the object changes.
  const labUrl = chapterLab?.s3_key
    ? `${getAssetUrl(chapterLab.s3_key)}${chapterLab.s3_uploaded_at ? `?v=${encodeURIComponent(chapterLab.s3_uploaded_at)}` : ""}`
    : undefined



  const triggerClass =
    "data-[state=active]:bg-ink data-[state=active]:text-sidebar-text"

  return (
    <div>
      {/* Proactive memory cards — struggle remedials derived from this
          student's quiz-mistake events (fire-and-forget, never blocks) */}
      <RecommendationCards userId={currentStudentId()} role="student" />
      {/* Breadcrumb context + gamification status (was the package's own
          topbar; AppLayout already renders the app Topbar) */}
      <Card className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-3">
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="h-9 w-[140px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {subjectOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-text-secondary">&gt;&gt;</span>
          <Select value={chapterId} onValueChange={onChapterChange}>
            <SelectTrigger className="h-9 w-[240px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {chapterOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.number != null ? `${c.number}. ${c.name}` : c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-text-secondary">&gt;&gt;</span>
          <Select value={topicId} onValueChange={setTopicId}>
            <SelectTrigger className="h-9 w-[200px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {topicOptions.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-3">
          <StudyMaterial chapterName={chapter.name} chapterNumber={chapter.number} resources={resources} />
          <Badge variant="warning">🔥 {streak} day streak</Badge>
        </div>
      </Card>

      <div className="mt-6">
        <StudyPlan assignments={realAssignments ?? ASSIGNMENTS} recommended={recTasks} onGoToChapter={goToChapter} />
      </div>

      <Tabs
        value={activeView === "learning" ? tab : activeView}
        onValueChange={(v: string) => {
          if (["journal", "heatmap"].includes(v)) setActiveView(v as "journal" | "heatmap")
          else { setActiveView("learning"); setTab(v) }
        }}
        className="mt-8"
      >
        <TabsList className="gap-2 bg-transparent">
          <TabsTrigger value="learn" className={triggerClass}>Learn</TabsTrigger>
          <TabsTrigger value="lab" className={triggerClass}>Lab Exercise</TabsTrigger>
          <TabsTrigger value="mindmap" className={triggerClass}>Mindmap</TabsTrigger>
          <TabsTrigger value="journal" className={triggerClass}>
            Mistake Journal <Badge variant="danger" className="ml-2">{mistakes.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="heatmap" className={triggerClass}>Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="learn" className="mt-6">
          <div className="mb-3 flex justify-end">
            <div className="flex items-center rounded-full bg-secondary p-[3px]">
              <button
                type="button"
                onClick={() => setVideoFocus(false)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  !videoFocus ? "bg-ink text-sidebar-text" : "text-text-secondary"
                }`}
              >
                Default
              </button>
              <button
                type="button"
                onClick={() => setVideoFocus(true)}
                className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${
                  videoFocus ? "bg-ink text-sidebar-text" : "text-text-secondary"
                }`}
              >
                Theater
              </button>
            </div>
          </div>
          <div
            className={`grid gap-6 transition-[grid-template-columns] duration-300 ${
              videoFocus ? "grid-cols-[72%_28%]" : "grid-cols-[55%_45%]"
            }`}
          >
            {/* key remounts the player per topic so quiz progress resets */}
            <VideoPlayerWithQuiz
              key={topic.id}
              questions={quiz ?? undefined}
              chapter={chapter.name}
              videoUrl={videoUrl}
              addXP={addXP}
              onMistake={addMistake}
            />
            <PdfViewerWithNotes
              pdfUrl={pdfUrl}
              pdfTitle={chapterPdf?.title}
              chapter={chapter.name}
              chapterNumber={chapter.number}
              addXP={addXP}
            />
          </div>
        </TabsContent>
        <TabsContent value="lab">
          <LabExercise key={topic.id} addXP={addXP} onMistake={addMistake} chapter={chapter.name} labUrl={labUrl} />
        </TabsContent>
        <TabsContent value="mindmap"><Mindmap /></TabsContent>
        <TabsContent value="journal"><MistakeJournal mistakes={mistakes} /></TabsContent>
        <TabsContent value="heatmap"><Heatmap /></TabsContent>
      </Tabs>
    </div>
  )
}
