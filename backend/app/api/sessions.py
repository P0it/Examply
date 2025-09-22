"""
Session endpoints for problem-solving sessions.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_session
from app.models import Session as LearningSession, SessionProblem, Problem, SourceDoc, SessionStatus
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


@router.get("/list")
async def get_sessions(
    source_doc_id: Optional[str] = Query(None, description="Filter by source document"),
    status: Optional[SessionStatus] = Query(None, description="Filter by status"),
    limit: int = Query(10, description="Number of sessions to return"),
    offset: int = Query(0, description="Number of sessions to skip"),
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Get list of learning sessions with filtering options."""

    # Build query
    query = select(LearningSession)

    # Apply filters
    if source_doc_id:
        query = query.where(LearningSession.source_doc_id == source_doc_id)

    if status:
        query = query.where(LearningSession.status == status)

    # Order by most recent first
    query = query.order_by(LearningSession.created_at.desc())

    # Apply pagination
    query = query.offset(offset).limit(limit)

    sessions = session.exec(query).all()

    # Get total count for pagination
    count_query = select(LearningSession)
    if source_doc_id:
        count_query = count_query.where(LearningSession.source_doc_id == source_doc_id)
    if status:
        count_query = count_query.where(LearningSession.status == status)

    total_count = len(session.exec(count_query).all())

    # Format response
    session_data = []
    for learning_session in sessions:
        # Get source document info
        source_doc = None
        if learning_session.source_doc_id:
            source_doc = session.get(SourceDoc, learning_session.source_doc_id)

        # Calculate progress
        progress = learning_session.get_progress()

        session_data.append({
            "id": learning_session.id,
            "name": learning_session.name,
            "source_doc_id": learning_session.source_doc_id,
            "source_filename": source_doc.filename if source_doc else None,
            "status": learning_session.status,
            "current_problem_index": learning_session.current_problem_index,
            "total_problems": learning_session.total_problems,
            "created_at": learning_session.created_at.isoformat(),
            "last_accessed_at": learning_session.last_accessed_at.isoformat() if learning_session.last_accessed_at else None,
            "progress": progress
        })

    return {
        "sessions": session_data,
        "total": total_count,
        "limit": limit,
        "offset": offset
    }


# Parameterized routes must come last to avoid conflicts
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
    problem_session = session.get(LearningSession, session_id)

    return {
        "problem": problem.get_public_data(),
        "session_progress": problem_session.get_progress(),
        "is_bookmarked": session_problem.is_bookmarked,
        "current_index": problem_session.current_problem_index
    }


@router.get("/{session_id}")
async def get_session_detail(
    session_id: int,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Get session details."""
    problem_session = session.get(LearningSession, session_id)
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
