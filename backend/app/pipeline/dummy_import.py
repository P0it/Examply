"""
Dummy data generator for testing the import pipeline without actual PDFs.
"""
import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime

from app.services.problem_service import ProblemService

logger = logging.getLogger(__name__)

# Sample problem data for different subjects
DUMMY_PROBLEMS = [
    {
        "question_text": "다음 중 2 + 3의 값은?",
        "problem_type": "multiple_choice",
        "difficulty": "easy",
        "subject": "수학",
        "topic": "기초연산",
        "tags": ["addition", "basic"],
        "choices": [
            {"choice_index": 0, "text": "4"},
            {"choice_index": 1, "text": "5"},
            {"choice_index": 2, "text": "6"},
            {"choice_index": 3, "text": "7"}
        ],
        "correct_answer_index": 1,
        "explanation": "2 + 3 = 5입니다. 기본적인 덧셈 연산입니다.",
        "source_file": "dummy_math.pdf",
        "page_number": 1,
        "is_approved": True
    },
    {
        "question_text": "다음 중 정수가 아닌 것은?",
        "problem_type": "multiple_choice",
        "difficulty": "easy",
        "subject": "수학",
        "topic": "수의 개념",
        "tags": ["numbers", "integers"],
        "choices": [
            {"choice_index": 0, "text": "-3"},
            {"choice_index": 1, "text": "0"},
            {"choice_index": 2, "text": "2.5"},
            {"choice_index": 3, "text": "7"}
        ],
        "correct_answer_index": 2,
        "explanation": "2.5는 소수이므로 정수가 아닙니다. 정수는 ..., -2, -1, 0, 1, 2, ...와 같은 수입니다.",
        "source_file": "dummy_math.pdf",
        "page_number": 1,
        "is_approved": True
    },
    {
        "question_text": "물의 끓는점은 몇 도인가?",
        "problem_type": "multiple_choice",
        "difficulty": "easy",
        "subject": "과학",
        "topic": "물의 성질",
        "tags": ["water", "boiling point", "temperature"],
        "choices": [
            {"choice_index": 0, "text": "90°C"},
            {"choice_index": 1, "text": "100°C"},
            {"choice_index": 2, "text": "110°C"},
            {"choice_index": 3, "text": "120°C"}
        ],
        "correct_answer_index": 1,
        "explanation": "물의 끓는점은 표준 대기압에서 100°C입니다.",
        "source_file": "dummy_science.pdf",
        "page_number": 1,
        "is_approved": True
    },
    {
        "question_text": "다음 중 올바른 영어 문장은?",
        "problem_type": "multiple_choice",
        "difficulty": "medium",
        "subject": "영어",
        "topic": "문법",
        "tags": ["grammar", "sentence structure"],
        "choices": [
            {"choice_index": 0, "text": "I are happy"},
            {"choice_index": 1, "text": "I am happy"},
            {"choice_index": 2, "text": "I is happy"},
            {"choice_index": 3, "text": "I be happy"}
        ],
        "correct_answer_index": 1,
        "explanation": "'I am happy'가 올바른 문법입니다. 1인칭 단수 주어 'I'에는 'am'을 사용합니다.",
        "source_file": "dummy_english.pdf",
        "page_number": 1,
        "is_approved": True
    },
    {
        "question_text": "대한민국의 수도는?",
        "problem_type": "multiple_choice",
        "difficulty": "easy",
        "subject": "사회",
        "topic": "지리",
        "tags": ["geography", "capital", "korea"],
        "choices": [
            {"choice_index": 0, "text": "부산"},
            {"choice_index": 1, "text": "서울"},
            {"choice_index": 2, "text": "대구"},
            {"choice_index": 3, "text": "인천"}
        ],
        "correct_answer_index": 1,
        "explanation": "대한민국의 수도는 서울특별시입니다.",
        "source_file": "dummy_social.pdf",
        "page_number": 1,
        "is_approved": True
    },
    {
        "question_text": "다음 중 3의 배수는?",
        "problem_type": "multiple_choice",
        "difficulty": "medium",
        "subject": "수학",
        "topic": "배수와 약수",
        "tags": ["multiples", "division"],
        "choices": [
            {"choice_index": 0, "text": "13"},
            {"choice_index": 1, "text": "14"},
            {"choice_index": 2, "text": "15"},
            {"choice_index": 3, "text": "16"}
        ],
        "correct_answer_index": 2,
        "explanation": "15는 3 × 5 = 15이므로 3의 배수입니다. 3의 배수 판별법: 각 자릿수의 합이 3의 배수이면 그 수는 3의 배수입니다.",
        "source_file": "dummy_math.pdf",
        "page_number": 2,
        "is_approved": True
    },
    {
        "question_text": "식물이 광합성을 하는 세포 소기관은?",
        "problem_type": "multiple_choice",
        "difficulty": "medium",
        "subject": "과학",
        "topic": "식물의 구조",
        "tags": ["photosynthesis", "organelle", "chloroplast"],
        "choices": [
            {"choice_index": 0, "text": "미토콘드리아"},
            {"choice_index": 1, "text": "엽록체"},
            {"choice_index": 2, "text": "리보솜"},
            {"choice_index": 3, "text": "핵"}
        ],
        "correct_answer_index": 1,
        "explanation": "엽록체는 식물 세포에서 광합성이 일어나는 세포 소기관입니다. 엽록소가 들어있어 빛 에너지를 화학 에너지로 변환합니다.",
        "source_file": "dummy_science.pdf",
        "page_number": 2,
        "is_approved": True
    },
    {
        "question_text": "다음 중 과거형이 올바른 것은?",
        "problem_type": "multiple_choice",
        "difficulty": "medium",
        "subject": "영어",
        "topic": "동사 변화",
        "tags": ["past tense", "irregular verbs"],
        "choices": [
            {"choice_index": 0, "text": "go → goed"},
            {"choice_index": 1, "text": "eat → eated"},
            {"choice_index": 2, "text": "come → came"},
            {"choice_index": 3, "text": "take → taked"}
        ],
        "correct_answer_index": 2,
        "explanation": "'come'의 과거형은 'came'입니다. 불규칙 동사의 과거형은 암기해야 합니다.",
        "source_file": "dummy_english.pdf",
        "page_number": 2,
        "is_approved": True
    },
    {
        "question_text": "조선시대의 첫 번째 왕은?",
        "problem_type": "multiple_choice",
        "difficulty": "medium",
        "subject": "사회",
        "topic": "한국사",
        "tags": ["history", "joseon", "king"],
        "choices": [
            {"choice_index": 0, "text": "이성계"},
            {"choice_index": 1, "text": "이방원"},
            {"choice_index": 2, "text": "이도"},
            {"choice_index": 3, "text": "이향"}
        ],
        "correct_answer_index": 0,
        "explanation": "조선시대의 첫 번째 왕은 태조 이성계입니다. 1392년에 조선을 건국했습니다.",
        "source_file": "dummy_social.pdf",
        "page_number": 2,
        "is_approved": True
    },
    {
        "question_text": "피타고라스 정리에서 직각삼각형의 빗변을 c, 나머지 두 변을 a, b라 할 때 성립하는 식은?",
        "problem_type": "multiple_choice",
        "difficulty": "hard",
        "subject": "수학",
        "topic": "기하",
        "tags": ["pythagorean theorem", "geometry"],
        "choices": [
            {"choice_index": 0, "text": "a + b = c"},
            {"choice_index": 1, "text": "a² + b² = c²"},
            {"choice_index": 2, "text": "a × b = c"},
            {"choice_index": 3, "text": "a² - b² = c²"}
        ],
        "correct_answer_index": 1,
        "explanation": "피타고라스 정리는 a² + b² = c²입니다. 직각삼각형에서 빗변의 제곱은 나머지 두 변의 제곱의 합과 같습니다.",
        "source_file": "dummy_math.pdf",
        "page_number": 3,
        "is_approved": True
    }
]


async def generate_dummy_problems() -> List[Dict[str, Any]]:
    """Generate dummy problems for testing."""
    logger.info("Generating dummy problem data...")

    problem_service = ProblemService()
    created_problems = []

    for i, problem_data in enumerate(DUMMY_PROBLEMS):
        try:
            logger.info(f"Creating problem {i+1}/{len(DUMMY_PROBLEMS)}: {problem_data['question_text'][:50]}...")

            # Create problem
            problem = await problem_service.create_problem(problem_data)
            created_problems.append(problem)

            logger.info(f"✅ Created problem ID {problem.id}")

        except Exception as e:
            logger.error(f"❌ Failed to create problem {i+1}: {str(e)}")

    logger.info(f"✅ Successfully created {len(created_problems)}/{len(DUMMY_PROBLEMS)} dummy problems")
    return created_problems


async def import_pdf_cli(pdf_path: str) -> Dict[str, Any]:
    """CLI function to import a PDF file."""
    logger.info(f"Starting PDF import: {pdf_path}")

    # For now, this is a stub that generates dummy data
    # In a real implementation, this would:
    # 1. Validate the PDF file
    # 2. Process it through OCR pipeline
    # 3. Parse problems using the problem parser
    # 4. Save to database

    logger.warning("PDF import is currently stubbed - generating dummy data instead")

    # Generate some dummy problems as if they came from the PDF
    subset_problems = DUMMY_PROBLEMS[:5]  # Use first 5 problems

    problem_service = ProblemService()
    created_problems = []

    for problem_data in subset_problems:
        # Update source file to match the input PDF
        problem_data_copy = problem_data.copy()
        problem_data_copy["source_file"] = pdf_path
        problem_data_copy["is_approved"] = False  # Require manual approval for imported PDFs

        try:
            problem = await problem_service.create_problem(problem_data_copy)
            created_problems.append(problem)
            logger.info(f"✅ Imported problem: {problem.question_text[:50]}...")
        except Exception as e:
            logger.error(f"❌ Failed to import problem: {str(e)}")

    result = {
        "source_file": pdf_path,
        "total_problems": len(created_problems),
        "status": "completed",
        "imported_at": datetime.utcnow().isoformat()
    }

    logger.info(f"✅ PDF import completed: {result}")
    return result


if __name__ == "__main__":
    # Generate dummy data when run directly
    asyncio.run(generate_dummy_problems())