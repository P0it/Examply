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

    def parse_problems(self, text: str, filename: str = "", progress_callback=None) -> List[ParsedProblem]:
        """Parse problems from text using the best adapter."""
        if not text.strip():
            return []

        adapter = self.select_best_adapter(text)
        if not adapter:
            print(f"No suitable adapter found for {filename}")
            return []

        print(f"Using adapter: {adapter.get('name', 'unknown')} for {filename}")

        # Clean text first
        cleaned_text = self._clean_text(text, adapter)

        # Split into problem blocks
        problem_blocks = self._split_into_problems(cleaned_text, adapter)
        total_blocks = len(problem_blocks)

        print(f"Found {total_blocks} potential problem blocks in {filename}")

        # Parse each problem block
        problems = []
        failed_blocks = []

        for i, block in enumerate(problem_blocks):
            # Report progress
            if progress_callback:
                progress_callback(i + 1, total_blocks, f"분석 중 {i + 1}/{total_blocks}")

            try:
                problem = self._parse_problem_block(block, adapter, i + 1)
                if problem:
                    problems.append(problem)
                else:
                    failed_blocks.append((i + 1, "No problem extracted"))
            except Exception as e:
                print(f"Failed to parse problem block {i + 1}: {e}")
                failed_blocks.append((i + 1, str(e)))
                # Log first 200 chars of failed block for debugging
                print(f"Failed block preview: {block[:200]}...")

        print(f"Successfully parsed {len(problems)} problems out of {total_blocks} blocks")
        if failed_blocks:
            print(f"Failed blocks: {failed_blocks[:10]}...")  # Show first 10 failures

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

        # Find all question starts with their positions and patterns
        problem_starts = []
        for pattern in question_patterns:
            for match in re.finditer(pattern, text, re.MULTILINE):
                problem_starts.append({
                    'position': match.start(),
                    'match': match,
                    'pattern': pattern
                })

        if not problem_starts:
            return [text]

        # Sort by position
        problem_starts.sort(key=lambda x: x['position'])

        # Remove duplicates (same position with different patterns)
        unique_starts = []
        for start in problem_starts:
            if not unique_starts or start['position'] != unique_starts[-1]['position']:
                unique_starts.append(start)

        # Split into blocks
        blocks = []
        for i, start in enumerate(unique_starts):
            start_pos = start['position']
            end_pos = unique_starts[i + 1]['position'] if i + 1 < len(unique_starts) else len(text)

            block = text[start_pos:end_pos].strip()
            # Reduced minimum block size to capture shorter problems
            if block and len(block) > 10:
                blocks.append(block)

        print(f"DEBUG: Found {len(blocks)} problem blocks from text of length {len(text)}")
        for i, block in enumerate(blocks[:3]):  # Show first 3 blocks for debugging
            print(f"Block {i+1} preview: {block[:100]}...")

        return blocks

    def _parse_problem_block(self, block: str, adapter: Dict[str, Any], problem_number: int) -> Optional[ParsedProblem]:
        """Parse a single problem block."""
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        if not lines:
            return None

        # Find choices first to properly separate question from choices
        choices, choice_lines = self._extract_choices(block, adapter)

        # More lenient choice validation - allow problems with at least 2 choices
        min_choices = adapter.get('hints', {}).get('min_choices', 2)
        if len(choices) < min_choices:
            # Try alternative extraction if initial failed
            choices = self._extract_choices_alternative(block, adapter)
            if len(choices) < min_choices:
                print(f"Problem {problem_number}: Not enough choices found ({len(choices)})")
                return None

        # Extract answer
        correct_answer_index = self._extract_answer(block, adapter, choices)

        # Extract explanation
        explanation = self._extract_explanation(block, adapter)

        # Extract subject and difficulty
        subject = self._extract_subject(block, adapter)
        difficulty = self._extract_difficulty(block, adapter)

        # Build question text (everything before first choice marker)
        question_parts = []
        choice_markers = adapter.get('choice_markers', [])

        for line in lines:
            # Stop at first choice marker
            is_choice_line = any(self._line_contains_choice_marker(line, marker_set) for marker_set in choice_markers)
            if is_choice_line:
                break

            # Clean question number pattern from first line
            if line == lines[0]:
                question_patterns = adapter.get('question_patterns', [])
                for pattern in question_patterns:
                    line = re.sub(pattern, '', line).strip()

            # Skip answer and explanation lines in question text
            if self._is_answer_line(line, adapter) or self._is_explanation_line(line, adapter):
                continue

            if line:  # Only add non-empty lines
                question_parts.append(line)

        question_text = '\n'.join(question_parts).strip()

        # More flexible question validation
        min_question_length = adapter.get('hints', {}).get('min_question_length', 5)
        if len(question_text) < min_question_length:
            # Try to salvage by using full block text if too short
            if len(block) > min_question_length:
                question_text = block[:200]  # Use first 200 chars as question
            else:
                return None

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
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        choices = []
        choice_lines = []

        for marker_set in choice_markers:
            found_choices = []
            found_lines = []

            for line in lines:
                line_stripped = line.strip()
                for marker in marker_set:
                    if line_stripped.startswith(marker):
                        choice_text = line_stripped[len(marker):].strip()
                        # Only add if choice text is meaningful (not just a marker)
                        if choice_text and len(choice_text) > 1:
                            found_choices.append(choice_text)
                            found_lines.append(line)
                        break  # Found marker, no need to check other markers for this line

            # Use the marker set that found the most choices (and at least 2)
            if len(found_choices) >= 2 and len(found_choices) > len(choices):
                choices = found_choices
                choice_lines = found_lines

        return choices, choice_lines

    def _extract_choices_alternative(self, block: str, adapter: Dict[str, Any]) -> List[str]:
        """Alternative choice extraction using more flexible patterns."""
        lines = [line.strip() for line in block.split('\n') if line.strip()]
        choices = []

        # Look for numbered patterns like "1)" or "1." at start of lines
        numbered_pattern = r'^(\d+[.)])\s*(.+)'

        for line in lines:
            match = re.match(numbered_pattern, line)
            if match:
                choice_text = match.group(2).strip()
                if choice_text and len(choice_text) > 1:
                    choices.append(choice_text)

        # If numbered didn't work, try to find lines that look like choices
        if len(choices) < 2:
            choices = []
            # Look for lines that are likely choices based on structure
            for line in lines:
                line = line.strip()
                # Skip obviously non-choice lines
                if (len(line) > 5 and len(line) < 200 and  # Reasonable length
                    not re.match(r'^\d+\.', line) and     # Not a question number
                    not any(keyword in line.lower() for keyword in ['정답', '답', '해설', '풀이', '설명']) and
                    not line.endswith('?')):              # Not a question
                    choices.append(line)
                    if len(choices) >= 10:  # Limit to prevent over-extraction
                        break

        return choices[:adapter.get('hints', {}).get('max_choices', 5)]  # Limit choices

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

    def _is_answer_line(self, line: str, adapter: Dict[str, Any]) -> bool:
        """Check if line contains answer information."""
        answer_patterns = adapter.get('answer_patterns', [])
        for pattern in answer_patterns:
            if re.search(pattern, line, re.IGNORECASE):
                return True
        return False

    def _is_explanation_line(self, line: str, adapter: Dict[str, Any]) -> bool:
        """Check if line contains explanation markers."""
        explanation_markers = adapter.get('explanation_markers', [])
        for marker in explanation_markers:
            if marker in line:
                return True
        return False