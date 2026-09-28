"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { UploadDropzone } from "@/components/upload-dropzone"
import { SiteHeader } from "@/components/site-header"
import { ExamCountdown } from "@/components/exam-countdown"
import Link from "next/link"
import { ArrowRight, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import {
  uploadPdf,
  startImport,
  getImportStatus,
  getSessions,
  deleteSession,
  getReviewStats,
} from "@/lib/api"

interface Session {
  id: number
  name: string
  source_doc_id: string
  status: 'active' | 'paused' | 'completed'
  current_problem_index: number
  total_problems: number
  created_at: string
  last_accessed_at?: string
  progress: {
    completed_count: number
    skipped_count: number
    bookmarked_count: number
    progress_percentage: number
  }
}

type UploadState = {
  status: 'idle' | 'uploading' | 'processing' | 'password_required'
  progress: number
  stage: string
}

const IDLE: UploadState = { status: 'idle', progress: 0, stage: '' }

export default function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [due, setDue] = useState<Record<number, number>>({})
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [sessionName, setSessionName] = useState('')
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)
  const [upload, setUpload] = useState<UploadState>(IDLE)

  const loadSessions = async () => {
    try {
      const response = await getSessions({ limit: 20 })
      const rows = response.sessions as unknown as Session[]
      setSessions(rows)

      // How many cards each session has waiting right now.
      const counts = await Promise.all(
        rows.map((row) =>
          getReviewStats(row.id)
            .then((stats) => [row.id, stats.due_now] as const)
            .catch(() => [row.id, 0] as const)
        )
      )
      setDue(Object.fromEntries(counts))
    } catch {
      setSessions([])
      toast.error("세션을 불러오지 못했습니다. 백엔드가 실행 중인지 확인하세요.")
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  // Polls the import job until it finishes, mirroring its stage text into the progress row.
  const trackImport = (jobId: string) => {
    const poll = async () => {
      try {
        const status = await getImportStatus(jobId)
        setUpload({ status: 'processing', progress: status.progress, stage: status.stage })

        if (status.status === 'done') {
          setUpload(IDLE)
          setSelectedFile(null)
          setSessionName('')
          setPassword('')
          toast.success(`${status.extracted_count}문항을 뽑았습니다`)
          loadSessions()
          return
        }

        if (status.status === 'error') {
          const message = status.error_message || "알 수 없는 오류가 발생했습니다."
          if (/암호|비밀번호|password/.test(message)) {
            setUpload({ status: 'password_required', progress: 0, stage: '' })
            setShowPasswordPrompt(true)
            toast.error("잠긴 PDF입니다. 비밀번호를 입력하세요.")
          } else {
            setUpload(IDLE)
            toast.error(message)
          }
          return
        }

        setTimeout(poll, 2000)
      } catch (error) {
        console.error('Polling error:', error)
      }
    }
    poll()
  }

  const startAnalysis = async () => {
    if (!selectedFile) return
    if (!sessionName.trim()) {
      toast.error("세션 이름을 입력하세요.")
      return
    }

    try {
      setUpload({ status: 'uploading', progress: 0, stage: '업로드 중' })
      const { job_id } = await uploadPdf(selectedFile, password || undefined, sessionName)
      await startImport(job_id)
      setShowPasswordPrompt(false)
      setUpload({ status: 'processing', progress: 0, stage: '분석 중' })
      trackImport(job_id)
    } catch (caught) {
      setUpload(IDLE)
      const error = caught as { message?: string; status?: number }
      const message = error?.message ?? "업로드에 실패했습니다."
      if (error?.status === 400 && /잠겨|비밀번호|암호/.test(message)) {
        setUpload({ status: 'password_required', progress: 0, stage: '' })
        setShowPasswordPrompt(true)
        toast.error("잠긴 PDF입니다. 비밀번호를 입력하세요.")
        return
      }
      toast.error(message)
    }
  }

  const removeSession = async (id: number, name: string) => {
    if (!confirm(`"${name}" 세션을 삭제할까요? 되돌릴 수 없습니다.`)) return
    try {
      await deleteSession(id)
      toast.success("세션을 삭제했습니다")
      loadSessions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "삭제하지 못했습니다.")
    }
  }

  const busy = upload.status === 'uploading' || upload.status === 'processing'
  const remainingProblems = sessions.reduce(
    (sum, session) => sum + Math.max(0, session.total_problems - session.progress.completed_count),
    0
  )

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-5xl space-y-12 px-6 py-10">
        <section className="grid gap-6 md:grid-cols-2 md:[&>*:only-child]:col-span-2">
          <ExamCountdown remainingProblems={remainingProblems} />

          <div className="space-y-4 rounded-lg border bg-card p-6">
            <div>
              <h2 className="text-base font-semibold">문제집 올리기</h2>
              <p className="mt-1 text-sm text-muted-foreground">덤프 PDF를 올리면 문제를 뽑아 세션으로 만듭니다.</p>
            </div>

            <UploadDropzone onFileSelect={setSelectedFile} selectedFile={selectedFile} />

            {selectedFile && !busy && (
              <div className="flex gap-2">
                <Input
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startAnalysis()}
                  placeholder="세션 이름"
                  aria-label="세션 이름"
                />
                <Button onClick={startAnalysis} className="shrink-0">분석 시작</Button>
              </div>
            )}

            {busy && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{upload.stage}</span>
                  <span className="tabular-nums text-muted-foreground">{upload.progress}%</span>
                </div>
                <Progress value={upload.progress} />
              </div>
            )}

            {showPasswordPrompt && (
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && startAnalysis()}
                  placeholder="PDF 비밀번호"
                  aria-label="PDF 비밀번호"
                />
                <Button onClick={startAnalysis} disabled={!password} className="shrink-0">
                  다시 시도
                </Button>
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">학습 세션</h2>
            {sessions.length > 0 && (
              <span className="text-sm tabular-nums text-muted-foreground">{sessions.length}개</span>
            )}
          </div>

          {sessions.length === 0 ? (
            <p className="rounded-lg border border-dashed bg-card py-12 text-center text-sm text-muted-foreground">
              아직 세션이 없습니다. 위에서 PDF를 올려 시작하세요.
            </p>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {sessions.map((session) => {
                const done = session.progress.progress_percentage >= 100
                return (
                  <li
                    key={session.id}
                    className="flex flex-col gap-4 rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{session.name}</p>
                        <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                          {session.total_problems}문항 · 완료 {session.progress.completed_count} · 북마크 {session.progress.bookmarked_count}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeSession(session.id, session.name)}
                        className="h-8 w-8 shrink-0 p-0 text-subtle hover:text-destructive"
                        aria-label="세션 삭제"
                      >
                        <Trash2 />
                      </Button>
                    </div>

                    <div className="flex items-center gap-3">
                      <Progress value={session.progress.progress_percentage} className="flex-1" />
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {Math.round(session.progress.progress_percentage)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant={due[session.id] > 0 ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => { window.location.href = `/review?session=${session.id}` }}
                        className={due[session.id] > 0 ? "" : "text-muted-foreground"}
                      >
                        복습{due[session.id] > 0 && ` ${due[session.id]}`}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => { window.location.href = `/study?session=${session.id}` }}
                      >
                        {done ? '다시 풀기' : session.progress.progress_percentage === 0 ? '시작' : '이어서'}
                      </Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="flex flex-col items-start justify-between gap-4 rounded-lg bg-secondary p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-semibold">시험 전에 알아둘 것</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              65문항 · 130분 · 720점 합격. 도메인 비중과 응시 팁을 정리했습니다.
            </p>
          </div>
          <Button asChild>
            <Link href="/guide">
              시험 가이드
              <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>
    </div>
  )
}
