import os
import json
import re
import sqlite3
import base64
import fitz # PyMuPDF
from typing import List, Dict, Any

from llama_parse import LlamaParse
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_text_splitters import MarkdownHeaderTextSplitter

from langchain_core.messages import HumanMessage
import sqlite_vec

class DocumentAgent:
    def __init__(self, db_path: str = "vectors45.db"):
        self.db_path = db_path
        
        # Initialize LlamaParse
        self.parser = LlamaParse(
            result_type="markdown",
            api_key=os.getenv("LLAMA_CLOUD_API_KEY")
        )
        
        # Initialize Embeddings & LLM
        self.embeddings = GoogleGenerativeAIEmbeddings(model="models/gemini-embedding-001")
        self.llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
        
        # Initialize Reranker (Disabled to improve speed)
        # self.reranker = CrossEncoder('BAAI/bge-reranker-base')
        
        # Initialize SQLiteVec DB
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        conn.execute("CREATE VIRTUAL TABLE IF NOT EXISTS vec_chunks USING vec0(embedding float[3072]);")
        conn.execute("CREATE TABLE IF NOT EXISTS chunks_meta (rowid INTEGER PRIMARY KEY, text TEXT, metadata TEXT);")
        conn.commit()
        conn.close()

    def ingest(self, file_path: str, original_filename: str = None):
        print(f"Ingesting {file_path}...")
        source_name = original_filename if original_filename else os.path.basename(file_path)
            
        json_objs = self.parser.get_json_result(file_path)
        
        if not json_objs or len(json_objs) == 0:
            raise Exception("LlamaParse failed to parse the document or returned empty data.")
            
        full_md = ""
        for page_idx, page_obj in enumerate(json_objs[0].get("pages", [])):
            page_num = page_obj.get("page", page_idx + 1)
            page_md = page_obj.get("md", "") + "\n\n"
            
            # Inject a page marker so we can track the page number across splits
            page_md = f"<!-- PAGE_MARKER_{page_num} -->\n" + page_md
            full_md += page_md
            
        print("Chunking document by semantic sections...")
        headers_to_split_on = [
            ("#", "Header 1"),
            ("##", "Header 2"),
            ("###", "Header 3"),
        ]
        markdown_splitter = MarkdownHeaderTextSplitter(headers_to_split_on=headers_to_split_on, strip_headers=False)
        md_header_splits = markdown_splitter.split_text(full_md)
        
        texts = []
        metadatas = []
        
        current_page = 1
        for split in md_header_splits:
            text_chunk = split.page_content
            
            # Extract all page numbers covered by this chunk
            page_matches = re.findall(r'<!-- PAGE_MARKER_(\d+) -->', text_chunk)
            pages_in_chunk = [int(p) for p in page_matches]
            
            chunk_page = current_page
            if pages_in_chunk:
                current_page = pages_in_chunk[-1]
            
            # Remove markers
            text_chunk = re.sub(r'<!-- PAGE_MARKER_\d+ -->\n?', '', text_chunk).strip()
            if not text_chunk: continue
                
            metadata = {
                "source": source_name,
                "page": chunk_page,
                "section_title": split.metadata.get("Header 3", split.metadata.get("Header 2", split.metadata.get("Header 1", "General Content")))
            }
            texts.append(text_chunk)
            metadatas.append(metadata)
            
        print(f"Created {len(texts)} semantic document chunks.")
        
        if texts:
            import time
            print(f"Generating embeddings for {len(texts)} chunks...")
            embs = []
            batch_size = 40
            for i in range(0, len(texts), batch_size):
                batch_texts = texts[i:i + batch_size]
                try:
                    batch_embs = self.embeddings.embed_documents(batch_texts)
                    embs.extend(batch_embs)
                except Exception as e:
                    print(f"Rate limit hit. Sleeping for 60 seconds... ({str(e)})")
                    time.sleep(60)
                    batch_embs = self.embeddings.embed_documents(batch_texts)
                    embs.extend(batch_embs)
                if i + batch_size < len(texts):
                    time.sleep(60)

            print("Adding to SQLiteVec database...")
            conn = sqlite3.connect(self.db_path)
            conn.enable_load_extension(True)
            sqlite_vec.load(conn)
            
            cursor = conn.cursor()
            for i, emb in enumerate(embs):
                import struct
                emb_bytes = struct.pack(f"<{len(emb)}f", *emb)
                
                cursor.execute("INSERT INTO chunks_meta (text, metadata) VALUES (?, ?)", 
                             (texts[i], json.dumps(metadatas[i])))
                rowid = cursor.lastrowid
                cursor.execute("INSERT INTO vec_chunks (rowid, embedding) VALUES (?, ?)", 
                             (rowid, emb_bytes))
            conn.commit()
            conn.close()
            print("Database update complete!")

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        query_embedding = self.embeddings.embed_query(query)
        import struct
        query_emb_bytes = struct.pack(f"<{len(query_embedding)}f", *query_embedding)
        
        conn = sqlite3.connect(self.db_path)
        conn.enable_load_extension(True)
        sqlite_vec.load(conn)
        
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT chunks_meta.text, chunks_meta.metadata
            FROM vec_chunks
            JOIN chunks_meta ON vec_chunks.rowid = chunks_meta.rowid
            WHERE embedding MATCH ? AND k = ?
            """,
            (query_emb_bytes, top_k)
        )
        rows = cursor.fetchall()
        conn.close()
        
        formatted_results = []
        for row in rows:
            formatted_results.append({
                "text": row[0],
                "metadata": json.loads(row[1])
            })
            
        return formatted_results

    def answer(self, query: str, top_k: int = 3, chat_history: list = None) -> Dict[str, Any]:
        print(f"Generating answer for query: {query}")
        results = self.retrieve(query, top_k=8)
        
        if not results:
            return {
                "structured_answer": {
                    "chapter_name": "No Relevant Content",
                    "explanation": "I couldn't find any information relevant to your question. Please make sure you have uploaded the PDF.",
                    "source_file": "None",
                    "page_number": 0,
                    "has_diagram": False
                },
                "images": [],
                "raw_context": ""
            }
            
        # Removed the slow local CPU reranker to optimize speed.
        # SQLiteVec embeddings retrieval is extremely fast and provides good enough top_k results.
        
        if not results:
            return {
                "structured_answer": {
                    "chapter_name": "No Relevant Content",
                    "explanation": "I couldn't find any information relevant to your question in the uploaded document. Please rephrase or ask something else.",
                    "source_file": "None",
                    "page_number": 0,
                    "has_diagram": False
                },
                "images": [],
                "raw_context": ""
            }
            
        results = results[:8]
            
        context = ""
        for i, res in enumerate(results):
            meta = res['metadata']
            source = meta.get('source', 'Unknown')
            page = meta.get('page', 'Unknown')
            section = meta.get('section_title', 'Unknown Section')
            context += f"--- Source: {source} (Page {page}), Section: {section} ---\n{res['text']}\n\n"
        
        history_text = ""
        if chat_history:
            history_text = "\nPREVIOUS CONVERSATION HISTORY:\n"
            for msg in chat_history[-6:]:
                role = "User" if msg["role"] == "user" else "Assistant"
                text = msg.get("explanation", msg.get("content", ""))
                history_text += f"{role}: {text}\n"
        
        json_schema = {
            "type": "object",
            "properties": {
                "chapter_name": {"type": "string"},
                "explanation": {"type": "string"},
                "page_number": {"type": "string"},
                "source_file": {"type": "string"},
                "quote": {"type": "string"}
            },
            "required": ["chapter_name", "explanation", "page_number", "source_file", "quote"]
        }
                        
        prompt = f"""You are a Strict NCERT/Textbook AI Tutor.

Your ONLY knowledge source is the uploaded textbook.

====================================================
PRIMARY OBJECTIVE
====================================================

When the user asks about any topic, definition, concept, process or explanation,
your job is to locate the COMPLETE textbook section that discusses that topic.

DO NOT answer using only a single retrieved paragraph.

Instead, reconstruct the COMPLETE section exactly as it appears in the textbook.

====================================================
STRICT RULES
====================================================

1. Use ONLY the uploaded textbook.
2. NEVER use outside knowledge.
3. NEVER paraphrase.
4. NEVER summarize.
5. NEVER rewrite sentences.
6. Copy the textbook wording EXACTLY.
7. Preserve paragraph breaks.
8. If multiple consecutive paragraphs belong to the same topic, copy ALL of them.
9. Stop copying ONLY when:
   - a new section begins
   - a new heading begins
   - an unrelated topic begins.
10. Ignore:
   - figure captions
   - figure numbers
   - table formatting
   - image labels
   - page headers
   - page footers
11. If the answer spans multiple pages, continue copying across pages until the topic ends.
12. If the answer is not found, respond exactly:
"I cannot answer this question because the information is not present in the uploaded document."

13. Extract an EXACT string of text (1-2 sentences max) from the context that best highlights where you found the answer. Put this in the 'quote' field.

RESPONSE FORMAT (Valid JSON object):
{{
  "chapter_name": "The chapter or section title if it exists.",
  "explanation": "The COMPLETE textbook section copied exactly as written. Do not modify even a single sentence. Maintain original paragraph spacing, Preserve the original paragraph spacing, line breaks, examples, notes, equations, formulas, mathematical expressions, tables (if text), and captions that belong to the section. If the section spans multiple pages, continue copying until the next main textbook heading or section begins. Do NOT skip any text within the section unless it is unrelated page headers or footers. Return the text verbatim, maintaining the same order as in the PDF.",
  "page_number": "The page number from the context.",
  "source_file": "The source file name from the context.",
  "quote": "An EXACT, verbatim string of text from the document (5 to 15 words) that best highlights the answer."
}}

{history_text}

Context:
{context}

Question: {query}
Answer:"""

        final_message = HumanMessage(content=prompt)
        
        import time
        try:
            response = self.llm.invoke([final_message])
        except Exception as e:
            if "429" in str(e) or "Quota exceeded" in str(e):
                print("Generation rate limit hit. Sleeping for 60 seconds...")
                time.sleep(60)
                response = self.llm.invoke([final_message])
            else:
                raise e
        
        try:
            clean_text = response.content.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            parsed_answer = json.loads(clean_text)
        except json.JSONDecodeError:
            parsed_answer = {
                "chapter_name": "Response Parse Error",
                "explanation": response.content,
                "source_file": "Unknown",
                "page_number": 0
            }

        return {
            "structured_answer": parsed_answer,
            "images": [],
            "raw_context": context
        }
