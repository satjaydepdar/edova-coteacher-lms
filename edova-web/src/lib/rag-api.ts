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
  if (!data?.sources || data.sources.length === 0) {
    return { explanation, sourceRef: "" }
  }

  const source = data.sources[0]
  const docId = source.doc_id || ""
  
  // Format the chapter name nicely: "chapter 1 - life process" -> "Life Process"
  const chapterName = docId
    .replace(/^chapter \d+ - /i, "")
    .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())

  // Collect all unique pages and sort them
  const pageNumbers = Array.from(new Set(data.sources.map(s => s.page_number).filter(Boolean))) as number[]
  pageNumbers.sort((a, b) => a - b)
  
  let pageStr = ""
  if (pageNumbers.length === 1) {
    pageStr = `Page: ${pageNumbers[0]}`
  } else if (pageNumbers.length > 1) {
    if (pageNumbers[pageNumbers.length - 1] - pageNumbers[0] === pageNumbers.length - 1) {
      pageStr = `Pages: ${pageNumbers[0]}-${pageNumbers[pageNumbers.length - 1]}`
    } else {
      pageStr = `Pages: ${pageNumbers.join(", ")}`
    }
  }

  const sourceRef = `Source:\nChapter: ${chapterName}\n${pageStr}`
  return { explanation, sourceRef }
}
