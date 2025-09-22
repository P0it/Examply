"""
Attempt endpoints for answer submission.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from typing import Dict, Any, Optional
from pydantic import BaseModel

from app.db.database import get_session
from app.models.attempt import Attempt
from app.models.problem import Problem
from app.services.attempt_service import AttemptService

router = APIRouter()


class SubmitAttemptRequest(BaseModel):
    problem_id: int
    session_id: Optional[int] = None
    answer_index: Optional[int] = None
    answer_text: Optional[str] = None
    time_taken_seconds: Optional[int] = None


@router.post("/")
async def submit_attempt(
    request: SubmitAttemptRequest,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Submit answer attempt for a problem."""
    attempt_service = AttemptService(session)

    try:
        attempt = await attempt_service.submit_attempt(
            problem_id=request.problem_id,
            session_id=request.session_id,
            answer_index=request.answer_index,
            answer_text=request.answer_text,
            time_taken_seconds=request.time_taken_seconds
        )

        # Get problem for response
        problem = session.get(Problem, request.problem_id)
        if not problem:
            raise HTTPException(status_code=404, detail="Problem not found")

        return {
            "attempt_id": attempt.id,
            "is_correct": attempt.is_correct,
            "correct_answer_index": problem.correct_answer_index,
            "explanation": problem.explanation,
            "explanation_image_url": problem.explanation_image_url,
            "time_taken_seconds": attempt.time_taken_seconds
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{attempt_id}")
async def get_attempt(
    attempt_id: int,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Get attempt details."""
    attempt = session.get(Attempt, attempt_id)
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    return attempt.get_summary()