# Examply Development Commands (for macOS/Linux with make)
# For Windows users: use the commands directly with uv and npm

.PHONY: help dev test lint dummy-data

help:
	@echo "Basic Commands (use directly on Windows):"
	@echo "  Backend setup:  cd backend && uv sync"
	@echo "  Frontend setup: cd frontend && npm install"
	@echo "  Start backend:  cd backend && uv run uvicorn app.main:app --reload"
	@echo "  Start frontend: cd frontend && npm run dev"
	@echo "  Generate data:  cd backend && uv run python -c \"import asyncio; from app.pipeline.dummy_import import generate_dummy_problems; asyncio.run(generate_dummy_problems())\""

dev:
	@make -j2 dev-backend dev-frontend

dev-backend:
	cd backend && uv run uvicorn app.main:app --reload

dev-frontend:
	cd frontend && npm run dev

test:
	cd backend && uv run pytest tests/ -v
	cd frontend && npm run test

lint:
	cd backend && uv run ruff check .
	cd frontend && npm run lint

dummy-data:
	cd backend && uv run python -c "import asyncio; from app.pipeline.dummy_import import generate_dummy_problems; asyncio.run(generate_dummy_problems())"