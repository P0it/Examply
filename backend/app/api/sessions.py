"""
Session endpoints for problem-solving sessions.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_session
from app.models import Session as LearningSession, SessionProblem, Problem, SourceDoc, SessionStatus, Attempt
from app.services.session_service import SessionService

import logging
logger = logging.getLogger(__name__)

router = APIRouter()


class CreateSessionRequest(BaseModel):
    name: Optional[str] = None
    subject_filter: Optional[str] = None
    topic_filter: Optional[str] = None
    difficulty_filter: Optional[str] = None
    tag_filters: List[str] = []
    max_problems: int = 50


class SubmitAnswerRequest(BaseModel):
    choice_index: int


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


@router.get("/{session_id}/progress")
async def get_session_progress(
    session_id: int,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Get session progress."""
    problem_session = session.get(LearningSession, session_id)
    if not problem_session:
        raise HTTPException(status_code=404, detail="Session not found")

    progress = problem_session.get_progress()

    # Convert 0-based index to 1-based for display
    current_display_index = max(1, problem_session.current_problem_index + 1)

    return {
        "current_index": current_display_index,
        "total_problems": problem_session.total_problems,
        "progress_percentage": progress.get("percentage", 0)
    }


@router.get("/{session_id}/current-problem")
async def get_current_problem(
    session_id: int,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Get current problem in session."""
    problem_session = session.get(LearningSession, session_id)
    if not problem_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # If session hasn't started, use the first problem (index 0)
    current_index = max(0, problem_session.current_problem_index)

    # Get current session problem
    session_problem_query = select(SessionProblem).where(
        SessionProblem.session_id == session_id,
        SessionProblem.order_index == current_index
    )
    session_problem = session.exec(session_problem_query).first()

    if not session_problem:
        raise HTTPException(status_code=404, detail="No current problem found")

    # Get the actual problem
    problem = session.get(Problem, session_problem.problem_id)
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")

    # Get choices for the problem
    from app.models import ProblemChoice
    choices_query = select(ProblemChoice).where(ProblemChoice.problem_id == problem.id).order_by(ProblemChoice.choice_index)
    choices = session.exec(choices_query).all()

    return {
        "id": problem.id,
        "question_text": problem.question_text,
        "choices": [{"choice_index": choice.choice_index, "text": choice.text} for choice in choices],
        "correct_answer_index": problem.correct_answer_index,
        "explanation": problem.explanation
    }


@router.get("/{session_id}/next-problem")
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


# Delete endpoint must come before parameterized GET to avoid conflicts
@router.delete("/{session_id}")
async def delete_session(
    session_id: int,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Delete a learning session and all associated data."""
    problem_session = session.get(LearningSession, session_id)
    if not problem_session:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        # Delete all session problems
        session_problems_query = select(SessionProblem).where(SessionProblem.session_id == session_id)
        session_problems = session.exec(session_problems_query).all()
        for sp in session_problems:
            session.delete(sp)

        # Delete all attempts for this session
        attempts_query = select(Attempt).where(Attempt.session_id == session_id)
        attempts = session.exec(attempts_query).all()
        for attempt in attempts:
            session.delete(attempt)

        # Delete the session itself
        session.delete(problem_session)
        session.commit()

        return {"message": "Session deleted successfully"}

    except Exception as e:
        session.rollback()
        logger.error(f"Error deleting session {session_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")


# Parameterized routes must come last to avoid conflicts
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
        "total_problems": problem_session.total_problems,
        "current_problem_index": problem_session.current_problem_index,
        "progress": problem_session.get_progress(),
        "created_at": problem_session.created_at.isoformat(),
        "filters": {
            "subject": problem_session.subject_filter,
            "topic": problem_session.topic_filter,
            "difficulty": problem_session.difficulty_filter,
            "tags": problem_session.tag_filters
        }
    }


@router.post("/{session_id}/submit-answer")
async def submit_answer(
    session_id: int,
    request: SubmitAnswerRequest,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Submit answer for current problem."""
    problem_session = session.get(LearningSession, session_id)
    if not problem_session:
        raise HTTPException(status_code=404, detail="Session not found")

    choice_index = request.choice_index

    # Get current session problem
    current_index = max(0, problem_session.current_problem_index)
    session_problem_query = select(SessionProblem).where(
        SessionProblem.session_id == session_id,
        SessionProblem.order_index == current_index
    )
    session_problem = session.exec(session_problem_query).first()

    if not session_problem:
        raise HTTPException(status_code=404, detail="No current problem found")

    # Record the answer
    from app.models import Attempt
    attempt = Attempt(
        session_id=session_id,
        problem_id=session_problem.problem_id,
        user_answer_index=choice_index,
        is_correct=False  # Will be updated based on correct answer
    )

    # Get the problem to check if answer is correct
    problem = session.get(Problem, session_problem.problem_id)
    if problem and problem.correct_answer_index is not None:
        attempt.is_correct = (choice_index == problem.correct_answer_index)

    session.add(attempt)
    session.commit()

    return {
        "message": "Answer submitted",
        "is_correct": attempt.is_correct,
        "correct_answer_index": problem.correct_answer_index if problem else None
    }


@router.post("/{session_id}/next")
async def move_to_next_problem(
    session_id: int,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Move to next problem in session."""
    problem_session = session.get(LearningSession, session_id)
    if not problem_session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Check if there are more problems
    if problem_session.current_problem_index + 1 >= problem_session.total_problems:
        raise HTTPException(status_code=400, detail="No more problems in session")

    # Move to next problem
    problem_session.current_problem_index += 1
    problem_session.last_accessed_at = datetime.utcnow()

    session.add(problem_session)
    session.commit()

    return {
        "message": "Moved to next problem",
        "current_index": problem_session.current_problem_index + 1,  # 1-based for display
        "total_problems": problem_session.total_problems
    }

