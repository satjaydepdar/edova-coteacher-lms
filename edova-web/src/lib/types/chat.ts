// Chat assistant.

export interface ChatRootChip {
  id: string
  label: string
}
export interface ChatTopic {
  title: string
  grade: string
  subject: string
  standard: string
  duration: string
  count: number
  byLevel: { remedial: string; onlevel: string; gifted: string }
}
export interface ChatExitTicket {
  title: string
  className: string
  questions: string[]
}
export interface ChatPolicyAnswer {
  answer: string
  source: { name: string; snippet: string; updated: string }
}
export interface ChatEmail {
  subject: string
  bodyByTone: { casual: string; professional: string; formal: string }
}
