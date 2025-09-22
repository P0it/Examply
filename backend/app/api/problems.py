"""
Problem endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from typing import List, Optional, Dict, Any

from app.db.database import get_session
from app.models.problem import Problem

router = APIRouter()


@router.get("/")
async def list_problems(
    session: Session = Depends(get_session),
    subject: Optional[str] = Query(None, description="Filter by subject"),
    topic: Optional[str] = Query(None, description="Filter by topic"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    search: Optional[str] = Query(None, description="Search in question text"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
) -> Dict[str, Any]:
    """List problems with filtering and pagination."""
    query = select(Problem).where(Problem.is_approved == True)

    # Apply filters
    if subject:
        query = query.where(Problem.subject == subject)
    if topic:
        query = query.where(Problem.topic == topic)
    if difficulty:
        query = query.where(Problem.difficulty == difficulty)
    if search:
        query = query.where(Problem.question_text.contains(search))

    # Count total
    total_count = len(session.exec(query).all())

    # Apply pagination
    offset = (page - 1) * size
    query = query.offset(offset).limit(size)

    problems = session.exec(query).all()

    return {
        "problems": [problem.get_public_data() for problem in problems],
        "total_count": total_count,
        "page": page,
        "size": size,
        "total_pages": (total_count + size - 1) // size
    }


@router.get("/{problem_id}")
async def get_problem(
    problem_id: int,
    session: Session = Depends(get_session),
    include_answer: bool = Query(False, description="Include answer and explanation"),
) -> Dict[str, Any]:
    """Get single problem by ID."""
    problem = session.get(Problem, problem_id)
    if not problem or not problem.is_approved:
        raise HTTPException(status_code=404, detail="Problem not found")

    return problem.get_public_data(include_answer=include_answer)


@router.post("/{problem_id}/skip")
async def skip_problem(
    problem_id: int,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Mark problem as skipped."""
    # TODO: Implement with session tracking
    return {"status": "skipped", "problem_id": problem_id}


@router.post("/{problem_id}/bookmark")
async def toggle_bookmark(
    problem_id: int,
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Toggle bookmark status for problem."""
    # TODO: Implement with user session tracking
    return {"status": "bookmarked", "problem_id": problem_id}