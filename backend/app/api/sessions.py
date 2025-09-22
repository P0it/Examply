"""
Session endpoints for problem-solving sessions.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.db.database import get_session
from app.models.session import Session as ProblemSession, SessionProblem
from app.models.problem import Problem
from app.services.session_service import SessionService

router = APIRouter()


class CreateSessionRequest(BaseModel):
    name: Optional[str] = None
    subject_filter: Optional[str] = None
    topic_filter: Optional[str] = None
    difficulty_filter: Optional[str] = None
    tag_filters: List[str] = []
    max_problems: int = 50


@router.post("/")
async def create_session(
    request: CreateSessionRequest,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Create new problem-solving session."""
    session_service = SessionService(session)
    new_session = await session_service.create_session(
        name=request.name,
        subject_filter=request.subject_filter,
        topic_filter=request.topic_filter,
        difficulty_filter=request.difficulty_filter,
        tag_filters=request.tag_filters,
        max_problems=request.max_problems
    )

    return {
        "id": new_session.id,
        "name": new_session.name,
        "total_problems": new_session.total_problems,
        "progress": new_session.get_progress()
    }


@router.get("/{session_id}")
async def get_session(
    session_id: int,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Get session details."""
    problem_session = session.get(ProblemSession, session_id)
    if not problem_session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "id": problem_session.id,
        "name": problem_session.name,
        "status": problem_session.status,
        "progress": problem_session.get_progress(),
        "created_at": problem_session.created_at.isoformat(),
        "filters": {
            "subject": problem_session.subject_filter,
            "topic": problem_session.topic_filter,
            "difficulty": problem_session.difficulty_filter,
            "tags": problem_session.tag_filters
        }
    }


@router.get("/{session_id}/next")
async def get_next_problem(
    session_id: int,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Get next problem in session."""
    session_service = SessionService(session)
    next_problem = await session_service.get_next_problem(session_id)

    if not next_problem:
        raise HTTPException(status_code=404, detail="No more problems in session")

    problem, session_problem = next_problem
    problem_session = session.get(ProblemSession, session_id)

    return {
        "problem": problem.get_public_data(),
        "session_progress": problem_session.get_progress(),
        "is_bookmarked": session_problem.is_bookmarked,
        "current_index": problem_session.current_problem_index
    }