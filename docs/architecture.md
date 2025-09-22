# Examply Architecture

## System Overview

Examply is a full-stack web application for creating and studying flashcards from PDF problem sets. The system consists of a Python FastAPI backend and a Next.js frontend, with an OCR pipeline for processing PDF documents.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │    Database     │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (SQLite/PG)   │
│                 │    │                 │    │                 │
│ • React/TS      │    │ • Python 3.11+ │    │ • SQLModel      │
│ • Tailwind CSS  │    │ • FastAPI       │    │ • SQLAlchemy    │
│ • shadcn/ui     │    │ • uvicorn       │    │                 │
│ • Zustand       │    │ • Pydantic      │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  OCR Pipeline   │
                       │                 │
                       │ • Tesseract     │
                       │ • PaddleOCR     │
                       │ • PyPDF         │
                       │ • pdf2image     │
                       └─────────────────┘
```

## Data Flow

### 1. PDF Import Flow
```
Admin uploads PDF → OCR Processor → Problem Parser → Database Storage
                                                   ↓
                   Text/Scan Detection ← PDF Analysis
                                                   ↓
                   Structured JSON ← Rule-based Parsing
```

### 2. Problem Solving Flow
```
User starts session → Filter problems → Create session queue
                                                   ↓
Next problem request → Serve problem data (without answers)
                                                   ↓
User submits answer → Validate & score → Return result + explanation
                                                   ↓
Update progress → Save attempt → Continue or finish session
```

### 3. Review Flow
```
User requests review → Query attempts/bookmarks → Aggregate results
                                                        ↓
Filter by type (wrong/bookmarked/skipped) → Return paginated data
```

## Component Architecture

### Backend Components

#### API Layer (`app/api/`)
- **Health**: System health checks and monitoring
- **Admin**: PDF import and administrative functions
- **Problems**: Problem CRUD and retrieval (secure)
- **Sessions**: Session management and problem queuing
- **Attempts**: Answer submission and validation
- **Reviews**: Wrong answers, bookmarks, skipped problems
- **Stats**: Progress tracking and analytics

#### Service Layer (`app/services/`)
- **ImportService**: Manages PDF import pipeline
- **SessionService**: Handles session creation and problem ordering
- **AttemptService**: Processes answer submissions and scoring
- **ProblemService**: Problem management and CRUD operations

#### Data Layer (`app/models/`)
- **Problem**: Core problem entity with choices and metadata
- **Session**: Problem-solving session with filters and progress
- **Attempt**: User answer submissions with results
- **User**: Basic user entity (simplified for MVP)

#### Pipeline Layer (`app/pipeline/`)
- **OCRProcessor**: Text extraction and image OCR
- **ProblemParser**: Rule-based parsing of problems from text

### Frontend Components

#### Pages (`src/app/`)
- **Home**: Landing page and session creation
- **Study**: Main problem-solving interface
- **Review**: Wrong answers, bookmarks, skipped problems
- **Admin**: PDF upload and import management
- **Stats**: Progress dashboard and analytics

#### Store (`src/store/`)
- **useAppStore**: Global state management with Zustand
  - Current session and problem state
  - UI preferences (theme, sidebar)
  - Statistics cache

#### API Client (`src/lib/api.ts`)
- RESTful API client with error handling
- Type-safe request/response interfaces
- Automatic retry and offline support

## Security Architecture

### Answer Protection
- **Server-side Validation**: All answer checking occurs on backend
- **Minimal Exposure**: Answers only sent after submission
- **Session Isolation**: User cannot access problem pool directly

### Data Validation
- **Input Sanitization**: All user inputs validated with Pydantic
- **SQL Injection Prevention**: SQLModel/SQLAlchemy ORM protection
- **File Upload Security**: PDF validation and size limits

## Scalability Considerations

### Database Design
- **SQLite for Development**: Easy setup and testing
- **PostgreSQL for Production**: Environment variable configuration
- **Indexing Strategy**: Optimized queries for filtering and search

### Performance Optimization
- **Lazy Loading**: Problems loaded on-demand during sessions
- **Caching Strategy**: Frontend state persistence
- **Async Processing**: Background PDF import with job tracking

### Monitoring & Observability
- **Health Checks**: Database connectivity and service status
- **Logging**: Structured logging throughout pipeline
- **Error Tracking**: Comprehensive error handling and reporting

## Technology Choices Rationale

### Backend: Python + FastAPI
- **Rapid Development**: Python ecosystem for OCR and ML
- **Performance**: Async/await support for concurrent processing
- **Type Safety**: Pydantic for data validation and documentation
- **Community**: Rich ecosystem for PDF processing and OCR

### Frontend: Next.js + TypeScript
- **Developer Experience**: Hot reload, TypeScript support
- **Performance**: App Router for optimized routing
- **UI Components**: shadcn/ui for consistent design system
- **State Management**: Zustand for minimal boilerplate

### Database: SQLModel
- **Type Safety**: Python type hints with database models
- **Flexibility**: Easy migration from SQLite to PostgreSQL
- **ORM Benefits**: Relationship management and query building

### OCR: Tesseract + PaddleOCR
- **Fallback Strategy**: Multiple engines for reliability
- **Language Support**: Korean and English text recognition
- **Open Source**: No licensing costs or API dependencies