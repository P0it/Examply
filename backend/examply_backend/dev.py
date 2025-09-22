"""
Development server startup script with automatic environment setup.
"""
import os
import shutil
import sys
from pathlib import Path

def setup_env_file():
    """Setup .env file if it doesn't exist."""
    backend_dir = Path(__file__).parent.parent
    env_file = backend_dir / ".env"
    env_example = backend_dir / ".env.example"

    if not env_file.exists() and env_example.exists():
        shutil.copy(env_example, env_file)
        print(f"✅ Created {env_file}")
    elif not env_file.exists():
        # Create minimal .env file
        with open(env_file, "w") as f:
            f.write("# Backend Environment Variables\n")
            f.write("DATABASE_URL=sqlite:///./examply.db\n")
            f.write("API_HOST=0.0.0.0\n")
            f.write("API_PORT=8000\n")
            f.write("DEBUG=true\n")
        print(f"✅ Created minimal {env_file}")

def main():
    """Main development server startup."""
    print("🚀 Starting Examply backend development server...")

    # Setup environment file
    setup_env_file()

    # Start uvicorn server
    try:
        import uvicorn
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            reload_dirs=["app"]
        )
    except ImportError:
        print("❌ uvicorn not found. Run: uv sync")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n👋 Backend server stopped")

if __name__ == "__main__":
    main()