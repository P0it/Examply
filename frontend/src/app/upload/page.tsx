"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { UploadDropzone } from "@/components/upload-dropzone"
import { SiteHeader } from "@/components/site-header"
import toast from "react-hot-toast"
import { uploadPdf, startImport, getImportStatus, unlockEncryptedPdf } from "@/lib/api"

interface UploadStatus {
  jobId?: string
  status: 'idle' | 'uploading' | 'needs_password' | 'queued' | 'running' | 'done' | 'error'
  progress: number
  stage: string
  logs: string[]
  extractedCount: number
  errorMessage?: string
}

const IDLE: UploadStatus = {
  status: 'idle',
  progress: 0,
  stage: '',
  logs: [],
  extractedCount: 0,
}

export default function UploadPage() {
  const router = useRouter()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [sessionName, setSessionName] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<UploadStatus>(IDLE)

  const selectFile = useCallback((file: File | null) => {
    setSelectedFile(file)
    setStatus(IDLE)
  }, [])

  const pollJobStatus = (jobId: string) => {
    const poll = async () => {
      try {
        const job = await getImportStatus(jobId)
        setStatus((prev) => ({
          ...prev,
          status: job.status,
          progress: job.progress,
          stage: job.stage,
          logs: job.logs || [],
          extractedCount: job.extracted_count || 0,
          errorMessage: job.error_message,
        }))

        if (job.status === 'running' || job.status === 'queued') {
          setTimeout(poll, 2000)
        } else if (job.status === 'done') {
          toast.success(`${job.extracted_count}문항을 뽑았습니다`)
        } else if (job.status === 'error') {
          toast.error(job.error_message || "알 수 없는 오류가 발생했습니다.")
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }
    poll()
  }

  const upload = async () => {
    if (!selectedFile) return

    try {
      setStatus({ ...IDLE, status: 'uploading', stage: '업로드 중' })
      const response = await uploadPdf(selectedFile, undefined, sessionName.trim() || undefined)

      if (response.encrypted && response.needs_password) {
        setStatus({
          ...IDLE,
          jobId: response.job_id,
          status: 'needs_password',
          stage: '비밀번호가 필요합니다',
        })
        return
      }

      setStatus((prev) => ({ ...prev, jobId: response.job_id, status: 'queued', stage: '대기 중' }))
      await startImport(response.job_id)
      pollJobStatus(response.job_id)
    } catch (error) {
      const message = error instanceof Error ? error.message : "업로드에 실패했습니다."
      setStatus((prev) => ({ ...prev, status: 'error', errorMessage: message }))
      toast.error(message)
    }
  }

  const unlock = async () => {
    if (!status.jobId || !password.trim()) return

    try {
      setStatus((prev) => ({ ...prev, status: 'uploading', stage: '비밀번호 확인 중' }))
      await unlockEncryptedPdf(status.jobId, password)
      setPassword('')
      setStatus((prev) => ({ ...prev, status: 'queued', stage: '대기 중' }))
      pollJobStatus(status.jobId)
    } catch (error) {
      const message = error instanceof Error ? error.message : "비밀번호가 올바르지 않습니다."
      setStatus((prev) => ({ ...prev, status: 'needs_password', errorMessage: message }))
      toast.error(message)
    }
  }

  const reset = () => {
    setSelectedFile(null)
    setSessionName('')
    setPassword('')
    setStatus(IDLE)
  }

  const busy = status.status === 'uploading' || status.status === 'queued' || status.status === 'running'

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <h1 className="text-2xl font-semibold">문제집 올리기</h1>
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <UploadDropzone onFileSelect={selectFile} selectedFile={selectedFile} />

          {selectedFile && status.status === 'idle' && (
            <div className="flex gap-2">
              <Input
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && upload()}
                placeholder="세션 이름 (선택)"
                aria-label="세션 이름"
              />
              <Button onClick={upload} className="shrink-0">분석 시작</Button>
            </div>
          )}

          {status.status === 'needs_password' && (
            <div className="flex gap-2">
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && unlock()}
                placeholder="PDF 비밀번호"
                aria-label="PDF 비밀번호"
              />
              <Button onClick={unlock} disabled={!password.trim()} className="shrink-0">
                잠금 해제
              </Button>
            </div>
          )}

          {busy && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{status.stage}</span>
                <span className="tabular-nums text-muted-foreground">{status.progress}%</span>
              </div>
              <Progress value={status.progress} />
            </div>
          )}

          {status.status === 'done' && (
            <div className="flex items-center justify-between gap-4 rounded-lg bg-secondary px-4 py-3">
              <p className="text-sm">
                <span className="tabular-nums font-semibold text-primary">{status.extractedCount}</span>문항을 뽑았습니다
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={reset}>다른 파일</Button>
                <Button size="sm" onClick={() => router.push('/')}>세션 목록</Button>
              </div>
            </div>
          )}

          {status.status === 'error' && status.errorMessage && (
            <div className="flex items-center justify-between gap-4 rounded-lg border border-destructive/40 bg-red-50 px-4 py-3">
              <p className="text-sm text-destructive">{status.errorMessage}</p>
              <Button variant="outline" size="sm" onClick={reset}>다시</Button>
            </div>
          )}
        </div>

        {status.logs.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold">처리 기록</h2>
            <ul className="space-y-1 rounded-lg border bg-card p-4 font-mono text-xs text-muted-foreground">
              {status.logs.slice(-12).map((log, index) => (
                <li key={index} className="break-all">{log}</li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}
