"""
Upload and import API endpoints.
"""
import os
import hashlib
import shutil
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlmodel import Session, select

from app.db.database import get_session
from app.models import SourceDoc, ImportJob, ImportStatus
from app.services.import_service import ImportService

router = APIRouter()
import_service = ImportService()

# Configuration
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "var/uploads")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "50"))
ALLOWED_CONTENT_TYPES = ["application/pdf"]

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)


def calculate_sha256(file_path: str) -> str:
    """Calculate SHA256 hash of a file."""
    sha256_hash = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256_hash.update(chunk)
    return sha256_hash.hexdigest()


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file and return job_id."""

    # Validate file type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Only PDF files are allowed."
        )

    # Check file size
    file_size = 0
    if hasattr(file, 'size') and file.size:
        file_size = file.size
    else:
        # Read to calculate size
        content = await file.read()
        file_size = len(content)
        await file.seek(0)  # Reset file pointer

    if file_size > MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_MB}MB."
        )

    try:
        # Generate unique filename using timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        safe_filename = f"{timestamp}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, safe_filename)

        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)

        # Calculate SHA256
        sha256 = calculate_sha256(file_path)

        # Check for duplicate files
        with Session(get_session()) as session:
            existing_doc = session.exec(
                select(SourceDoc).where(SourceDoc.sha256 == sha256)
            ).first()

            if existing_doc:
                # Remove uploaded file since we have a duplicate
                os.remove(file_path)

                # Check if there's an existing job for this document
                existing_job = session.exec(
                    select(ImportJob).where(ImportJob.source_doc_id == existing_doc.id)
                ).first()

                if existing_job:
                    return {"job_id": existing_job.id, "message": "File already uploaded"}
                else:
                    # Create new job for existing document
                    new_job = ImportJob(source_doc_id=existing_doc.id)
                    session.add(new_job)
                    session.commit()
                    session.refresh(new_job)
                    return {"job_id": new_job.id, "message": "New job created for existing file"}

        # Create source document record
        with Session(get_session()) as session:
            source_doc = SourceDoc(
                filename=file.filename,
                content_type=file.content_type,
                size=file_size,
                sha256=sha256,
                storage_path=file_path
            )
            session.add(source_doc)
            session.commit()
            session.refresh(source_doc)

            # Create import job
            import_job = ImportJob(source_doc_id=source_doc.id)
            session.add(import_job)
            session.commit()
            session.refresh(import_job)

            return {"job_id": import_job.id}

    except Exception as e:
        # Clean up uploaded file on error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/import/{job_id}/start")
async def start_import(job_id: str, background_tasks: BackgroundTasks):
    """Start the import process for a job."""
    with Session(get_session()) as session:
        job = session.get(ImportJob, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        if job.status != ImportStatus.QUEUED:
            raise HTTPException(status_code=400, detail="Job already started or completed")

        # Update job status
        job.status = ImportStatus.RUNNING
        job.add_log("Import process started")
        session.add(job)
        session.commit()

        # Start background processing
        background_tasks.add_task(import_service.process_import_job, job_id)

        return {"message": "Import started", "job_id": job_id}


@router.get("/import/{job_id}/status")
async def get_import_status(job_id: str) -> Dict[str, Any]:
    """Get the status of an import job."""
    with Session(get_session()) as session:
        job = session.get(ImportJob, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        return {
            "status": job.status,
            "progress": job.progress,
            "stage": job.stage,
            "logs": job.logs,
            "extracted_count": job.extracted_count,
            "error_message": job.error_message,
            "created_at": job.created_at.isoformat(),
            "finished_at": job.finished_at.isoformat() if job.finished_at else None
        }


@router.get("/import/jobs")
async def list_import_jobs(limit: int = 10):
    """List recent import jobs."""
    with Session(get_session()) as session:
        jobs = session.exec(
            select(ImportJob).order_by(ImportJob.created_at.desc()).limit(limit)
        ).all()

        return [
            {
                "id": job.id,
                "status": job.status,
                "progress": job.progress,
                "stage": job.stage,
                "extracted_count": job.extracted_count,
                "created_at": job.created_at.isoformat(),
                "finished_at": job.finished_at.isoformat() if job.finished_at else None
            }
            for job in jobs
        ]