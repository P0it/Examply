"""
Text extraction from PDF files with OCR support.
"""
import os
import io
from typing import Callable, Optional
import fitz  # PyMuPDF
import pytesseract
from PIL import Image
import logging

logger = logging.getLogger(__name__)

# Configuration
OCR_LANG = os.getenv("OCR_LANG", "kor+eng")
OCR_MODE = os.getenv("OCR_MODE", "auto")  # auto, force, off
WORK_DIR = os.getenv("WORK_DIR", "var/work")


class TextExtractor:
    """Extract text from PDF files with OCR fallback."""

    def __init__(self):
        os.makedirs(WORK_DIR, exist_ok=True)

    async def extract_text(
        self,
        pdf_path: str,
        progress_callback: Optional[Callable[[int, str], None]] = None,
        password: Optional[str] = None
    ) -> str:
        """Extract text from PDF with progress reporting."""

        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")

        try:
            # Try to open PDF
            doc = None
            try:
                doc = fitz.open(pdf_path)
                if doc.needs_pass:
                    if not password:
                        doc.close()
                        raise ValueError("PDF가 암호화되어 있습니다. 비밀번호를 입력해주세요.")
                    auth_result = doc.authenticate(password)
                    if not auth_result:
                        doc.close()
                        raise ValueError("비밀번호가 올바르지 않습니다.")
            except Exception as e:
                if doc:
                    doc.close()
                # Check if it's a password-related error
                error_msg = str(e).lower()
                if any(keyword in error_msg for keyword in ['password', 'encrypted', 'authentication', 'decrypt']):
                    raise ValueError("PDF가 암호화되어 있습니다. 올바른 비밀번호를 입력해주세요.")
                else:
                    raise ValueError(f"PDF 파일을 열 수 없습니다: {str(e)}")

            total_pages = len(doc)

            if progress_callback:
                progress_callback(0, f"PDF 열기 완료: {total_pages} 페이지")

            all_text = []

            for page_num in range(total_pages):
                try:
                    page = doc[page_num]
                    page_progress = int((page_num / total_pages) * 100)

                    if progress_callback:
                        progress_callback(page_progress, f"페이지 {page_num + 1}/{total_pages} 처리 중")

                    # Try text extraction first
                    text = page.get_text()

                    # Determine if OCR is needed
                    needs_ocr = self._needs_ocr(text, page_num + 1)

                    if needs_ocr and OCR_MODE != "off":
                        if progress_callback:
                            progress_callback(page_progress, f"페이지 {page_num + 1} OCR 처리 중")

                        ocr_text = await self._ocr_page(page, page_num + 1)
                        if ocr_text and len(ocr_text.strip()) > len(text.strip()):
                            text = ocr_text
                            logger.info(f"Page {page_num + 1}: OCR text used ({len(ocr_text)} chars)")
                        else:
                            logger.info(f"Page {page_num + 1}: Original text used ({len(text)} chars)")
                    else:
                        logger.info(f"Page {page_num + 1}: Text-based ({len(text)} chars)")

                    if text.strip():
                        all_text.append(f"--- Page {page_num + 1} ---\n{text}\n")

                except Exception as e:
                    logger.error(f"Failed to process page {page_num + 1}: {e}")
                    if progress_callback:
                        progress_callback(page_progress, f"페이지 {page_num + 1} 처리 실패")

            doc.close()

            final_text = "\n".join(all_text)

            if progress_callback:
                progress_callback(100, f"텍스트 추출 완료: {len(final_text)} 문자")

            return final_text

        except Exception as e:
            logger.error(f"Text extraction failed for {pdf_path}: {e}")
            raise

    def _needs_ocr(self, text: str, page_num: int) -> bool:
        """Determine if OCR is needed for this page."""
        if OCR_MODE == "force":
            return True
        elif OCR_MODE == "off":
            return False
        else:  # auto mode
            # If text is very short or mostly whitespace, use OCR
            clean_text = text.strip()
            if len(clean_text) < 50:  # Less than 50 characters
                logger.info(f"Page {page_num}: Low text content ({len(clean_text)} chars), using OCR")
                return True

            # Check for common OCR indicators
            if len(clean_text.split()) < 10:  # Less than 10 words
                logger.info(f"Page {page_num}: Low word count, using OCR")
                return True

            return False

    async def _ocr_page(self, page, page_num: int) -> str:
        """Perform OCR on a PDF page."""
        try:
            # Render page to image at high DPI
            mat = fitz.Matrix(3.0, 3.0)  # 300 DPI (3x scaling)
            pix = page.get_pixmap(matrix=mat)
            img_data = pix.tobytes("png")

            # Convert to PIL Image
            image = Image.open(io.BytesIO(img_data))

            # Perform OCR
            custom_config = r'--oem 3 --psm 6'  # OCR Engine Mode 3, Page Segmentation Mode 6
            text = pytesseract.image_to_string(
                image,
                lang=OCR_LANG,
                config=custom_config
            )

            # Save OCR image for debugging if needed
            if os.getenv("SAVE_OCR_IMAGES", "false").lower() == "true":
                debug_path = os.path.join(WORK_DIR, f"page_{page_num}_ocr.png")
                image.save(debug_path)
                logger.debug(f"Saved OCR image: {debug_path}")

            return text.strip()

        except Exception as e:
            logger.error(f"OCR failed for page {page_num}: {e}")
            return ""

    def cleanup_work_files(self, pattern: str = "*"):
        """Clean up temporary work files."""
        try:
            import glob
            files = glob.glob(os.path.join(WORK_DIR, pattern))
            for file in files:
                try:
                    os.remove(file)
                    logger.debug(f"Removed work file: {file}")
                except Exception as e:
                    logger.warning(f"Failed to remove work file {file}: {e}")
        except Exception as e:
            logger.error(f"Failed to cleanup work files: {e}")