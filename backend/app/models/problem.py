"""
Problem and related models.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship, JSON, Column


class DifficultyLevel(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class ProblemType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    TRUE_FALSE = "true_false"
    SHORT_ANSWER = "short_answer"


class ProblemChoice(SQLModel, table=True):
    """Individual choice for multiple choice problems."""
    id: Optional[int] = Field(default=None, primary_key=True)
    problem_id: int = Field(foreign_key="problem.id")
    choice_index: int = Field(description="0-based index of the choice")
    text: str = Field(description="Choice text content")

    # Relationship
    problem: "Problem" = Relationship(back_populates="choices")


class Problem(SQLModel, table=True):
    """Main problem model."""
    id: Optional[int] = Field(default=None, primary_key=True)

    # Content
    question_text: str = Field(description="The problem question")
    question_image_url: Optional[str] = Field(default=None, description="Image URL if question has image")

    # Problem metadata
    problem_type: ProblemType = Field(description="Type of problem")
    difficulty: Optional[DifficultyLevel] = Field(default=None)
    subject: Optional[str] = Field(default=None, description="Subject area")
    topic: Optional[str] = Field(default=None, description="Specific topic")
    tags: List[str] = Field(default=[], sa_column=Column(JSON))

    # Answer information (stored securely)
    correct_answer_index: Optional[int] = Field(default=None, description="Index of correct choice (for MC)")
    correct_answer_text: Optional[str] = Field(default=None, description="Text answer (for short answer)")
    explanation: Optional[str] = Field(default=None, description="Detailed explanation")
    explanation_image_url: Optional[str] = Field(default=None, description="Image URL for explanation")

    # Source information
    source_file: Optional[str] = Field(default=None, description="Original PDF filename")
    page_number: Optional[int] = Field(default=None, description="Page number in source")

    # Status and metadata
    is_approved: bool = Field(default=False, description="Whether problem is approved for use")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None)

    # Relationships
    choices: List[ProblemChoice] = Relationship(back_populates="problem")

    def get_public_data(self, include_answer: bool = False) -> dict:
        """Get problem data without sensitive information."""
        data = {
            "id": self.id,
            "question_text": self.question_text,
            "question_image_url": self.question_image_url,
            "problem_type": self.problem_type,
            "difficulty": self.difficulty,
            "subject": self.subject,
            "topic": self.topic,
            "tags": self.tags,
            "choices": [
                {
                    "choice_index": choice.choice_index,
                    "text": choice.text
                }
                for choice in sorted(self.choices, key=lambda x: x.choice_index)
            ]
        }

        if include_answer:
            data.update({
                "correct_answer_index": self.correct_answer_index,
                "correct_answer_text": self.correct_answer_text,
                "explanation": self.explanation,
                "explanation_image_url": self.explanation_image_url,
            })

        return data