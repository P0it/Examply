"""
Session models for problem-solving sessions.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship, JSON, Column


class SessionStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class SessionProblem(SQLModel, table=True):
    """Junction table for session problems with additional metadata."""
    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: int = Field(foreign_key="session.id")
    problem_id: int = Field(foreign_key="problem.id")

    # Order and status
    order_index: int = Field(description="Order of problem in session")
    is_completed: bool = Field(default=False)
    is_skipped: bool = Field(default=False)
    is_bookmarked: bool = Field(default=False)

    # Timestamps
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    # Relationships
    session: "Session" = Relationship(back_populates="session_problems")


class Session(SQLModel, table=True):
    """Problem-solving session."""
    id: Optional[int] = Field(default=None, primary_key=True)

    # Session metadata
    name: Optional[str] = Field(default=None, description="Optional session name")
    status: SessionStatus = Field(default=SessionStatus.ACTIVE)

    # Filters applied to create this session
    subject_filter: Optional[str] = Field(default=None)
    topic_filter: Optional[str] = Field(default=None)
    difficulty_filter: Optional[str] = Field(default=None)
    tag_filters: List[str] = Field(default=[], sa_column=Column(JSON))

    # Progress tracking
    current_problem_index: int = Field(default=0, description="Current position in session")
    total_problems: int = Field(description="Total number of problems in session")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    last_accessed_at: Optional[datetime] = Field(default=None)

    # Relationships
    session_problems: List[SessionProblem] = Relationship(back_populates="session")

    def get_progress(self) -> dict:
        """Get session progress information."""
        completed_count = sum(1 for sp in self.session_problems if sp.is_completed)
        skipped_count = sum(1 for sp in self.session_problems if sp.is_skipped)
        bookmarked_count = sum(1 for sp in self.session_problems if sp.is_bookmarked)

        return {
            "current_index": self.current_problem_index,
            "total_problems": self.total_problems,
            "completed_count": completed_count,
            "skipped_count": skipped_count,
            "bookmarked_count": bookmarked_count,
            "progress_percentage": (completed_count / self.total_problems * 100) if self.total_problems > 0 else 0
        }