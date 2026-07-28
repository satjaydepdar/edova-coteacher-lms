"use client"
import { useState } from "react"
import { VideoPlayerWithQuiz } from "./components/VideoPlayerWithQuiz"
import { PdfViewerWithNotes } from "./components/PdfViewerWithNotes"
import { LabExercise } from "./components/LabExercise"
import { Mindmap } from "./components/Mindmap"
import { MistakeJournal } from "./components/MistakeJournal"
import { Heatmap } from "./components/Heatmap"
import { StudyPlan } from "./components/StudyPlan"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { useXPStreak } from "./hooks/useXPStreak"

export default function LearningPage() {
  const [activeView, setActiveView] = useState<"learning"|"journal"|"heatmap">("learning")
  const [tab, setTab] = useState("learn")
  const [subject, setSubject] = useState("Science")
  const [chapter, setChapter] = useState("Light")
  const [topic, setTopic] = useState("Reflection")
  const { xp, streak, addXP } = useXPStreak()
  const [mistakes, setMistakes] = useState<any[]>([
    { id: 1, q: "Angle of incidence = ?", yourAns: "30°", correct: "45°", chapter: "Light", date: "2026-07-24", solution: "Use law: i = r. Mirror angle was 45°" },
  ])

  return (
    <div className="min-h-screen bg-white">
      {/* Topbar wired */}
      <div className="h-16 bg-[#F5F1E6] border-b border-[#E5E1D2] px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Input value={subject} onChange={e=>setSubject(e.target.value)} className="w-[120px] h-9" />
          <span className="text-[#6B7280]">{">>"}</span>
          <Input value={chapter} onChange={e=>setChapter(e.target.value)} className="w-[120px] h-9" />
          <span className="text-[#6B7280]">{">>"}</span>
          <Input value={topic} onChange={e=>setTopic(e.target.value)} className="w-[160px] h-9" />
          <Badge variant="okf" className="ml-2 font-mono">C10.SCI.LIGHT.03</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary">⚡ {xp} XP</Badge>
          <Badge variant="warning">🔥 {streak} day streak</Badge>
        </div>
      </div>

      <div className="px-8 pt-7 pb-16">
        <StudyPlan />

        <Tabs value={activeView === "learning" ? tab : activeView} onValueChange={(v:any)=> {
          if(["journal","heatmap"].includes(v)) setActiveView(v as any); else { setActiveView("learning"); setTab(v) }
        }} className="mt-8">
          <TabsList className="bg-transparent gap-2">
            <TabsTrigger value="learn" className="data-[state=active]:bg-[#13231F] data-[state=active]:text-[#FBF7EE]">Learn</TabsTrigger>
            <TabsTrigger value="lab" className="data-[state=active]:bg-[#13231F] data-[state=active]:text-[#FBF7EE]">Lab Exercise</TabsTrigger>
            <TabsTrigger value="mindmap" className="data-[state=active]:bg-[#13231F] data-[state=active]:text-[#FBF7EE]">Mindmap</TabsTrigger>
            <TabsTrigger value="journal" className="data-[state=active]:bg-[#13231F] data-[state=active]:text-[#FBF7EE]">Mistake Journal <Badge variant="danger" className="ml-2">{mistakes.length}</Badge></TabsTrigger>
            <TabsTrigger value="heatmap" className="data-[state=active]:bg-[#13231F] data-[state=active]:text-[#FBF7EE]">Heatmap</TabsTrigger>
          </TabsList>

          <TabsContent value="learn" className="mt-6 grid grid-cols-[55%_45%] gap-6">
            <VideoPlayerWithQuiz addXP={addXP} onMistake={(m:any)=> setMistakes(prev=>[m, ...prev])} />
            <PdfViewerWithNotes addXP={addXP} />
          </TabsContent>
          <TabsContent value="lab"><LabExercise addXP={addXP} /></TabsContent>
          <TabsContent value="mindmap"><Mindmap /></TabsContent>
          <TabsContent value="journal"><MistakeJournal mistakes={mistakes} /></TabsContent>
          <TabsContent value="heatmap"><Heatmap /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
