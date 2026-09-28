'use client'

import { cn } from '@/lib/utils'

export interface ProblemChoice {
  choice_index: number
  text: string
}

export interface ProblemData {
  id: number | string
  question_text: string
  choices: ProblemChoice[]
  correct_answer_index?: number
  explanation?: string
}

// PDF text carries a hard line break at every printed line. Collapse those into
// spaces so the question reflows, but keep blank lines as paragraph breaks.
export function reflow(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
}

interface ProblemViewProps {
  problem: ProblemData
  selected: number | null
  onSelect: (index: number) => void
  revealed: boolean
  aside?: React.ReactNode
}

// Mirrors the Pearson VUE exam screen: plain question text, then one column of
// radio rows lettered A-D. Grading colors only appear after submit.
export function ProblemView({ problem, selected, onSelect, revealed, aside }: ProblemViewProps) {
  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <p className="whitespace-pre-line break-keep text-[15px] leading-7">
          {reflow(problem.question_text)}
        </p>
        {aside}
      </div>

      <div role="radiogroup" className="space-y-2">
        {problem.choices.map((choice) => {
          const isSelected = selected === choice.choice_index
          const isCorrect = revealed && choice.choice_index === problem.correct_answer_index
          const isWrong = revealed && isSelected && !isCorrect

          return (
            <label
              key={choice.choice_index}
              className={cn(
                "flex items-start gap-3 rounded border border-transparent px-3 py-2 text-[15px] leading-7",
                !revealed && "cursor-pointer hover:bg-slate-100",
                isSelected && !revealed && "bg-slate-100",
                isCorrect && "border-emerald-500 bg-emerald-50",
                isWrong && "border-red-500 bg-red-50"
              )}
            >
              <input
                type="radio"
                name={`problem-${problem.id}`}
                checked={isSelected}
                onChange={() => onSelect(choice.choice_index)}
                disabled={revealed}
                className="mt-[7px] h-4 w-4 shrink-0 accent-slate-700"
              />
              <span className="shrink-0 font-semibold">
                {String.fromCharCode(65 + choice.choice_index)}.
              </span>
              <span className="min-w-0 break-keep">{reflow(choice.text)}</span>
            </label>
          )
        })}
      </div>

      {revealed && problem.explanation && (
        <div className="rounded border border-slate-300 bg-slate-50 p-5">
          <p className="mb-1 text-xs font-semibold text-slate-600">풀이</p>
          <p className="whitespace-pre-line break-keep text-sm leading-relaxed">
            {reflow(problem.explanation)}
          </p>
        </div>
      )}
    </>
  )
}
