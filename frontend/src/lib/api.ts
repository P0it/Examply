const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010'

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  const config: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(url, config)

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = await response.json()
        if (errorData.detail) {
          errorMessage = errorData.detail
        }
      } catch {
        // If response is not JSON, use default message
      }
      throw new ApiError(response.status, errorMessage)
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError(0, `Network error: ${error}`)
  }
}

// Health check
export const healthCheck = () => apiRequest('/health')

// Problems
export const getProblems = (params?: {
  subject?: string
  topic?: string
  difficulty?: string
  search?: string
  page?: number
  size?: number
}) => {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
  }
  return apiRequest(`/problems?${searchParams}`)
}

export const getProblem = (id: number, includeAnswer: boolean = false) =>
  apiRequest(`/problems/${id}?include_answer=${includeAnswer}`)

export const skipProblem = (id: number) =>
  apiRequest(`/problems/${id}/skip`, { method: 'POST' })

export const toggleBookmark = (id: number) =>
  apiRequest(`/problems/${id}/bookmark`, { method: 'POST' })

// Sessions
export const createSession = (data: {
  name?: string
  subject_filter?: string
  topic_filter?: string
  difficulty_filter?: string
  tag_filters?: string[]
  max_problems?: number
}) => apiRequest('/sessions', {
  method: 'POST',
  body: JSON.stringify(data)
})

export const getLearningSession = (id: number) =>
  apiRequest(`/sessions/${id}`)

export const getNextProblem = (sessionId: number) =>
  apiRequest(`/sessions/${sessionId}/next`)

// Attempts
export const submitAttempt = (data: {
  problem_id: number
  session_id?: number
  answer_index?: number
  answer_text?: string
  time_taken_seconds?: number
}) => apiRequest('/attempts', {
  method: 'POST',
  body: JSON.stringify(data)
})

// Reviews
export const getWrongAnswers = (params?: {
  session_id?: number
  page?: number
  size?: number
}) => {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
  }
  return apiRequest(`/reviews/wrong?${searchParams}`)
}

export const getBookmarkedProblems = (params?: {
  session_id?: number
  page?: number
  size?: number
}) => {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
  }
  return apiRequest(`/reviews/bookmarked?${searchParams}`)
}

export const getSkippedProblems = (params?: {
  session_id?: number
  page?: number
  size?: number
}) => {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
  }
  return apiRequest(`/reviews/skipped?${searchParams}`)
}

// Statistics
export const getOverviewStats = () =>
  apiRequest('/stats/overview')

export const getProgressStats = () =>
  apiRequest('/stats/progress')

// Upload and Import
export interface UploadResponse {
  job_id: string
  encrypted?: boolean
  needs_password?: boolean
  message?: string
}

export interface ImportStatus {
  status: 'queued' | 'running' | 'done' | 'error'
  progress: number
  stage: string
  logs: string[]
  extracted_count: number
  error_message?: string
  created_at: string
  finished_at?: string
}

export const uploadPdf = (file: File, password?: string, sessionName?: string): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  if (password) {
    formData.append('password', password)
  }
  if (sessionName) {
    formData.append('session_name', sessionName)
  }

  return apiRequest('/upload', {
    method: 'POST',
    headers: {}, // Remove Content-Type to let browser set it with boundary
    body: formData
  })
}

export const startImport = (jobId: string) =>
  apiRequest(`/import/${jobId}/start`, { method: 'POST' })

export const getImportStatus = (jobId: string): Promise<ImportStatus> =>
  apiRequest(`/import/${jobId}/status`)

export const getImportJobs = (limit: number = 10) =>
  apiRequest(`/import/jobs?limit=${limit}`)

export const deleteImportJob = (jobId: string) =>
  apiRequest(`/import/${jobId}`, { method: 'DELETE' })

export const unlockEncryptedPdf = (jobId: string, password: string) => {
  const formData = new FormData()
  formData.append('password', password)

  return apiRequest(`/upload/${jobId}/unlock`, {
    method: 'POST',
    headers: {}, // Remove Content-Type to let browser set it with boundary
    body: formData
  })
}

// Sessions
export interface SessionResponse {
  sessions: Array<{
    id: number
    name: string
    source_doc_id: string
    source_filename: string
    status: 'active' | 'paused' | 'completed'
    current_problem_index: number
    total_problems: number
    created_at: string
    last_accessed_at?: string
    progress: {
      current_index: number
      total_problems: number
      completed_count: number
      skipped_count: number
      bookmarked_count: number
      progress_percentage: number
    }
  }>
  total: number
  limit: number
  offset: number
}

export const getSessions = (params?: {
  source_doc_id?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<SessionResponse> => {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, value.toString())
      }
    })
  }
  return apiRequest(`/sessions/list?${searchParams}`)
}

export const getSessionDetail = (sessionId: number) =>
  apiRequest(`/sessions/${sessionId}`)

export const startSession = (sessionId: number) =>
  apiRequest(`/sessions/${sessionId}/start`, { method: 'POST' })

export const deleteSession = (sessionId: number) =>
  apiRequest(`/sessions/${sessionId}`, { method: 'DELETE' })

// Admin
export const importPdf = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  return apiRequest('/admin/import', {
    method: 'POST',
    headers: {}, // Remove Content-Type to let browser set it with boundary
    body: formData
  })
}