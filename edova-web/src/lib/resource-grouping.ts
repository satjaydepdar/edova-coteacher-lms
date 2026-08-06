// Resource grouping for the Learning Resources page: catalog entries bucketed
// by chapter number, with the duplicate-chapter-number safeguard. Pure.
import type { CatalogResource, OkfResourceType, SyllabusUnitOut } from "@/lib/types"

export interface DisplayResource {
  id: string
  title: string
  type: OkfResourceType
  meta: string
  status: "ready" | "processing" | "failed"
  previewS3Key?: string
  uploadedByTeacher?: boolean
}

/** Chapter numbers aren't guaranteed unique across units once an admin adds
 * units through Master Data, so resources can't be resolved to a chapter
 * number that more than one real chapter shares — showing nothing beats
 * attaching the wrong file. */
export function ambiguousChapterNumbers(units: SyllabusUnitOut[]): Set<number> {
  const counts = new Map<number, number>()
  for (const u of units) for (const c of u.chapters) if (c.number != null) counts.set(c.number, (counts.get(c.number) ?? 0) + 1)
  return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([number]) => number))
}

export function groupResourcesByChapter(
  resources: CatalogResource[],
  pendingUploads: Record<number, DisplayResource[]>,
  ambiguous: Set<number>,
): Map<number, DisplayResource[]> {
  const m = new Map<number, DisplayResource[]>()
  for (const r of resources) {
    if (ambiguous.has(r.chapter_number)) continue
    const display: DisplayResource = {
      id: r.id, title: r.title, type: r.type,
      meta: r.doc_type ?? "", status: r.status === "ready" ? "ready" : "processing",
      previewS3Key: r.preview_s3_key ?? undefined,
    }
    m.set(r.chapter_number, [...(m.get(r.chapter_number) ?? []), display])
  }
  for (const [num, pending] of Object.entries(pendingUploads)) {
    const n = Number(num)
    if (ambiguous.has(n)) continue
    m.set(n, [...(m.get(n) ?? []), ...pending])
  }
  return m
}
