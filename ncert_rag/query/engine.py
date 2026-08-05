from storage.pgvector_store import PGVectorStore
from embedding.gemini_embedder import GeminiEmbedder
from openai import OpenAI
from config.settings import settings
from ports import ChatClient, Embedder, VectorStore
from typing import Dict, List, Optional
import re


class QueryEngine:
    """
    RAG Query Engine: Embed query -> Retrieve -> Generate answer

    Collaborators are constructor-injected; every parameter defaults to the
    production concrete, so existing no-arg callers (api/app.py, main.py)
    behave exactly as before.
    """

    def __init__(
        self,
        store: Optional[VectorStore] = None,
        embedder: Optional[Embedder] = None,
        client: Optional[ChatClient] = None,
        model: Optional[str] = None,
    ):
        self.store = store if store is not None else PGVectorStore()
        self.embedder = embedder if embedder is not None else GeminiEmbedder()
        self.client = client if client is not None else OpenAI(
            api_key=settings.NEMOTRON_API_KEY,
            base_url=settings.NEMOTRON_BASE_URL
        )
        self.model = model if model is not None else settings.NEMOTRON_MODEL

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        Retrieve relevant documents for query
        """
        query_embedding = self.embedder.embed_query(query)
        results = self.store.similarity_search(query_embedding, top_k=top_k)
        return results

    def generate_answer(self, query: str, context: List[Dict]) -> str:
        """
        Generate answer using retrieved context
        """
        # Build context string
        context_text = "\n\n".join([
            f"[From {doc['doc_id']}, Page {doc['page_number']}]\n{doc['content']}"
            for doc in context
        ])

        system_prompt = """You are a textbook excerpt copier. You copy text from the provided context EXACTLY as written. You never add your own words.

CRITICAL FORMATTING RULES:
- Do NOT use any markdown: no #, no ##, no ###, no **, no *, no -, no numbered lists.
- Do NOT use bold, italic, bullet points, or headings.
- Do NOT restructure the text into lists or steps.
- Do NOT paraphrase or rewrite. Copy word-for-word. Do NOT substitute synonyms. Do NOT change even a single word. Every word must match the context exactly.
- Do NOT add any note, clarification, or comment.
- Do NOT append "I cannot answer..." after providing an answer.
- Write ONLY plain text paragraphs exactly as they appear in the textbook.
- If the answer is truly not found, respond with ONLY: "I cannot answer this question because the information is not present in the uploaded document."

RESPONSE FORMAT (three parts, nothing else):
Line 1: The chapter or topic name (plain text, no formatting)
Line 2: Empty line
Lines 3+: The exact paragraphs from the textbook, copied word for word as plain text
Last line: Source: Page <number>"""

        user_prompt = f"""CONTEXT:
{context_text}

QUESTION: {query}

Copy the relevant textbook paragraphs exactly. Plain text only. No markdown. No lists. No bold. No commentary."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=2048,
                temperature=0
            )

            return response.choices[0].message.content

        except Exception as e:
            return f"Error generating answer: {str(e)}"

    def query(self, question: str, top_k: int = 5) -> Dict:
        """
        Full RAG pipeline: Retrieve + Generate
        """
        print(f"\nQuery: {question}")
        print("-" * 60)

        # Retrieve
        print("Retrieving relevant documents...")
        retrieved = self.retrieve(question, top_k=top_k)

        if not retrieved:
            return {
                "question": question,
                "answer": "No relevant documents found in the database.",
                "sources": []
            }

        print(f"Found {len(retrieved)} relevant sections")
        for doc in retrieved:
            print(f"  - {doc['doc_id']} (Page {doc['page_number']}, sim={doc['similarity']:.3f})")

        # Generate
        print("\nGenerating answer...")
        answer = self.generate_answer(question, retrieved)

        return {
            "question": question,
            "answer": answer,
            "sources": [
                {
                    "doc_id": d['doc_id'],
                    "page": d['page_number'],
                    "similarity": d['similarity']
                }
                for d in retrieved
            ],
            "chunk_ids": [str(d['id']) for d in retrieved],  # for rag_queries audit logging
        }

    def chat(self, message: str, history: List[Dict] = None) -> Dict:
        """
        Chat interface with conversation memory.

        Uses a hybrid approach:
        1. Retrieve candidate chunks via embedding similarity search.
        2. Ask the LLM ONLY to select which chunks are relevant (returns JSON indices).
        3. Construct the response from raw database text — guaranteeing verbatim output.
        """
        import json as _json

        if history is None:
            history = []

        # Retrieve candidate chunks
        retrieved = self.retrieve(message, top_k=8)

        if not retrieved:
            return {
                "response": "I cannot answer this question because the information is not present in the uploaded document.",
                "sources": [],
                "chunk_ids": [],
            }

        # Build a short summary of each chunk for the LLM to select from
        chunk_summaries = ""
        for i, d in enumerate(retrieved):
            # Show first 150 chars so the LLM can judge relevance
            preview = d['content'][:150].replace('\n', ' ')
            chunk_summaries += f"[{i}] Source: {d['doc_id']}, Page {d['page_number']}: {preview}...\n"

        selection_prompt = f"""I have {len(retrieved)} text chunks from a textbook. The student asked: "{message}"

Your job: pick which chunks answer the question.

Return ONLY a valid JSON object, nothing else:
{{"topic": "exact section heading", "chunks": [0, 1, 3], "page": 12}}

- "topic": the EXACT section heading or title from the beginning of the most relevant chunk (e.g. do not shorten "Our pump - the heart" to "The Heart")
- "chunks": a list of chunk index numbers (from 0 to {len(retrieved)-1}) that are relevant to the question, in reading order
- "page": the page number of the primary answer

Return ONLY the JSON object. No explanation. No other text."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You return ONLY valid JSON. No other text."},
                    {"role": "user", "content": selection_prompt + "\n\nChunks:\n" + chunk_summaries}
                ],
                max_tokens=200,
                temperature=0
            )

            raw = response.choices[0].message.content.strip()
            # Strip markdown code fences if present
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
            if raw.endswith("```"):
                raw = raw[:-3]
            raw = raw.strip()

            selection = _json.loads(raw)
            topic = selection.get("topic", retrieved[0]['doc_id'])
            selected_indices = selection.get("chunks", list(range(min(5, len(retrieved)))))
            page = selection.get("page", retrieved[0]['page_number'])

        except Exception:
            # Fallback: use the top 5 chunks sorted by similarity
            topic = retrieved[0]['doc_id']
            selected_indices = list(range(min(5, len(retrieved))))
            page = retrieved[0]['page_number']

        # Identify the range of chunks selected — then expand to neighbors
        selected_chunks = [retrieved[i] for i in selected_indices if i < len(retrieved)]
        
        from collections import defaultdict
        chunks_by_doc = defaultdict(list)
        for c in selected_chunks:
            doc_id = c['doc_id']
            page_number = c.get('page_number', 0)
            chunks_by_doc[(doc_id, page_number)].append(c.get('metadata', {}).get('chunk', 0))

        # For each (doc, page) group, fetch the continuous range + 1 neighbor on each side
        final_chunks = []
        for (doc_id, page_number), indices in chunks_by_doc.items():
            if not indices:
                continue
            min_idx = max(0, min(indices) - 1)  # expand 1 chunk before
            max_idx = max(indices) + 1           # expand 1 chunk after
            
            # If the gap is too large (> 6 chunks), they are probably distinct sections
            if max_idx - min_idx > 8:
                final_chunks.extend([c for c in selected_chunks if c['doc_id'] == doc_id and c.get('page_number', 0) == page_number])
            else:
                continuous_chunks = self.store.get_chunks_by_range(doc_id, page_number, min_idx, max_idx)
                final_chunks.extend(continuous_chunks)
                
        # Sort by page number then chunk index so text flows in reading order
        final_chunks.sort(key=lambda c: (
            c.get('page_number', 0) or 0, 
            c.get('metadata', {}).get('chunk', 0) or 0
        ))

        # Merge chunks with overlap-aware deduplication
        merged_text = ""
        for chunk in final_chunks:
            text = chunk['content'].strip()
            
            # --- Clean PDF artifacts ---
            # Remove heading tags (#)
            text = re.sub(r'^#{1,6}\s+', '', text, flags=re.MULTILINE)
            # Remove page headers/footers like "Life Processes 81"
            text = re.sub(r'^[A-Z][A-Za-z\s\-&]+\d{1,3}\s*$', '', text, flags=re.MULTILINE)
            # Remove reprint/edition lines
            text = re.sub(r'^Reprint\s+\d{4}[\-–]\d{2,4}\s*$', '', text, flags=re.MULTILINE)
            # Remove chapter headers like "1064CH06"
            text = re.sub(r'^\d+CH\d+\s*$', '', text, flags=re.MULTILINE)
            text = re.sub(r'^CHAPTER\s+\d+\s*$', '', text, flags=re.MULTILINE)
            # Remove standalone page numbers
            text = re.sub(r'^\d{1,3}\s*$', '', text, flags=re.MULTILINE)
            # Remove [Diagram: ...] tags
            text = re.sub(r'\[Diagram:\s*[^\]]*\]', '', text)
            # Remove standalone figure caption lines
            text = re.sub(r'^(?:Figure|Fig\.?)\s+\d+\.\d+\s*$', '', text, flags=re.MULTILINE)
            # Fix broken words from page breaks
            text = re.sub(r'(?<=\w)-\n(?=\w)', '', text)
            text = re.sub(r'(?<=\w)\n(?=[a-z])', ' ', text)
            # Collapse multiple blank lines
            text = re.sub(r'\n{3,}', '\n\n', text)
            text = text.strip()
            
            if not text:
                continue
            if not merged_text:
                merged_text = text
                continue

            # Check if the start of this chunk overlaps with the end of merged_text
            overlap_found = False
            max_check = min(300, len(merged_text), len(text))
            for overlap_len in range(max_check, 20, -1):
                if merged_text.endswith(text[:overlap_len]):
                    merged_text += text[overlap_len:]
                    overlap_found = True
                    break
            if not overlap_found:
                merged_text += "\n\n" + text

        # Clean the merged text using the LLM to format it beautifully, 
        # remove OCR artifacts, format equations, and fix paragraphs.
        cleaning_prompt = f"""You are an educational formatting assistant. 
I have extracted text from a textbook, but it contains OCR errors from diagrams, poor paragraph spacing, and missing formatting.

Here is the raw text for the topic "{topic}":
---
{merged_text}
---

Your task:
1. Output the cleaned text.
2. The very first line MUST be the exact topic title in bold: **{topic}**
3. Fix the paragraph spacing (use double newlines between paragraphs).
4. Identify subheadings and wrap them in **bold**.
5. REMOVE any hallucinatory text extracted from diagrams/images (e.g., text like "Rubber cuff inflated with air -120 120 -80 Artery closed" or "Blood pressure 120/80 More to Know"). Do NOT include diagram descriptions.
6. IF there are actual formulas or equations, provide them exactly as they are without changing text or symbols.
7. Return ONLY the cleaned text. No conversational padding.
"""

        try:
            clean_response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a textbook formatting assistant. You return ONLY the formatted textbook text, nothing else."},
                    {"role": "user", "content": cleaning_prompt}
                ],
                max_tokens=2000,
                temperature=0.1
            )
            response_text = clean_response.choices[0].message.content.strip()
        except Exception:
            # Fallback if LLM fails
            response_text = f"**{topic}**\n\n{merged_text}"

        # Deduplicate sources for the frontend
        unique_sources = []
        seen = set()
        for c in final_chunks:
            key = (c['doc_id'], c.get('page_number', 0))
            if key not in seen:
                seen.add(key)
                unique_sources.append(c)

        return {
            "response": response_text,
            "sources": unique_sources,
            "chunk_ids": [str(d['id']) for d in final_chunks],
        }
