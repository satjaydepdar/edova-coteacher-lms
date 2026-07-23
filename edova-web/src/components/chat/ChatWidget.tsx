import { useEffect, useRef, useState } from "react"
import { Bot, X } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import {
  CHAT_EMAILS,
  CHAT_EXIT_TICKETS,
  CHAT_GREETING,
  CHAT_QUESTIONS,
  CHAT_ROOT_CHIPS,
  CHAT_TOPICS,
} from "@/data/seed"

type Chip = { id: string; label: string }
type MsgKind =
  | "text"
  | "typing"
  | "worksheet"
  | "summary"
  | "email"
  | "exitticket"
  | "kb"
  | "textbook"
interface ChatMsg {
  id: number
  from: "user" | "bot"
  kind: MsgKind
  text?: string
  chips?: Chip[] | null
  time?: string | null
  topicId?: string
  emailId?: string
  etId?: string
  qId?: string
  /** "textbook" messages: where the passage came from (chapter · page · file). */
  sourceRef?: string
}

const RAG_API = import.meta.env.VITE_RAG_API_URL || "http://localhost:8000"

/** History entries in the shape the RAG service reads (role + content/explanation). */
type RagHistoryMsg = { role: "user" | "assistant"; content?: string; explanation?: string }

async function askTextbook(query: string, history: RagHistoryMsg[]) {
  const res = await fetch(`${RAG_API}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, chat_history: history }),
  })
  if (!res.ok) throw new Error(`RAG service ${res.status}`)
  const data = await res.json()
  const a = data?.structured_answer ?? {}
  const explanation: string = a.explanation || "I couldn't find that in the textbook."
  const refParts = [a.chapter_name, a.page_number ? `Page ${a.page_number}` : "", a.source_file]
    .filter((p) => p && p !== "None" && p !== "Unknown" && p !== 0)
  return { explanation, sourceRef: refParts.join(" · ") }
}

type DiffLevel = "remedial" | "onlevel" | "gifted"
type ToneLevel = "casual" | "professional" | "formal"

let idSeq = 1
const nextId = () => idSeq++
// Chat clock ported from app.js (chatClockMin starts at 15; each message increments).
let chatClockMin = 15
function nextChatTime() {
  const totalMin = chatClockMin++
  const hour = 9 + Math.floor(totalMin / 60)
  const min = totalMin % 60
  return `${hour}:${String(min).padStart(2, "0")} AM`
}

const greetingMsg = (): ChatMsg => ({
  id: nextId(),
  from: "bot",
  kind: "text",
  text: CHAT_GREETING,
  chips: CHAT_ROOT_CHIPS,
  time: "9:14 AM",
})

export function ChatWidget() {
  const chatOpen = useAppStore((s) => s.chatOpen)
  const toggleChat = useAppStore((s) => s.toggleChat)

  const [messages, setMessages] = useState<ChatMsg[]>(() => [greetingMsg()])
  const [diffLevel, setDiffLevel] = useState<DiffLevel>("onlevel")
  const [toneLevel, setToneLevel] = useState<ToneLevel>("professional")
  const [kbSourcesOpen, setKbSourcesOpen] = useState(false)
  const [input, setInput] = useState("")
  const [asking, setAsking] = useState(false)
  const ragHistory = useRef<RagHistoryMsg[]>([])
  const msgsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages])

  function routeChat(chipId: string, label: string) {
    setMessages((prev) => [
      ...prev.map((m) => ({ ...m, chips: null })),
      { id: nextId(), from: "user", kind: "text", text: label, time: nextChatTime() },
      { id: nextId(), from: "bot", kind: "typing", time: null },
    ])
    setKbSourcesOpen(false)
    window.setTimeout(() => resolveChat(chipId), 700)
  }

  // Free-text questions go to the Ask-the-Textbook RAG service; chips keep
  // their scripted flows. On any failure the widget degrades to a friendly
  // text reply, matching the app's backends-optional behaviour.
  async function sendFreeText() {
    const q = input.trim()
    if (!q || asking) return
    setInput("")
    setAsking(true)
    setMessages((prev) => [
      ...prev.map((m) => ({ ...m, chips: null })),
      { id: nextId(), from: "user", kind: "text", text: q, time: nextChatTime() },
      { id: nextId(), from: "bot", kind: "typing", time: null },
    ])
    try {
      const { explanation, sourceRef } = await askTextbook(q, ragHistory.current)
      ragHistory.current.push({ role: "user", content: q }, { role: "assistant", explanation })
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { id: nextId(), from: "bot", kind: "textbook", text: explanation, sourceRef, time: nextChatTime() },
      ])
    } catch {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        {
          id: nextId(),
          from: "bot",
          kind: "text",
          text: "I couldn't reach the textbook assistant right now. Please check the service is running and try again.",
          time: nextChatTime(),
        },
      ])
    } finally {
      setAsking(false)
    }
  }

  function resolveChat(chipId: string) {
    setMessages((prev) => {
      const msgs = prev.slice(0, -1) // drop typing
      const mk = (kind: MsgKind, extra: Partial<ChatMsg>, chips?: Chip[]): ChatMsg => ({
        id: nextId(),
        from: "bot",
        kind,
        chips: chips ?? null,
        time: nextChatTime(),
        ...extra,
      })
      let botMsg: ChatMsg
      switch (chipId) {
        case "worksheet":
          botMsg = mk("text", { text: "Great — what topic and class level should I build this for?" }, [
            { id: "w_fractions", label: "Fractions · Class 5" },
            { id: "w_photo", label: "Photosynthesis · Class 7" },
            { id: "w_revolution", label: "American Revolution · Class 8" },
          ])
          break
        case "w_fractions":
        case "w_photo":
        case "w_revolution":
          botMsg = mk("worksheet", { topicId: chipId }, [
            { id: "ask", label: "💬 Ask a Question" },
            { id: "restart", label: "↩ Back to Menu" },
          ])
          break
        case "grades":
          botMsg = mk("summary", {}, [{ id: "restart", label: "↩ Back to Menu" }])
          break
        case "email":
          botMsg = mk("text", { text: "Who is this about, and what's the topic?" }, [
            { id: "email_alex", label: "Struggling in Math – Alex R." },
            { id: "email_jordan", label: "Missing Homework – Jordan P." },
          ])
          break
        case "email_alex":
        case "email_jordan":
          botMsg = mk("email", { emailId: chipId }, [{ id: "restart", label: "↩ Back to Menu" }])
          break
        case "exitticket":
          botMsg = mk("text", { text: "Which class should this exit ticket be for?" }, [
            { id: "et_fractions", label: "Class 5 Math – Fractions" },
            { id: "et_photo", label: "Class 7 Science – Photosynthesis" },
          ])
          break
        case "et_fractions":
        case "et_photo":
          botMsg = mk("exitticket", { etId: chipId }, [{ id: "restart", label: "↩ Back to Menu" }])
          break
        case "ask":
          botMsg = mk("text", { text: "Sure — here are a few things teachers often ask me:" }, [
            { id: "q_late", label: "Late homework policy?" },
            { id: "q_iep", label: "IEP accommodation guidelines?" },
            { id: "q_trip", label: "Field trip form submission?" },
          ])
          break
        case "q_late":
        case "q_iep":
        case "q_trip":
          botMsg = mk("kb", { qId: chipId }, [{ id: "restart", label: "↩ Ask Something Else" }])
          break
        default:
          botMsg = mk("text", { text: "Of course — what else can I help with?" }, CHAT_ROOT_CHIPS)
          break
      }
      return [...msgs, botMsg]
    })
  }

  const fabIcon = chatOpen ? <X className="size-6" /> : <Bot className="size-6" />

  return (
    <>
      {/* FAB */}
      <button
        onClick={toggleChat}
        title="AI Assistant"
        className="fixed bottom-7 right-7 z-[1000] flex size-[60px] items-center justify-center rounded-full border-[3px] border-gold text-white shadow-[0_8px_24px_rgba(0,0,0,.28)]"
        style={{ background: "#3F6E62" }}
      >
        {fabIcon}
      </button>

      {/* Window */}
      {chatOpen && (
        <div className="fixed bottom-[100px] right-7 z-[999] flex h-[600px] max-h-[76vh] w-[400px] flex-col overflow-hidden rounded-[16px] border border-[#E5E1D2] bg-[#FAF8F2] shadow-[0_20px_60px_rgba(0,0,0,.32)]">
          {/* header */}
          <div className="flex flex-none items-center gap-2.5 bg-ink px-4 py-3.5">
            <div className="flex size-[38px] flex-none items-center justify-center rounded-[10px] bg-gold text-[19px]">
              🤖
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[15px] font-bold text-sidebar-text">
                AI Assistant
              </div>
              <div className="flex items-center gap-1.5 text-[12.5px] text-[#A8C5A0]">
                <span className="size-[7px] rounded-full bg-[#4ADE80]" /> Online
              </div>
            </div>
            <button
              onClick={toggleChat}
              className="flex size-[30px] flex-none items-center justify-center rounded-[8px] text-[16px] text-sidebar-text"
            >
              ✕
            </button>
          </div>

          {/* messages */}
          <div ref={msgsRef} className="flex flex-1 flex-col overflow-y-auto p-4">
            {messages.map((m) => {
              const isUser = m.from === "user"
              return (
                <div key={m.id}>
                  <div className={isUser ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className="mb-1 max-w-[85%] rounded-[14px] px-3.5 py-2.5 text-[14px] leading-relaxed"
                      style={
                        isUser
                          ? { background: "#3F6E62", color: "#fff", borderBottomRightRadius: 4 }
                          : { background: "#fff", color: "#111827", border: "1px solid #E5E7EB", borderBottomLeftRadius: 4 }
                      }
                    >
                      {m.kind === "typing" && (
                        <div className="flex items-center gap-1 px-0.5 py-1">
                          {[0, 0.15, 0.3].map((d) => (
                            <span
                              key={d}
                              className="inline-block size-[7px] rounded-full bg-text-muted"
                              style={{ animation: "bounceDot 1.2s infinite ease-in-out", animationDelay: `${d}s` }}
                            />
                          ))}
                        </div>
                      )}
                      {m.kind === "text" && <div>{m.text}</div>}
                      {m.kind === "textbook" && (
                        <div>
                          <div className="whitespace-pre-line">{m.text}</div>
                          {m.sourceRef && (
                            <div className="mt-2 border-t border-[#E5E7EB] pt-1.5 text-[11.5px] text-text-muted">
                              Source: {m.sourceRef}
                            </div>
                          )}
                        </div>
                      )}
                      {m.kind === "worksheet" && m.topicId && (
                        <WorksheetCard topicId={m.topicId} diffLevel={diffLevel} setDiffLevel={setDiffLevel} />
                      )}
                      {m.kind === "summary" && <SummaryCard />}
                      {m.kind === "email" && m.emailId && (
                        <EmailCard emailId={m.emailId} toneLevel={toneLevel} setToneLevel={setToneLevel} />
                      )}
                      {m.kind === "exitticket" && m.etId && <ExitTicketCard etId={m.etId} />}
                      {m.kind === "kb" && m.qId && (
                        <KbCard qId={m.qId} open={kbSourcesOpen} onToggle={() => setKbSourcesOpen((o) => !o)} />
                      )}
                      {m.time && (
                        <div
                          className="mt-1 text-[10.5px]"
                          style={{ color: isUser ? "rgba(255,255,255,.6)" : "#9CA3AF", textAlign: isUser ? "right" : "left" }}
                        >
                          {m.time}
                        </div>
                      )}
                    </div>
                  </div>
                  {m.chips && m.chips.length > 0 && (
                    <div className="my-1.5 mb-4 flex flex-wrap gap-2">
                      {m.chips.map((chip) => (
                        <button
                          key={chip.id}
                          onClick={() => routeChat(chip.id, chip.label)}
                          className="cursor-pointer rounded-full border border-[#CFE3DC] bg-[#E4F0ED] px-3 py-1.5 text-[12.5px] font-semibold text-[#16332B] transition-colors hover:bg-[#DAEAE3]"
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* footer */}
          <div className="flex-none border-t border-[#E5E1D2] bg-cream px-3.5 py-3">
            <div className="flex items-center gap-2 rounded-[10px] border border-[#E5E1D2] bg-white py-1.5 pl-3 pr-1.5">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") sendFreeText()
                }}
                disabled={asking}
                placeholder={asking ? "Looking it up in the textbook…" : "Ask the textbook, or tap an option above…"}
                className="flex-1 bg-transparent text-[13.5px] text-[#111827] outline-none placeholder:text-text-muted"
              />
              <div className="flex size-8 flex-none items-center justify-center rounded-[8px] bg-[#F3EFE3] text-[15px]">
                🎙️
              </div>
              <button
                onClick={sendFreeText}
                disabled={asking || !input.trim()}
                className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-[8px] text-[14px] text-white disabled:cursor-default disabled:opacity-60"
                style={{ background: "#3F6E62" }}
              >
                ➤
              </button>
            </div>
            <div className="mt-2 text-center text-[10.5px] text-text-muted">
              Data isn't used for model training. Attachments are encrypted.{" "}
              <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const seg = (active: boolean) =>
  "flex-1 cursor-pointer rounded-[7px] px-2 py-1.5 text-center text-[12px] font-semibold transition-colors " +
  (active ? "bg-white text-ink shadow-sm" : "text-text-secondary")

function WorksheetCard({
  topicId,
  diffLevel,
  setDiffLevel,
}: {
  topicId: string
  diffLevel: DiffLevel
  setDiffLevel: (l: DiffLevel) => void
}) {
  const topic = CHAT_TOPICS[topicId]
  if (!topic) return null
  return (
    <div>
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#CFE3DC] bg-[#E4F0ED] px-2 py-0.5 text-[11px] font-bold text-[#3F6E62]">
        🤖 AI-GENERATED DRAFT
      </div>
      <div className="mb-0.5 text-[15px] font-bold text-[#111827]">{topic.title}</div>
      <div className="mb-2.5 text-[12.5px] text-text-secondary">
        {topic.grade} · {topic.subject} · {topic.standard} · {topic.duration} · {topic.count} questions
      </div>
      <div className="mb-2.5 flex rounded-[9px] bg-[#F1F5F9] p-[3px]">
        {(["remedial", "onlevel", "gifted"] as DiffLevel[]).map((l) => (
          <div key={l} onClick={() => setDiffLevel(l)} className={seg(diffLevel === l)}>
            {l === "remedial" ? "Remedial" : l === "onlevel" ? "On Level" : "Gifted"}
          </div>
        ))}
      </div>
      <div className="mb-2.5 rounded-[8px] border border-card-border bg-[#F9FAFB] px-3 py-2.5 text-[13px] leading-normal text-[#374151]">
        {topic.byLevel[diffLevel]}
      </div>
      <div className="flex gap-2">
        <div className="flex-1 cursor-pointer rounded-[7px] px-1 py-2 text-center text-[12.5px] font-bold text-white" style={{ background: "#3F6E62" }}>
          📄 Export PDF
        </div>
        <div className="flex-1 cursor-pointer rounded-[7px] bg-[#F3EFE3] px-1 py-2 text-center text-[12.5px] font-bold text-[#16332B]">
          📤 Google Forms
        </div>
      </div>
    </div>
  )
}

function SummaryCard() {
  return (
    <div>
      <div className="mb-2.5 text-[14px] text-[#111827]">
        Here's a quick snapshot of your pending grading:
      </div>
      <div className="mb-2.5 grid grid-cols-3 gap-2">
        <div className="rounded-[8px] border border-card-border bg-[#F9FAFB] p-2.5 text-center">
          <div className="text-[18px] font-bold text-[#111827]">23</div>
          <div className="text-[10.5px] text-text-secondary">Pending</div>
        </div>
        <div className="rounded-[8px] border border-card-border bg-[#F9FAFB] p-2.5 text-center">
          <div className="text-[18px] font-bold text-[#111827]">82%</div>
          <div className="text-[10.5px] text-text-secondary">Avg. Score</div>
        </div>
        <div className="rounded-[8px] border border-[#FECACA] bg-[#FEF2F2] p-2.5 text-center">
          <div className="text-[18px] font-bold text-danger">4</div>
          <div className="text-[10.5px] text-danger">Flagged</div>
        </div>
      </div>
      <div className="cursor-pointer rounded-[7px] py-2.5 text-center text-[12.5px] font-bold text-white" style={{ background: "#3F6E62" }}>
        🔎 Open Grading Queue
      </div>
    </div>
  )
}

function EmailCard({
  emailId,
  toneLevel,
  setToneLevel,
}: {
  emailId: string
  toneLevel: ToneLevel
  setToneLevel: (t: ToneLevel) => void
}) {
  const email = CHAT_EMAILS[emailId]
  if (!email) return null
  return (
    <div>
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#CFE3DC] bg-[#E4F0ED] px-2 py-0.5 text-[11px] font-bold text-[#3F6E62]">
        🤖 AI-DRAFTED EMAIL
      </div>
      <div className="mb-0.5 text-[12.5px] text-text-secondary">Subject</div>
      <div className="mb-2.5 text-[14px] font-bold text-[#111827]">{email.subject}</div>
      <div className="mb-2.5 flex rounded-[9px] bg-[#F1F5F9] p-[3px]">
        {(["casual", "professional", "formal"] as ToneLevel[]).map((t) => (
          <div key={t} onClick={() => setToneLevel(t)} className={seg(toneLevel === t)}>
            {t === "casual" ? "Casual" : t === "professional" ? "Professional" : "Formal"}
          </div>
        ))}
      </div>
      <div className="mb-2.5 rounded-[8px] border border-card-border bg-[#F9FAFB] px-3 py-2.5 text-[13px] leading-relaxed text-[#374151]">
        {email.bodyByTone[toneLevel]}
      </div>
      <div className="flex gap-2">
        <div className="flex-1 cursor-pointer rounded-[7px] px-1 py-2 text-center text-[12.5px] font-bold text-white" style={{ background: "#3F6E62" }}>
          📤 Send Email
        </div>
        <div className="flex-1 cursor-pointer rounded-[7px] bg-[#F3EFE3] px-1 py-2 text-center text-[12.5px] font-bold text-[#16332B]">
          📋 Copy Draft
        </div>
      </div>
    </div>
  )
}

function ExitTicketCard({ etId }: { etId: string }) {
  const et = CHAT_EXIT_TICKETS[etId]
  if (!et) return null
  return (
    <div>
      <div className="mb-0.5 text-[14.5px] font-bold text-[#111827]">{et.title}</div>
      <div className="mb-2.5 text-[12.5px] text-text-secondary">{et.className}</div>
      {et.questions.map((q, i) => (
        <div key={i} className="flex gap-2 border-b border-[#F1F5F9] py-1.5 text-[13px] text-[#374151]">
          <span className="text-text-muted">•</span>
          <span>{q}</span>
        </div>
      ))}
      <div className="mt-2.5 flex gap-2">
        <div className="flex-1 cursor-pointer rounded-[7px] px-1 py-2 text-center text-[12.5px] font-bold text-white" style={{ background: "#3F6E62" }}>
          📄 Print Preview
        </div>
        <div className="flex-1 cursor-pointer rounded-[7px] bg-[#F3EFE3] px-1 py-2 text-center text-[12.5px] font-bold text-[#16332B]">
          📤 Google Forms
        </div>
      </div>
    </div>
  )
}

function KbCard({ qId, open, onToggle }: { qId: string; open: boolean; onToggle: () => void }) {
  const q = CHAT_QUESTIONS[qId]
  if (!q) return null
  return (
    <div>
      <div className="mb-2 text-[14px] leading-relaxed text-[#111827]">{q.answer}</div>
      <div
        onClick={onToggle}
        className="inline-flex cursor-pointer items-center gap-1 text-[12px] font-semibold text-[#3F6E62]"
      >
        {open ? "▾ Hide source" : "▸ View source [1]"}
      </div>
      {open && (
        <div className="mt-2 rounded-[8px] border border-card-border bg-[#F9FAFB] px-3 py-2.5">
          <div className="text-[12.5px] font-bold text-[#111827]">📄 {q.source.name}</div>
          <div className="my-1.5 text-[12px] italic text-text-secondary">{q.source.snippet}</div>
          <div className="text-[11px] text-text-muted">{q.source.updated}</div>
        </div>
      )}
    </div>
  )
}
