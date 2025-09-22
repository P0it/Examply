"""
Upload and import related models.
"""
from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from sqlmodel import SQLModel, Field, JSON, Column
import ulid


class ImportStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    ERROR = "error"


class SourceDoc(SQLModel, table=True):
    """Source document model for uploaded PDFs."""
    id: str = Field(default_factory=lambda: ulid.new().str, primary_key=True)
    filename: str = Field(description="Original filename")
    content_type: str = Field(description="MIME type")
    size: int = Field(description="File size in bytes")
    sha256: str = Field(description="SHA256 hash for deduplication")
    storage_path: str = Field(description="Path where file is stored")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ImportJob(SQLModel, table=True):
    """Import job model for tracking PDF processing."""
    id: str = Field(default_factory=lambda: ulid.new().str, primary_key=True)
    source_doc_id: str = Field(foreign_key="sourcedoc.id")
    status: ImportStatus = Field(default=ImportStatus.QUEUED)
    progress: int = Field(default=0, description="Progress percentage 0-100")
    stage: str = Field(default="", description="Current processing stage")
    logs: List[str] = Field(default=[], sa_column=Column(JSON))
    extracted_count: int = Field(default=0, description="Number of problems extracted")
    error_message: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = Field(default=None)

    def add_log(self, message: str):
        """Add a log message to the job."""
        self.logs.append(f"[{datetime.utcnow().strftime('%H:%M:%S')}] {message}")

    def update_progress(self, progress: int, stage: str):
        """Update job progress and stage."""
        self.progress = progress
        self.stage = stage
        self.add_log(f"Progress: {progress}% - {stage}")