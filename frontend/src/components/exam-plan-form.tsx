"use client"

import { useEffect, useState } from "react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { countdown, DEFAULT_PLAN, loadPlan, savePlan, type ExamPlan } from "@/lib/exam-plan"

// Exam date + daily availability, stored locally. The dashboard reads it for the D-day card.
export function ExamPlanForm() {
  const [draft, setDraft] = useState<ExamPlan>(DEFAULT_PLAN)

  useEffect(() => {
    setDraft(loadPlan())
  }, [])

  const save = () => {
    if (!draft.examDate) return
    savePlan(draft)
    toast.success("시험일을 저장했습니다")
  }

  const preview = countdown(draft)

  return (
    <div className="space-y-4 rounded-lg border bg-card p-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="exam-date" className="text-muted-foreground">시험일</Label>
          <Input
            id="exam-date"
            type="date"
            value={draft.examDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDraft({ ...draft, examDate: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weekday-hours" className="text-muted-foreground">평일 (시간)</Label>
          <Input
            id="weekday-hours"
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={draft.weekdayHours}
            onChange={(e) => setDraft({ ...draft, weekdayHours: Number(e.target.value) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="weekend-hours" className="text-muted-foreground">주말 (시간)</Label>
          <Input
            id="weekend-hours"
            type="number"
            min={0}
            max={24}
            step={0.5}
            value={draft.weekendHours}
            onChange={(e) => setDraft({ ...draft, weekendHours: Number(e.target.value) })}
          />
        </div>
      </div>
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {preview && preview.daysLeft > 0
            ? `D-${preview.daysLeft} · 공부 가능 ${preview.hoursLeft}시간`
            : "저장하면 홈에 D-day 카드가 나타납니다."}
        </p>
        <Button size="sm" onClick={save} disabled={!draft.examDate}>저장</Button>
      </div>
    </div>
  )
}
