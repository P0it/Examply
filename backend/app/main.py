"""
FastAPI main application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import admin, health, problems, sessions, attempts, reviews, stats, upload
from app.db.database import create_db_and_tables

app = FastAPI(
    title="Examply API",
    description="API for Examply flashcard problem-solving application",
    version="0.1.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, prefix="/health", tags=["health"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(problems.router, prefix="/problems", tags=["problems"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(attempts.router, prefix="/attempts", tags=["attempts"])
app.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
app.include_router(stats.router, prefix="/stats", tags=["stats"])
app.include_router(upload.router, prefix="", tags=["upload"])


@app.on_event("startup")
async def startup_event():
    """Create database tables on startup."""
    create_db_and_tables()


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler."""
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Examply API", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=True)