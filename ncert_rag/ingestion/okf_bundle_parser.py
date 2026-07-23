import hashlib
from pathlib import Path
from typing import Dict, List, Optional
from urllib.parse import urlparse

import frontmatter

# Google Cloud's Open Knowledge Format spec:
# https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
# A bundle is a directory of markdown files. Two filenames are reserved and
# structured differently (no frontmatter, grouped lists / date-ordered log)
# rather than being concept documents:
RESERVED_FILENAMES = {"index.md", "log.md"}

# Frontmatter fields the spec names explicitly; anything else a producer
# adds is an "extension" the spec says consumers should preserve, not drop.
_KNOWN_FIELDS = {"type", "title", "description", "resource", "tags", "timestamp"}

# Resource paths ending in these extensions can't be read as text — note
# them in metadata rather than trying to parse a PDF/video as markdown.
_BINARY_EXTENSIONS = {".pdf", ".mp4", ".pptx", ".png", ".jpg", ".jpeg", ".svg"}


class OKFBundleParser:
    """
    Parses an Open Knowledge Format bundle — "fetching docs from OKF" means
    getting a bundle onto disk here (git clone, download, etc.); this class
    reads what's already local, it doesn't fetch over the network itself.

    Real bundles (e.g. edova-brain/OKF/) are often a thin pointer layer:
    a concept's own markdown body is a short description, and the
    substantive content lives elsewhere (a sibling `math-Knowledge/`-style
    workspace) via the `resource:` frontmatter field. `resolve_resources`
    controls whether local resource: targets get read in and appended to
    the concept body, or whether only the concept's own thin body is used.
    """

    def parse_bundle(self, bundle_dir: str, resolve_resources: bool = True) -> List[Dict]:
        """
        Walk bundle_dir and parse every non-reserved .md file as a concept
        document. Returns one dict per concept, in the same page-like shape
        the PDF extraction path already produces, so IngestionPipeline can
        treat both sources uniformly.
        """
        bundle_path = Path(bundle_dir)
        if not bundle_path.exists():
            raise FileNotFoundError(f"OKF bundle directory not found: {bundle_dir}")

        concepts = []
        skipped = 0
        for md_file in sorted(bundle_path.rglob("*.md")):
            if md_file.name in RESERVED_FILENAMES:
                continue
            concept = self._parse_concept_file(md_file, bundle_path, resolve_resources)
            if concept is None:
                skipped += 1
                continue
            concepts.append(concept)

        if resolve_resources:
            self._flag_cross_chapter_duplicates(concepts)

        print(f"OKF bundle: {len(concepts)} concept(s) parsed, {skipped} skipped (non-conformant)")
        return concepts

    def _parse_concept_file(self, md_file: Path, bundle_root: Path, resolve_resources: bool) -> Optional[Dict]:
        try:
            post = frontmatter.load(md_file)
        except Exception as e:
            print(f"  Skipping {md_file}: failed to parse frontmatter ({e})")
            return None

        # Conformance requirement #2: every frontmatter block must include a
        # non-empty `type` field. Not an error per the spec's own tolerance
        # rules, but not a usable concept either — skip, don't fail the batch.
        concept_type = post.metadata.get("type")
        if not concept_type:
            print(f"  Skipping {md_file}: missing required 'type' frontmatter field")
            return None

        # Concept ID per the spec's parsing guidance: file path without
        # extension, relative to the bundle root — e.g. tables/orders.md -> tables/orders.
        concept_id = str(md_file.relative_to(bundle_root).with_suffix("")).replace("\\", "/")

        own_body = post.content.strip()
        resource = post.metadata.get("resource")
        resolved_content = None
        resolved_from = None

        if resolve_resources and resource:
            resolved_content, resolved_from = self._resolve_resource(resource, md_file)

        content = own_body
        if resolved_content:
            content = f"{own_body}\n\n---\n\n{resolved_content}".strip() if own_body else resolved_content

        if not content:
            print(f"  Skipping {md_file}: empty body and no resolvable resource content")
            return None

        return {
            "page_number": None,          # concepts aren't paginated
            "document": concept_id,       # -> source_ref in knowledge_chunks
            "content": content,
            "status": "success",
            "okf_type": concept_type,
            "okf_title": post.metadata.get("title", md_file.stem),
            "okf_description": post.metadata.get("description"),
            "okf_resource": resource,
            "okf_resource_resolved_from": resolved_from,  # list of file paths actually read, or None
            "okf_tags": post.metadata.get("tags", []),
            "okf_timestamp": post.metadata.get("timestamp"),
            "okf_chapter": post.metadata.get("chapter"),  # not a spec field, but this bundle uses it consistently
            # Extension fields the spec says to preserve even though we
            # don't know what they mean.
            "okf_extra": {k: v for k, v in post.metadata.items() if k not in _KNOWN_FIELDS and k != "chapter"},
        }

    @staticmethod
    def _resolve_with_fallback(base_dir: Path, resource: str, max_extra_levels: int = 4) -> Optional[Path]:
        """
        Try resolving `resource` relative to base_dir as authored; if that
        doesn't exist, retry with 1..max_extra_levels additional leading
        ../ segments prepended, returning the first path that exists.
        """
        candidate = (base_dir / resource).resolve()
        if candidate.exists():
            return candidate

        for extra in range(1, max_extra_levels + 1):
            padded = "../" * extra + resource
            candidate = (base_dir / padded).resolve()
            if candidate.exists():
                return candidate

        return None

    def _resolve_resource(self, resource: str, concept_file: Path) -> tuple[Optional[str], Optional[List[str]]]:
        """
        Follow a concept's `resource:` field to its actual content, if it's
        a local file or directory. Returns (content, [file paths read]) or
        (None, None) if the resource is an external URL, a binary asset, or
        can't be found.
        """
        parsed = urlparse(resource)
        if parsed.scheme in ("http", "https"):
            return None, None  # external reference — the concept's own body is the content

        # Relative to the concept file's own directory, matching standard
        # markdown link resolution (the spec's "Relative" link form) — this
        # bundle's resource: paths use ../../../ traversals that
        # deliberately escape the OKF bundle root into a sibling workspace.
        #
        # edova-brain/OKF/'s resource: paths are consistently off by one
        # ../ level (verified: e.g. chapters/linear-equations/algebraic-methods.md's
        # resource needs 4 levels up to reach the real math-Knowledge/ sibling,
        # but is authored with only 3) — a bug in the source bundle, not in
        # this resolution logic. Rather than hardcode that one-level fix
        # (fragile — the videos/ subfolder sits one level deeper again, so a
        # fixed offset wouldn't work uniformly), try the path as authored
        # first, then try prepending extra ../ segments until something
        # actually exists on disk. Spec-correct bundles resolve on the first
        # try; this one needed the fallback.
        target = self._resolve_with_fallback(concept_file.parent, resource)

        if target is None:
            print(f"  Note: resource not found for {concept_file.name}: {resource}")
            return None, None

        if target.is_file():
            if target.suffix.lower() in _BINARY_EXTENSIONS:
                print(f"  Note: resource is binary, not resolved: {target.name}")
                return None, None
            if target.suffix.lower() != ".md":
                return None, None
            text = self._read_stripped_markdown(target)
            return (text, [str(target)]) if text else (None, None)

        if target.is_dir():
            md_files = sorted(target.rglob("*.md"))
            sections = []
            read_paths = []
            for f in md_files:
                text = self._read_stripped_markdown(f)
                if text:
                    sections.append(f"## {f.stem}\n\n{text}")
                    read_paths.append(str(f))
            if not sections:
                return None, None
            return "\n\n".join(sections), read_paths

        return None, None

    @staticmethod
    def _read_stripped_markdown(path: Path) -> Optional[str]:
        """
        Read a raw markdown file from the linked (non-OKF) workspace. These
        files often carry their own frontmatter using an inconsistent,
        free-text `type` taxonomy — not validated here, just stripped, since
        this content is being pulled in as a resource body, not registered
        as its own bundle concept.
        """
        try:
            post = frontmatter.load(path)
            text = post.content.strip()
            return text if text else None
        except Exception as e:
            print(f"  Note: failed to read resource file {path}: {e}")
            return None

    def resolve_concept_media(self, concept_id: str, bundle_dir: str) -> Dict:
        """
        Given a concept id (e.g. "chapters/quadratic-equations/videos/quadratic-polynomial")
        and the bundle it lives in, resolve that concept's `resource:` field
        to something servable — a local file path, or an external URL.

        Returns {"kind": "file", "path": Path} or {"kind": "url", "url": str}.
        Raises FileNotFoundError (no such concept, or resource can't be
        resolved) or ValueError (malformed concept_id, or the resolved path
        would escape the trusted content root — path-traversal defense; a
        concept_id or resource: field is untrusted input the moment it comes
        from an HTTP request, even though it's trusted when read from the
        bundle itself during ingestion).
        """
        if ".." in Path(concept_id).parts:
            raise ValueError(f"invalid concept_id: {concept_id}")

        bundle_path = Path(bundle_dir).resolve()
        md_file = bundle_path / f"{concept_id}.md"
        if not md_file.is_file():
            raise FileNotFoundError(f"no such concept: {concept_id}")

        post = frontmatter.load(md_file)
        resource = post.metadata.get("resource")
        if not resource:
            raise FileNotFoundError(f"concept {concept_id} has no resource: field")

        parsed = urlparse(resource)
        if parsed.scheme in ("http", "https"):
            return {"kind": "url", "url": resource}

        target = self._resolve_with_fallback(md_file.parent, resource)
        if target is None or not target.is_file():
            raise FileNotFoundError(f"resource not found for concept {concept_id}: {resource}")

        # Trust boundary: resource: paths in this bundle deliberately escape
        # the OKF bundle root to reach a sibling content workspace (see
        # _resolve_resource's docstring) — but only as far as that known
        # workspace root, never further. Two levels above the bundle dir
        # covers edova-brain/OKF/math-Knowledge -> edova-brain/, which is
        # where both OKF/ and math-Knowledge/ actually live.
        safe_root = bundle_path.parents[1] if len(bundle_path.parents) > 1 else bundle_path
        if safe_root not in target.parents and target != safe_root:
            raise ValueError(f"resolved path for {concept_id} escapes the trusted content root: {target}")

        return {"kind": "file", "path": target}

    @staticmethod
    def _flag_cross_chapter_duplicates(concepts: List[Dict]) -> None:
        """
        The exact bug class found in edova-brain/math-Knowledge/: identical
        stub content copy-pasted across unrelated chapters (three chapters'
        activities/art-integration.md files were byte-identical, containing
        a fourth chapter's content). Detects it generically via content
        hash rather than hardcoding the specific known-bad files, so it
        catches the same bug class anywhere else it might exist.
        """
        by_hash: Dict[str, List[Dict]] = {}
        for c in concepts:
            h = hashlib.sha256(c["content"].encode("utf-8")).hexdigest()
            by_hash.setdefault(h, []).append(c)

        for h, group in by_hash.items():
            chapters = {c.get("okf_chapter") for c in group if c.get("okf_chapter")}
            if len(group) > 1 and len(chapters) > 1:
                ids = [c["document"] for c in group]
                print(f"  WARNING: identical content found across different chapters — likely a copy-paste "
                      f"bug, not real duplication: {ids} (chapters: {sorted(chapters)})")
                for c in group:
                    c["okf_extra"]["possible_duplicate_bug"] = True
