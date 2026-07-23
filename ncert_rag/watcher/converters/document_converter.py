from pathlib import Path

from extraction.llamaparse_extractor import LlamaParseExtractor
from watcher.converters.base import ConversionResult

_extractor = None


def convert(path: Path) -> ConversionResult:
    """PDF and DOCX both go through LlamaParse — it handles both formats,
    same as the existing ingestion pipeline's PDF path (extraction/llamaparse_extractor.py)."""
    global _extractor
    if _extractor is None:
        _extractor = LlamaParseExtractor()

    pages = _extractor.process_pdf(str(path))
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
