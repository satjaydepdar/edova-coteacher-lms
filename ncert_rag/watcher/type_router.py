from pathlib import Path
from typing import Optional

from watcher.converters.base import supported_extensions
import watcher.converters  # noqa: F401 — importing the package registers all converter specs

# Extension -> converter kind, BUILT from each converter's self-declared
# ConverterSpec (watcher/converters/*). Deterministic dispatch, no LLM
# involved — there's nothing to "decide" about what a .pdf is.
SUPPORTED_TYPES = supported_extensions()

# Reserved/system filenames and bundle-internal files that should never be
# treated as a new document to convert (e.g. a file the pipeline itself
# just wrote into OKF/, or macOS/Windows noise files).
_IGNORED_NAMES = {"index.md", "log.md", ".DS_Store", "Thumbs.db"}


def detect_type(path: Path) -> Optional[str]:
    """Returns a converter kind ('pdf', 'video', ...) or None if the file
    type isn't supported / should be ignored entirely."""
    if path.name in _IGNORED_NAMES:
        return None
    if "OKF" in path.parts:
        return None  # never re-process files already inside an OKF bundle
    return SUPPORTED_TYPES.get(path.suffix.lower())
