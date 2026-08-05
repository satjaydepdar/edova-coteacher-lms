from pathlib import Path
from typing import List

class PDFUtils:
    """Utility class for PDF operations"""

    @staticmethod
    def get_pdf_files(directory: str) -> List[Path]:
        """Get all PDF files from directory"""
        pdf_dir = Path(directory)
        return sorted(pdf_dir.rglob("*.pdf"))
