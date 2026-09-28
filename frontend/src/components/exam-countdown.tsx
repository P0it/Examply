"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { countdown, loadPlan, type ExamPlan } from "@/lib/exam-plan"

interface ExamCountdownProps {
  // Problems not yet solved across all sessions — drives the per-day target.
  remainingProblems: number
}

// Read-only D-day card for the dashboard. The date itself is set on /guide;
// until then this renders nothing.
export function ExamCountdown({ remainingProblems }: ExamCountdownProps) {
  const [plan, setPlan] = useState<ExamPlan | null>(null)

  useEffect(() => {
    setPlan(loadPlan())
  }, [])

  const result = plan && countdown(plan)
  if (!plan || !result) return null

  const perDay = result.studyDays > 0 ? Math.ceil(remainingProblems / result.studyDays) : remainingProblems
  const minutesPerProblem = remainingProblems > 0 ? Math.floor((result.hoursLeft * 60) / remainingProblems) : null
  const examLabel = new Date(plan.examDate + "T00:00").toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  })

  return (
    <div className="rounded-lg bg-secondary p-2">
      <div className="rounded-lg bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">SAA-C03 · {examLabel}</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-primary">
              {result.daysLeft > 0 ? `D-${result.daysLeft}` : result.daysLeft === 0 ? "D-Day" : "시험 종료"}
            </p>
          </div>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0 text-muted-foreground"
          >
            <Link href="/guide#exam-plan" aria-label="시험일 수정">
              <Pencil />
            </Link>
          </Button>
        </div>

        <dl className="mt-6 grid grid-cols-3 gap-4 border-t pt-4">
          <div>
            <dt className="text-xs text-muted-foreground">공부 가능 시간</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{result.hoursLeft}시간</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">남은 문항</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{remainingProblems}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">하루 권장</dt>
            <dd className="mt-1 text-xl font-semibold tabular-nums">{perDay}문항</dd>
          </div>
        </dl>

        <p className="mt-4 text-xs text-muted-foreground">
          평일 {plan.weekdayHours}시간 · 주말 {plan.weekendHours}시간 기준
          {minutesPerProblem !== null && ` · 문항당 약 ${minutesPerProblem}분 여유`}
        </p>
      </div>
    </div>
  )
}
