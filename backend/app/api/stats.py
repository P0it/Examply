"""
Statistics endpoints.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session, select, func
from typing import Dict, Any
from datetime import datetime, timedelta

from app.db.database import get_session
from app.models.attempt import Attempt
from app.models.problem import Problem
from app.models.session import Session as ProblemSession

router = APIRouter()


@router.get("/overview")
async def get_overview_stats(
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Get overview statistics."""
    # Total attempts
    total_attempts = session.exec(
        select(func.count(Attempt.id))
    ).first() or 0

    # Correct attempts
    correct_attempts = session.exec(
        select(func.count(Attempt.id)).where(Attempt.is_correct == True)
    ).first() or 0

    # Accuracy rate
    accuracy_rate = (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0

    # Recent activity (last 7 days)
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_attempts = session.exec(
        select(func.count(Attempt.id)).where(Attempt.submitted_at >= week_ago)
    ).first() or 0

    # Subject breakdown
    subject_stats = session.exec(
        select(Problem.subject, func.count(Attempt.id), func.avg(Attempt.is_correct.cast(float)))
        .join(Attempt, Problem.id == Attempt.problem_id)
        .group_by(Problem.subject)
    ).all()

    subjects = []
    for subject, count, avg_correct in subject_stats:
        subjects.append({
            "subject": subject,
            "total_attempts": count,
            "accuracy_rate": (avg_correct * 100) if avg_correct else 0
        })

    return {
        "total_attempts": total_attempts,
        "correct_attempts": correct_attempts,
        "accuracy_rate": round(accuracy_rate, 1),
        "recent_attempts_7d": recent_attempts,
        "subjects": subjects
    }


@router.get("/progress")
async def get_progress_stats(
    session: Session = Depends(get_session),
) -> Dict[str, Any]:
    """Get progress statistics over time."""
    # Daily stats for last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)

    daily_stats = session.exec(
        select(
            func.date(Attempt.submitted_at).label('date'),
            func.count(Attempt.id).label('total'),
            func.sum(Attempt.is_correct.cast(int)).label('correct')
        )
        .where(Attempt.submitted_at >= thirty_days_ago)
        .group_by(func.date(Attempt.submitted_at))
        .order_by(func.date(Attempt.submitted_at))
    ).all()

    progress_data = []
    for date, total, correct in daily_stats:
        accuracy = (correct / total * 100) if total > 0 else 0
        progress_data.append({
            "date": date.isoformat(),
            "total_attempts": total,
            "correct_attempts": correct,
            "accuracy_rate": round(accuracy, 1)
        })

    return {
        "daily_progress": progress_data,
        "period_days": 30
    }