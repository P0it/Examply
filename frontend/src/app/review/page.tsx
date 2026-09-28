'use client'

import { useCallback, useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { SiteHeader } from "@/components/site-header"
import { cn } from '@/lib/utils'
import {
  getWrongAnswers,
  getBookmarkedProblems,
  getSkippedProblems,
  getSessions,
  getReviewStats,
  type ReviewStats,
} from '@/lib/api'
import toast from 'react-hot-toast'

type Tab = 'wrong' | 'bookmarked' | 'skipped'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'wrong', label: '오답' },
  { key: 'bookmarked', label: '북마크' },
  { key: 'skipped', label: '건너뜀' },
]

const EMPTY: Record<Tab, string> = {
  wrong: '틀린 문제가 없습니다',
  bookmarked: '북마크한 문제가 없습니다',
  skipped: '건너뛴 문제가 없습니다',
}

interface ReviewProblem {
  id: number
  question_text: string
  session_id?: number
  position?: number
}

interface SessionRow {
  id: number
  name: string
  total_problems: number
  progress: {
    completed_count: number
    skipped_count: number
    bookmarked_count: number
  }
}

const FETCHERS: Record<Tab, (sessionId: number) => Promise<unknown>> = {
  wrong: (sessionId) => getWrongAnswers({ session_id: sessionId }),
  bookmarked: (sessionId) => getBookmarkedProblems({ session_id: sessionId }),
  skipped: (sessionId) => getSkippedProblems({ session_id: sessionId }),
}

function firstLine(text: string) {
  return text.replace(/\s*\n\s*/g, ' ').trim()
}

function ReviewPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session')
  const initialTab = (searchParams.get('tab') as Tab) || 'wrong'

  const [tab, setTab] = useState<Tab>(TABS.some((t) => t.key === initialTab) ? initialTab : 'wrong')
  const [sessions, setSessions] = useState<SessionRow[]>([])
  const [sessionName, setSessionName] = useState('')
  const [problems, setProblems] = useState<ReviewProblem[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  // No session picked yet — offer the list to choose from.
  useEffect(() => {
    if (sessionId) return
    getSessions({ limit: 20 })
      .then((response) => setSessions(response.sessions as unknown as SessionRow[]))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return
    getReviewStats(Number(sessionId)).then(setStats).catch(() => setStats(null))
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) return
    getSessions({ limit: 20 })
      .then((response) => {
        const found = (response.sessions as unknown as SessionRow[]).find(
          (item) => String(item.id) === sessionId
        )
        setSessionName(found?.name ?? '')
      })
      .catch(() => setSessionName(''))
  }, [sessionId])

  const load = useCallback(async (next: Tab) => {
    if (!sessionId) return
    setLoading(true)
    try {
      const response = (await FETCHERS[next](Number(sessionId))) as { problems: ReviewProblem[] }
      // The same problem comes back once per wrong attempt — show it once.
      const seen = new Set<number>()
      setProblems(
        (response.problems ?? []).filter((problem) => {
          if (seen.has(problem.id)) return false
          seen.add(problem.id)
          return true
        })
      )
    } catch (error) {
      setProblems([])
      toast.error(error instanceof Error ? error.message : "불러오지 못했습니다.")
    } finally {
      setLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    load(tab)
  }, [tab, load])

  const selectTab = (next: Tab) => {
    setTab(next)
    router.replace(`/review?session=${sessionId}&tab=${next}`)
  }

  const open = (problem: ReviewProblem) => {
    if (!problem.position) {
      toast.error("이 문제의 위치를 찾지 못했습니다.")
      return
    }
    router.push(`/study?session=${sessionId}&problem=${problem.position}`)
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />

      <main className="mx-auto max-w-3xl space-y-6 px-6 py-10">
        <h1 className="text-2xl font-semibold">
          복습{sessionName && <span className="text-muted-foreground"> · {sessionName}</span>}
        </h1>
        {!sessionId ? (
          <>
            <h2 className="text-sm text-muted-foreground">세션을 고르세요</h2>
            {loading ? (
              <p className="py-16 text-center text-sm text-muted-foreground">불러오는 중</p>
            ) : sessions.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-card py-16 text-center text-sm text-muted-foreground">
                아직 세션이 없습니다
              </p>
            ) : (
              <ul className="divide-y rounded-lg border bg-card">
                {sessions.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/review?session=${item.id}`)}
                      className="flex w-full items-center justify-between gap-4 p-4 text-left transition-colors hover:bg-secondary"
                    >
                      <span className="truncate text-sm font-medium">{item.name}</span>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        스킵 {item.progress.skipped_count} · 북마크 {item.progress.bookmarked_count}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            {stats && (
              <div className="flex items-center justify-between gap-4 rounded-lg bg-secondary p-6">
                <div>
                  <p className="text-base">
                    지금 복습할 문제 <span className="font-semibold tabular-nums text-primary">{stats.due_now}</span>문항
                  </p>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    오늘까지 {stats.due_today} · 학습 중 {stats.learning} · 장기기억 {stats.review} · 추적 {stats.tracked}
                  </p>
                </div>
                <Button
                  disabled={stats.due_now === 0}
                  onClick={() => router.push(`/review/run?session=${sessionId}`)}
                  className="shrink-0"
                >
                  복습 시작
                </Button>
              </div>
            )}

            <div className="flex gap-1 border-b">
              {TABS.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectTab(key)}
                  className={cn(
                    "-mb-px border-b-[3px] px-4 py-2 text-sm transition-colors",
                    tab === key
                      ? "border-primary font-semibold text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="py-16 text-center text-sm text-muted-foreground">불러오는 중</p>
            ) : problems.length === 0 ? (
              <p className="rounded-lg border border-dashed bg-card py-16 text-center text-sm text-muted-foreground">
                {EMPTY[tab]}
              </p>
            ) : (
              <ul className="divide-y rounded-lg border bg-card">
                {problems.map((problem) => (
                  <li key={problem.id}>
                    <button
                      type="button"
                      onClick={() => open(problem)}
                      className="flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-secondary"
                    >
                      <span className="shrink-0 font-semibold tabular-nums text-sm text-subtle">
                        {problem.position ?? '-'}
                      </span>
                      <span className="line-clamp-2 min-w-0 flex-1 break-keep text-sm leading-relaxed">
                        {firstLine(problem.question_text)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  )
}

export default function ReviewPage() {
  return (
    <Suspense>
      <ReviewPageContent />
    </Suspense>
  )
}
