"""
Health check endpoints.
"""
from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.db.database import get_session

router = APIRouter()


@router.get("/")
async def health_check():
    """Basic health check."""
    return {
        "status": "healthy",
        "service": "examply-api",
        "version": "0.1.0"
    }


@router.get("/db")
async def database_health_check(session: Session = Depends(get_session)):
    """Database connectivity check."""
    try:
        # Simple query to test database connection
        session.exec("SELECT 1").first()
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }