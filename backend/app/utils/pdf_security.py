"""
Secure PDF processing utilities with pikepdf.
"""
import io
import os
import tempfile
from typing import Optional, Tuple, Dict, Any
import logging

# Conditional pikepdf import with fallback
try:
    import pikepdf
    PIKEPDF_AVAILABLE = True
except ImportError:
    PIKEPDF_AVAILABLE = False
    pikepdf = None

logger = logging.getLogger(__name__)


class PDFSecurityHandler:
    """Handle PDF encryption/decryption securely."""

    @staticmethod
    def check_encryption(file_path: str) -> Dict[str, Any]:
        """
        Check if PDF is encrypted without requiring password.
        Returns detailed encryption information.
        """
        if not PIKEPDF_AVAILABLE:
            return {
                "encrypted": None,
                "needs_password": False,
                "message": "PDF security module not available"
            }

        try:
            # Try to open without password first
            with pikepdf.open(file_path) as pdf:
                return {
                    "encrypted": False,
                    "needs_password": False,
                    "message": "PDF is not encrypted"
                }
        except pikepdf.PasswordError:
            return {
                "encrypted": True,
                "needs_password": True,
                "message": "PDF requires password"
            }
        except Exception as e:
            logger.error(f"Error checking PDF encryption: {e}")
            return {
                "encrypted": None,
                "needs_password": False,
                "message": f"Cannot read PDF file: {str(e)}"
            }

    @staticmethod
    def validate_password(file_path: str, password: str) -> Dict[str, Any]:
        """
        Validate password without storing it.
        Returns validation result.
        """
        if not PIKEPDF_AVAILABLE:
            return {
                "valid": False,
                "message": "PDF security module not available"
            }

        try:
            with pikepdf.open(file_path, password=password) as pdf:
                # Successfully opened with password
                return {
                    "valid": True,
                    "message": "Password is correct"
                }
        except pikepdf.PasswordError:
            return {
                "valid": False,
                "message": "Incorrect password"
            }
        except Exception as e:
            logger.error(f"Error validating password: {e}")
            return {
                "valid": False,
                "message": f"Error validating password: {str(e)}"
            }

    @staticmethod
    def create_decrypted_tempfile(file_path: str, password: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Create a temporary decrypted PDF file.
        Returns (temp_file_path, error_message).
        The caller is responsible for deleting the temp file.
        """
        if not PIKEPDF_AVAILABLE:
            return None, "PDF security module not available"

        temp_fd = None
        temp_path = None

        try:
            # Create temporary file
            temp_fd, temp_path = tempfile.mkstemp(suffix='.pdf', prefix='decrypted_')

            # Open encrypted PDF and save decrypted version
            with pikepdf.open(file_path, password=password) as pdf:
                pdf.save(temp_path)

            # Close the file descriptor
            os.close(temp_fd)
            temp_fd = None

            logger.info(f"Created decrypted temp file: {temp_path}")
            return temp_path, None

        except pikepdf.PasswordError:
            error_msg = "Incorrect password"
            logger.error(error_msg)
        except Exception as e:
            error_msg = f"Failed to decrypt PDF: {str(e)}"
            logger.error(error_msg)

        # Cleanup on error
        if temp_fd is not None:
            try:
                os.close(temp_fd)
            except:
                pass
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except:
                pass

        return None, error_msg

    @staticmethod
    def secure_delete(file_path: str) -> bool:
        """
        Securely delete a temporary file.
        """
        try:
            if os.path.exists(file_path):
                # Overwrite with random data (basic secure delete)
                file_size = os.path.getsize(file_path)
                with open(file_path, 'r+b') as f:
                    f.write(os.urandom(file_size))
                    f.flush()
                    os.fsync(f.fileno())

                # Delete the file
                os.remove(file_path)
                logger.info(f"Securely deleted temp file: {file_path}")
                return True
        except Exception as e:
            logger.error(f"Error securely deleting file {file_path}: {e}")

        return False