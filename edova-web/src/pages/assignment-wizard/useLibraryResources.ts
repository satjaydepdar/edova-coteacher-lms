// Library-browser data flow for the Assignment Wizard attachment picker:
// subjects -> matching subject -> resources + syllabus topic titles.
import { useEffect, useState } from "react"
import {
  getResources,
  getSubjects,
  getSyllabus,
  type LearningResource,
  type SyllabusUnit,
} from "@/lib/learning-api"

export interface LibraryBrowser {
  resources: LearningResource[]
  loading: boolean
  topicTitles: Record<string, string>
}

export function useLibraryResources(active: boolean, subject: string): LibraryBrowser {
  const [resources, setResources] = useState<LearningResource[]>([])
  const [loading, setLoading] = useState(false)
  const [topicTitles, setTopicTitles] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!active) return
    setLoading(true)
    getSubjects()
      .then(({ subjects }) => subjects.find((s) => s.subject_name === subject))
      .then((match) =>
        match
          ? Promise.all([getResources(match.id), getSyllabus(match.id)])
          : Promise.resolve([[], { units: [] }] as [LearningResource[], { units: SyllabusUnit[] }]),
      )
      .then(([resources, { units }]) => {
        setResources(resources)
        const titles: Record<string, string> = {}
        for (const u of units) for (const c of u.chapters) for (const t of c.topics) titles[t.id] = t.title
        setTopicTitles(titles)
      })
      .catch(() => setResources([]))
      .finally(() => setLoading(false))
  }, [active, subject])

  return { resources, loading, topicTitles }
}
