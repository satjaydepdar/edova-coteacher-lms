/**
 * Ask-the-Textbook RAG service client (ragApi :8000), matching the actual
 * POST /chat contract in ncert_rag/api/app.py (ChatRequest/ChatResponse) —
 * degradation-on-failure behaviour preserved: any failure throws and the
 * widget shows its friendly fallback message.
 */
import { ragApi } from "./api-client"

/** History entries in the shape the widget keeps (role + content/explanation). */
export type RagHistoryMsg = { role: "user" | "assistant"; content?: string; explanation?: string }

export interface TextbookAnswer {
  explanation: string
  sourceRef: string
}

/** Wire shape of the RAG service's POST /chat response. */
interface RagChatResponse {
  response: string
  sources?: Array<{ doc_id?: string; page_number?: number }>
}

function toChatTurns(history: RagHistoryMsg[]): Array<{ user: string; assistant: string }> {
  const turns: Array<{ user: string; assistant: string }> = []
  for (let i = 0; i + 1 < history.length; i += 2) {
    turns.push({ user: history[i].content ?? "", assistant: history[i + 1].explanation ?? "" })
  }
  return turns
}

export async function askTextbook(query: string, history: RagHistoryMsg[]): Promise<TextbookAnswer> {
  const data = await ragApi.post<RagChatResponse>("/chat", { message: query, history: toChatTurns(history) })
  const explanation = data?.response || "I couldn't find that in the textbook."
  const source = data?.sources?.[0]
  const refParts = [source?.doc_id, source?.page_number ? `Page ${source.page_number}` : ""]
    .filter((p): p is string => typeof p === "string" && p !== "")
  return { explanation, sourceRef: refParts.join(" · ") }
}
