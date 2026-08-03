import psycopg2
from psycopg2.extras import execute_values
import psycopg2.extras
from typing import List, Dict, Optional
from config.settings import settings


class PGVectorStore:
    """
    PostgreSQL + pgvector storage for embeddings.

    Reads/writes knowledge_chunks in the main Edova database (see
    db/migrations/20260101000013_pgvector_knowledge_and_rag.sql) — not a
    standalone ncert_documents table in its own database anymore. Schema
    (table, extension, HNSW index) is owned by that migration; this class
    intentionally does no DDL on init, so app code can never drift from
    what the migrations describe.
    """

    def __init__(self, connection_string: str = None, pool=None):
        self.conn_string = connection_string or settings.DATABASE_URL
        self.dimension = settings.EMBEDDING_DIM
        # Optional psycopg2-style connection pool (anything exposing
        # getconn/putconn, e.g. psycopg2.pool.ThreadedConnectionPool). When
        # omitted, each call opens and closes its own connection, exactly as
        # before — no behavior change for current callers.
        self._pool = pool

    def _get_connection(self):
        if self._pool is not None:
            return self._pool.getconn()
        return psycopg2.connect(self.conn_string)

    def _release_connection(self, conn):
        if self._pool is not None:
            self._pool.putconn(conn)
        else:
            conn.close()

    def insert_documents(self, documents: List[Dict]):
        """
        Insert chunks with embeddings.

        documents: List of {
            'doc_id': str,          # -> source_ref
            'page_number': int,
            'content': str,
            'embedding': List[float],
            'metadata': dict,
            'source_type': str,     # optional, defaults to 'ncert_textbook'
            'curriculum_unit_id': str | None,  # optional
        }
        """
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                data = [
                    (
                        d.get('source_type', 'ncert_textbook'),
                        d.get('doc_id') or d.get('source_ref'),
                        d.get('curriculum_unit_id'),
                        d.get('page_number', 0),
                        d['content'],
                        d['embedding'],
                        psycopg2.extras.Json(d.get('metadata', {}))
                    )
                    for d in documents
                ]

                execute_values(
                    cur,
                    """
                    INSERT INTO knowledge_chunks
                    (source_type, source_ref, curriculum_unit_id, page_number, content, embedding, metadata)
                    VALUES %s
                    """,
                    data,
                    template=None,
                    page_size=100
                )
                conn.commit()
                print(f"Inserted {len(documents)} chunks")
        finally:
            self._release_connection(conn)

    def similarity_search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        doc_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Search for similar chunks using cosine similarity.
        `doc_id` filters by source_ref, kept as the param name callers
        already use.
        """
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                if doc_id:
                    cur.execute("""
                        SELECT id, source_ref, page_number, content, metadata,
                               1 - (embedding <=> %s::vector) as similarity
                        FROM knowledge_chunks
                        WHERE source_ref = %s
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s;
                    """, (query_embedding, doc_id, query_embedding, top_k))
                else:
                    cur.execute("""
                        SELECT id, source_ref, page_number, content, metadata,
                               1 - (embedding <=> %s::vector) as similarity
                        FROM knowledge_chunks
                        ORDER BY embedding <=> %s::vector
                        LIMIT %s;
                    """, (query_embedding, query_embedding, top_k))

                results = []
                for row in cur.fetchall():
                    results.append({
                        'id': row[0],
                        'doc_id': row[1],        # kept as 'doc_id' — callers (engine.py) already key on this
                        'page_number': row[2],
                        'content': row[3],
                        'metadata': row[4],
                        'similarity': row[5]
                    })
                return results
        finally:
            self._release_connection(conn)

    def get_document_count(self) -> int:
        """Get total chunk count"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM knowledge_chunks")
                return cur.fetchone()[0]
        finally:
            self._release_connection(conn)

    def clear_collection(self, doc_id: Optional[str] = None):
        """Clear chunks — by source_ref if given, otherwise all of them"""
        conn = self._get_connection()
        try:
            with conn.cursor() as cur:
                if doc_id:
                    cur.execute("DELETE FROM knowledge_chunks WHERE source_ref = %s", (doc_id,))
                else:
                    cur.execute("DELETE FROM knowledge_chunks")
                conn.commit()
        finally:
            self._release_connection(conn)
