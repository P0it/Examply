'use client'

import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { ProblemView, type ProblemData } from "@/components/problem-view"
import { answerDueProblem, getNextDueProblem, type ReviewAnswerResult } from '@/lib/api'
import toast from 'react-hot-toast'

function dueLabel(result: ReviewAnswerResult) {
  const days = result.interval_days
  if (days === null || days === undefined) return null
  if (days >= 1) return `다음 복습 ${days}일 뒤`

  const minutes = Math.max(1, Math.round((new Date(result.next_due).getTime() - Date.now()) / 60000))
  if (minutes < 60) return `다음 복습 ${minutes}분 뒤`
  return `다음 복습 ${Math.round(minutes / 60)}시간 뒤`
}

function ReviewRunPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')

  const [problem, setProblem] = useState<ProblemData | null>(null)
  const [remaining, setRemaining] = useState(0)
  const [position, setPosition] = useState<number | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<ReviewAnswerResult | null>(null)
  const [loading, setLoading] = useState(true)
  // Problems answered since this screen was opened — one sitting.
  const answeredRef = useRef<number[]>([])

  const loadNext = useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const response = await getNextDueProblem(Number(sessionId), answeredRef.current)
      setProblem(response.problem as ProblemData | null)
      setRemaining(response.remaining)
      setPosition(response.position ?? null)
      setSelected(null)
      setResult(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) {
      router.push('/review')
      return
    }
    loadNext()
  }, [sessionId, router, loadNext])

  const submit = useCallback(async (rating?: string) => {
    if (!sessionId || !problem || selected === null || result) return
    try {
      const response = await answerDueProblem(Number(sessionId), {
        problem_id: Number(problem.id),
        choice_index: selected,
        rating,
      })
      setResult(response)
      setRemaining(response.remaining)
      answeredRef.current = [...answeredRef.current, Number(problem.id)]
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "채점하지 못했습니다.")
    }
  }, [sessionId, problem, selected, result])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!problem) return
      if (event.key === 'Enter') {
        event.preventDefault()
        if (result) loadNext()
        else submit()
        return
      }
      const index = Number(event.key) - 1
      if (!result && index >= 0 && index < problem.choices.length) setSelected(index)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [problem, result, submit, loadNext])

  return (
    <div className="min-h-screen">
      <SiteHeader>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => router.push(`/review?session=${sessionId}`)}
            aria-label="복습으로"
          >
            <ArrowLeft />
          </Button>
          <span className="text-sm font-medium">오늘 복습</span>
          {position && (
            <span className="text-sm text-muted-foreground">· {position}번 문제</span>
          )}
          <span className="ml-auto shrink-0 text-sm tabular-nums text-muted-foreground">
            남은 {remaining}
          </span>
      </SiteHeader>

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        {loading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">불러오는 중</p>
        ) : !problem ? (
          <div className="space-y-4 rounded-lg border border-dashed bg-card py-16 text-center">
            <p className="text-sm text-muted-foreground">지금 복습할 문제가 없습니다</p>
            <Button variant="outline" onClick={() => router.push(`/review?session=${sessionId}`)}>
              복습 화면으로
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-6 rounded-lg bg-card p-6 shadow-md">
              <ProblemView
                problem={problem}
                selected={selected}
                onSelect={setSelected}
                revealed={Boolean(result)}
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              {result ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className={result.is_correct ? "text-sm font-semibold text-emerald-600" : "text-sm font-semibold text-red-600"}>
                      {result.is_correct ? '정답' : '오답'}
                    </span>
                    <span className="text-sm text-muted-foreground">{dueLabel(result)}</span>
                  </div>
                  <Button onClick={loadNext}>
                    다음
                    <ArrowRight />
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-xs text-subtle">1-4 선택 · Enter 제출</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => submit('hard')} disabled={selected === null}>
                      어려웠음
                    </Button>
                    <Button onClick={() => submit()} disabled={selected === null}>
                      제출
                    </Button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default function ReviewRunPage() {
  return (
    <Suspense>
      <ReviewRunPageContent />
    </Suspense>
  )
}
