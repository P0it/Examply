"""
Upload and import API endpoints.
"""
import os
import hashlib
import shutil
import fitz  # PyMuPDF
from datetime import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Form
from fastapi.responses import JSONResponse
from sqlmodel import Session, select

from app.db.database import engine
from app.models import SourceDoc, ImportJob, ImportStatus
from app.services.import_service import ImportService
from app.utils.pdf_security import PDFSecurityHandler

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


def check_pdf_encryption(file_path: str, password: Optional[str] = None) -> Dict[str, Any]:
    """Check if PDF is encrypted and validate password if provided."""
    try:
        doc = fitz.open(file_path)

        # Check if PDF requires password
        if doc.needs_pass:
            if password:
                # Try to authenticate with provided password
                auth_result = doc.authenticate(password)
                doc.close()
                if auth_result:
                    return {"encrypted": True, "password_valid": True, "message": "비밀번호가 올바릅니다."}
                else:
                    return {"encrypted": True, "password_valid": False, "message": "비밀번호가 올바르지 않습니다."}
            else:
                doc.close()
                return {"encrypted": True, "password_valid": False, "message": "PDF 파일이 잠겨있습니다. 비밀번호를 입력해주세요."}
        else:
            doc.close()
            return {"encrypted": False, "password_valid": True, "message": "암호화되지 않은 PDF입니다."}

    except Exception as e:
        return {"encrypted": None, "password_valid": False, "message": f"PDF 파일을 확인할 수 없습니다: {str(e)}"}


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    password: Optional[str] = Form(None),
    session_name: Optional[str] = Form(None)
):
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

        # Check PDF encryption status (without password validation)
        encryption_status = PDFSecurityHandler.check_encryption(file_path)

        # If encrypted but no password provided, return special status
        if encryption_status["encrypted"] and not password:
            # Create source document even for encrypted PDFs
            pass  # Continue to create the document
        elif encryption_status["encrypted"] and password:
            # Validate password if provided
            password_validation = PDFSecurityHandler.validate_password(file_path, password)
            if not password_validation["valid"]:
                os.remove(file_path)
                raise HTTPException(
                    status_code=400,
                    detail=password_validation["message"]
                )

        # Calculate SHA256
        sha256 = calculate_sha256(file_path)

        # Check for duplicate files (same content AND same filename)
        with Session(engine) as session:
            existing_doc = session.exec(
                select(SourceDoc).where(
                    SourceDoc.sha256 == sha256,
                    SourceDoc.filename == file.filename
                )
            ).first()

            if existing_doc:
                # Remove uploaded file since we have an exact duplicate (same content + same name)
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
        with Session(engine) as session:
            source_doc = SourceDoc(
                filename=file.filename,
                content_type=file.content_type,
                size=file_size,
                sha256=sha256,
                storage_path=file_path,
                password=None  # Never store passwords
            )
            session.add(source_doc)
            session.commit()
            session.refresh(source_doc)

            # Create import job
            import_job = ImportJob(
                source_doc_id=source_doc.id,
                session_name=session_name
            )
            session.add(import_job)
            session.commit()
            session.refresh(import_job)

            response = {"job_id": import_job.id}

            # Add encryption status to response
            if encryption_status["encrypted"]:
                response.update({
                    "encrypted": True,
                    "needs_password": not bool(password),
                    "message": "PDF is encrypted" if not password else "Password validated"
                })
            else:
                response.update({
                    "encrypted": False,
                    "needs_password": False,
                    "message": "PDF is not encrypted"
                })

            return response

    except Exception as e:
        # Clean up uploaded file on error
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.post("/import/{job_id}/start")
async def start_import(job_id: str, background_tasks: BackgroundTasks):
    """Start the import process for a job."""
    with Session(engine) as session:
        job = session.get(ImportJob, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Allow restart if job failed
        if job.status == ImportStatus.ERROR:
            job.status = ImportStatus.QUEUED
            job.progress = 0
            job.stage = "대기 중..."
            job.error_message = None
            job.logs = []
            job.finished_at = None
            job.add_log("Job reset after error")
        elif job.status != ImportStatus.QUEUED:
            raise HTTPException(status_code=400, detail="Job already started or completed")

        # Update job status
        job.status = ImportStatus.RUNNING
        job.add_log("Import process started")
        session.add(job)
        session.commit()

        # Start background processing
        background_tasks.add_task(import_service.process_import_job, job_id, job.session_name)

        return {"message": "Import started", "job_id": job_id}


@router.get("/import/{job_id}/status")
async def get_import_status(job_id: str) -> Dict[str, Any]:
    """Get the status of an import job."""
    with Session(engine) as session:
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
    with Session(engine) as session:
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


@router.delete("/import/{job_id}")
async def delete_import_job(job_id: str):
    """Delete an import job and its associated source document."""
    with Session(engine) as session:
        job = session.get(ImportJob, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        # Get source document
        source_doc = session.get(SourceDoc, job.source_doc_id)

        # Delete the job first
        session.delete(job)

        # If source document exists and no other jobs reference it, delete it too
        if source_doc:
            other_jobs = session.exec(
                select(ImportJob).where(
                    ImportJob.source_doc_id == source_doc.id,
                    ImportJob.id != job_id
                )
            ).all()

            if not other_jobs:
                # Delete the physical file if it exists
                if source_doc.storage_path and os.path.exists(source_doc.storage_path):
                    try:
                        os.remove(source_doc.storage_path)
                    except Exception as e:
                        print(f"Failed to delete file {source_doc.storage_path}: {e}")

                # Delete the source document record
                session.delete(source_doc)

        session.commit()
        return {"message": "Job deleted successfully"}


@router.post("/upload/{job_id}/unlock")
async def unlock_encrypted_pdf(
    job_id: str,
    background_tasks: BackgroundTasks,
    password: str = Form(...)
):
    """Unlock encrypted PDF with password and start processing."""
    with Session(engine) as session:
        job = session.get(ImportJob, job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        source_doc = session.get(SourceDoc, job.source_doc_id)
        if not source_doc:
            raise HTTPException(status_code=404, detail="Source document not found")

        # Validate password
        password_validation = PDFSecurityHandler.validate_password(source_doc.storage_path, password)
        if not password_validation["valid"]:
            raise HTTPException(status_code=400, detail=password_validation["message"])

        # Update job status and start processing
        job.status = ImportStatus.RUNNING
        job.add_log("Password validated, starting import process")
        session.add(job)
        session.commit()

        # Start background processing with password (passed securely, not stored)
        background_tasks.add_task(
            import_service.process_import_job_with_password,
            job_id,
            password,
            job.session_name
        )

        return {
            "message": "PDF unlocked successfully",
            "job_id": job_id,
            "status": "processing"
        }