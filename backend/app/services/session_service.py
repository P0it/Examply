"""
Session management service.
"""
from typing import List, Optional, Tuple
from sqlmodel import Session, select
from datetime import datetime

from app.models.session import Session as ProblemSession, SessionProblem, SessionStatus
from app.models.problem import Problem


class SessionService:
    """Service for managing problem-solving sessions."""

    def __init__(self, db_session: Session):
        self.db = db_session

    async def create_session(
        self,
        name: Optional[str] = None,
        subject_filter: Optional[str] = None,
        topic_filter: Optional[str] = None,
        difficulty_filter: Optional[str] = None,
        tag_filters: List[str] = None,
        max_problems: int = 50
    ) -> ProblemSession:
        """Create new problem-solving session with filtered problems."""
        if tag_filters is None:
            tag_filters = []

        # Build query to find matching problems
        query = select(Problem).where(Problem.is_approved == True)

        if subject_filter:
            query = query.where(Problem.subject == subject_filter)
        if topic_filter:
            query = query.where(Problem.topic == topic_filter)
        if difficulty_filter:
            query = query.where(Problem.difficulty == difficulty_filter)

        # Execute query and limit results
        problems = self.db.exec(query.limit(max_problems)).all()

        if not problems:
            raise ValueError("No problems found matching the specified filters")

        # Create session
        session = ProblemSession(
            name=name,
            subject_filter=subject_filter,
            topic_filter=topic_filter,
            difficulty_filter=difficulty_filter,
            tag_filters=tag_filters,
            total_problems=len(problems),
            created_at=datetime.utcnow()
        )

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        # Create session problems
        for i, problem in enumerate(problems):
            session_problem = SessionProblem(
                session_id=session.id,
                problem_id=problem.id,
                order_index=i
            )
            self.db.add(session_problem)

        self.db.commit()
        return session

    async def get_next_problem(self, session_id: int) -> Optional[Tuple[Problem, SessionProblem]]:
        """Get next problem in session."""
        session = self.db.get(ProblemSession, session_id)
        if not session:
            return None

        # Find next incomplete problem
        query = (
            select(Problem, SessionProblem)
            .join(SessionProblem, Problem.id == SessionProblem.problem_id)
            .where(SessionProblem.session_id == session_id)
            .where(SessionProblem.is_completed == False)
            .order_by(SessionProblem.order_index)
        )

        result = self.db.exec(query).first()
        if not result:
            return None

        problem, session_problem = result

        # Update session current index and last accessed
        session.current_problem_index = session_problem.order_index
        session.last_accessed_at = datetime.utcnow()

        # Mark session problem as started
        if not session_problem.started_at:
            session_problem.started_at = datetime.utcnow()

        self.db.commit()
        return problem, session_problem