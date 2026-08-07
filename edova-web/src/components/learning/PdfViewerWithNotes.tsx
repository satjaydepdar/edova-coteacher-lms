import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { getDocument, GlobalWorkerOptions, TextLayer, type PDFDocumentProxy } from "pdfjs-dist"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FlagButton } from "./FlagButton"
import { Badge } from "@/components/ui/badge"
import { MAX_NOTE_CHARS, saveWikiNote, STUDENT_ID } from "@/lib/learning-api"
import "./pdf-text-layer.css"

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

const PAGE_SCALE = 1.3
const MIN_SELECTION_CHARS = 5
const WIKI_SLUG = `student-${STUDENT_ID}`
// Reserved height for a page not yet rendered, before we know any page's
// real size — replaced by the actual height the moment a page renders.
const PLACEHOLDER_PAGE_HEIGHT = 900

interface Props {
  pdfUrl?: string
  pdfTitle?: string
  chapter: string
  chapterNumber?: number | null
  addXP: (v: number) => void
}

// One page: renders its canvas + an overlaid, invisible text layer so the
// browser's native selection works directly on real PDF text (not an
// image) — but only once the page is about to scroll into view. A chapter
// PDF can run 25+ pages; rendering every canvas + text layer up front is
// real, wasted CPU/memory on the low-end devices this app targets.
function PdfPage({
  pdf,
  pageNumber,
  scrollRoot,
  placeholderHeight,
  onRendered,
}: {
  pdf: PDFDocumentProxy
  pageNumber: number
  scrollRoot: HTMLElement | null
  placeholderHeight: number
  onRendered: (height: number) => void
}) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  // Page 1 is guaranteed to be in view the moment the viewer mounts, so it
  // renders eagerly rather than waiting on an IntersectionObserver's first
  // callback — browsers aren't required to fire that immediately, and there's
  // no reason the very first page should ever show a placeholder.
  const [visible, setVisible] = useState(pageNumber === 1)

  useEffect(() => {
    if (visible) return
    const el = wrapperRef.current
    if (!el) return
    // rootMargin pre-renders pages a bit before they're actually in view,
    // so scrolling doesn't visibly outrun rendering.
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) setVisible(true) },
      { root: scrollRoot, rootMargin: "600px 0px" },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [scrollRoot, visible])

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    let renderTask: { cancel: () => void } | null = null
    let textLayer: TextLayer | null = null

    pdf.getPage(pageNumber).then(async (page) => {
      const canvas = canvasRef.current
      const textLayerDiv = textLayerRef.current
      if (cancelled || !canvas || !textLayerDiv) return

      const viewport = page.getViewport({ scale: PAGE_SCALE })
      canvas.width = viewport.width
      canvas.height = viewport.height
      textLayerDiv.style.width = `${viewport.width}px`
      textLayerDiv.style.height = `${viewport.height}px`

      const task = page.render({ canvas, viewport })
      renderTask = task
      await task.promise
      if (cancelled) return
      onRendered(viewport.height)

      textLayer = new TextLayer({
        textContentSource: page.streamTextContent(),
        container: textLayerDiv,
        viewport,
      })
      await textLayer.render()
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
      textLayer?.cancel()
    }
  }, [visible, pdf, pageNumber, onRendered])

  return (
    <div
      ref={wrapperRef}
      className="relative mx-auto mb-2 leading-none last:mb-0"
      style={visible ? undefined : { height: placeholderHeight }}
    >
      {visible && <canvas ref={canvasRef} className="block" />}
      {visible && <div ref={textLayerRef} className="pdf-text-layer" />}
    </div>
  )
}

function PdfCanvasViewer({
  pdfUrl,
  onTextSelected,
}: {
  pdfUrl: string
  onTextSelected: (text: string) => void
}) {
  // A plain useRef wouldn't re-render children when the node first mounts,
  // so a page's IntersectionObserver could get stuck with a null `root`
  // forever (nothing re-renders PdfCanvasViewer just to refresh a ref).
  // useState-as-ref guarantees the container element itself triggers that
  // re-render once it exists.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null)
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState(false)
  const [pageHeight, setPageHeight] = useState(PLACEHOLDER_PAGE_HEIGHT)

  useEffect(() => {
    let cancelled = false
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    let task: ReturnType<typeof getDocument> | null = null
    setPdf(null)
    setError(false)

    // Safari intermittently throws a generic "Load failed" TypeError on
    // cross-origin fetches (confirmed with a raw fetch() bypassing pdf.js
    // entirely -- same failure, no pdf.js involved). Plain same-URL retries
    // kept failing identically, which points to Safari reusing the same
    // broken connection/socket rather than a one-off flake -- so each retry
    // busts the URL to force a genuinely new connection.
    const MAX_ATTEMPTS = 4
    const attempt = (n: number) => {
      const url = n === 1 ? pdfUrl : `${pdfUrl}${pdfUrl!.includes("?") ? "&" : "?"}_retry=${n}`
      task = getDocument({ url, disableRange: true, disableStream: true })
      task.promise
        .then((doc) => { if (!cancelled) setPdf(doc) })
        .catch(() => {
          if (cancelled) return
          if (n < MAX_ATTEMPTS) {
            retryTimer = setTimeout(() => { if (!cancelled) attempt(n + 1) }, 700 * n)
          } else {
            setError(true)
          }
        })
    }
    attempt(1)

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      task?.destroy()
    }
  }, [pdfUrl])

  // Listening on the container itself (not document) means a mouseup
  // anywhere else on the page — e.g. clicking "Save to my Wiki Page" —
  // never re-reports a stale leftover selection from the chapter.
  useEffect(() => {
    if (!containerEl) return
    const onMouseUp = () => {
      const selection = window.getSelection()
      const text = selection?.toString().trim() ?? ""
      if (text.length < MIN_SELECTION_CHARS) return
      if (!containerEl.contains(selection?.anchorNode ?? null)) return
      onTextSelected(text)
    }
    containerEl.addEventListener("mouseup", onMouseUp)
    return () => containerEl.removeEventListener("mouseup", onMouseUp)
  }, [containerEl, onTextSelected])

  if (error) {
    return (
      <div className="m-3 flex h-[420px] items-center justify-center rounded-[8px] border border-card-border bg-white text-[13px] text-text-secondary">
        Could not load this chapter's PDF.
      </div>
    )
  }

  if (!pdf) {
    return (
      <div className="m-3 flex h-[420px] items-center justify-center rounded-[8px] border border-card-border bg-white text-[13px] text-text-secondary">
        Loading chapter…
      </div>
    )
  }

  return (
    <div
      ref={setContainerEl}
      className="m-3 h-[420px] overflow-auto rounded-[8px] border border-card-border bg-[#525659] p-3"
    >
      {Array.from({ length: pdf.numPages }, (_, i) => (
        <PdfPage
          key={i + 1}
          pdf={pdf}
          pageNumber={i + 1}
          scrollRoot={containerEl}
          placeholderHeight={pageHeight}
          onRendered={setPageHeight}
        />
      ))}
    </div>
  )
}

export function PdfViewerWithNotes({ pdfUrl, pdfTitle, chapter, chapterNumber, addXP }: Props) {
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Text selected from the PDF's text layer appends here as a blockquote,
  // same pattern as the reference spec's ChapterReader -> MyNotes flow. A
  // selection spanning multiple lines carries embedded newlines (pdfjs's
  // text layer inserts <br> between lines), so every line needs its own
  // "> " prefix — a single prefix on the whole string would only quote the
  // first line and leave the rest as an unprefixed continuation, which
  // WikiPage's line-based parser would then split into a separate paragraph.
  const handleTextSelected = (text: string) => {
    const quoted = text.split("\n").map((line) => `> ${line}`).join("\n")
    setNote((prev) => (prev ? `${prev}\n${quoted}\n` : `${quoted}\n`))
  }

  const handleSave = async () => {
    const text = note.trim()
    if (!text || saving) return
    setSaving(true)
    try {
      const result = await saveWikiNote({
        chapter_number: chapterNumber ?? null,
        chapter_name: chapter,
        note_text: text,
      })
      setSaved(true)
      setNote("")
      addXP(5)
      toast.success("Saved to Wiki!", {
        description: result.truncated
          ? `Note was trimmed to ${MAX_NOTE_CHARS} characters.`
          : undefined,
        action: { label: "View Wiki Page", onClick: () => window.open(`/wiki/${WIKI_SLUG}`, "_self") },
      })
      setTimeout(() => setSaved(false), 2000)
    } catch {
      toast.error("Could not save your note — try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between border-b border-card-border">
          <CardTitle>{pdfTitle ?? `Textbook - ${chapter}`}</CardTitle>
          <FlagButton context={`PDF - ${chapter}`} />
        </CardHeader>
        {pdfUrl ? (
          <CardContent className="p-0">
            <PdfCanvasViewer pdfUrl={pdfUrl} onTextSelected={handleTextSelected} />
          </CardContent>
        ) : (
          <CardContent className="m-3 h-[280px] overflow-auto rounded-[8px] bg-white p-5 text-[13px] leading-6 text-ink">
            <p className="font-display font-bold">{chapter}</p>
            <p className="mt-3 text-text-secondary">
              No chapter PDF is catalogued for this selection yet. Upload one
              from Learning Resources and it appears here.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-[8px] border border-okf-border bg-okf-bg p-3">
              <Badge variant="okf">OKF Linked</Badge>
              <span className="text-xs text-okf">Linked to curriculum - {chapter}</span>
            </div>
          </CardContent>
        )}
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>My Notes - Saved to Wiki</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="min-h-[100px] bg-white"
            placeholder="Take notes... or select text from the chapter above"
          />
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-text-secondary">{note.length} chars</span>
            <Button variant="default" onClick={handleSave} disabled={!note.trim() || saving}>
              {saved ? "Saved to Wiki ✓" : saving ? "Saving…" : "Save to my Wiki Page"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
