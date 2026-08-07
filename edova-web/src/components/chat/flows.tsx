// Scripted chat flows + per-kind message renderers, both as registries.
// Adding a flow = one CHAT_FLOWS entry (exact chip id, or a prefix key ending
// in "_" for a family of ids). Adding a message kind = one MESSAGE_RENDERERS
// entry. Neither the widget nor the resolver needs an edit.
import type { ReactNode } from "react"
import { CHAT_ROOT_CHIPS } from "@/data/seed"
import {
  EmailCard,
  ExitTicketCard,
  KbCard,
  SummaryCard,
  WorksheetCard,
} from "./cards"
import type { ChatMsg, Chip, MsgKind, MsgRenderCtx } from "./types"

// Helper to render **bold** inline without a full markdown parser
const renderFormattedText = (text: string) => {
  if (!text) return text
  return text.split(/(\*\*.*?\*\*)/).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <span key={i}>{part}</span>
  })
}

export type MsgFactory = (kind: MsgKind, extra: Partial<ChatMsg>, chips?: Chip[]) => ChatMsg
export type FlowHandler = (mk: MsgFactory, chipId: string) => ChatMsg

const BACK_TO_MENU: Chip[] = [{ id: "restart", label: "↩ Back to Menu" }]

export const CHAT_FLOWS: Record<string, FlowHandler> = {
  worksheet: (mk) =>
    mk("text", { text: "Great — what topic and class level should I build this for?" }, [
      { id: "w_fractions", label: "Fractions · Class 5" },
      { id: "w_photo", label: "Photosynthesis · Class 7" },
      { id: "w_revolution", label: "American Revolution · Class 8" },
    ]),
  w_: (mk, chipId) =>
    mk("worksheet", { topicId: chipId }, [
      { id: "ask", label: "💬 Ask a Question" },
      { id: "restart", label: "↩ Back to Menu" },
    ]),
  grades: (mk) => mk("summary", {}, BACK_TO_MENU),
  email: (mk) =>
    mk("text", { text: "Who is this about, and what's the topic?" }, [
      { id: "email_alex", label: "Struggling in Math – Alex R." },
      { id: "email_jordan", label: "Missing Homework – Jordan P." },
    ]),
  email_: (mk, chipId) => mk("email", { emailId: chipId }, BACK_TO_MENU),
  exitticket: (mk) =>
    mk("text", { text: "Which class should this exit ticket be for?" }, [
      { id: "et_fractions", label: "Class 5 Math – Fractions" },
      { id: "et_photo", label: "Class 7 Science – Photosynthesis" },
    ]),
  et_: (mk, chipId) => mk("exitticket", { etId: chipId }, BACK_TO_MENU),
  ask: (mk) =>
    mk("text", { text: "Sure — here are a few things teachers often ask me:" }, [
      { id: "q_late", label: "Late homework policy?" },
      { id: "q_iep", label: "IEP accommodation guidelines?" },
      { id: "q_trip", label: "Field trip form submission?" },
    ]),
  q_: (mk, chipId) => mk("kb", { qId: chipId }, [{ id: "restart", label: "↩ Ask Something Else" }]),
  default: (mk) => mk("text", { text: "Of course — what else can I help with?" }, CHAT_ROOT_CHIPS),
}

/** Exact id first, then the longest matching prefix family, then default. */
export function resolveFlow(chipId: string): FlowHandler {
  const exact = CHAT_FLOWS[chipId]
  if (exact) return exact
  const prefix = Object.keys(CHAT_FLOWS)
    .filter((k) => k.endsWith("_") && chipId.startsWith(k))
    .sort((a, b) => b.length - a.length)[0]
  return (prefix && CHAT_FLOWS[prefix]) || CHAT_FLOWS.default
}

/** Per-kind message body renderers. `text`/`typing`/`textbook` render inline
 * (no card); card kinds delegate to cards.tsx with the widget's render ctx. */
export const MESSAGE_RENDERERS: Record<MsgKind, (m: ChatMsg, ctx: MsgRenderCtx) => ReactNode> = {
  typing: () => (
    <div className="flex items-center gap-1 px-0.5 py-1">
      {[0, 0.15, 0.3].map((d) => (
        <span
          key={d}
          className="inline-block size-[7px] rounded-full bg-text-muted"
          style={{ animation: "bounceDot 1.2s infinite ease-in-out", animationDelay: `${d}s` }}
        />
      ))}
    </div>
  ),
  text: (m) => <div>{renderFormattedText(m.text || "")}</div>,
  textbook: (m) => {
    // If the text starts with **Title**, extract it and render it as a bold heading
    const match = (m.text || "").match(/^\*\*(.*?)\*\*\n\n([\s\S]*)$/);
    if (match) {
      return (
        <div>
          <div className="font-bold text-[15px] mb-2">{match[1]}</div>
          <div className="whitespace-pre-line text-justify">{renderFormattedText(match[2])}</div>
          {m.sourceRef && (
            <div className="mt-2 border-t border-[#E5E7EB] pt-1.5 text-[11.5px] text-text-muted whitespace-pre-line">
              {m.sourceRef}
            </div>
          )}
        </div>
      )
    }
    
    return (
      <div>
        <div className="whitespace-pre-line text-justify">{renderFormattedText(m.text || "")}</div>
        {m.sourceRef && (
          <div className="mt-2 border-t border-[#E5E7EB] pt-1.5 text-[11.5px] text-text-muted whitespace-pre-line">
            {m.sourceRef}
          </div>
        )}
      </div>
    )
  },
  worksheet: (m, ctx) =>
    m.topicId ? (
      <WorksheetCard topicId={m.topicId} diffLevel={ctx.diffLevel} setDiffLevel={ctx.setDiffLevel} />
    ) : null,
  summary: () => <SummaryCard />,
  email: (m, ctx) =>
    m.emailId ? (
      <EmailCard emailId={m.emailId} toneLevel={ctx.toneLevel} setToneLevel={ctx.setToneLevel} />
    ) : null,
  exitticket: (m) => (m.etId ? <ExitTicketCard etId={m.etId} /> : null),
  kb: (m, ctx) =>
    m.qId ? <KbCard qId={m.qId} open={ctx.kbSourcesOpen} onToggle={ctx.toggleKbSources} /> : null,
}
