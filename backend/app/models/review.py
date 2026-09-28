"""
Spaced-repetition card state (FSRS).

One row per (session, problem). The three numbers FSRS actually needs —
stability, difficulty, due — live here; everything else is bookkeeping so a
card can be rebuilt for the scheduler without replaying its whole history.
"""
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import SQLModel, Field


class ReviewCard(SQLModel, table=True):
    """FSRS state for one problem inside one session."""
    id: Optional[int] = Field(default=None, primary_key=True)

    session_id: int = Field(foreign_key="session.id", index=True)
    problem_id: int = Field(foreign_key="problem.id", index=True)

    # FSRS card state
    state: int = Field(default=1, description="1 Learning, 2 Review, 3 Relearning")
    step: Optional[int] = Field(default=0, description="Position in the learning/relearning steps")
    stability: Optional[float] = Field(default=None)
    difficulty: Optional[float] = Field(default=None)
    due: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), index=True)
    last_review: Optional[datetime] = Field(default=None)

    # Bookkeeping for the UI
    reps: int = Field(default=0, description="Times this card was graded")
    lapses: int = Field(default=0, description="Times it was forgotten after being learned")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    def interval_days(self) -> Optional[int]:
        """Whole days until this card is due again, from its last review."""
        if not self.last_review:
            return None
        return max(0, (self.due - self.last_review).days)
