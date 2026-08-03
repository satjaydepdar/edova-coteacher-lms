import json
import shutil
import subprocess
from pathlib import Path

from watcher.converters.base import ConversionResult


def convert(path: Path) -> ConversionResult:
    """
    No transcription — that's a separate, bigger decision (needs a
    speech-to-text call) not taken here. What this does: pull real
    duration via ffprobe rather than leave an unfilled "00:00:00"
    placeholder (the exact bug the real bundle already had one instance
    of, per the edova-brain survey).
    """
    duration = _get_duration(path)
    text_content = f"Video file: {path.name}" + (f" ({duration})" if duration else "")
    return ConversionResult(
        text_content=text_content,
        suggested_okf_type="Video",
        extra_frontmatter={"duration": duration} if duration else {},
    )


def _get_duration(path: Path) -> str:
    """Returns HH:MM:SS, or "" if ffprobe isn't available / fails — never
    a fabricated placeholder value."""
    ffprobe = shutil.which("ffprobe")
    if not ffprobe:
        print(f"[video_converter] ffprobe not found on PATH — duration will be left blank for {path.name}")
        return ""
    try:
        result = subprocess.run(
            [ffprobe, "-v", "error", "-show_entries", "format=duration",
             "-of", "json", str(path)],
            capture_output=True, text=True, timeout=30, check=True,
        )
        seconds = float(json.loads(result.stdout)["format"]["duration"])
        h, rem = divmod(int(seconds), 3600)
        m, s = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"
    except Exception as e:
        print(f"[video_converter] ffprobe failed for {path.name}: {e}")
        return ""

from watcher.converters.base import ConverterSpec, register

register(ConverterSpec(extension_kinds=((".mp4", "video"), (".mov", "video")), convert=convert))
