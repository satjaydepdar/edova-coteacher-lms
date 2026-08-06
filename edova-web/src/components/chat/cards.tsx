// Scripted-content cards rendered inside chat messages. Purely presentational;
// all content comes from the CHAT_* seed records.
import {
  CHAT_EMAILS,
  CHAT_EXIT_TICKETS,
  CHAT_QUESTIONS,
  CHAT_TOPICS,
} from "@/data/seed"
import type { DiffLevel, ToneLevel } from "./types"

const seg = (active: boolean) =>
  "flex-1 cursor-pointer rounded-[7px] px-2 py-1.5 text-center text-[12px] font-semibold transition-colors " +
  (active ? "bg-white text-ink shadow-sm" : "text-text-secondary")

export function WorksheetCard({
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

export function SummaryCard() {
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

export function EmailCard({
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

export function ExitTicketCard({ etId }: { etId: string }) {
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

export function KbCard({ qId, open, onToggle }: { qId: string; open: boolean; onToggle: () => void }) {
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
