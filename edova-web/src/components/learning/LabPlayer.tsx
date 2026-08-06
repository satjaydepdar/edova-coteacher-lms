import { useEffect, useRef, useState } from "react"
import { z } from "zod"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { FlagButton } from "./FlagButton"
import { useLearningStore } from "@/store/learning-store"
import type { NewMistake } from "@/lib/types"

// XP is this component's constant, never read off the message -- a lab
// reports what happened (isCorrect/question/answer), not what it's worth,
// so a buggy or malicious lab file can't mint arbitrary XP.
const LAB_CHECK_XP = 30

// A cross-origin sandboxed iframe can't be measured directly (no
// allow-same-origin -- that's deliberate, see LabPlayer below), so the lab
// self-reports its content height and this is the only way LabPlayer learns
// it. Bounded so a broken/malicious lab can't force an absurd page height.
const MIN_IFRAME_HEIGHT = 300
const MAX_IFRAME_HEIGHT = 3000
const FALLBACK_IFRAME_HEIGHT = 820 // used until the first "resize" arrives (or never, for a lab predating this message)

// Contract every lab HTML file's window.EdovaBridge targets via
// parent.postMessage. Versioned (v:1) so a future breaking change can add a
// v:2 branch without orphaning already-catalogued lab files.
const BridgeMessage = z.discriminatedUnion("type", [
  z.object({ v: z.literal(1), type: z.literal("ready") }),
  z.object({
    v: z.literal(1),
    type: z.literal("check"),
    isCorrect: z.boolean(),
    question: z.string().max(500),
    yourAnswer: z.string().max(200),
    correctAnswer: z.string().max(200),
    explanation: z.string().max(1000),
  }),
  z.object({ v: z.literal(1), type: z.literal("flag"), context: z.string().max(300) }),
  z.object({ v: z.literal(1), type: z.literal("resize"), height: z.number().min(0).max(20000) }),
])

interface Props {
  labUrl: string
  chapter: string
  addXP: (v: number) => void
  onMistake: (m: NewMistake) => void
}

// Renders a catalogued interactive lab (a single self-contained HTML file,
// same S3-backed resource pipeline as PDFs/videos) in a sandboxed iframe.
// Give this a `key` that changes per topic/chapter at the call site (same
// convention as VideoPlayerWithQuiz) so switching labs remounts cleanly.
export function LabPlayer({ labUrl, chapter, addXP, onMistake }: Props) {
  const flag = useLearningStore((s) => s.flag)
  const [loaded, setLoaded] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [autoHeight, setAutoHeight] = useState<number | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Only trust messages from this exact iframe -- not any other frame
      // or script on the page.
      if (e.source !== iframeRef.current?.contentWindow) return
      const parsed = BridgeMessage.safeParse(e.data)
      if (!parsed.success) return
      const msg = parsed.data
      if (msg.type === "ready") {
        setLoaded(true)
      } else if (msg.type === "check") {
        if (msg.isCorrect) {
          addXP(LAB_CHECK_XP)
        } else {
          onMistake({
            q: msg.question,
            yourAns: msg.yourAnswer,
            correct: msg.correctAnswer,
            chapter,
            solution: msg.explanation,
          })
        }
      } else if (msg.type === "flag") {
        flag(msg.context)
      } else if (msg.type === "resize") {
        setAutoHeight(Math.min(MAX_IFRAME_HEIGHT, Math.max(MIN_IFRAME_HEIGHT, Math.ceil(msg.height))))
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [chapter, addXP, onMistake, flag])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between border-b border-card-border">
        <CardTitle>Interactive Lab - {chapter}</CardTitle>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="rounded-[6px] border border-card-border px-2.5 py-1 text-[12px] font-medium text-text-secondary hover:bg-[#F9FAFB]"
          >
            {expanded ? "⤡ Collapse" : "⤢ Expand"}
          </button>
          <FlagButton context={`Lab - ${chapter}`} />
        </div>
      </CardHeader>
      <CardContent className="relative p-0">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-white text-[13px] text-text-secondary">
            Loading lab…
          </div>
        )}
        {/* Sized to the lab's own reported content height (via the "resize"
            bridge message) so a short lab isn't padded with empty space and
            a tall one isn't clipped. Falls back to a generous fixed height
            for a lab that hasn't reported one yet (or predates the message);
            Expand still overrides either, for a lab that's tall regardless. */}
        <iframe
          ref={iframeRef}
          src={labUrl}
          title={`Interactive Lab - ${chapter}`}
          sandbox="allow-scripts"
          className="w-full border-0 transition-[height] duration-200"
          style={{ height: expanded ? "85vh" : `${autoHeight ?? FALLBACK_IFRAME_HEIGHT}px` }}
        />
      </CardContent>
    </Card>
  )
}
