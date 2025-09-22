"""
Adapter-based parser engine for extracting problems from text.
"""
import os
import re
import yaml
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass


@dataclass
class ParsedProblem:
    """Represents a parsed problem."""
    question_text: str
    choices: List[str]
    correct_answer_index: Optional[int]
    explanation: Optional[str]
    page_number: Optional[int]
    difficulty: Optional[str]
    subject: Optional[str]
    raw_text: str


class AdapterEngine:
    """Engine for parsing problems using configurable adapters."""

    def __init__(self, adapters_dir: str = "app/pipeline/adapters"):
        self.adapters_dir = adapters_dir
        self.adapters = self._load_adapters()

    def _load_adapters(self) -> List[Dict[str, Any]]:
        """Load all adapter configurations."""
        adapters = []
        if not os.path.exists(self.adapters_dir):
            return adapters

        for filename in os.listdir(self.adapters_dir):
            if filename.endswith('.yaml') or filename.endswith('.yml'):
                try:
                    with open(os.path.join(self.adapters_dir, filename), 'r', encoding='utf-8') as f:
                        adapter = yaml.safe_load(f)
                        adapter['filename'] = filename
                        adapters.append(adapter)
                except Exception as e:
                    print(f"Failed to load adapter {filename}: {e}")

        # Sort by priority (higher first)
        adapters.sort(key=lambda x: x.get('priority', 0), reverse=True)
        return adapters

    def select_best_adapter(self, text: str) -> Dict[str, Any]:
        """Select the best adapter for the given text."""
        best_adapter = None
        best_score = 0

        for adapter in self.adapters:
            score = self._score_adapter(adapter, text)
            if score > best_score:
                best_score = score
                best_adapter = adapter

        return best_adapter or self.adapters[0] if self.adapters else {}

    def _score_adapter(self, adapter: Dict[str, Any], text: str) -> float:
        """Score how well an adapter matches the text."""
        score = 0
        text_lower = text.lower()

        # Score based on question patterns
        question_patterns = adapter.get('question_patterns', [])
        for pattern in question_patterns:
            matches = re.findall(pattern, text, re.MULTILINE)
            score += len(matches) * 2

        # Score based on choice markers
        choice_markers = adapter.get('choice_markers', [])
        for marker_set in choice_markers:
            for marker in marker_set:
                if marker.lower() in text_lower:
                    score += 1

        # Score based on answer patterns
        answer_patterns = adapter.get('answer_patterns', [])
        for pattern in answer_patterns:
            matches = re.findall(pattern, text, re.MULTILINE)
            score += len(matches) * 3

        # Score based on subject patterns
        subject_patterns = adapter.get('subject_patterns', {})
        for korean_subject in subject_patterns.keys():
            if korean_subject in text_lower:
                score += 0.5

        return score

    def parse_problems(self, text: str, filename: str = "") -> List[ParsedProblem]:
        """Parse problems from text using the best adapter."""
        if not text.strip():
            return []

        adapter = self.select_best_adapter(text)
        if not adapter:
            return []

        # Clean text first
        cleaned_text = self._clean_text(text, adapter)

        # Split into problem blocks
        problem_blocks = self._split_into_problems(cleaned_text, adapter)

        # Parse each problem block
        problems = []
        for i, block in enumerate(problem_blocks):
            try:
                problem = self._parse_problem_block(block, adapter, i + 1)
                if problem:
                    problems.append(problem)
            except Exception as e:
                print(f"Failed to parse problem block {i + 1}: {e}")

        return problems

    def _clean_text(self, text: str, adapter: Dict[str, Any]) -> str:
        """Clean text using adapter rules."""
        lines = text.split('\n')
        cleaned_lines = []

        header_footer_rules = adapter.get('header_footer_rules', [])

        for line in lines:
            # Skip empty lines
            if not line.strip():
                continue

            # Check header/footer rules
            skip_line = False
            for rule in header_footer_rules:
                if re.match(rule, line.strip()):
                    skip_line = True
                    break

            if not skip_line:
                cleaned_lines.append(line)

        return '\n'.join(cleaned_lines)

    def _split_into_problems(self, text: str, adapter: Dict[str, Any]) -> List[str]:
        """Split text into individual problem blocks."""
        question_patterns = adapter.get('question_patterns', [])
        if not question_patterns:
            return [text]

        # Find all question starts
        problem_starts = []
        for pattern in question_patterns:
            for match in re.finditer(pattern, text, re.MULTILINE):
                problem_starts.append(match.start())

        if not problem_starts:
            return [text]

        # Sort by position
        problem_starts.sort()

        # Split into blocks
        blocks = []
        for i, start in enumerate(problem_starts):
            end = problem_starts[i + 1] if i + 1 < len(problem_starts) else len(text)
            block = text[start:end].strip()
            if block:
                blocks.append(block)

        return blocks

    def _parse_problem_block(self, block: str, adapter: Dict[str, Any], problem_number: int) -> Optional[ParsedProblem]:
        """Parse a single problem block."""
        lines = block.split('\n')
        if not lines:
            return None

        # Extract question text (first line after cleaning question number)
        question_line = lines[0]
        question_patterns = adapter.get('question_patterns', [])
        for pattern in question_patterns:
            question_line = re.sub(pattern, '', question_line).strip()

        if len(question_line) < adapter.get('hints', {}).get('min_question_length', 10):
            return None

        # Find choices
        choices, choice_lines = self._extract_choices(block, adapter)
        if len(choices) < adapter.get('hints', {}).get('min_choices', 2):
            return None

        # Extract answer
        correct_answer_index = self._extract_answer(block, adapter, choices)

        # Extract explanation
        explanation = self._extract_explanation(block, adapter)

        # Extract subject and difficulty
        subject = self._extract_subject(block, adapter)
        difficulty = self._extract_difficulty(block, adapter)

        # Build question text (everything before choices)
        question_parts = []
        for line in lines:
            if any(self._line_contains_choice_marker(line, marker_set) for marker_set in adapter.get('choice_markers', [])):
                break
            # Skip the first line if it's just the question number
            if line != lines[0] or question_line:
                question_parts.append(question_line if line == lines[0] else line)

        question_text = '\n'.join(question_parts).strip()

        return ParsedProblem(
            question_text=question_text,
            choices=choices,
            correct_answer_index=correct_answer_index,
            explanation=explanation,
            page_number=None,  # TODO: extract page number
            difficulty=difficulty,
            subject=subject,
            raw_text=block
        )

    def _extract_choices(self, block: str, adapter: Dict[str, Any]) -> Tuple[List[str], List[str]]:
        """Extract choices from the block."""
        choice_markers = adapter.get('choice_markers', [])
        lines = block.split('\n')
        choices = []
        choice_lines = []

        for marker_set in choice_markers:
            found_choices = []
            found_lines = []

            for line in lines:
                for marker in marker_set:
                    if line.strip().startswith(marker):
                        choice_text = line.strip()[len(marker):].strip()
                        if choice_text:
                            found_choices.append(choice_text)
                            found_lines.append(line)

            # Use the marker set that found the most choices
            if len(found_choices) > len(choices):
                choices = found_choices
                choice_lines = found_lines

        return choices, choice_lines

    def _line_contains_choice_marker(self, line: str, marker_set: List[str]) -> bool:
        """Check if line contains any choice marker from the set."""
        line_stripped = line.strip()
        return any(line_stripped.startswith(marker) for marker in marker_set)

    def _extract_answer(self, block: str, adapter: Dict[str, Any], choices: List[str]) -> Optional[int]:
        """Extract the correct answer index."""
        answer_patterns = adapter.get('answer_patterns', [])

        for pattern in answer_patterns:
            match = re.search(pattern, block, re.MULTILINE | re.IGNORECASE)
            if match:
                answer_text = match.group(1).strip()

                # Map answer to choice index
                choice_markers = adapter.get('choice_markers', [])
                for marker_set in choice_markers:
                    if answer_text in marker_set:
                        return marker_set.index(answer_text)

        return None

    def _extract_explanation(self, block: str, adapter: Dict[str, Any]) -> Optional[str]:
        """Extract explanation from the block."""
        explanation_markers = adapter.get('explanation_markers', [])

        for marker in explanation_markers:
            pattern = f'{marker}\\s*([\\s\\S]*?)(?=\\n\\n|$)'
            match = re.search(pattern, block, re.MULTILINE | re.IGNORECASE)
            if match:
                explanation = match.group(1).strip()
                if explanation:
                    return explanation

        return None

    def _extract_subject(self, block: str, adapter: Dict[str, Any]) -> Optional[str]:
        """Extract subject from the block."""
        subject_patterns = adapter.get('subject_patterns', {})
        block_lower = block.lower()

        for korean_subject, english_subject in subject_patterns.items():
            if korean_subject in block_lower:
                return english_subject

        return None

    def _extract_difficulty(self, block: str, adapter: Dict[str, Any]) -> Optional[str]:
        """Extract difficulty from the block."""
        difficulty_patterns = adapter.get('difficulty_patterns', {})

        for pattern, difficulty in difficulty_patterns.items():
            if pattern in block:
                return difficulty

        return None