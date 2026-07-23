"""
Watches edova-brain/ for new documents and dispatches them to a callback.
Deterministic — file-type filtering and debounce logic only, no LLM/API
calls happen in this module. What the callback actually does (convert,
write an OKF concept) is Phase 2/3's problem, not this one's.
"""

import time
from pathlib import Path
from typing import Callable, Optional

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from watcher.type_router import detect_type


class _NewDocumentHandler(FileSystemEventHandler):
    def __init__(self, brain_root: Path, on_new_document: Callable[[Path, str], None],
                 settle_seconds: float = 2.0, settle_checks: int = 3):
        self.brain_root = brain_root
        self.on_new_document = on_new_document
        self.settle_seconds = settle_seconds
        self.settle_checks = settle_checks

    def on_created(self, event):
        if event.is_directory:
            return
        self._handle(Path(event.src_path))

    def on_moved(self, event):
        # Covers the common "upload to a .tmp name, then rename" pattern —
        # on_created fires for the .tmp file (wrong extension, ignored by
        # detect_type), the real signal is the rename to its final name.
        if event.is_directory:
            return
        self._handle(Path(event.dest_path))

    def _handle(self, path: Path):
        kind = detect_type(path)
        if kind is None:
            return
        if not self._wait_until_settled(path):
            print(f"[watcher] {path.name} never stabilized (still being written?) — skipping")
            return
        print(f"[watcher] new {kind} document: {path}")
        self.on_new_document(path, kind)

    def _wait_until_settled(self, path: Path) -> bool:
        """
        Large file writes aren't atomic — wait for the file size to stop
        changing across a few checks before treating it as "arrived",
        rather than trying to convert a half-written video.
        """
        last_size = -1
        stable_count = 0
        for _ in range(30):  # ~30 * settle_seconds max wait
            if not path.exists():
                return False
            try:
                size = path.stat().st_size
            except OSError:
                return False
            if size == last_size and size > 0:
                stable_count += 1
                if stable_count >= self.settle_checks:
                    return True
            else:
                stable_count = 0
            last_size = size
            time.sleep(self.settle_seconds)
        return False


def watch(brain_root: str, on_new_document: Callable[[Path, str], None],
          settle_seconds: float = 2.0) -> Observer:
    """
    Starts watching brain_root recursively. Returns the Observer — caller
    is responsible for observer.join() (blocking) or stopping it later
    (observer.stop(); observer.join()).
    """
    root = Path(brain_root).resolve()
    handler = _NewDocumentHandler(root, on_new_document, settle_seconds=settle_seconds)
    observer = Observer()
    observer.schedule(handler, str(root), recursive=True)
    observer.start()
    print(f"[watcher] watching {root} for new documents (pdf, docx, mp4, jpg/png, xlsx, txt/md)")
    return observer
