import { useEffect, useRef, useState } from "react"
import { Bot, X } from "lucide-react"
import { useAppStore } from "@/store/app-store"
import { CHAT_GREETING, CHAT_ROOT_CHIPS } from "@/data/seed"
import { askTextbook, type RagHistoryMsg } from "@/lib/rag-api"
import { MESSAGE_RENDERERS, resolveFlow } from "./flows"
import type { ChatMsg, DiffLevel, MsgKind, MsgRenderCtx, ToneLevel } from "./types"

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
      const mk = (kind: MsgKind, extra: Partial<ChatMsg>, chips?: typeof CHAT_ROOT_CHIPS): ChatMsg => ({
        id: nextId(),
        from: "bot",
        kind,
        chips: chips ?? null,
        time: nextChatTime(),
        ...extra,
      })
      return [...msgs, resolveFlow(chipId)(mk, chipId)]
    })
  }

  const renderCtx: MsgRenderCtx = {
    diffLevel,
    setDiffLevel,
    toneLevel,
    setToneLevel,
    kbSourcesOpen,
    toggleKbSources: () => setKbSourcesOpen((o) => !o),
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
                      {MESSAGE_RENDERERS[m.kind](m, renderCtx)}
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
