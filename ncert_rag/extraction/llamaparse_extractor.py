from pathlib import Path
from typing import List, Dict
from llama_parse import LlamaParse
from config.settings import settings


class LlamaParseExtractor:
    """
    Extracts structured content from PDFs using LlamaParse — replaces the
    old PyMuPDF-page-image + vision-LLM extraction step. LlamaParse takes
    the PDF directly and returns structured markdown, so there's no
    separate "render page to image, then ask an LLM to transcribe it" pass
    anymore; math/diagram/table handling is driven by `parsing_instruction`
    instead of a hand-written vision prompt.
    """

    # LlamaParse's default page_separator is "\n---\n". There's a known bug
    # (run-llama/llama_cloud_services#721) where the {page_number} template
    # placeholder isn't substituted correctly in the Python client — so this
    # deliberately does NOT set a custom page_separator with {page_number}
    # in it. Pages are just enumerated 1-based after splitting instead.
    PAGE_SEPARATOR = "\n---\n"

    def __init__(self):
        self.parser = LlamaParse(
            api_key=settings.LLAMA_CLOUD_API,
            result_type="markdown",
            parsing_instruction=(
                "Preserve ALL mathematical equations in LaTeX format: $...$ for inline, "
                "$$...$$ for display. Describe diagrams briefly as [Diagram: description]. "
                "Maintain structure: Examples, Exercises, Solutions, Theorems. Keep "
                "example/solution numbering intact. Use markdown tables for tabular data."
            ),
            verbose=True,
        )

    def process_pdf(self, pdf_path: str, use_vision: bool = True) -> List[Dict]:
        """
        Process entire PDF - extract all pages.

        `use_vision` is kept for interface compatibility with the pipeline's
        existing call sites; LlamaParse doesn't distinguish a vision vs.
        text-only mode the way the old DeepSeek extractor did, so it's
        currently unused here (LlamaParse always parses the actual PDF
        content, images included, server-side).
        """
        doc_name = Path(pdf_path).stem
        print(f"Processing: {doc_name}")

        try:
            documents = self.parser.load_data(pdf_path)
        except Exception as e:
            return [{
                "page_number": 0,
                "document": doc_name,
                "content": "",
                "status": "error",
                "error": str(e),
            }]

        if not documents:
            return [{
                "page_number": 0,
                "document": doc_name,
                "content": "",
                "status": "error",
                "error": "LlamaParse returned no content",
            }]

        full_text = documents[0].text
        pages = full_text.split(self.PAGE_SEPARATOR)

        results = []
        for i, page_content in enumerate(pages, start=1):
            page_content = page_content.strip()
            if not page_content:
                continue
            results.append({
                "page_number": i,
                "document": doc_name,
                "content": page_content,
                "status": "success",
            })
        print(f"  Extracted {len(results)} pages")
        return results

    def process_pdf_batch(self, pdf_paths: List[str], use_vision: bool = True) -> List[Dict]:
        """
        Process multiple PDFs
        """
        all_results = []
        for pdf_path in pdf_paths:
            results = self.process_pdf(pdf_path, use_vision=use_vision)
            all_results.extend(results)
            print(f"  Completed: {len(results)} pages extracted")
        return all_results
