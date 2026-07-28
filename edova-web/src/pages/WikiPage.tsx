import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { PageHeader } from "@/components/common/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { getWiki, type WikiPage as WikiPageData } from "@/lib/learning-api"

// content_markdown is produced only by the clerk's append-only note API
// (### headings + > blockquotes + plain paragraphs) — a closed, tiny
// grammar, so a ~30-line line-based parser covers it without pulling in a
// full markdown dependency.
type Block =
  | { type: "heading"; text: string }
  | { type: "quote"; lines: string[] }
  | { type: "para"; lines: string[] }

function parseNotes(markdown: string): Block[] {
  const blocks: Block[] = []
  for (const line of markdown.split("\n")) {
    if (!line.trim()) continue
    if (line.startsWith("### ")) {
      blocks.push({ type: "heading", text: line.slice(4) })
      continue
    }
    const last = blocks[blocks.length - 1]
    if (line.startsWith("> ")) {
      if (last?.type === "quote") last.lines.push(line.slice(2))
      else blocks.push({ type: "quote", lines: [line.slice(2)] })
      continue
    }
    if (last?.type === "para") last.lines.push(line)
    else blocks.push({ type: "para", lines: [line] })
  }
  return blocks
}

function NoteBlocks({ markdown }: { markdown: string }) {
  const blocks = parseNotes(markdown)
  if (blocks.length === 0) {
    return (
      <p className="text-[13px] text-text-secondary">
        No notes yet — select any text from a chapter in Learning Hub and save it here.
      </p>
    )
  }
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3 key={i} className="font-display text-[15px] font-bold text-ink pt-2 first:pt-0">
              {block.text}
            </h3>
          )
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={i}
              className="border-l-2 border-okf-border bg-okf-bg py-2 pl-3 text-[13px] italic text-okf"
            >
              {block.lines.map((l, j) => <p key={j}>{l}</p>)}
            </blockquote>
          )
        }
        return (
          <p key={i} className="text-[13px] leading-6 text-ink">
            {block.lines.map((l, j) => (
              <span key={j}>
                {l}
                {j < block.lines.length - 1 && <br />}
              </span>
            ))}
          </p>
        )
      })}
    </div>
  )
}

export default function WikiPage() {
  const { slug = "" } = useParams<{ slug: string }>()
  const studentId = slug.replace(/^student-/, "")
  const [wiki, setWiki] = useState<WikiPageData | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    setWiki(null)
    setError(false)
    getWiki(studentId)
      .then(setWiki)
      .catch(() => setError(true))
  }, [studentId])

  if (error) {
    return (
      <div>
        <PageHeader title="Learning Wiki" />
        <Card><CardContent className="p-5 text-[13px] text-text-secondary">Wiki page not found.</CardContent></Card>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={wiki?.title ?? "Learning Wiki"}
        subtitle={wiki ? `Last updated ${new Date(wiki.updated_at).toLocaleDateString()}` : undefined}
      />
      <Card>
        <CardContent className="p-5">
          {wiki ? <NoteBlocks markdown={wiki.content_markdown} /> : (
            <p className="text-[13px] text-text-secondary">Loading…</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
