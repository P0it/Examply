"""
Review endpoints for wrong answers, bookmarks, and skipped problems.
"""
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select
from typing import Dict, Any, List

from app.db.database import get_session
from app.models.problem import Problem
from app.models.session import SessionProblem
from app.models.attempt import Attempt

router = APIRouter()


@router.get("/wrong")
async def get_wrong_answers(
    session: Session = Depends(get_session),
    session_id: int = Query(None, description="Filter by session ID"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> Dict[str, Any]:
    """Get problems with wrong answers for review."""
    # Get wrong attempts
    query = (
        select(Problem, Attempt)
        .join(Attempt, Problem.id == Attempt.problem_id)
        .where(Attempt.is_correct == False)
    )

    if session_id:
        query = query.where(Attempt.session_id == session_id)

    # Apply pagination
    offset = (page - 1) * size
    results = session.exec(query.offset(offset).limit(size)).all()

    problems_with_attempts = []
    for problem, attempt in results:
        problem_data = problem.get_public_data(include_answer=True)
        problem_data["attempt"] = attempt.get_summary()
        problems_with_attempts.append(problem_data)

    return {
        "problems": problems_with_attempts,
        "page": page,
        "size": size
    }


@router.get("/bookmarked")
async def get_bookmarked_problems(
    session: Session = Depends(get_session),
    session_id: int = Query(None, description="Filter by session ID"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> Dict[str, Any]:
    """Get bookmarked problems for review."""
    query = (
        select(Problem, SessionProblem)
        .join(SessionProblem, Problem.id == SessionProblem.problem_id)
        .where(SessionProblem.is_bookmarked == True)
    )

    if session_id:
        query = query.where(SessionProblem.session_id == session_id)

    # Apply pagination
    offset = (page - 1) * size
    results = session.exec(query.offset(offset).limit(size)).all()

    problems = []
    for problem, session_problem in results:
        problem_data = problem.get_public_data()
        problem_data["bookmarked_at"] = session_problem.completed_at
        problems.append(problem_data)

    return {
        "problems": problems,
        "page": page,
        "size": size
    }


@router.get("/skipped")
async def get_skipped_problems(
    session: Session = Depends(get_session),
    session_id: int = Query(None, description="Filter by session ID"),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
) -> Dict[str, Any]:
    """Get skipped problems for review."""
    query = (
        select(Problem, SessionProblem)
        .join(SessionProblem, Problem.id == SessionProblem.problem_id)
        .where(SessionProblem.is_skipped == True)
    )

    if session_id:
        query = query.where(SessionProblem.session_id == session_id)

    # Apply pagination
    offset = (page - 1) * size
    results = session.exec(query.offset(offset).limit(size)).all()

    problems = []
    for problem, session_problem in results:
        problem_data = problem.get_public_data()
        problem_data["skipped_at"] = session_problem.completed_at
        problems.append(problem_data)

    return {
        "problems": problems,
        "page": page,
        "size": size
    }