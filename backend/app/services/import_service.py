"""
PDF import and processing service.
"""
import asyncio
import uuid
import logging
from typing import Dict, Any, List, Optional
from fastapi import UploadFile
import aiofiles
import os

from app.pipeline.ocr_processor import OCRProcessor
from app.pipeline.problem_parser import ProblemParser
from app.services.problem_service import ProblemService

logger = logging.getLogger(__name__)


class ImportService:
    """Service for handling PDF imports and processing."""

    def __init__(self):
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.ocr_processor = OCRProcessor()
        self.problem_parser = ProblemParser()
        self.problem_service = ProblemService()

    async def start_import(self, file: UploadFile) -> str:
        """Start PDF import process and return job ID."""
        job_id = str(uuid.uuid4())

        # Save uploaded file
        upload_dir = "data/uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = f"{upload_dir}/{job_id}_{file.filename}"

        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)

        # Initialize job status
        self.jobs[job_id] = {
            "id": job_id,
            "filename": file.filename,
            "file_path": file_path,
            "status": "pending",
            "progress": 0,
            "total_problems": 0,
            "processed_problems": 0,
            "errors": [],
            "created_at": None,
            "completed_at": None
        }

        return job_id

    async def process_pdf(self, job_id: str, file: UploadFile):
        """Process PDF file in background."""
        if job_id not in self.jobs:
            return

        job = self.jobs[job_id]

        try:
            job["status"] = "processing"
            job["progress"] = 10

            # Step 1: OCR Processing
            logger.info(f"Starting OCR for job {job_id}")
            ocr_result = await self.ocr_processor.process_pdf(job["file_path"])
            job["progress"] = 40

            # Step 2: Problem Parsing
            logger.info(f"Parsing problems for job {job_id}")
            problems = await self.problem_parser.parse_problems(ocr_result, job["filename"])
            job["progress"] = 70
            job["total_problems"] = len(problems)

            # Step 3: Save to database
            logger.info(f"Saving {len(problems)} problems for job {job_id}")
            saved_count = 0
            for problem_data in problems:
                try:
                    await self.problem_service.create_problem(problem_data)
                    saved_count += 1
                    job["processed_problems"] = saved_count
                    job["progress"] = 70 + (saved_count / len(problems)) * 25
                except Exception as e:
                    logger.error(f"Failed to save problem: {str(e)}")
                    job["errors"].append(f"Failed to save problem: {str(e)}")

            job["status"] = "completed"
            job["progress"] = 100
            logger.info(f"Import job {job_id} completed successfully")

        except Exception as e:
            logger.error(f"Import job {job_id} failed: {str(e)}")
            job["status"] = "failed"
            job["errors"].append(str(e))

    async def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get status of import job."""
        return self.jobs.get(job_id)

    async def list_recent_jobs(self, limit: int = 10) -> List[Dict[str, Any]]:
        """List recent import jobs."""
        jobs = list(self.jobs.values())
        jobs.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return jobs[:limit]