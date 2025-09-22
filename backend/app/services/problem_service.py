"""
Problem management service.
"""
from typing import Dict, Any, List
from sqlmodel import Session

from app.models.problem import Problem, ProblemChoice
from app.db.database import get_session


class ProblemService:
    """Service for managing problems."""

    def __init__(self):
        pass

    async def create_problem(self, problem_data: Dict[str, Any]) -> Problem:
        """Create new problem from parsed data."""
        with Session(get_session()) as session:
            # Create problem
            problem = Problem(
                question_text=problem_data["question_text"],
                question_image_url=problem_data.get("question_image_url"),
                problem_type=problem_data["problem_type"],
                difficulty=problem_data.get("difficulty"),
                subject=problem_data.get("subject"),
                topic=problem_data.get("topic"),
                tags=problem_data.get("tags", []),
                correct_answer_index=problem_data.get("correct_answer_index"),
                correct_answer_text=problem_data.get("correct_answer_text"),
                explanation=problem_data.get("explanation"),
                explanation_image_url=problem_data.get("explanation_image_url"),
                source_file=problem_data.get("source_file"),
                page_number=problem_data.get("page_number"),
                is_approved=problem_data.get("is_approved", False)
            )

            session.add(problem)
            session.commit()
            session.refresh(problem)

            # Create choices if provided
            if "choices" in problem_data:
                for choice_data in problem_data["choices"]:
                    choice = ProblemChoice(
                        problem_id=problem.id,
                        choice_index=choice_data["choice_index"],
                        text=choice_data["text"]
                    )
                    session.add(choice)

            session.commit()
            return problem