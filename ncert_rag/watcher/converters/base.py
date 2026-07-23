from dataclasses import dataclass, field
from typing import Dict


@dataclass
class ConversionResult:
    text_content: str                    # extracted/derived text — feeds the metadata generator (Phase 3)
    suggested_okf_type: str              # "Video", "Reference", "Module", "Worksheet", ...
    extra_frontmatter: Dict = field(default_factory=dict)  # type-specific fields, e.g. {"duration": "00:01:40"}
