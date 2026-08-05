from typing import Dict, List, Optional
from extraction.llamaparse_extractor import LlamaParseExtractor
from embedding.gemini_embedder import GeminiEmbedder
from ingestion.okf_bundle_parser import OKFBundleParser
from ports import Embedder, Extractor, VectorStore
from storage.pgvector_store import PGVectorStore
from utils.pdf_utils import PDFUtils
from config.settings import settings
import json


class IngestionPipeline:
    """
    End-to-end pipeline: PDF/OKF bundle -> Extract -> Embed -> Store

    Collaborators are constructor-injected; every parameter defaults to the
    production concrete, so existing no-arg callers (api/app.py, main.py)
    behave exactly as before.
    """

    def __init__(
        self,
        extractor: Optional[Extractor] = None,
        embedder: Optional[Embedder] = None,
        okf_parser: Optional[OKFBundleParser] = None,
        store: Optional[VectorStore] = None,
        pdf_utils: Optional[PDFUtils] = None,
    ):
        self.extractor = extractor if extractor is not None else LlamaParseExtractor()
        self.embedder = embedder if embedder is not None else GeminiEmbedder()
        self.okf_parser = okf_parser if okf_parser is not None else OKFBundleParser()
        self.store = store if store is not None else PGVectorStore()
        self.pdf_utils = pdf_utils if pdf_utils is not None else PDFUtils()

    @staticmethod
    def _fix_page_breaks(content: str) -> str:
        """Fix broken words from PDF page breaks before chunking."""
        import re
        # Fix hyphenated line breaks: "transpor-\nted" -> "transported"
        content = re.sub(r'(?<=\w)-\n(?=\w)', '', content)
        # Fix bare word breaks across lines (but NOT paragraph breaks):
        # "transpor\nted" -> "transported" (only when lowercase letter follows)
        # But preserve intentional newlines (double \n, bullets, headings, etc.)
        content = re.sub(r'(?<=\w)\n(?=[a-z])', ' ', content)
        # Remove PDF page headers/footers during ingestion too
        content = re.sub(r'^[A-Z][A-Za-z\s\-&]+\d{1,3}\s*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^Reprint\s+\d{4}[\-–]\d{2,4}\s*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^\d+CH\d+\s*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'^CHAPTER\s+\d+\s*$', '', content, flags=re.MULTILINE)
        # Collapse multiple blank lines
        content = re.sub(r'\n{3,}', '\n\n', content)
        return content.strip()

    def chunk_content(self, content: str, chunk_size: int = 1500, overlap: int = 200) -> List[str]:
        """
        Split long content into overlapping chunks using markdown-aware separators.
        Respects headings, paragraphs, and bullet points.
        """
        import re

        # Fix broken words from page breaks first
        content = self._fix_page_breaks(content)

        if len(content) <= chunk_size:
            return [content]

        # Markdown-aware separators in priority order
        separators = [
            "\n# ",      # H1 heading
            "\n## ",     # H2 heading
            "\n### ",    # H3 heading
            "\n\n",      # Paragraph break
            "\n",        # Single line break
            ". ",        # Sentence end
            " ",         # Word boundary
        ]

        chunks = []
        self._recursive_split(content, separators, chunk_size, overlap, chunks)
        return [c.strip() for c in chunks if c.strip()]

    def _recursive_split(self, text: str, separators: List[str], 
                          chunk_size: int, overlap: int, result: List[str]):
        """Recursively split text using the best available separator."""
        if len(text) <= chunk_size:
            result.append(text)
            return

        # Find the best separator that actually exists in the text
        separator = separators[-1]  # fallback: space
        for sep in separators:
            if sep in text:
                separator = sep
                break

        # Split on the chosen separator
        parts = text.split(separator)
        
        current_chunk = ""
        for part in parts:
            candidate = current_chunk + separator + part if current_chunk else part
            if len(candidate) <= chunk_size:
                current_chunk = candidate
            else:
                if current_chunk:
                    result.append(current_chunk)
                    # Keep overlap from the end of current chunk
                    if overlap > 0 and len(current_chunk) > overlap:
                        overlap_text = current_chunk[-overlap:]
                        # Try to start overlap at a word boundary
                        space_idx = overlap_text.find(' ')
                        if space_idx > 0:
                            overlap_text = overlap_text[space_idx + 1:]
                        current_chunk = overlap_text + separator + part
                    else:
                        current_chunk = part
                else:
                    # Single part is bigger than chunk_size, try next separator
                    remaining_seps = separators[separators.index(separator) + 1:]
                    if remaining_seps:
                        self._recursive_split(part, remaining_seps, chunk_size, overlap, result)
                    else:
                        result.append(part)
                    current_chunk = ""
        
        if current_chunk:
            result.append(current_chunk)

    def _embed_and_store(self, all_chunks: List[Dict], results: Dict) -> Dict:
        """Shared tail end of both ingestion paths: embed in batches, store, report."""
        results['total_chunks'] = len(all_chunks)
        print(f"Total chunks created: {len(all_chunks)}")

        print("\n" + "=" * 60)
        print("Generating embeddings")
        print("=" * 60)

        batch_size = 32
        for i in range(0, len(all_chunks), batch_size):
            batch = all_chunks[i:i + batch_size]
            texts = [c['content'] for c in batch]
            titles = [c['doc_id'] for c in batch]

            embeddings = self.embedder.embed_documents(texts, titles=titles)

            for chunk, embedding in zip(batch, embeddings):
                chunk['embedding'] = embedding

            print(f"  Embedded batch {i//batch_size + 1}/{(len(all_chunks)-1)//batch_size + 1}")

        print("\n" + "=" * 60)
        print("Storing in pgvector")
        print("=" * 60)

        self.store.insert_documents(all_chunks)
        results['processed'] = len(all_chunks)

        print(f"\n{'=' * 60}")
        print("PIPELINE COMPLETE")
        print(f"{'=' * 60}")
        print(f"Total chunks in knowledge_chunks: {self.store.get_document_count()}")

        return results

    def process_and_store(
        self,
        pdf_paths: List[str],
        use_vision: bool = True,
        chunk_size: int = 512
    ) -> Dict:
        """
        Full pipeline: Process PDFs (via LlamaParse) and store in pgvector.
        """
        results = {
            "processed": 0,
            "failed": 0,
            "total_chunks": 0,
            "errors": []
        }

        print("=" * 60)
        print("STEP 1: Extracting content from PDFs (LlamaParse)")
        print("=" * 60)

        extracted_pages = self.extractor.process_pdf_batch(pdf_paths, use_vision=use_vision)

        print("\n" + "=" * 60)
        print("STEP 2: Chunking")
        print("=" * 60)

        all_chunks = []
        for page in extracted_pages:
            if page['status'] != 'success':
                results['failed'] += 1
                results['errors'].append(f"Page {page['page_number']}: {page.get('error', 'Unknown')}")
                continue

            chunks = self.chunk_content(page['content'], chunk_size=chunk_size)

            for i, chunk in enumerate(chunks):
                all_chunks.append({
                    'doc_id': page['document'],
                    'source_type': 'ncert_textbook',
                    'page_number': page['page_number'],
                    'chunk_index': i,
                    'content': chunk,
                    'metadata': {
                        'source': page['document'],
                        'page': page['page_number'],
                        'chunk': i
                    }
                })

        return self._embed_and_store(all_chunks, results)

    def process_okf_bundle(self, bundle_dir: str = None, chunk_size: int = 512,
                            resolve_resources: bool = None) -> Dict:
        """
        Full pipeline: parse an Open Knowledge Format bundle from disk and
        store its concepts in pgvector as source_type='okf_library'.

        `resolve_resources` follows a concept's resource: field into a
        sibling content workspace when it's a local path (see
        OKFBundleParser) — defaults to settings.OKF_RESOLVE_RESOURCES.
        """
        bundle_dir = bundle_dir or settings.OKF_BUNDLE_DIR
        resolve_resources = settings.OKF_RESOLVE_RESOURCES if resolve_resources is None else resolve_resources
        results = {
            "processed": 0,
            "failed": 0,
            "total_chunks": 0,
            "errors": []
        }

        print("=" * 60)
        print(f"STEP 1: Parsing OKF bundle at {bundle_dir} (resolve_resources={resolve_resources})")
        print("=" * 60)

        concepts = self.okf_parser.parse_bundle(bundle_dir, resolve_resources=resolve_resources)

        print("\n" + "=" * 60)
        print("STEP 2: Chunking")
        print("=" * 60)

        all_chunks = []
        for concept in concepts:
            if concept['status'] != 'success':
                results['failed'] += 1
                results['errors'].append(f"{concept['document']}: {concept.get('error', 'Unknown')}")
                continue

            chunks = self.chunk_content(concept['content'], chunk_size=chunk_size)

            for i, chunk in enumerate(chunks):
                all_chunks.append({
                    'doc_id': concept['document'],       # concept_id, e.g. "chapters/photosynthesis"
                    'source_type': 'okf_library',
                    'page_number': None,
                    'chunk_index': i,
                    'content': chunk,
                    'metadata': {
                        'source': concept['document'],
                        'chunk': i,
                        'okf_type': concept['okf_type'],
                        'okf_title': concept['okf_title'],
                        'okf_description': concept['okf_description'],
                        'okf_resource': concept['okf_resource'],
                        'okf_resource_resolved_from': concept.get('okf_resource_resolved_from'),
                        'okf_tags': concept['okf_tags'],
                        'okf_timestamp': concept['okf_timestamp'],
                        'okf_chapter': concept.get('okf_chapter'),
                        'okf_extra': concept['okf_extra'],
                    }
                })

        return self._embed_and_store(all_chunks, results)

    def process_single_pdf(self, pdf_path: str, use_vision: bool = True) -> Dict:
        """Process a single PDF"""
        return self.process_and_store([pdf_path], use_vision=use_vision)
