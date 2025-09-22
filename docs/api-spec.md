# Examply API Specification

## Base URL
- Development: `http://localhost:8000`
- Production: TBD

## Authentication
Currently no authentication required (MVP). Future versions will implement JWT-based authentication.

## Security Principles

### Answer Protection Policy
- **Default Behavior**: Problem endpoints never return correct answers or explanations
- **Explicit Opt-in**: Answers only returned when explicitly requested with `include_answer=true`
- **Post-submission**: Answers revealed only after user submits their attempt
- **Server-side Validation**: All answer checking occurs on backend to prevent client-side manipulation

## Core Endpoints

### Health Check

#### GET /health
Basic service health check.

**Response:**
```json
{
  "status": "healthy",
  "service": "examply-api",
  "version": "0.1.0"
}
```

#### GET /health/db
Database connectivity check.

**Response:**
```json
{
  "status": "healthy",
  "database": "connected"
}
```

### Problems

#### GET /problems
List problems with filtering and pagination.

**Query Parameters:**
- `subject` (string, optional): Filter by subject
- `topic` (string, optional): Filter by topic
- `difficulty` (string, optional): Filter by difficulty level
- `search` (string, optional): Search in question text
- `page` (integer, default=1): Page number
- `size` (integer, default=20, max=100): Page size

**Response:**
```json
{
  "problems": [
    {
      "id": 1,
      "question_text": "What is 2 + 2?",
      "question_image_url": null,
      "problem_type": "multiple_choice",
      "difficulty": "easy",
      "subject": "수학",
      "topic": "기초연산",
      "tags": ["arithmetic", "basic"],
      "choices": [
        {"choice_index": 0, "text": "3"},
        {"choice_index": 1, "text": "4"},
        {"choice_index": 2, "text": "5"},
        {"choice_index": 3, "text": "6"}
      ]
    }
  ],
  "total_count": 150,
  "page": 1,
  "size": 20,
  "total_pages": 8
}
```

#### GET /problems/{id}
Get single problem by ID.

**Query Parameters:**
- `include_answer` (boolean, default=false): Include answer and explanation

**Response (without answer):**
```json
{
  "id": 1,
  "question_text": "What is 2 + 2?",
  "question_image_url": null,
  "problem_type": "multiple_choice",
  "difficulty": "easy",
  "subject": "수학",
  "topic": "기초연산",
  "tags": ["arithmetic", "basic"],
  "choices": [
    {"choice_index": 0, "text": "3"},
    {"choice_index": 1, "text": "4"},
    {"choice_index": 2, "text": "5"},
    {"choice_index": 3, "text": "6"}
  ]
}
```

**Response (with answer):**
```json
{
  "id": 1,
  "question_text": "What is 2 + 2?",
  "choices": [...],
  "correct_answer_index": 1,
  "explanation": "2 + 2 equals 4 through basic addition.",
  "explanation_image_url": null
}
```

#### POST /problems/{id}/skip
Mark problem as skipped.

**Response:**
```json
{
  "status": "skipped",
  "problem_id": 1
}
```

#### POST /problems/{id}/bookmark
Toggle bookmark status for problem.

**Response:**
```json
{
  "status": "bookmarked",
  "problem_id": 1
}
```

### Sessions

#### POST /sessions
Create new problem-solving session.

**Request Body:**
```json
{
  "name": "Math Practice Session",
  "subject_filter": "수학",
  "topic_filter": "기초연산",
  "difficulty_filter": "easy",
  "tag_filters": ["arithmetic"],
  "max_problems": 20
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Math Practice Session",
  "total_problems": 15,
  "progress": {
    "current_index": 0,
    "total_problems": 15,
    "completed_count": 0,
    "skipped_count": 0,
    "bookmarked_count": 0,
    "progress_percentage": 0
  }
}
```

#### GET /sessions/{id}
Get session details.

**Response:**
```json
{
  "id": 1,
  "name": "Math Practice Session",
  "status": "active",
  "progress": {
    "current_index": 3,
    "total_problems": 15,
    "completed_count": 3,
    "skipped_count": 1,
    "bookmarked_count": 2,
    "progress_percentage": 20
  },
  "created_at": "2024-01-15T10:30:00Z",
  "filters": {
    "subject": "수학",
    "topic": "기초연산",
    "difficulty": "easy",
    "tags": ["arithmetic"]
  }
}
```

#### GET /sessions/{id}/next
Get next problem in session.

**Response:**
```json
{
  "problem": {
    "id": 5,
    "question_text": "What is 3 × 4?",
    "problem_type": "multiple_choice",
    "choices": [...]
  },
  "session_progress": {
    "current_index": 4,
    "total_problems": 15,
    "completed_count": 3,
    "progress_percentage": 26.7
  },
  "is_bookmarked": false,
  "current_index": 4
}
```

### Attempts

#### POST /attempts
Submit answer attempt for a problem.

**Request Body:**
```json
{
  "problem_id": 5,
  "session_id": 1,
  "answer_index": 2,
  "answer_text": null,
  "time_taken_seconds": 45
}
```

**Response:**
```json
{
  "attempt_id": 123,
  "is_correct": true,
  "correct_answer_index": 2,
  "explanation": "3 × 4 = 12 through multiplication.",
  "explanation_image_url": null,
  "time_taken_seconds": 45
}
```

#### GET /attempts/{id}
Get attempt details.

**Response:**
```json
{
  "id": 123,
  "problem_id": 5,
  "is_correct": true,
  "time_taken_seconds": 45,
  "submitted_at": "2024-01-15T10:35:00Z"
}
```

### Reviews

#### GET /reviews/wrong
Get problems with wrong answers for review.

**Query Parameters:**
- `session_id` (integer, optional): Filter by session
- `page` (integer, default=1): Page number
- `size` (integer, default=20): Page size

**Response:**
```json
{
  "problems": [
    {
      "id": 3,
      "question_text": "What is the capital of France?",
      "choices": [...],
      "correct_answer_index": 1,
      "explanation": "Paris is the capital of France.",
      "attempt": {
        "id": 98,
        "is_correct": false,
        "time_taken_seconds": 30,
        "submitted_at": "2024-01-15T10:32:00Z"
      }
    }
  ],
  "page": 1,
  "size": 20
}
```

#### GET /reviews/bookmarked
Get bookmarked problems for review.

**Response:**
```json
{
  "problems": [
    {
      "id": 7,
      "question_text": "Complex math problem...",
      "choices": [...],
      "bookmarked_at": "2024-01-15T10:33:00Z"
    }
  ]
}
```

#### GET /reviews/skipped
Get skipped problems for review.

**Response:**
```json
{
  "problems": [
    {
      "id": 9,
      "question_text": "Skipped problem...",
      "choices": [...],
      "skipped_at": "2024-01-15T10:34:00Z"
    }
  ]
}
```

### Statistics

#### GET /stats/overview
Get overview statistics.

**Response:**
```json
{
  "total_attempts": 150,
  "correct_attempts": 120,
  "accuracy_rate": 80.0,
  "recent_attempts_7d": 25,
  "subjects": [
    {
      "subject": "수학",
      "total_attempts": 50,
      "accuracy_rate": 85.0
    },
    {
      "subject": "과학",
      "total_attempts": 30,
      "accuracy_rate": 75.0
    }
  ]
}
```

#### GET /stats/progress
Get progress statistics over time.

**Response:**
```json
{
  "daily_progress": [
    {
      "date": "2024-01-15",
      "total_attempts": 10,
      "correct_attempts": 8,
      "accuracy_rate": 80.0
    }
  ],
  "period_days": 30
}
```

### Admin

#### POST /admin/import
Import PDF file and trigger OCR/parsing pipeline.

**Request:** Multipart form with PDF file.

**Response:**
```json
{
  "job_id": "uuid-string",
  "filename": "test.pdf",
  "status": "processing",
  "message": "PDF import started successfully"
}
```

#### GET /admin/import/{job_id}/status
Get status of import job.

**Response:**
```json
{
  "id": "uuid-string",
  "filename": "test.pdf",
  "status": "completed",
  "progress": 100,
  "total_problems": 25,
  "processed_problems": 25,
  "errors": []
}
```

#### GET /admin/import/jobs
List recent import jobs.

**Response:**
```json
{
  "jobs": [
    {
      "id": "uuid-string",
      "filename": "test.pdf",
      "status": "completed",
      "total_problems": 25,
      "created_at": "2024-01-15T09:00:00Z"
    }
  ]
}
```

## Error Responses

All endpoints may return these error responses:

### 400 Bad Request
```json
{
  "detail": "Invalid request parameters"
}
```

### 404 Not Found
```json
{
  "detail": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "detail": "Internal server error"
}
```

## Rate Limiting
No rate limiting implemented in MVP. Future versions will implement per-user rate limits for API endpoints.

## Pagination
List endpoints support cursor-based pagination with `page` and `size` parameters. Maximum page size is 100 items.