"""
IngestionPipeline exercised with in-memory fakes of the ports (Extractor,
Embedder, VectorStore) — proves the extract -> chunk -> embed -> store flow
works with zero network/DB, and that no-arg construction still wires the
production concretes (the api/app.py and main.py call shape).
"""

from extraction.llamaparse_extractor import LlamaParseExtractor
from embedding.gemini_embedder import GeminiEmbedder
from ingestion.okf_bundle_parser import OKFBundleParser
from ingestion.pipeline import IngestionPipeline
from ports import Embedder, Extractor, VectorStore
from storage.pgvector_store import PGVectorStore
from utils.pdf_utils import PDFUtils


class FakeExtractor:
    def __init__(self, pages):
        self.pages = list(pages)
        self.batch_calls = []

    def process_pdf(self, pdf_path, use_vision=True):
        return [p for p in self.pages]

    def process_pdf_batch(self, pdf_paths, use_vision=True):
        self.batch_calls.append({"pdf_paths": list(pdf_paths), "use_vision": use_vision})
        return list(self.pages)


class FakeEmbedder:
    def __init__(self):
        self.document_calls = []

    def embed_query(self, query):
        return [0.1, 0.2, 0.3]

    def embed_documents(self, documents, titles=None):
        self.document_calls.append({"texts": list(documents), "titles": list(titles or [])})
        return [[float(i), 0.0, 0.0] for i, _ in enumerate(documents)]


class FakeVectorStore:
    def __init__(self):
        self.inserted = []

    def insert_documents(self, documents):
        self.inserted.extend(documents)

    def similarity_search(self, query_embedding, top_k=5, doc_id=None):
        return []

    def get_document_count(self):
        return len(self.inserted)

    def clear_collection(self, doc_id=None):
        self.inserted.clear()


class FakeOKFParser:
    def __init__(self, concepts):
        self.concepts = list(concepts)
        self.calls = []

    def parse_bundle(self, bundle_dir, resolve_resources=None):
        self.calls.append({"bundle_dir": bundle_dir, "resolve_resources": resolve_resources})
        return list(self.concepts)


def _pdf_pipeline(pages):
    extractor = FakeExtractor(pages)
    embedder = FakeEmbedder()
    store = FakeVectorStore()
    pipeline = IngestionPipeline(
        extractor=extractor,
        embedder=embedder,
        okf_parser=FakeOKFParser([]),
        store=store,
    )
    return pipeline, extractor, embedder, store


def test_fakes_satisfy_protocols():
    pipeline, extractor, embedder, store = _pdf_pipeline([])
    assert isinstance(extractor, Extractor)
    assert isinstance(embedder, Embedder)
    assert isinstance(store, VectorStore)


def test_process_and_store_chunks_embeds_then_stores():
    pages = [
        {
            "page_number": 4,
            "document": "math-ch1",
            "content": "a" * 250,  # 5 chunks at chunk_size=100/overlap=50
            "status": "success",
        },
        {
            "page_number": 0,
            "document": "math-ch1",
            "content": "",
            "status": "error",
            "error": "parse failed",
        },
    ]
    pipeline, extractor, embedder, store = _pdf_pipeline(pages)
    results = pipeline.process_and_store(["math-ch1.pdf"], use_vision=False, chunk_size=100)

    # Extraction was delegated with the caller's arguments.
    assert extractor.batch_calls == [
        {"pdf_paths": ["math-ch1.pdf"], "use_vision": False}
    ]

    # Results bookkeeping: 5 chunks stored, 1 page failed.
    assert results["processed"] == 5
    assert results["total_chunks"] == 5
    assert results["failed"] == 1
    assert results["errors"] == ["Page 0: parse failed"]

    # Embedding ran once (5 chunks < batch_size 32) with doc_id titles.
    assert len(embedder.document_calls) == 1
    call = embedder.document_calls[0]
    assert call["texts"] == [c["content"] for c in store.inserted]
    assert call["titles"] == ["math-ch1"] * 5

    # Stored chunks carry the pipeline's document shape plus the embedding.
    for i, chunk in enumerate(store.inserted):
        assert chunk["doc_id"] == "math-ch1"
        assert chunk["source_type"] == "ncert_textbook"
        assert chunk["page_number"] == 4
        assert chunk["chunk_index"] == i
        assert chunk["content"]
        assert chunk["metadata"] == {"source": "math-ch1", "page": 4, "chunk": i}
        assert chunk["embedding"] == [float(i), 0.0, 0.0]


def test_process_okf_bundle_flow():
    concepts = [
        {
            "status": "success",
            "document": "chapters/photosynthesis",
            "content": "Photosynthesis converts light energy into chemical energy.",
            "okf_type": "Module",
            "okf_title": "Photosynthesis",
            "okf_description": "How plants make food",
            "okf_resource": "photosynthesis.md",
            "okf_resource_resolved_from": None,
            "okf_tags": ["biology", "plants"],
            "okf_timestamp": "2026-01-01T00:00:00",
            "okf_chapter": "chapters/photosynthesis",
            "okf_extra": {},
        },
        {
            "status": "error",
            "document": "chapters/broken",
            "content": "",
            "error": "bad frontmatter",
        },
    ]
    extractor = FakeExtractor([])
    embedder = FakeEmbedder()
    store = FakeVectorStore()
    okf_parser = FakeOKFParser(concepts)
    pipeline = IngestionPipeline(
        extractor=extractor,
        embedder=embedder,
        okf_parser=okf_parser,
        store=store,
    )
    results = pipeline.process_okf_bundle(
        bundle_dir="fake-bundle", chunk_size=512, resolve_resources=False
    )

    assert okf_parser.calls == [
        {"bundle_dir": "fake-bundle", "resolve_resources": False}
    ]
    assert results["processed"] == 1
    assert results["total_chunks"] == 1
    assert results["failed"] == 1
    assert results["errors"] == ["chapters/broken: bad frontmatter"]

    (chunk,) = store.inserted
    assert chunk["doc_id"] == "chapters/photosynthesis"
    assert chunk["source_type"] == "okf_library"
    assert chunk["page_number"] is None
    assert chunk["chunk_index"] == 0
    assert chunk["embedding"] == [0.0, 0.0, 0.0]
    assert chunk["metadata"]["okf_type"] == "Module"
    assert chunk["metadata"]["okf_title"] == "Photosynthesis"
    assert chunk["metadata"]["okf_tags"] == ["biology", "plants"]
    assert chunk["metadata"]["source"] == "chapters/photosynthesis"


def test_process_single_pdf_delegates_to_batch_path():
    pages = [
        {
            "page_number": 1,
            "document": "x",
            "content": "short content",
            "status": "success",
        }
    ]
    pipeline, extractor, _, store = _pdf_pipeline(pages)
    results = pipeline.process_single_pdf("x.pdf", use_vision=False)

    assert extractor.batch_calls == [{"pdf_paths": ["x.pdf"], "use_vision": False}]
    assert results["processed"] == 1
    assert len(store.inserted) == 1


def test_chunk_content_boundaries():
    pipeline, _, _, _ = _pdf_pipeline([])

    # Short content is returned untouched as a single chunk.
    assert pipeline.chunk_content("one two three", chunk_size=512) == ["one two three"]

    # No break points in the window -> fixed-size chunks with overlap.
    assert pipeline.chunk_content("a" * 250, chunk_size=100, overlap=50) == [
        "a" * 100,
        "a" * 100,
        "a" * 100,
        "a" * 100,
        "a" * 50,
    ]

    # A period inside the window snaps the chunk boundary to just after it.
    chunks = pipeline.chunk_content("b" * 99 + "." + "c" * 150, chunk_size=100, overlap=50)
    assert chunks[0] == "b" * 99 + "."
    assert all(chunks)


def test_no_arg_constructor_wires_production_concretes():
    """The exact call shape api/app.py and main.py use — constructors only,
    no network/DB access happens here."""
    pipeline = IngestionPipeline()
    assert isinstance(pipeline.extractor, LlamaParseExtractor)
    assert isinstance(pipeline.embedder, GeminiEmbedder)
    assert isinstance(pipeline.okf_parser, OKFBundleParser)
    assert isinstance(pipeline.store, PGVectorStore)
    assert isinstance(pipeline.pdf_utils, PDFUtils)
