"""
Attempt models for tracking user answers.
"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class Attempt(SQLModel, table=True):
    """User attempt on a problem."""
    id: Optional[int] = Field(default=None, primary_key=True)

    # Problem and session references
    problem_id: int = Field(foreign_key="problem.id")
    session_id: Optional[int] = Field(default=None, foreign_key="session.id")

    # User answer
    answer_index: Optional[int] = Field(default=None, description="Selected choice index")
    answer_text: Optional[str] = Field(default=None, description="Text answer for short answer problems")

    # Result
    is_correct: bool = Field(description="Whether the answer was correct")
    time_taken_seconds: Optional[int] = Field(default=None, description="Time taken to answer")

    # Timestamps
    submitted_at: datetime = Field(default_factory=datetime.utcnow)

    def get_summary(self) -> dict:
        """Get attempt summary without revealing correct answers."""
        return {
            "id": self.id,
            "problem_id": self.problem_id,
            "is_correct": self.is_correct,
            "time_taken_seconds": self.time_taken_seconds,
            "submitted_at": self.submitted_at.isoformat(),
        }