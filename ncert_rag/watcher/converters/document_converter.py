from pathlib import Path

from extraction.llamaparse_extractor import LlamaParseExtractor
from watcher.converters.base import ConversionResult

_extractor = None


def _build_extractor() -> LlamaParseExtractor:
    return LlamaParseExtractor()


def _get_extractor() -> LlamaParseExtractor:
    """Lazily create and cache the shared LlamaParse extractor (same caching
    behavior as before, now behind a factory tests can monkeypatch or reset)."""
    global _extractor
    if _extractor is None:
        _extractor = _build_extractor()
    return _extractor


def convert(path: Path) -> ConversionResult:
    """PDF and DOCX both go through LlamaParse — it handles both formats,
    same as the existing ingestion pipeline's PDF path (extraction/llamaparse_extractor.py)."""
    pages = _get_extractor().process_pdf(str(path))
    successful = [p for p in pages if p["status"] == "success"]
    if not successful:
        errors = [p.get("error", "unknown") for p in pages if p["status"] != "success"]
        raise RuntimeError(f"LlamaParse extraction failed for {path.name}: {errors}")

    text_content = "\n\n---\n\n".join(p["content"] for p in successful)
    return ConversionResult(
        text_content=text_content,
        suggested_okf_type="Reference",
        extra_frontmatter={"page_count": len(successful)},
    )

from watcher.converters.base import ConverterSpec, register

register(ConverterSpec(extension_kinds=((".pdf", "pdf"), (".docx", "docx"), (".doc", "docx")), convert=convert))
