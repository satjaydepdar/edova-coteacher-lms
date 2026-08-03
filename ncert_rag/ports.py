"""
Structural interfaces (typing.Protocol) for the RAG core's external
collaborators.

The production concretes already satisfy these structurally — GeminiEmbedder,
PGVectorStore, the OpenAI client (DeepSeek), and LlamaParseExtractor need no
changes. The protocols exist so QueryEngine / IngestionPipeline can take their
collaborators by constructor injection (defaults remain the production
concretes, so existing no-arg callers are unaffected) and so tests can supply
in-memory fakes with zero network/DB.
"""

from typing import Dict, List, Optional, Protocol, runtime_checkable


@runtime_checkable
class Embedder(Protocol):
    """Embedding provider — GeminiEmbedder today."""

    def embed_query(self, query: str) -> List[float]:
        """Embed a single search query."""
        ...

    def embed_documents(self, documents: List[str], titles: Optional[List[str]] = None) -> List[List[float]]:
        """Embed multiple document chunks, optionally with per-doc titles."""
        ...


@runtime_checkable
class VectorStore(Protocol):
    """Chunk persistence — PGVectorStore today."""

    def insert_documents(self, documents: List[Dict]) -> None:
        """Insert chunks with embeddings (see PGVectorStore for the dict shape)."""
        ...

    def similarity_search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        doc_id: Optional[str] = None,
    ) -> List[Dict]:
        """Cosine-similarity search; rows carry id/doc_id/page_number/content/metadata/similarity."""
        ...

    def get_document_count(self) -> int:
        """Total chunk count."""
        ...

    def clear_collection(self, doc_id: Optional[str] = None) -> None:
        """Clear chunks — by doc_id (source_ref) if given, otherwise all of them."""
        ...


class _ChatMessage(Protocol):
    content: str


class _ChatChoice(Protocol):
    message: _ChatMessage


class _ChatCompletion(Protocol):
    choices: List[_ChatChoice]


class _CompletionsResource(Protocol):
    def create(
        self,
        *,
        model: str,
        messages: List[Dict[str, str]],
        max_tokens: int,
        temperature: float,
    ) -> _ChatCompletion:
        ...


class _ChatResource(Protocol):
    completions: _CompletionsResource


@runtime_checkable
class ChatClient(Protocol):
    """
    Answer generator — an OpenAI-compatible client today (DeepSeek via
    openai.OpenAI). Matches the exact chained call shape engine.py uses:

        client.chat.completions.create(model=..., messages=...,
                                       max_tokens=..., temperature=...)
            .choices[0].message.content
    """

    @property
    def chat(self) -> _ChatResource:
        ...


@runtime_checkable
class Extractor(Protocol):
    """PDF/DOCX content extraction — LlamaParseExtractor today."""

    def process_pdf(self, pdf_path: str, use_vision: bool = True) -> List[Dict]:
        """Extract one PDF into page dicts (page_number/document/content/status[/error])."""
        ...

    def process_pdf_batch(self, pdf_paths: List[str], use_vision: bool = True) -> List[Dict]:
        """Extract several PDFs, concatenating their page dicts."""
        ...
