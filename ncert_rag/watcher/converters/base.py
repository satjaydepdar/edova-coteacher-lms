from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, Tuple


@dataclass
class ConversionResult:
    text_content: str                    # extracted/derived text — feeds the metadata generator (Phase 3)
    suggested_okf_type: str              # "Video", "Reference", "Module", "Worksheet", ...
    extra_frontmatter: Dict = field(default_factory=dict)  # type-specific fields, e.g. {"duration": "00:01:40"}


@dataclass
class ConverterSpec:
    """One converter's self-declaration: the (extension, kind) pairs it
    handles and its convert callable. A converter module registers exactly
    one of these at import time — type_router.SUPPORTED_TYPES and the
    pipeline dispatch table are both BUILT from this registry, so a new
    converter is one new module with one spec and zero edits elsewhere."""
    extension_kinds: Tuple[Tuple[str, str], ...]  # (".pdf", "pdf"), ...
    convert: Callable[[Path], ConversionResult]


CONVERTER_SPECS: list[ConverterSpec] = []


def register(spec: ConverterSpec) -> None:
    CONVERTER_SPECS.append(spec)


def converters_by_kind() -> dict[str, Callable[[Path], ConversionResult]]:
    return {kind: spec.convert for spec in CONVERTER_SPECS for _ext, kind in spec.extension_kinds}


def supported_extensions() -> dict[str, str]:
    """extension -> kind, for type_router (first spec to claim an ext wins)."""
    out: dict[str, str] = {}
    for spec in CONVERTER_SPECS:
        for ext, kind in spec.extension_kinds:
            out.setdefault(ext, kind)
    return out
