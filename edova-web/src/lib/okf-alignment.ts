// OKF Curriculum Alignment computation for the Syllabus Map: how much of
// each OKF chapter is taught, based on the curriculum units linked to it.
// Pure — OKF library shape and curriculum arrive as parameters.
import { classNameById } from "@/lib/curriculum-utils"
import type { CurriculumUnit } from "@/lib/types"

export interface OkfChapter {
  id: string
  number: number
  title: string
  topics: { id: string; title: string }[]
}

export interface OkfFilters {
  classId: string
  subject: string
  topicId: string
}

export interface OkfCoverageRow {
  id: string
  number: number
  title: string
  linked: boolean
  coverage: number
  linkedUnitsLabel: string
}

export function buildOkfCoverageRows(
  chapters: OkfChapter[],
  curriculum: CurriculumUnit[],
  filters: OkfFilters,
  academicYear: string,
): OkfCoverageRow[] {
  return chapters
    .filter((ch) => {
      if (filters.topicId === "all") return true
      const t = chapters
        .flatMap((c) => c.topics.map((tp) => ({ id: tp.id, chapterId: c.id })))
        .find((x) => x.id === filters.topicId)
      return !!t && t.chapterId === ch.id
    })
    .map((ch) => {
      const { classId, subject } = filters
      const linked = curriculum.filter(
        (u) =>
          u.okfChapterId === ch.id &&
          u.academicYear === academicYear &&
          (classId === "all" || u.classId === classId) &&
          (subject === "all" || u.subject === subject)
      )
      const coverage = linked.length
        ? Math.round(linked.reduce((a, u) => a + Number(u.actual || 0), 0) / linked.length)
        : 0
      return {
        id: ch.id,
        number: ch.number,
        title: ch.title,
        linked: linked.length > 0,
        coverage,
        linkedUnitsLabel: linked.map((u) => u.unit + " — " + classNameById(u.classId)).join(", "),
      }
    })
}
