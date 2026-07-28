import { useEffect, useMemo, useState } from "react"
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
const FALLBACK_SUBJECT: LearningSubject = { id: "fallback-subject", subject_name: "Science" }
const FALLBACK_CHAPTER: SyllabusChapter = {
  id: "fallback-chapter",
  number: 9,
  name: "Light — Reflection and Refraction",
  topics: [],
}
const FALLBACK_TOPIC: SyllabusTopic = { id: "fallback-topic", title: "Laws of Reflection" }

function subjectCode(name: string): string {
  if (name === "Science") return "SCI"
  if (name === "Mathematics") return "MAT"
  return name.slice(0, 3).toUpperCase()
}

export default function LearningHub() {
  const [activeView, setActiveView] = useState<"learning" | "journal" | "heatmap">("learning")
  const [tab, setTab] = useState("learn")
  const { xp, streak, mistakes, hydrate, addXP, addMistake } = useLearningStore()

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

  useEffect(() => {
    hydrate()
  }, [hydrate])

  // Subjects for the fixed demo curriculum (Class 10, CBSE, 2026–27).
  useEffect(() => {
    getSubjects()
      .then((d) => {
        setSubjects(d.subjects)
        const science = d.subjects.find((s) => s.subject_name === FALLBACK_SUBJECT.subject_name) ?? d.subjects[0]
        if (science) setSubjectId(science.id)
      })
      .catch(() => { /* keep the fallback subject */ })
  }, [])

  // Syllabus tree of the picked subject; default to the Light chapter (or the
  // first chapter for any other subject) and its Laws of Reflection topic.
  useEffect(() => {
    if (subjectId === FALLBACK_SUBJECT.id) return
    setUnits([])
    getSyllabus(subjectId)
      .then((d) => {
        const loaded = d.units ?? []
        setUnits(loaded)
        const chapters = loaded.flatMap((u) => u.chapters)
        const chapter = chapters.find((c) => c.name === FALLBACK_CHAPTER.name) ?? chapters[0]
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
  const subject = subjectOptions.find((s) => s.id === subjectId) ?? subjectOptions[0]

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

  // Chapter PDF + video for the selection, straight from the subject's
  // catalogued resources (see LearningResources for the same catalog).
  const chapterPdf = resources.find(
    (r) => r.doc_type === "chapter_content" && r.chapter_number === chapter.number && r.s3_key,
  )
  const pdfUrl = chapterPdf?.s3_key ? getAssetUrl(chapterPdf.s3_key) : undefined
  const chapterVideo = resources.find(
    (r) => r.type === "Video" && r.chapter_number === chapter.number && r.s3_key,
  )
  const videoUrl = chapterVideo?.s3_key ? getAssetUrl(chapterVideo.s3_key) : undefined

  const okf = `C10.${subjectCode(subject.subject_name)}.CH${String(chapter.number ?? 0).padStart(2, "0")}`

  const triggerClass =
    "data-[state=active]:bg-ink data-[state=active]:text-sidebar-text"

  return (
    <div>
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
          <Badge variant="okf" className="ml-2 font-mono">{okf}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <StudyMaterial chapterName={chapter.name} chapterNumber={chapter.number} resources={resources} />
          <Badge variant="secondary">⚡ {xp} XP</Badge>
          <Badge variant="warning">🔥 {streak} day streak</Badge>
        </div>
      </Card>

      <div className="mt-6">
        <StudyPlan />
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

        <TabsContent value="learn" className="mt-6 grid grid-cols-[55%_45%] gap-6">
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
        </TabsContent>
        <TabsContent value="lab"><LabExercise addXP={addXP} /></TabsContent>
        <TabsContent value="mindmap"><Mindmap /></TabsContent>
        <TabsContent value="journal"><MistakeJournal mistakes={mistakes} /></TabsContent>
        <TabsContent value="heatmap"><Heatmap /></TabsContent>
      </Tabs>
    </div>
  )
}
