"""
Problem parser for extracting structured problem data from OCR text.
"""
import re
import logging
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)


class ProblemParser:
    """Parser for extracting problems from OCR text."""

    def __init__(self):
        # Korean and English patterns for problem detection
        self.problem_patterns = [
            r'(\d+)\.\s*(.+?)(?=\d+\.|$)',  # Numbered problems: "1. Question text"
            r'문제\s*(\d+)\s*[:.]\s*(.+?)(?=문제\s*\d+|$)',  # Korean: "문제 1: Question text"
            r'Q\s*(\d+)\s*[:.]\s*(.+?)(?=Q\s*\d+|$)',  # Q1: Question text
        ]

        self.choice_patterns = [
            r'①\s*(.+?)(?=②|③|④|⑤|$)',  # Korean circle numbers
            r'②\s*(.+?)(?=③|④|⑤|$)',
            r'③\s*(.+?)(?=④|⑤|$)',
            r'④\s*(.+?)(?=⑤|$)',
            r'⑤\s*(.+?)(?=$)',
            r'[1-5]\)\s*(.+?)(?=[1-5]\)|$)',  # 1) Choice text
            r'[A-E]\)\s*(.+?)(?=[A-E]\)|$)',  # A) Choice text
        ]

        self.answer_patterns = [
            r'정답\s*[:\-]\s*([①②③④⑤1-5A-E])',  # Korean: "정답: ①"
            r'답\s*[:\-]\s*([①②③④⑤1-5A-E])',  # Korean: "답: ①"
            r'Answer\s*[:\-]\s*([①②③④⑤1-5A-E])',  # English: "Answer: A"
        ]

        self.explanation_patterns = [
            r'해설\s*[:\-]\s*(.+?)(?=문제\s*\d+|해설\s*[:\-]|$)',  # Korean: "해설: explanation"
            r'풀이\s*[:\-]\s*(.+?)(?=문제\s*\d+|풀이\s*[:\-]|$)',  # Korean: "풀이: explanation"
            r'Explanation\s*[:\-]\s*(.+?)(?=Question\s*\d+|Explanation\s*[:\-]|$)',  # English
        ]

    async def parse_problems(self, ocr_result: Dict[str, Any], source_file: str) -> List[Dict[str, Any]]:
        """Parse problems from OCR result."""
        if ocr_result["method"] == "failed":
            logger.error(f"Cannot parse problems from failed OCR result")
            return []

        pages = ocr_result["pages"]
        all_problems = []

        for page_num, page_text in enumerate(pages):
            if not page_text.strip():
                continue

            logger.info(f"Parsing problems from page {page_num + 1}")
            page_problems = self._parse_page(page_text, page_num + 1, source_file)
            all_problems.extend(page_problems)

        logger.info(f"Parsed {len(all_problems)} problems from {source_file}")
        return all_problems

    def _parse_page(self, page_text: str, page_number: int, source_file: str) -> List[Dict[str, Any]]:
        """Parse problems from a single page."""
        problems = []

        # Try different problem patterns
        for pattern in self.problem_patterns:
            matches = re.finditer(pattern, page_text, re.DOTALL | re.MULTILINE)

            for match in matches:
                problem_num = match.group(1)
                problem_text = match.group(2).strip()

                if len(problem_text) < 10:  # Skip very short matches
                    continue

                try:
                    problem_data = self._parse_single_problem(
                        problem_text, problem_num, page_number, source_file
                    )
                    if problem_data:
                        problems.append(problem_data)
                except Exception as e:
                    logger.warning(f"Failed to parse problem {problem_num} on page {page_number}: {str(e)}")

        return problems

    def _parse_single_problem(
        self,
        problem_text: str,
        problem_num: str,
        page_number: int,
        source_file: str
    ) -> Optional[Dict[str, Any]]:
        """Parse a single problem from text."""

        # Extract question text (everything before choices)
        question_text = self._extract_question_text(problem_text)

        # Extract choices
        choices = self._extract_choices(problem_text)

        # Extract answer
        correct_answer_index = self._extract_answer(problem_text, len(choices))

        # Extract explanation
        explanation = self._extract_explanation(problem_text)

        # Determine problem type
        if choices:
            problem_type = "multiple_choice"
        else:
            problem_type = "short_answer"

        # Build problem data
        problem_data = {
            "question_text": question_text,
            "problem_type": problem_type,
            "source_file": source_file,
            "page_number": page_number,
            "is_approved": False,  # Requires manual review
            "subject": self._detect_subject(question_text),
            "difficulty": self._detect_difficulty(question_text),
        }

        if choices:
            problem_data["choices"] = [
                {"choice_index": i, "text": choice}
                for i, choice in enumerate(choices)
            ]
            problem_data["correct_answer_index"] = correct_answer_index

        if explanation:
            problem_data["explanation"] = explanation

        return problem_data

    def _extract_question_text(self, text: str) -> str:
        """Extract the main question text."""
        # Remove common prefixes and clean up
        question = re.sub(r'^(문제\s*\d+\s*[:.]\s*|Q\s*\d+\s*[:.]\s*|\d+\.\s*)', '', text)

        # Stop at first choice marker
        for pattern in ['①', '1)', 'A)', '정답', '해설', '풀이']:
            if pattern in question:
                question = question.split(pattern)[0]
                break

        return question.strip()

    def _extract_choices(self, text: str) -> List[str]:
        """Extract multiple choice options."""
        choices = []

        # Korean circle numbers
        circle_nums = ['①', '②', '③', '④', '⑤']
        for i, marker in enumerate(circle_nums):
            if marker in text:
                # Find text between this marker and the next
                start_idx = text.find(marker) + len(marker)
                next_marker_idx = len(text)

                # Find next choice marker
                for next_marker in circle_nums[i+1:] + ['정답', '해설', '풀이']:
                    idx = text.find(next_marker, start_idx)
                    if idx != -1:
                        next_marker_idx = min(next_marker_idx, idx)

                choice_text = text[start_idx:next_marker_idx].strip()
                if choice_text:
                    choices.append(choice_text)

        # If no circle numbers, try numbered choices
        if not choices:
            for i in range(1, 6):
                pattern = f'{i})'
                if pattern in text:
                    start_idx = text.find(pattern) + len(pattern)
                    next_pattern_idx = len(text)

                    for j in range(i+1, 6):
                        next_pattern = f'{j})'
                        idx = text.find(next_pattern, start_idx)
                        if idx != -1:
                            next_pattern_idx = min(next_pattern_idx, idx)

                    choice_text = text[start_idx:next_pattern_idx].strip()
                    if choice_text:
                        choices.append(choice_text)

        return choices

    def _extract_answer(self, text: str, num_choices: int) -> Optional[int]:
        """Extract the correct answer index."""
        for pattern in self.answer_patterns:
            match = re.search(pattern, text)
            if match:
                answer = match.group(1)

                # Convert to index
                if answer in ['①', '1', 'A']:
                    return 0
                elif answer in ['②', '2', 'B']:
                    return 1
                elif answer in ['③', '3', 'C']:
                    return 2
                elif answer in ['④', '4', 'D']:
                    return 3
                elif answer in ['⑤', '5', 'E']:
                    return 4

        return None

    def _extract_explanation(self, text: str) -> Optional[str]:
        """Extract explanation text."""
        for pattern in self.explanation_patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                explanation = match.group(1).strip()
                if len(explanation) > 10:  # Only return substantial explanations
                    return explanation

        return None

    def _detect_subject(self, question_text: str) -> Optional[str]:
        """Detect subject from question text (basic heuristics)."""
        # Simple keyword-based detection
        if any(word in question_text for word in ['수학', '계산', '방정식', '함수']):
            return "수학"
        elif any(word in question_text for word in ['과학', '물리', '화학', '생물']):
            return "과학"
        elif any(word in question_text for word in ['영어', 'English', 'grammar']):
            return "영어"
        elif any(word in question_text for word in ['국어', '문학', '어법']):
            return "국어"

        return None

    def _detect_difficulty(self, question_text: str) -> Optional[str]:
        """Detect difficulty from question text (basic heuristics)."""
        # Very basic difficulty detection
        if len(question_text) > 200:
            return "hard"
        elif len(question_text) > 100:
            return "medium"
        else:
            return "easy"