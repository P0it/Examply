// Exam countdown math for the D-day card. Everything is local-date based:
// "today" counts as a study day, the exam day itself does not.

export interface ExamPlan {
  examDate: string // yyyy-mm-dd
  weekdayHours: number
  weekendHours: number
}

export const DEFAULT_PLAN: ExamPlan = { examDate: "", weekdayHours: 1, weekendHours: 4 }

const STORAGE_KEY = "examply.exam-plan"

export function loadPlan(): ExamPlan {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_PLAN, ...JSON.parse(raw) } : DEFAULT_PLAN
  } catch {
    return DEFAULT_PLAN
  }
}

export function savePlan(plan: ExamPlan) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
  } catch {
    // Private mode or blocked storage — the card still works for this visit.
  }
}

function parseLocalDate(value: string) {
  const [y, m, d] = value.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export interface Countdown {
  daysLeft: number // D-N
  studyDays: number
  hoursLeft: number
}

export function countdown(plan: ExamPlan, today = new Date()): Countdown | null {
  if (!plan.examDate) return null
  const exam = parseLocalDate(plan.examDate)
  const day = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const daysLeft = Math.round((exam.getTime() - day.getTime()) / 86_400_000)

  let hoursLeft = 0
  for (let i = 0; i < daysLeft; i++) {
    const weekday = (day.getDay() + i) % 7
    hoursLeft += weekday === 0 || weekday === 6 ? plan.weekendHours : plan.weekdayHours
  }
  return { daysLeft, studyDays: Math.max(0, daysLeft), hoursLeft }
}
