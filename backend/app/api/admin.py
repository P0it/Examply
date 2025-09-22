"""
Admin endpoints for PDF import and management.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from typing import Dict, Any
import logging

from app.services.import_service import ImportService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/import")
async def import_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
) -> Dict[str, Any]:
    """
    Import PDF file and trigger OCR/parsing pipeline.
    Returns immediately with job ID for tracking progress.
    """
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")

    try:
        # Start import process in background
        import_service = ImportService()
        job_id = await import_service.start_import(file)

        background_tasks.add_task(import_service.process_pdf, job_id, file)

        return {
            "job_id": job_id,
            "filename": file.filename,
            "status": "processing",
            "message": "PDF import started successfully"
        }

    except Exception as e:
        logger.error(f"Import failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Import failed")


@router.get("/import/{job_id}/status")
async def get_import_status(job_id: str) -> Dict[str, Any]:
    """Get status of import job."""
    import_service = ImportService()
    status = await import_service.get_job_status(job_id)

    if not status:
        raise HTTPException(status_code=404, detail="Job not found")

    return status


@router.get("/import/jobs")
async def list_import_jobs() -> Dict[str, Any]:
    """List recent import jobs."""
    import_service = ImportService()
    jobs = await import_service.list_recent_jobs()
    return {"jobs": jobs}