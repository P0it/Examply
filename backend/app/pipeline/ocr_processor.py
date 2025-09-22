"""
OCR processing pipeline for PDF files.
"""
import logging
from typing import Dict, Any, List
from pathlib import Path
import pytesseract
from PIL import Image
import fitz  # PyMuPDF
from pdf2image import convert_from_path

logger = logging.getLogger(__name__)


class OCRProcessor:
    """OCR processor for extracting text from PDF files."""

    def __init__(self):
        self.min_text_ratio = 0.1  # Minimum ratio of text to consider as text-based PDF

    async def process_pdf(self, file_path: str) -> Dict[str, Any]:
        """Process PDF file and extract text using OCR if needed."""
        logger.info(f"Processing PDF: {file_path}")

        try:
            # First, try to extract text directly from PDF
            text_content = self._extract_text_from_pdf(file_path)

            # Determine if PDF is text-based or scan-based
            is_text_based = self._is_text_based_pdf(text_content, file_path)

            if is_text_based:
                logger.info("PDF is text-based, using direct text extraction")
                return {
                    "method": "text_extraction",
                    "pages": text_content,
                    "total_pages": len(text_content),
                    "confidence": 0.95
                }
            else:
                logger.info("PDF appears to be scan-based, using OCR")
                return await self._process_with_ocr(file_path)

        except Exception as e:
            logger.error(f"OCR processing failed: {str(e)}")
            return {
                "method": "failed",
                "error": str(e),
                "pages": [],
                "total_pages": 0,
                "confidence": 0.0
            }

    def _extract_text_from_pdf(self, file_path: str) -> List[str]:
        """Extract text directly from PDF."""
        doc = fitz.open(file_path)
        pages = []

        for page_num in range(doc.page_count):
            page = doc[page_num]
            text = page.get_text()
            pages.append(text)

        doc.close()
        return pages

    def _is_text_based_pdf(self, text_content: List[str], file_path: str) -> bool:
        """Determine if PDF is text-based or requires OCR."""
        total_chars = sum(len(page) for page in text_content)

        if total_chars == 0:
            return False

        # Check for meaningful text content
        non_whitespace_chars = sum(len(page.strip()) for page in text_content)
        text_ratio = non_whitespace_chars / total_chars if total_chars > 0 else 0

        # If we have a decent amount of text, consider it text-based
        return text_ratio > self.min_text_ratio and total_chars > 100

    async def _process_with_ocr(self, file_path: str) -> Dict[str, Any]:
        """Process PDF using OCR."""
        logger.info("Converting PDF to images for OCR")

        # Convert PDF to images
        images = convert_from_path(file_path, dpi=300)
        pages = []
        total_confidence = 0

        for i, image in enumerate(images):
            logger.info(f"Processing page {i + 1}/{len(images)} with OCR")

            # Perform OCR
            try:
                # Get text with confidence scores
                ocr_data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)

                # Extract text
                text = pytesseract.image_to_string(image, lang='kor+eng')

                # Calculate average confidence
                confidences = [int(conf) for conf in ocr_data['conf'] if int(conf) > 0]
                page_confidence = sum(confidences) / len(confidences) if confidences else 0

                pages.append(text)
                total_confidence += page_confidence

            except Exception as e:
                logger.error(f"OCR failed for page {i + 1}: {str(e)}")
                pages.append("")

        avg_confidence = total_confidence / len(images) if images else 0

        return {
            "method": "ocr",
            "pages": pages,
            "total_pages": len(pages),
            "confidence": avg_confidence / 100  # Convert to 0-1 range
        }