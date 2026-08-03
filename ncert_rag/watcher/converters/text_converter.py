from pathlib import Path

import frontmatter

from watcher.converters.base import ConversionResult


def convert(path: Path) -> ConversionResult:
    """
    .txt/.md are already close to OKF's native shape. If the file already
    carries valid OKF frontmatter (a real `type:` field), it's arguably
    already a concept — this still returns a ConversionResult so the
    pipeline can decide (Phase 3) whether to treat it as pass-through-as-is
    rather than re-metadata-generate it.
    """
    if path.suffix.lower() == ".md":
        post = frontmatter.load(path)
        if post.metadata.get("type"):
            return ConversionResult(
                text_content=post.content.strip(),
                suggested_okf_type=post.metadata["type"],
                extra_frontmatter={k: v for k, v in post.metadata.items()
                                    if k not in ("type", "title", "description", "resource", "tags", "timestamp")},
            )
        text = post.content.strip()
    else:
        text = path.read_text(encoding="utf-8", errors="replace").strip()

    return ConversionResult(text_content=text, suggested_okf_type="Module")

from watcher.converters.base import ConverterSpec, register

register(ConverterSpec(extension_kinds=((".txt", "text"), (".md", "text")), convert=convert))
