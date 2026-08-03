# Importing the package registers every converter's spec (see base.py).
from watcher.converters import (  # noqa: F401
    document_converter,
    excel_converter,
    image_converter,
    text_converter,
    video_converter,
)
