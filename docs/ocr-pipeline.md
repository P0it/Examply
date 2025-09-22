# OCR Pipeline Documentation

## Overview

The OCR pipeline is responsible for extracting structured problem data from PDF files. It handles both text-based PDFs and scanned documents, using a fallback strategy to ensure maximum reliability.

## Pipeline Architecture

```
PDF Input → Detection → Processing → Parsing → Validation → Database
    │           │           │           │          │
    ▼           ▼           ▼           ▼          ▼
[File]  [Text/Scan]  [Extract/OCR]  [Structure]  [Review]
```

## Processing Flow

### 1. Input Validation
- **File Type Check**: Verify PDF format
- **Size Limits**: Maximum 50MB file size
- **Security Scan**: Basic malware detection

### 2. Text Detection Strategy

The pipeline automatically determines the best processing method:

#### Text-based PDF Detection
- Extract text directly using PyMuPDF
- Calculate text density ratio
- Minimum threshold: 10% meaningful text content
- Minimum character count: 100 characters

```python
def is_text_based_pdf(text_content: List[str]) -> bool:
    total_chars = sum(len(page) for page in text_content)
    non_whitespace_chars = sum(len(page.strip()) for page in text_content)
    text_ratio = non_whitespace_chars / total_chars if total_chars > 0 else 0

    return text_ratio > 0.1 and total_chars > 100
```

#### Scan-based PDF Fallback
- Convert PDF to images at 300 DPI
- Apply OCR using Tesseract with PaddleOCR fallback
- Support Korean + English text recognition
- Image preprocessing for better accuracy

### 3. OCR Processing

#### Primary Engine: Tesseract
- **Languages**: `kor+eng` (Korean + English)
- **Configuration**: Optimized for Korean text
- **Output**: Text with confidence scores
- **Preprocessing**: Image enhancement for better accuracy

#### Fallback Engine: PaddleOCR
- **Activation**: When Tesseract confidence < 70%
- **Advantages**: Better handling of complex layouts
- **Languages**: Korean, English
- **Processing**: Automatic text detection and recognition

```python
async def _process_with_ocr(self, file_path: str) -> Dict[str, Any]:
    images = convert_from_path(file_path, dpi=300)
    pages = []

    for image in images:
        # Primary: Tesseract
        text = pytesseract.image_to_string(image, lang='kor+eng')
        confidence = get_confidence_score(image)

        # Fallback: PaddleOCR if low confidence
        if confidence < 0.7:
            text = paddleocr_process(image)

        pages.append(text)
```

## Problem Parsing Rules

### 1. Problem Detection Patterns

#### Korean Patterns
```regex
문제\s*(\d+)\s*[:.]\s*(.+?)(?=문제\s*\d+|$)
```
Example: "문제 1: 다음 중 올바른 답은?"

#### English Patterns
```regex
Q\s*(\d+)\s*[:.]\s*(.+?)(?=Q\s*\d+|$)
```
Example: "Q1: Which of the following is correct?"

#### Numbered Patterns
```regex
(\d+)\.\s*(.+?)(?=\d+\.|$)
```
Example: "1. What is the capital of Korea?"

### 2. Choice Extraction

#### Korean Circle Numbers
- ①, ②, ③, ④, ⑤
- Automatic extraction with regex patterns
- Text between markers extracted as choice content

#### Western Formats
- 1), 2), 3), 4), 5)
- A), B), C), D), E)
- Support for mixed formats within same document

```python
def _extract_choices(self, text: str) -> List[str]:
    choices = []
    circle_nums = ['①', '②', '③', '④', '⑤']

    for i, marker in enumerate(circle_nums):
        if marker in text:
            start_idx = text.find(marker) + len(marker)
            # Find next choice or end markers
            next_marker_idx = find_next_marker(text, start_idx)
            choice_text = text[start_idx:next_marker_idx].strip()
            choices.append(choice_text)
```

### 3. Answer Extraction

#### Answer Patterns
```regex
정답\s*[:\-]\s*([①②③④⑤1-5A-E])    # Korean: "정답: ①"
답\s*[:\-]\s*([①②③④⑤1-5A-E])      # Korean: "답: ①"
Answer\s*[:\-]\s*([①②③④⑤1-5A-E])  # English: "Answer: A"
```

#### Index Conversion
- ① → 0, ② → 1, ③ → 2, ④ → 3, ⑤ → 4
- 1 → 0, 2 → 1, 3 → 2, 4 → 3, 5 → 4
- A → 0, B → 1, C → 2, D → 3, E → 4

### 4. Explanation Extraction

#### Explanation Patterns
```regex
해설\s*[:\-]\s*(.+?)(?=문제\s*\d+|해설\s*[:\-]|$)   # Korean: "해설: explanation"
풀이\s*[:\-]\s*(.+?)(?=문제\s*\d+|풀이\s*[:\-]|$)   # Korean: "풀이: explanation"
Explanation\s*[:\-]\s*(.+?)                      # English
```

## Error Handling & Recovery

### 1. OCR Failures
- **Low Confidence**: Retry with different OCR engine
- **No Text Detected**: Manual review queue
- **Malformed Output**: Logging and error reporting

### 2. Parsing Failures
- **Missing Patterns**: Attempt alternative regex patterns
- **Incomplete Data**: Flag for manual review
- **Format Mismatch**: Fallback to generic text extraction

### 3. Validation Rules
- **Minimum Question Length**: 10 characters
- **Choice Count**: 2-5 choices for multiple choice
- **Answer Validation**: Must match one of the extracted choices
- **Explanation Length**: Minimum 10 characters if present

## Quality Assurance

### 1. Confidence Scoring
```python
def calculate_confidence(ocr_result: Dict) -> float:
    text_confidence = ocr_result.get('confidence', 0)
    parsing_confidence = len(extracted_problems) / expected_problems
    structure_confidence = validate_problem_structure()

    return (text_confidence + parsing_confidence + structure_confidence) / 3
```

### 2. Manual Review Triggers
- **Low OCR Confidence**: < 70%
- **Missing Critical Data**: No answers or choices
- **Format Anomalies**: Unusual patterns detected
- **High Error Rate**: > 20% parsing failures

### 3. Approval Workflow
```
OCR Processing → Auto-validation → Manual Review Queue → Approval → Publication
                       ↓               ↓                  ↓
                   [Pass/Fail]    [Admin Review]    [Bulk Approve]
```

## Performance Optimization

### 1. Processing Speed
- **Parallel Processing**: Multiple pages processed concurrently
- **Caching**: Processed results cached by file hash
- **Image Optimization**: Preprocessing for OCR efficiency

### 2. Resource Management
- **Memory Usage**: Process large PDFs in chunks
- **Disk Space**: Temporary files cleaned up automatically
- **CPU Throttling**: Limit concurrent OCR operations

### 3. Background Processing
- **Async Jobs**: PDF import runs in background
- **Progress Tracking**: Real-time status updates
- **Queue Management**: FIFO processing with priority options

## Integration Points

### 1. Admin Interface
- **Upload Progress**: Real-time feedback during processing
- **Review Dashboard**: Problems pending approval
- **Error Reports**: Failed imports with diagnostic info

### 2. Database Integration
- **Atomic Operations**: All-or-nothing problem creation
- **Metadata Preservation**: Source file and page tracking
- **Version Control**: Problem revision history

### 3. API Endpoints
- **Job Status**: GET `/admin/import/{job_id}/status`
- **Bulk Operations**: Batch approval and rejection
- **Error Reporting**: Detailed failure analysis

## Monitoring & Debugging

### 1. Logging Strategy
- **Processing Steps**: Each pipeline stage logged
- **Performance Metrics**: Processing time and accuracy
- **Error Details**: Stack traces and context

### 2. Metrics Collection
- **Success Rate**: Percentage of successful imports
- **Processing Time**: Average time per page/problem
- **Quality Scores**: OCR confidence and parsing accuracy

### 3. Debugging Tools
- **Preview Mode**: Visual inspection of parsed problems
- **Raw Text Export**: Original OCR output for analysis
- **Diff Comparison**: Before/after manual edits

## Future Enhancements

### 1. Machine Learning Integration
- **Layout Detection**: AI-powered problem boundary detection
- **Content Classification**: Automatic subject/topic tagging
- **Quality Prediction**: ML-based confidence scoring

### 2. Advanced OCR Features
- **Table Recognition**: Support for tabular problem formats
- **Mathematical Notation**: LaTeX extraction from formulas
- **Diagram Processing**: Image region extraction and description

### 3. Performance Improvements
- **GPU Acceleration**: CUDA-enabled OCR processing
- **Distributed Processing**: Multi-server pipeline scaling
- **Smart Caching**: Intelligent cache invalidation strategies