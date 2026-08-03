import base64
import mimetypes
from pathlib import Path

from google import genai
from google.genai import types

from config.settings import settings
from watcher.converters.base import ConversionResult

# Vision, not DeepSeek: deepseek-chat isn't a vision-capable model — sending
# it an image would silently fail or be ignored. Gemini is already
# configured in this app (for embeddings) and has real multimodal support,
# so image captioning reuses that same client/key rather than assuming
# DeepSeek can do something it can't.
_client = None


def _build_client():
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _get_client():
    """Lazily create and cache the Gemini client (same caching behavior as
    before, now behind a factory tests can monkeypatch or reset)."""
    global _client
    if _client is None:
        _client = _build_client()
    return _client


def convert(path: Path) -> ConversionResult:
    client = _get_client()

    media_type = mimetypes.guess_type(str(path))[0] or "image/png"
    image_bytes = path.read_bytes()

    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=media_type),
            "Describe this image for an educational knowledge base — what does it show, "
            "what subject/concept does it illustrate (e.g. a diagram, a chart, a photo of an "
            "experiment)? Be specific and factual, 2-4 sentences.",
        ],
    )
    caption = response.text.strip()

    return ConversionResult(
        text_content=caption,
        suggested_okf_type="Module",
        extra_frontmatter={},
    )

from watcher.converters.base import ConverterSpec, register

register(ConverterSpec(extension_kinds=((".jpg", "image"), (".jpeg", "image"), (".png", "image")), convert=convert))
