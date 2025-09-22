"""
Database configuration and connection management.
"""
import os
from sqlmodel import SQLModel, create_engine, Session
from typing import Generator

# Database URL - defaults to SQLite, can be overridden with environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./examply_v2.db")

# Create engine
if DATABASE_URL.startswith("sqlite"):
    # SQLite specific configuration
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False  # Set to True for SQL debugging
    )
else:
    # PostgreSQL configuration
    engine = create_engine(
        DATABASE_URL,
        echo=False  # Set to True for SQL debugging
    )


def create_db_and_tables():
    """Create database tables."""
    # Import all models to ensure they are registered
    from app.models import Problem, ProblemChoice, Session as ProblemSession, SessionProblem, Attempt, User, SourceDoc, ImportJob

    SQLModel.metadata.create_all(engine)


def get_session() -> Generator[Session, None, None]:
    """Get database session."""
    with Session(engine) as session:
        yield session