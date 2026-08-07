#!/usr/bin/env python3
"""
Minimal OKF ingestion CLI for edova-third-brain.

The library (bundle persistence, hashing, text extraction, node I/O) lives in
tools/okf_lib/ — this script is only the command-line wrapper. Its public
names are re-exported so existing importers (ncert_rag/clerk's
`import ingest as okf_ingest`) keep working unchanged.

Usage:
    python tools/ingest.py <subject> <chapter_id> <chapter_name> <doc_type> <file_path>
    python tools/ingest.py remove <doc_id>
"""

import sys
import json
from pathlib import Path

from okf_lib import (  # noqa: F401 — re-exported for backward compatibility
    NODE_EXT,
    OKF_VERSION,
    ROOT,
    TEXT_SUFFIXES,
    extract_text,
    file_hash,
    ingest,
    load_config,
    qualify_chapter_id,
    read_json,
    read_node,
    remove,
    write_json,
    write_node,
)

EXIT_CODES = {"added": 0, "skipped": 0, "removed": 0, "not_found": 1, "error": 2}


def main():
    if len(sys.argv) == 3 and sys.argv[1] == "remove":
        result = remove(sys.argv[2])
    elif len(sys.argv) == 6:
        subject, chapter_id, chapter_name, doc_type, file_path = sys.argv[1:]
        file_path = Path(file_path).resolve()
        if not file_path.is_file():
            result = {"status": "error", "error": f"file not found: {file_path}"}
        else:
            result = ingest(subject, chapter_id, chapter_name, doc_type, file_path)
    else:
        print(__doc__)
        return 1
    print(json.dumps(result, indent=2))
    return EXIT_CODES.get(result.get("status"), 2)


if __name__ == "__main__":
    sys.exit(main())
