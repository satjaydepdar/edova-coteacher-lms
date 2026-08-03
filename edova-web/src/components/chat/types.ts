export type Chip = { id: string; label: string }

export type MsgKind =
  | "text"
  | "typing"
  | "worksheet"
  | "summary"
  | "email"
  | "exitticket"
  | "kb"
  | "textbook"

export interface ChatMsg {
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

export type DiffLevel = "remedial" | "onlevel" | "gifted"
export type ToneLevel = "casual" | "professional" | "formal"

/** Rendering context the per-kind message renderers read from the widget. */
export interface MsgRenderCtx {
  diffLevel: DiffLevel
  setDiffLevel: (l: DiffLevel) => void
  toneLevel: ToneLevel
  setToneLevel: (t: ToneLevel) => void
  kbSourcesOpen: boolean
  toggleKbSources: () => void
}
