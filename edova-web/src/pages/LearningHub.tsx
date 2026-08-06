import { useEffect, useMemo, useRef, useState } from "react"
import { VideoPlayerWithQuiz } from "@/components/learning/VideoPlayerWithQuiz"
import { PdfViewerWithNotes, MyNotesWidget } from "@/components/learning/PdfViewerWithNotes"
import { LabExercise } from "@/components/learning/LabExercise"
import { Mindmap } from "@/components/learning/Mindmap"
import { MistakeJournal } from "@/components/learning/MistakeJournal"
import { Heatmap } from "@/components/learning/Heatmap"
import { StudyPlan } from "@/components/learning/StudyPlan"
import { StudyMaterial } from "@/components/learning/StudyMaterial"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLearningStore } from "@/store/learning-store"
import { useSchoolStore } from "@/store/school-store"
import {
  getQuiz,
  getResources,
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

const FALLBACK_CHAPTER: SyllabusChapter = {
  id: "fallback-chapter",
  number: 9,
  name: "Light — Reflection and Refraction",
  topics: [],
}
const FALLBACK_TOPIC: SyllabusTopic = { id: "fallback-topic", title: "Laws of Reflection" }

// Placeholder until teacher-assigned homework is wired into StudyPlan for
// real — chapter name matches the seeded syllabus exactly so "Start Now"
// genuinely jumps there instead of silently doing nothing.
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

const DEFAULT_SUBJECTS: LearningSubject[] = [
  { id: "95d52338-ad08-4941-a06b-4d60fa696874", subject_name: "Science" },
  { id: "b2e55684-4aa5-423b-a576-3979def5914f", subject_name: "Mathematics" },
]



export default function LearningHub() {
  const storeAssignments = useSchoolStore((s) => s.assignments)
  const [activeView, setActiveView] = useState<"learning" | "journal" | "heatmap">("learning")
  const [tab, setTab] = useState("learn")
  // Default: 55/45 video/reading split. Theater: 72/28, for when the video
  // is what needs the room (a diagram, a worked example) rather than the text.
  const [videoFocus, setVideoFocus] = useState(false)
  const { streak, mistakes, hydrate, addXP, addMistake } = useLearningStore()

  // Content tree from the clerk API; each level falls back to the seeded
  // Science/Light/Laws-of-Reflection selection while unloaded or unreachable.
  const [subjects, setSubjects] = useState<LearningSubject[]>(DEFAULT_SUBJECTS)
  const [subjectId, setSubjectId] = useState(DEFAULT_SUBJECTS[0].id)
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

  // Subjects for the fixed demo curriculum (Class 10, CBSE, 2026–27).
  useEffect(() => {
    getSubjects()
      .then((d) => {
        if (d.subjects && d.subjects.length > 0) {
          setSubjects(d.subjects)
          setSubjectId(d.subjects[0].id)
        }
      })
      .catch(() => { /* keep default subjects */ })
  }, [])

  // Syllabus tree of the picked subject; default to the Light chapter (or the
  // first chapter for any other subject) and its Laws of Reflection topic.
  useEffect(() => {
    if (!subjectId) return
    setUnits([])
    const pendingChapterName = pendingChapterNameRef.current
    pendingChapterNameRef.current = null
    getSyllabus(subjectId)
      .then((d) => {
        const loaded = d.units ?? []
        setUnits(loaded)
        const chapters = loaded.flatMap((u) => u.chapters)
        const chapter =
          (pendingChapterName &&
            chapters.find(
              (c) =>
                c.name.toLowerCase() === pendingChapterName.toLowerCase() ||
                c.name.toLowerCase().includes(pendingChapterName.toLowerCase()) ||
                pendingChapterName.toLowerCase().includes(c.name.toLowerCase())
            )) ||
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
    if (!subjectId) return
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

  const subjectOptions = subjects.length > 0 ? subjects : DEFAULT_SUBJECTS

  const assignedChapters = useMemo(() => {
    const allSyllabusChapters = units.flatMap((u) => u.chapters)
    if (!storeAssignments || storeAssignments.length === 0) {
      return allSyllabusChapters.slice(0, 1)
    }

    const assignedTitles = storeAssignments.map((a) => a.title.toLowerCase())

    const filtered = allSyllabusChapters.filter((c) => {
      const cNameLower = c.name.toLowerCase()
      return assignedTitles.some(
        (t) => t.includes(cNameLower) || cNameLower.includes(t)
      )
    })

    return filtered.length > 0 ? filtered : allSyllabusChapters.slice(0, 1)
  }, [units, storeAssignments])

  const chapterOptions = assignedChapters.length > 0 ? assignedChapters : [FALLBACK_CHAPTER]
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
    const targetSubject = subjectOptions.find(
      (s) => s.subject_name.toLowerCase() === subjectName.toLowerCase()
    )
    if (targetSubject) {
      pendingChapterNameRef.current = chapterName
      setSubjectId(targetSubject.id)
    }
  }

  // Chapter PDF + video for the selection, straight from teacher-assigned chapters.
  const allVideoResources = useMemo(() => {
    const assignedChapterNumbers = new Set(assignedChapters.map((c) => c.number))
    const catalogVideos = resources.filter(
      (r) =>
        (r.type === "Video" || r.doc_type === "video") &&
        (r.chapter_number == null || assignedChapterNumbers.has(r.chapter_number))
    )
    const storeVideos = (storeAssignments || [])
      .filter((a) => a.attachments && a.attachments.some((att) => att.s3Key?.endsWith(".mp4") || att.name.toLowerCase().includes("video")))
      .map((a) => {
        const att = a.attachments?.find((att) => att.s3Key?.endsWith(".mp4") || att.name.toLowerCase().includes("video"))
        return {
          id: a.id,
          title: a.title,
          type: "Video" as const,
          chapter_number: chapter.number,
          s3_key: att?.s3Key || "",
          doc_type: "video",
          topic_id: null,
        }
      })
    return [...catalogVideos, ...storeVideos]
  }, [resources, storeAssignments, chapter.number, assignedChapters])

  const currentChapterVideos = useMemo(() => {
    return allVideoResources.filter((r) => r.s3_key && (r.chapter_number === chapter.number || !r.chapter_number))
  }, [allVideoResources, chapter.number])

  const [selectedVideoKey, setSelectedVideoKey] = useState<string | null>(null)

  const chapterVideo = useMemo(() => {
    if (selectedVideoKey) {
      const match = currentChapterVideos.find((v) => v.s3_key === selectedVideoKey || v.id === selectedVideoKey)
      if (match) return match
    }
    return (
      currentChapterVideos.find((r) => r.topic_id === topicId) ??
      currentChapterVideos[0] ??
      allVideoResources[0]
    )
  }, [selectedVideoKey, currentChapterVideos, topicId, allVideoResources])

  const videoUrl = chapterVideo?.s3_key ? getAssetUrl(chapterVideo.s3_key) : undefined

  const chapterPdf =
    resources.find((r) => r.doc_type === "chapter_content" && r.topic_id === topicId && r.s3_key) ??
    resources.find((r) => r.doc_type === "chapter_content" && r.chapter_number === chapter.number && r.s3_key)
  const pdfUrl = chapterPdf?.s3_key ? getAssetUrl(chapterPdf.s3_key) : undefined



  const triggerClass =
    "data-[state=active]:bg-ink data-[state=active]:text-sidebar-text"

  const [showPdfModal, setShowPdfModal] = useState(false)

  return (
    <div>
      {/* Breadcrumb context + gamification status */}
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
        <StudyPlan
          assignments={
            storeAssignments && storeAssignments.length > 0
              ? storeAssignments.map((a) => ({
                  id: a.id,
                  title: a.title,
                  subject: a.subject,
                  chapter: a.title,
                  dueLabel: a.due || "Due Soon",
                  status: "due_today" as const,
                }))
              : ASSIGNMENTS
          }
          onGoToChapter={goToChapter}
        />
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
          <div className="mb-3 flex items-center justify-between">
            {currentChapterVideos.length > 1 ? (
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-semibold text-text-secondary">📹 Video Lesson:</span>
                <select
                  value={chapterVideo?.s3_key || ""}
                  onChange={(e) => setSelectedVideoKey(e.target.value)}
                  className="h-8 rounded-[8px] border border-card-border bg-white px-3 text-[13px] font-semibold text-ink shadow-sm"
                >
                  {currentChapterVideos.map((v) => (
                    <option key={v.id || v.s3_key} value={v.s3_key || ""}>
                      {v.title}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div />
            )}
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

          <div className="grid grid-cols-1 lg:grid-cols-[70%_28%] gap-6">
            <div>
              <VideoPlayerWithQuiz
                key={topic.id}
                questions={quiz ?? undefined}
                chapter={chapter.name}
                videoUrl={videoUrl}
                addXP={addXP}
                onMistake={addMistake}
              />
              <MyNotesWidget
                chapter={chapter.name}
                chapterNumber={chapter.number}
                addXP={addXP}
              />
            </div>

            <Card className="flex flex-col justify-between p-5 bg-white border border-card-border rounded-[12px] shadow-sm h-fit">
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-[#FEF3C7] text-lg shrink-0">
                    📄
                  </div>
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-wider text-text-secondary">Textbook & Notes</p>
                    <h4 className="font-bold text-[14px] text-ink leading-snug">
                      {chapterPdf?.title || `${chapter.name} PDF`}
                    </h4>
                  </div>
                </div>
                <p className="text-[12.5px] text-text-secondary leading-relaxed">
                  Open the official textbook PDF notes, worked examples, and formulas for {chapter.name}.
                </p>
              </div>

              <div className="mt-5 space-y-2">
                <Button
                  type="button"
                  variant="gold"
                  onClick={() => setShowPdfModal(true)}
                  className="w-full flex items-center justify-center gap-2 font-bold py-2.5 text-[13.5px] shadow-sm"
                >
                  <span>📖</span> Open Chapter PDF & Notes
                </Button>
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center text-[12px] text-text-secondary hover:text-ink hover:underline pt-1"
                  >
                    Download PDF ↗
                  </a>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="lab"><LabExercise addXP={addXP} /></TabsContent>
        <TabsContent value="mindmap"><Mindmap /></TabsContent>
        <TabsContent value="journal"><MistakeJournal mistakes={mistakes} /></TabsContent>
        <TabsContent value="heatmap"><Heatmap /></TabsContent>
      </Tabs>

      {/* PDF Viewer Popup Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-[16px] border border-card-border bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-card-border px-5 py-3.5 bg-cream">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="font-bold text-[15px] text-ink">{chapterPdf?.title || `${chapter.name} PDF & Notes`}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPdfModal(false)}
                className="rounded-full bg-secondary px-3.5 py-1 text-[13px] font-bold text-ink hover:bg-ink hover:text-white transition-colors"
              >
                Close ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PdfViewerWithNotes
                pdfUrl={pdfUrl}
                pdfTitle={chapterPdf?.title}
                chapter={chapter.name}
                chapterNumber={chapter.number}
                addXP={addXP}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
