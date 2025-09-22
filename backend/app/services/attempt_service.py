"""
Attempt management service.
"""
from typing import Optional
from sqlmodel import Session
from datetime import datetime

from app.models.attempt import Attempt
from app.models.problem import Problem
from app.models.session import SessionProblem


class AttemptService:
    """Service for managing problem attempts."""

    def __init__(self, db_session: Session):
        self.db = db_session

    async def submit_attempt(
        self,
        problem_id: int,
        session_id: Optional[int] = None,
        answer_index: Optional[int] = None,
        answer_text: Optional[str] = None,
        time_taken_seconds: Optional[int] = None
    ) -> Attempt:
        """Submit answer attempt for a problem."""
        # Get problem
        problem = self.db.get(Problem, problem_id)
        if not problem:
            raise ValueError("Problem not found")

        # Validate answer format
        if problem.problem_type == "multiple_choice" and answer_index is None:
            raise ValueError("Answer index required for multiple choice problems")
        if problem.problem_type == "short_answer" and not answer_text:
            raise ValueError("Answer text required for short answer problems")

        # Check if answer is correct
        is_correct = False
        if problem.problem_type == "multiple_choice":
            is_correct = answer_index == problem.correct_answer_index
        elif problem.problem_type == "short_answer":
            # Simple case-insensitive string comparison for now
            is_correct = answer_text.strip().lower() == problem.correct_answer_text.strip().lower()

        # Create attempt
        attempt = Attempt(
            problem_id=problem_id,
            session_id=session_id,
            answer_index=answer_index,
            answer_text=answer_text,
            is_correct=is_correct,
            time_taken_seconds=time_taken_seconds,
            submitted_at=datetime.utcnow()
        )

        self.db.add(attempt)

        # Update session problem if session_id provided
        if session_id:
            session_problem = self.db.exec(
                "SELECT * FROM sessionproblem WHERE session_id = ? AND problem_id = ?",
                (session_id, problem_id)
            ).first()

            if session_problem:
                session_problem.is_completed = True
                session_problem.completed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(attempt)
        return attempt