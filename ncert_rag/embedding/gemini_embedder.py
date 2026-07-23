from typing import List, Optional
from google import genai
from google.genai import types
from config.settings import settings


class GeminiEmbedder:
    """
    gemini-embedding-2 wrapper, truncated to 768 dimensions (see settings.EMBEDDING_DIM
    and db/migrations/20260101000014_gemini_768_embeddings.sql).

    gemini-embedding-2 doesn't support the task_type parameter older Gemini
    embedding models used — instead it reads task intent from a prefix
    baked into the text itself. Asymmetric retrieval (short queries vs long
    documents) needs different prefixes on each side:
      - query:    "task: search result | query: {query}"
      - document: "title: {title} | text: {content}"
    See https://ai.google.dev/gemini-api/docs/embeddings.
    """

    def __init__(self, model_name: str = None):
        self.model_name = model_name or settings.GEMINI_EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIM
        self.client = genai.Client(api_key=settings.GEMINI_API_KEY)

    def embed_query(self, query: str) -> List[float]:
        """Embed a single search query"""
        result = self.client.models.embed_content(
            model=self.model_name,
            contents=f"task: search result | query: {query}",
            config=types.EmbedContentConfig(output_dimensionality=self.dimension),
        )
        return list(result.embeddings[0].values)

    def embed_documents(self, documents: List[str], titles: Optional[List[str]] = None) -> List[List[float]]:
        """
        Embed multiple document chunks. `titles` (e.g. the source chapter/doc
        name) is optional but recommended — Gemini's asymmetric retrieval
        prefix expects one, and omitting it degrades retrieval quality
        slightly rather than failing outright.
        """
        if titles is None:
            titles = [""] * len(documents)
        prefixed = [
            f"title: {title} | text: {text}" if title else f"text: {text}"
            for title, text in zip(titles, documents)
        ]

        result = self.client.models.embed_content(
            model=self.model_name,
            contents=prefixed,
            config=types.EmbedContentConfig(output_dimensionality=self.dimension),
        )
        return [list(e.values) for e in result.embeddings]
