"""
QueryEngine exercised with in-memory fakes of the ports (Embedder,
VectorStore, ChatClient) — proves the retrieve -> prompt -> answer flow works
with zero network/DB, and that no-arg construction still wires the production
concretes (the api/app.py and main.py call shape).
"""

import pytest

from config.settings import settings
from embedding.gemini_embedder import GeminiEmbedder
from ports import ChatClient, Embedder, VectorStore
from query.engine import QueryEngine
from storage.pgvector_store import PGVectorStore


class FakeEmbedder:
    def __init__(self):
        self.queries = []

    def embed_query(self, query):
        self.queries.append(query)
        return [0.1, 0.2, 0.3]

    def embed_documents(self, documents, titles=None):
        return [[0.0] * 3 for _ in documents]


class FakeVectorStore:
    def __init__(self, results=None):
        self.results = list(results or [])
        self.searches = []

    def insert_documents(self, documents):
        raise NotImplementedError

    def similarity_search(self, query_embedding, top_k=5, doc_id=None):
        self.searches.append(
            {"embedding": query_embedding, "top_k": top_k, "doc_id": doc_id}
        )
        return self.results[:top_k]

    def get_document_count(self):
        return len(self.results)

    def clear_collection(self, doc_id=None):
        self.results.clear()


class _FakeMessage:
    def __init__(self, content):
        self.content = content


class _FakeChoice:
    def __init__(self, content):
        self.message = _FakeMessage(content)


class _FakeCompletion:
    def __init__(self, content):
        self.choices = [_FakeChoice(content)]


class _FakeCompletions:
    """Mirrors the OpenAI chained call shape engine.py uses."""

    def __init__(self, client):
        self._client = client

    def create(self, *, model, messages, max_tokens, temperature, **_ignored):
        self._client.calls.append(
            {
                "model": model,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            }
        )
        if self._client.error is not None:
            raise self._client.error
        return _FakeCompletion(self._client.content)


class _FakeChat:
    def __init__(self, client):
        self.completions = _FakeCompletions(client)


class FakeChatClient:
    def __init__(self, content="fake answer", error=None):
        self.content = content
        self.error = error
        self.calls = []
        self.chat = _FakeChat(self)


def _retrieved():
    return [
        {
            "id": 11,
            "doc_id": "math-ch1",
            "page_number": 4,
            "content": "Fractions are parts of a whole.",
            "metadata": {"source": "math-ch1"},
            "similarity": 0.91,
        },
        {
            "id": 12,
            "doc_id": "math-ch1",
            "page_number": 5,
            "content": "A proper fraction has numerator < denominator.",
            "metadata": {"source": "math-ch1"},
            "similarity": 0.87,
        },
    ]


def _engine(results=None, client=None):
    embedder = FakeEmbedder()
    store = FakeVectorStore(_retrieved() if results is None else results)
    client = client if client is not None else FakeChatClient()
    engine = QueryEngine(store=store, embedder=embedder, client=client, model="fake-model")
    return engine, embedder, store, client


def test_fakes_satisfy_protocols():
    engine, embedder, store, client = _engine()
    assert isinstance(embedder, Embedder)
    assert isinstance(store, VectorStore)
    assert isinstance(client, ChatClient)


def test_retrieve_embeds_query_then_searches_store():
    engine, embedder, store, _ = _engine()
    results = engine.retrieve("what is a fraction?", top_k=3)

    assert embedder.queries == ["what is a fraction?"]
    assert store.searches == [{"embedding": [0.1, 0.2, 0.3], "top_k": 3, "doc_id": None}]
    assert results == store.results[:3]


def test_query_runs_retrieval_prompt_generation_flow():
    engine, _, store, client = _engine()
    out = engine.query("What is a fraction?", top_k=5)

    assert out["question"] == "What is a fraction?"
    assert out["answer"] == "fake answer"
    assert out["sources"] == [
        {"doc_id": "math-ch1", "page": 4, "similarity": 0.91},
        {"doc_id": "math-ch1", "page": 5, "similarity": 0.87},
    ]
    assert out["chunk_ids"] == ["11", "12"]

    # The chat client saw exactly one call carrying the model, the tutor
    # system prompt, and a user prompt built from the retrieved context.
    assert len(client.calls) == 1
    call = client.calls[0]
    assert call["model"] == "fake-model"
    assert call["max_tokens"] == 2048
    assert call["temperature"] == 0.3
    roles = [m["role"] for m in call["messages"]]
    assert roles == ["system", "user"]
    user_prompt = call["messages"][1]["content"]
    assert "What is a fraction?" in user_prompt
    assert "Fractions are parts of a whole." in user_prompt
    assert "A proper fraction has numerator < denominator." in user_prompt


def test_query_without_retrieval_short_circuits_without_llm_call():
    engine, _, _, client = _engine(results=[])
    out = engine.query("anything")

    assert out == {
        "question": "anything",
        "answer": "No relevant documents found in the database.",
        "sources": [],
    }
    assert client.calls == []


def test_generate_answer_returns_error_string_on_llm_failure():
    client = FakeChatClient(error=RuntimeError("boom"))
    engine, _, _, _ = _engine(client=client)
    answer = engine.generate_answer("q?", _retrieved())
    assert answer == "Error generating answer: boom"


def test_chat_flow_uses_history_and_returns_sources():
    engine, embedder, store, client = _engine()
    history = [{"user": "earlier q", "assistant": "earlier a"}]
    out = engine.chat("follow-up question", history=history)

    assert out["response"] == "fake answer"
    assert out["sources"] == store.results[:3]
    assert out["chunk_ids"] == ["11", "12"]
    assert embedder.queries == ["follow-up question"]
    assert store.searches[0]["top_k"] == 3

    messages = client.calls[0]["messages"]
    roles = [m["role"] for m in messages]
    assert roles == ["system", "user", "assistant", "user"]
    assert messages[1]["content"] == "earlier q"
    assert messages[2]["content"] == "earlier a"
    assert messages[3]["content"] == "follow-up question"
    # Retrieved context is folded into the system message.
    assert "Fractions are parts of a whole." in messages[0]["content"]


def test_no_arg_constructor_wires_production_concretes():
    """The exact call shape api/app.py and main.py use — constructors only,
    no network/DB access happens here."""
    engine = QueryEngine()
    assert isinstance(engine.store, PGVectorStore)
    assert isinstance(engine.embedder, GeminiEmbedder)
    assert engine.model == settings.NEMOTRON_MODEL
