from storage.pgvector_store import PGVectorStore
from embedding.gemini_embedder import GeminiEmbedder
from openai import OpenAI
from config.settings import settings
from typing import List, Dict


class QueryEngine:
    """
    RAG Query Engine: Embed query -> Retrieve -> Generate answer
    """

    def __init__(self):
        self.store = PGVectorStore()
        self.embedder = GeminiEmbedder()
        self.client = OpenAI(
            api_key=settings.DEEPSEEK_API_KEY,
            base_url=settings.DEEPSEEK_BASE_URL
        )
        self.model = settings.DEEPSEEK_MODEL

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict]:
        """
        Retrieve relevant documents for query
        """
        query_embedding = self.embedder.embed_query(query)
        results = self.store.similarity_search(query_embedding, top_k=top_k)
        return results

    def generate_answer(self, query: str, context: List[Dict]) -> str:
        """
        Generate answer using DeepSeek with retrieved context
        """
        # Build context string
        context_text = "\n\n".join([
            f"[From {doc['doc_id']}, Page {doc['page_number']}, Similarity: {doc['similarity']:.3f}]\n{doc['content']}"
            for doc in context
        ])

        prompt = f"""You are a helpful math tutor assistant. Answer the student's question based on the provided textbook context.

        If the context contains relevant information, use it to provide a detailed, step-by-step answer.
        If the context doesn't contain relevant information, say "I don't have enough information in the textbook to answer this fully."

        Always format mathematical expressions in LaTeX.

        CONTEXT:
        {context_text}

        STUDENT QUESTION: {query}

        Provide a clear, educational answer:"""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert math tutor. Be patient, clear, and use step-by-step explanations."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=2048,
                temperature=0.3
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
        Chat interface with conversation memory
        """
        if history is None:
            history = []

        # Retrieve context for this message
        retrieved = self.retrieve(message, top_k=3)
        context = "\n\n".join([d['content'] for d in retrieved])

        # Build conversation
        messages = [
            {
                "role": "system",
                "content": f"""You are a math tutor. Use the following textbook context to help answer.
                Context: {context}"""
            }
        ]

        # Add history
        for h in history:
            messages.append({"role": "user", "content": h.get("user", "")})
            messages.append({"role": "assistant", "content": h.get("assistant", "")})

        messages.append({"role": "user", "content": message})

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=2048,
            temperature=0.3
        )

        return {
            "response": response.choices[0].message.content,
            "sources": retrieved,
            "chunk_ids": [str(d['id']) for d in retrieved],  # for rag_queries audit logging
        }
