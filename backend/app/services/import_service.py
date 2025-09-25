"""
PDF import and processing service.
"""
import os
import traceback
from datetime import datetime
from typing import Optional
from sqlmodel import Session as DBSession

from app.db.database import engine
from sqlmodel import select
from app.models import ImportJob, SourceDoc, Problem, ProblemChoice, ImportStatus, Session, SessionProblem, SessionStatus
from app.pipeline.text_extractor import TextExtractor
from app.pipeline.adapter_engine import AdapterEngine
from app.services.problem_service import ProblemService
from app.utils.pdf_security import PDFSecurityHandler

import logging
logger = logging.getLogger(__name__)


class ImportService:
    """Service for handling PDF imports and processing."""

    def __init__(self):
        self.text_extractor = TextExtractor()
        self.adapter_engine = AdapterEngine()
        self.problem_service = ProblemService()

    async def process_import_job(self, job_id: str, session_name: str = None):
        """Process an import job with detailed progress tracking."""
        with DBSession(engine) as session:
            job = session.get(ImportJob, job_id)
            if not job:
                logger.error(f"Job {job_id} not found")
                return

            source_doc = session.get(SourceDoc, job.source_doc_id)
            if not source_doc:
                logger.error(f"Source document {job.source_doc_id} not found")
                job.status = ImportStatus.ERROR
                job.error_message = "Source document not found"
                session.add(job)
                session.commit()
                return

            try:
                # Step 1: Document analysis
                job.update_progress(5, "문서 분석 중...")
                session.add(job)
                session.commit()

                if not os.path.exists(source_doc.storage_path):
                    raise FileNotFoundError(f"File not found: {source_doc.storage_path}")

                job.add_log(f"문서 열기: {source_doc.filename}")
                job.add_log(f"파일 크기: {source_doc.size} bytes")

                # Step 2: Text extraction
                job.update_progress(10, "텍스트 추출 중...")
                session.add(job)
                session.commit()

                extracted_text = await self.text_extractor.extract_text(
                    source_doc.storage_path,
                    progress_callback=lambda p, s: self._update_extraction_progress(session, job, p, s),
                    password=source_doc.password
                )

                if not extracted_text.strip():
                    raise ValueError("문서에서 텍스트를 추출할 수 없습니다")

                job.add_log(f"텍스트 추출 완료: {len(extracted_text)} 문자")

                # Step 3: Problem parsing
                job.update_progress(60, "문제 파싱 중...")
                session.add(job)
                session.commit()

                # Parse with progress tracking
                def parsing_progress_callback(current: int, total: int, message: str):
                    # Map parsing progress (0-100%) to job progress (60-80%)
                    if total > 0:
                        parsing_percent = (current / total) * 100
                        job_progress = 60 + int(parsing_percent * 20 / 100)
                        job.update_progress(job_progress, f"문제 파싱: {message} ({current}/{total})")
                        session.add(job)
                        session.commit()

                parsed_problems = self.adapter_engine.parse_problems(
                    extracted_text,
                    source_doc.filename,
                    progress_callback=parsing_progress_callback
                )
                job.add_log(f"파싱된 문제 수: {len(parsed_problems)}")

                if not parsed_problems:
                    raise ValueError("문서에서 문제를 찾을 수 없습니다")

                # Step 4: Save to database
                job.update_progress(80, "데이터베이스 저장 중...")
                session.add(job)
                session.commit()

                saved_count = 0
                for i, parsed_problem in enumerate(parsed_problems):
                    try:
                        # Create Problem instance
                        problem = Problem(
                            question_text=parsed_problem.question_text,
                            problem_type="multiple_choice",  # Assume MC for now
                            correct_answer_index=parsed_problem.correct_answer_index,
                            explanation=parsed_problem.explanation,
                            source_doc_id=source_doc.id,
                            source_file=source_doc.filename,
                            page_number=parsed_problem.page_number,
                            subject=parsed_problem.subject,
                            difficulty=parsed_problem.difficulty,
                            is_approved=True
                        )

                        session.add(problem)
                        session.flush()  # Get the ID

                        # Create choices
                        for choice_index, choice_text in enumerate(parsed_problem.choices):
                            choice = ProblemChoice(
                                problem_id=problem.id,
                                choice_index=choice_index,
                                text=choice_text
                            )
                            session.add(choice)

                        saved_count += 1
                        # More granular progress during saving (80-95%)
                        progress = 80 + (saved_count / len(parsed_problems)) * 15
                        job.update_progress(int(progress), f"문제 저장 중... ({saved_count}/{len(parsed_problems)})")
                        session.add(job)

                        # Commit more frequently for better progress visibility
                        if saved_count % 10 == 0:
                            session.commit()

                    except Exception as e:
                        logger.error(f"Failed to save problem {i}: {e}")
                        job.add_log(f"문제 저장 실패 {i}: {str(e)}")

                session.commit()

                # Step 5: Create learning session
                job.update_progress(95, "학습 세션 생성 중...")
                session.add(job)
                session.commit()

                # Get all problems from this source document
                problems = session.exec(
                    select(Problem).where(Problem.source_doc_id == source_doc.id)
                ).all()

                if problems:
                    # Create a new session for this document
                    final_session_name = session_name if session_name else f"{source_doc.filename} 학습"
                    learning_session = Session(
                        name=final_session_name,
                        source_doc_id=source_doc.id,
                        total_problems=len(problems),
                        status=SessionStatus.ACTIVE
                    )
                    session.add(learning_session)
                    session.flush()  # Get the session ID

                    # Add all problems to the session
                    for index, problem in enumerate(problems):
                        session_problem = SessionProblem(
                            session_id=learning_session.id,
                            problem_id=problem.id,
                            order_index=index
                        )
                        session.add(session_problem)

                    job.add_log(f"학습 세션 생성 완료: {len(problems)}개 문제")

                # Step 6: Completion
                job.status = ImportStatus.DONE
                job.progress = 100
                job.stage = "완료"
                job.extracted_count = saved_count
                job.finished_at = datetime.utcnow()
                job.add_log(f"임포트 완료: {saved_count}개 문제 저장됨")

                session.add(job)
                session.commit()

                logger.info(f"Import job {job_id} completed successfully with {saved_count} problems")

            except Exception as e:
                logger.error(f"Import job {job_id} failed: {e}")
                job.status = ImportStatus.ERROR
                job.error_message = str(e)
                job.finished_at = datetime.utcnow()
                job.add_log(f"오류 발생: {str(e)}")
                job.add_log(f"상세 오류: {traceback.format_exc()}")

                session.add(job)
                session.commit()

    async def process_import_job_with_password(self, job_id: str, password: str, session_name: str = None):
        """Process an encrypted PDF import job with password."""
        temp_file_path = None

        with DBSession(engine) as session:
            job = session.get(ImportJob, job_id)
            if not job:
                logger.error(f"Job {job_id} not found")
                return

            source_doc = session.get(SourceDoc, job.source_doc_id)
            if not source_doc:
                logger.error(f"Source document {job.source_doc_id} not found")
                job.status = ImportStatus.ERROR
                job.error_message = "Source document not found"
                session.add(job)
                session.commit()
                return

            try:
                # Step 1: Document analysis and decryption
                job.update_progress(5, "암호화된 문서 처리 중...")
                session.add(job)
                session.commit()

                if not os.path.exists(source_doc.storage_path):
                    raise FileNotFoundError(f"File not found: {source_doc.storage_path}")

                job.add_log(f"암호화된 문서 열기: {source_doc.filename}")

                # Create temporary decrypted file
                temp_file_path, error_msg = PDFSecurityHandler.create_decrypted_tempfile(
                    source_doc.storage_path, password
                )

                if not temp_file_path:
                    raise ValueError(f"암호화 해제 실패: {error_msg}")

                job.add_log("임시 복호화 파일 생성 완료")

                # Step 2: Text extraction from decrypted temp file
                job.update_progress(10, "텍스트 추출 중...")
                session.add(job)
                session.commit()

                extracted_text = await self.text_extractor.extract_text(
                    temp_file_path,
                    progress_callback=lambda p, s: self._update_extraction_progress(session, job, p, s),
                    password=None  # No password needed for temp decrypted file
                )

                if not extracted_text.strip():
                    raise ValueError("문서에서 텍스트를 추출할 수 없습니다")

                job.add_log(f"텍스트 추출 완료: {len(extracted_text)} 문자")

                # Step 3: Problem parsing
                job.update_progress(60, "문제 파싱 중...")
                session.add(job)
                session.commit()

                # Parse with progress tracking
                def parsing_progress_callback(current: int, total: int, message: str):
                    # Map parsing progress (0-100%) to job progress (60-80%)
                    if total > 0:
                        parsing_percent = (current / total) * 100
                        job_progress = 60 + int(parsing_percent * 20 / 100)
                        job.update_progress(job_progress, f"문제 파싱: {message} ({current}/{total})")
                        session.add(job)
                        session.commit()

                parsed_problems = self.adapter_engine.parse_problems(
                    extracted_text,
                    source_doc.filename,
                    progress_callback=parsing_progress_callback
                )
                job.add_log(f"파싱된 문제 수: {len(parsed_problems)}")

                if not parsed_problems:
                    raise ValueError("문서에서 문제를 찾을 수 없습니다")

                # Step 4: Save to database
                job.update_progress(80, "데이터베이스 저장 중...")
                session.add(job)
                session.commit()

                saved_count = 0
                for i, parsed_problem in enumerate(parsed_problems):
                    try:
                        # Create Problem instance
                        problem = Problem(
                            question_text=parsed_problem.question_text,
                            problem_type="multiple_choice",  # Assume MC for now
                            correct_answer_index=parsed_problem.correct_answer_index,
                            explanation=parsed_problem.explanation,
                            source_doc_id=source_doc.id,
                            source_file=source_doc.filename,
                            page_number=parsed_problem.page_number,
                            subject=parsed_problem.subject,
                            difficulty=parsed_problem.difficulty,
                            is_approved=True
                        )

                        session.add(problem)
                        session.flush()  # Get the ID

                        # Create choices
                        for choice_index, choice_text in enumerate(parsed_problem.choices):
                            choice = ProblemChoice(
                                problem_id=problem.id,
                                choice_index=choice_index,
                                text=choice_text
                            )
                            session.add(choice)

                        saved_count += 1
                        # More granular progress during saving (80-95%)
                        progress = 80 + (saved_count / len(parsed_problems)) * 15
                        job.update_progress(int(progress), f"문제 저장 중... ({saved_count}/{len(parsed_problems)})")
                        session.add(job)

                        # Commit more frequently for better progress visibility
                        if saved_count % 10 == 0:
                            session.commit()

                    except Exception as e:
                        logger.error(f"Failed to save problem {i}: {e}")
                        job.add_log(f"문제 저장 실패 {i}: {str(e)}")

                session.commit()

                # Step 5: Create learning session
                job.update_progress(95, "학습 세션 생성 중...")
                session.add(job)
                session.commit()

                # Get all problems from this source document
                problems = session.exec(
                    select(Problem).where(Problem.source_doc_id == source_doc.id)
                ).all()

                if problems:
                    # Create a new session for this document
                    final_session_name = session_name if session_name else f"{source_doc.filename} 학습"
                    learning_session = Session(
                        name=final_session_name,
                        source_doc_id=source_doc.id,
                        total_problems=len(problems),
                        status=SessionStatus.ACTIVE
                    )
                    session.add(learning_session)
                    session.flush()  # Get the session ID

                    # Add all problems to the session
                    for index, problem in enumerate(problems):
                        session_problem = SessionProblem(
                            session_id=learning_session.id,
                            problem_id=problem.id,
                            order_index=index
                        )
                        session.add(session_problem)

                    job.add_log(f"학습 세션 생성 완료: {len(problems)}개 문제")

                # Step 6: Completion
                job.status = ImportStatus.DONE
                job.progress = 100
                job.stage = "완료"
                job.extracted_count = saved_count
                job.finished_at = datetime.utcnow()
                job.add_log(f"임포트 완료: {saved_count}개 문제 저장됨")

                session.add(job)
                session.commit()

                logger.info(f"Import job {job_id} completed successfully with {saved_count} problems")

            except Exception as e:
                logger.error(f"Import job {job_id} failed: {e}")
                job.status = ImportStatus.ERROR
                job.error_message = str(e)
                job.finished_at = datetime.utcnow()
                job.add_log(f"오류 발생: {str(e)}")
                job.add_log(f"상세 오류: {traceback.format_exc()}")

                session.add(job)
                session.commit()

            finally:
                # Secure cleanup: Clear password from memory and delete temp file
                if temp_file_path:
                    if PDFSecurityHandler.secure_delete(temp_file_path):
                        logger.info(f"Securely deleted temp file for job {job_id}")
                    else:
                        logger.warning(f"Failed to securely delete temp file for job {job_id}")

                # Clear password from local variable (though Python GC will handle this)
                password = None

    def _update_extraction_progress(self, session: DBSession, job: ImportJob, progress: int, stage: str):
        """Update progress during text extraction."""
        # Map extraction progress (0-100) to job progress (10-60) with more granularity
        job_progress = 10 + int(progress * 0.5)  # More precise calculation
        job.update_progress(job_progress, f"텍스트 추출: {stage}")
        session.add(job)
        # Only commit every 5% to reduce DB overhead
        if progress % 5 == 0:
            session.commit()