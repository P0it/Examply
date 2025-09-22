"""
User model (simplified for MVP).
"""
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    """User model (simplified for MVP - no authentication yet)."""
    id: Optional[int] = Field(default=None, primary_key=True)

    # Basic info
    username: str = Field(unique=True, index=True)
    email: Optional[str] = Field(default=None, unique=True, index=True)

    # Preferences
    preferred_language: str = Field(default="ko", description="Preferred language code")
    theme_preference: str = Field(default="system", description="Theme preference: light, dark, system")

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = Field(default=None)

    # Statistics cache (updated periodically)
    total_problems_attempted: int = Field(default=0)
    total_problems_correct: int = Field(default=0)
    current_streak: int = Field(default=0)
    longest_streak: int = Field(default=0)

    def get_accuracy_rate(self) -> float:
        """Get overall accuracy rate."""
        if self.total_problems_attempted == 0:
            return 0.0
        return self.total_problems_correct / self.total_problems_attempted