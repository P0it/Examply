'use client'

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Clock, Flag } from "lucide-react"
import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, Suspense } from 'react'
import { API_BASE_URL, gotoProblem, skipCurrentProblem, toggleSessionBookmark } from '@/lib/api'
import { ProblemView } from '@/components/problem-view'
import toast from 'react-hot-toast'

interface Problem {
  id: string
  question_text: string
  choices: Array<{ choice_index: number; text: string }>
  correct_answer_index?: number
  explanation?: string
  is_bookmarked?: boolean
  is_skipped?: boolean
}

interface Session {
  id: string
  name: string
  total_problems: number
  status: string
}

interface SessionProgress {
  current_index: number
  total_problems: number
  progress_percentage: number
}

function StudyPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')
  const requestedIndex = searchParams.get('problem')

  const [session, setSession] = useState<Session | null>(null)
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null)
  const [sessionProgress, setSessionProgress] = useState<SessionProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [jumpTo, setJumpTo] = useState('')

  const refresh = useCallback(async () => {
    if (!sessionId) return
    const [progressResponse, problemResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/sessions/${sessionId}/progress`),
      fetch(`${API_BASE_URL}/sessions/${sessionId}/current-problem`),
    ])
    if (progressResponse.ok) setSessionProgress(await progressResponse.json())
    setCurrentProblem(problemResponse.ok ? await problemResponse.json() : null)
    setSelectedChoice(null)
    setIsSubmitted(false)
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      router.push('/')
      return
    }

    const load = async () => {
      try {
        const sessionResponse = await fetch(`${API_BASE_URL}/sessions/${sessionId}`)
        if (!sessionResponse.ok) throw new Error('Session not found')
        setSession(await sessionResponse.json())

        // A review link can point straight at one problem: /study?session=1&problem=42
        if (requestedIndex) {
          await gotoProblem(Number(sessionId), Number(requestedIndex)).catch(() => null)
        }
        await refresh()
      } catch (error) {
        console.error('Error fetching session data:', error)
        // Session unavailable (not found or backend down) — return home
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [sessionId, requestedIndex, router, refresh])

  const submitAnswer = useCallback(async () => {
    if (selectedChoice === null || !sessionId || isSubmitted) return

    setIsSubmitted(true)
    try {
      await fetch(`${API_BASE_URL}/sessions/${sessionId}/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice_index: selectedChoice })
      })
      const progressResponse = await fetch(`${API_BASE_URL}/sessions/${sessionId}/progress`)
      if (progressResponse.ok) setSessionProgress(await progressResponse.json())
    } catch (error) {
      console.error('Error submitting answer:', error)
    }
  }, [selectedChoice, sessionId, isSubmitted])

  const goToNextProblem = useCallback(async () => {
    if (!sessionId) return
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/next`, { method: 'POST' })
      if (!response.ok) {
        toast('마지막 문제입니다')
        return
      }
      await refresh()
    } catch (error) {
      console.error('Error moving to next problem:', error)
    }
  }, [sessionId, refresh])

  const skip = useCallback(async () => {
    if (!sessionId) return
    try {
      await skipCurrentProblem(Number(sessionId))
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "스킵하지 못했습니다.")
    }
  }, [sessionId, refresh])

  const bookmark = useCallback(async () => {
    if (!sessionId) return
    try {
      const { is_bookmarked } = await toggleSessionBookmark(Number(sessionId))
      setCurrentProblem((prev) => (prev ? { ...prev, is_bookmarked } : prev))
      const progressResponse = await fetch(`${API_BASE_URL}/sessions/${sessionId}/progress`)
      if (progressResponse.ok) setSessionProgress(await progressResponse.json())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "북마크하지 못했습니다.")
    }
  }, [sessionId])

  const previous = useCallback(async () => {
    if (!sessionId || !sessionProgress || sessionProgress.current_index <= 1) return
    try {
      await gotoProblem(Number(sessionId), sessionProgress.current_index - 1)
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이동하지 못했습니다.")
    }
  }, [sessionId, sessionProgress, refresh])

  const jump = async () => {
    const index = Number(jumpTo)
    if (!sessionId || !Number.isInteger(index)) return
    try {
      await gotoProblem(Number(sessionId), index)
      setJumpTo('')
      await refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "이동하지 못했습니다.")
    }
  }

  // 1-4 picks a choice, Enter submits then moves on, B bookmarks, S skips.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!currentProblem) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

      if (event.key === 'Enter') {
        event.preventDefault()
        if (isSubmitted) goToNextProblem()
        else submitAnswer()
        return
      }

      const key = event.key.toLowerCase()
      if (key === 'b') { bookmark(); return }
      if (key === 's') { skip(); return }

      const index = Number(event.key) - 1
      if (!isSubmitted && index >= 0 && index < currentProblem.choices.length) {
        setSelectedChoice(index)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [currentProblem, isSubmitted, submitAnswer, goToNextProblem, bookmark, skip])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-muted-foreground">불러오는 중</p>
      </div>
    )
  }

  if (!session || !sessionProgress) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">세션을 찾을 수 없습니다</p>
        <Button variant="outline" onClick={() => router.push('/')}>홈으로</Button>
      </div>
    )
  }

  const examButton = "h-9 rounded border border-slate-400 bg-gradient-to-b from-white to-slate-200 px-5 text-sm font-medium text-slate-800 hover:to-slate-300 disabled:opacity-50"

  // Pearson VUE layout: navy title bar, gray status strip (timer, position,
  // flag), white question pane, navy bottom bar with the nav buttons.
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex h-10 items-center gap-4 bg-[#1f3b5c] px-4 text-sm text-white">
        <span className="truncate font-semibold">{session.name}</span>
        <button onClick={() => router.push('/')} className="ml-auto shrink-0 text-xs text-white/80 hover:text-white">
          학습 종료
        </button>
      </header>

      <div className="flex h-10 items-center gap-4 border-b border-slate-300 bg-slate-100 px-4 text-sm text-slate-800">
        <ElapsedTimer />
        <div className="flex items-center gap-1">
          <span>Question</span>
          <Input
            value={jumpTo}
            onChange={(e) => setJumpTo(e.target.value.replace(/\D/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && jump()}
            placeholder={String(sessionProgress.current_index)}
            aria-label="문제 번호로 이동"
            className="h-7 w-14 rounded-sm bg-white px-1 text-center text-sm tabular-nums"
          />
          <span className="tabular-nums">of {sessionProgress.total_problems}</span>
        </div>
        {currentProblem && (
          <label className="ml-auto flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={Boolean(currentProblem.is_bookmarked)}
              onChange={bookmark}
              className="h-4 w-4 accent-[#1f3b5c]"
            />
            <Flag className="h-4 w-4 text-amber-600" />
            Flag for Review
          </label>
        )}
      </div>
      <Progress value={sessionProgress.progress_percentage} className="h-1 rounded-none bg-transparent" />

      <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-6 py-8">
        {currentProblem ? (
          <ProblemView
            problem={currentProblem}
            selected={selectedChoice}
            onSelect={setSelectedChoice}
            revealed={isSubmitted}
          />
        ) : (
          <p className="py-16 text-center text-sm text-muted-foreground">문제를 불러오지 못했습니다</p>
        )}
      </main>

      <footer className="sticky bottom-0 flex h-14 items-center gap-2 bg-[#1f3b5c] px-4">
        <button className={examButton} onClick={previous} disabled={sessionProgress.current_index <= 1}>
          ◀ Previous
        </button>
        <button className={examButton} onClick={skip} disabled={!currentProblem}>
          Skip
        </button>
        <span className="mx-auto hidden text-xs text-white/60 sm:block">
          1-4 선택 · Enter 제출 · B 플래그 · S 건너뛰기
        </span>
        {isSubmitted ? (
          <button className={examButton} onClick={goToNextProblem}>
            Next ▶
          </button>
        ) : (
          <button className={examButton} onClick={submitAnswer} disabled={selectedChoice === null}>
            Submit
          </button>
        )}
      </footer>
    </div>
  )
}

// Counts up from page load, like the exam clock but without a limit.
function ElapsedTimer() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const hh = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return (
    <span className="flex items-center gap-1 tabular-nums">
      <Clock className="h-4 w-4" />
      경과 {hh}:{mm}:{ss}
    </span>
  )
}

export default function StudyPage() {
  return (
    <Suspense>
      <StudyPageContent />
    </Suspense>
  )
}
