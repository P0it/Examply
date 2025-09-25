'use client'

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Bookmark, SkipForward, Eye, ArrowRight } from "lucide-react"
import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface Problem {
  id: string
  question_text: string
  choices: Array<{ choice_index: number; text: string }>
  correct_answer_index?: number
  explanation?: string
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

export default function StudyPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')

  const [session, setSession] = useState<Session | null>(null)
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null)
  const [sessionProgress, setSessionProgress] = useState<SessionProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      router.push('/')
      return
    }

    const fetchSessionData = async () => {
      try {
        // Fetch session details
        const sessionResponse = await fetch(`http://localhost:8010/sessions/${sessionId}`)
        if (!sessionResponse.ok) {
          throw new Error('Session not found')
        }
        const sessionData = await sessionResponse.json()
        setSession(sessionData)

        // Fetch session progress/status
        const progressResponse = await fetch(`http://localhost:8010/sessions/${sessionId}/progress`)
        if (progressResponse.ok) {
          const progressData = await progressResponse.json()
          setSessionProgress(progressData)
        } else {
          // Default progress if not started
          setSessionProgress({
            current_index: 1,
            total_problems: sessionData.total_problems,
            progress_percentage: 0
          })
        }

        // Fetch current problem
        const problemResponse = await fetch(`http://localhost:8010/sessions/${sessionId}/current-problem`)
        if (problemResponse.ok) {
          const problemData = await problemResponse.json()
          setCurrentProblem(problemData)
        }

      } catch (error) {
        console.error('Error fetching session data:', error)
        // Fallback to mock data or redirect
        router.push('/')
      } finally {
        setLoading(false)
      }
    }

    fetchSessionData()
  }, [sessionId, router])

  const handleChoiceSelect = (choiceIndex: number) => {
    if (!isSubmitted) {
      setSelectedChoice(choiceIndex)
    }
  }

  const handleSubmitAnswer = async () => {
    if (selectedChoice === null || !sessionId) return

    try {
      setIsSubmitted(true)
      setShowAnswer(true)

      // Submit answer to backend
      const response = await fetch(`http://localhost:8010/sessions/${sessionId}/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          choice_index: selectedChoice
        })
      })

      if (!response.ok) {
        console.error('Failed to submit answer')
      }
    } catch (error) {
      console.error('Error submitting answer:', error)
    }
  }

  const handleNextProblem = async () => {
    if (!sessionId) return

    try {
      // Move to next problem
      const response = await fetch(`http://localhost:8010/sessions/${sessionId}/next`, {
        method: 'POST'
      })

      if (response.ok) {
        // Reset states
        setSelectedChoice(null)
        setShowAnswer(false)
        setIsSubmitted(false)

        // Refresh data
        const progressResponse = await fetch(`http://localhost:8010/sessions/${sessionId}/progress`)
        if (progressResponse.ok) {
          const progressData = await progressResponse.json()
          setSessionProgress(progressData)
        }

        const problemResponse = await fetch(`http://localhost:8010/sessions/${sessionId}/current-problem`)
        if (problemResponse.ok) {
          const problemData = await problemResponse.json()
          setCurrentProblem(problemData)
        }
      } else {
        console.error('Failed to move to next problem')
      }
    } catch (error) {
      console.error('Error moving to next problem:', error)
    }
  }

  const handleShowExplanation = () => {
    setShowAnswer(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">세션 로딩 중...</p>
        </div>
      </div>
    )
  }

  if (!session || !sessionProgress) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">세션을 찾을 수 없습니다.</p>
          <Button onClick={() => router.push('/')} className="mt-4">
            홈으로 돌아가기
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/')}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{session.name}</h1>
                <p className="text-sm text-muted-foreground">
                  문제 {sessionProgress.current_index}/{sessionProgress.total_problems}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">진행률</span>
              <div className="w-32">
                <Progress value={sessionProgress.progress_percentage} className="h-2" />
              </div>
              <span className="text-sm font-medium">{sessionProgress.progress_percentage}%</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Problem Card */}
          {currentProblem ? (
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">문제 {sessionProgress.current_index}</CardTitle>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Bookmark className="h-4 w-4 mr-1" />
                      북마크
                    </Button>
                    <Button variant="outline" size="sm">
                      <SkipForward className="h-4 w-4 mr-1" />
                      스킵
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question */}
                <div className="text-lg font-medium leading-relaxed">
                  {currentProblem.question_text}
                </div>

                {/* Choices */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentProblem.choices.map((choice) => {
                    const isSelected = selectedChoice === choice.choice_index
                    const isCorrect = showAnswer && choice.choice_index === currentProblem.correct_answer_index
                    const isWrong = showAnswer && isSelected && choice.choice_index !== currentProblem.correct_answer_index

                    return (
                      <Button
                        key={choice.choice_index}
                        variant="outline"
                        onClick={() => handleChoiceSelect(choice.choice_index)}
                        disabled={isSubmitted}
                        className={`h-auto p-4 text-left justify-start transition-all ${
                          isSelected && !showAnswer ? 'bg-primary/10 border-primary' :
                          isCorrect ? 'bg-green-100/50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300' :
                          isWrong ? 'bg-red-100/50 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-300' :
                          'hover:bg-primary/5 hover:border-primary'
                        } ${isSubmitted ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-start space-x-3 w-full">
                          <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                            isSelected && !showAnswer ? 'border-primary bg-primary text-primary-foreground' :
                            isCorrect ? 'border-green-500 bg-green-500 text-white' :
                            isWrong ? 'border-red-500 bg-red-500 text-white' :
                            'border-current'
                          }`}>
                            {choice.choice_index + 1}
                          </div>
                          <div className="flex-grow text-sm leading-relaxed">
                            {choice.text}
                          </div>
                        </div>
                      </Button>
                    )
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4 pt-4">
                  {!isSubmitted ? (
                    <Button
                      size="lg"
                      className="px-8"
                      onClick={handleSubmitAnswer}
                      disabled={selectedChoice === null}
                    >
                      답안 제출
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="px-8"
                      onClick={handleNextProblem}
                    >
                      다음 문제
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}

                  {!showAnswer && (
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={handleShowExplanation}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      풀이 보기
                    </Button>
                  )}
                </div>

                {/* Explanation */}
                {showAnswer && currentProblem.explanation && (
                  <div className="mt-6 p-4 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">풀이</h4>
                    <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                      {currentProblem.explanation}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="mb-8">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">문제를 불러오는 중...</p>
              </CardContent>
            </Card>
          )}

          {/* Keyboard Shortcuts */}
          <Card className="mb-8">
            <CardContent className="py-4">
              <div className="flex items-center justify-center space-x-8 text-sm text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">1-4</kbd>
                  <span>선택지</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">Enter</kbd>
                  <span>제출</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">S</kbd>
                  <span>스킵</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">B</kbd>
                  <span>북마크</span>
                </div>
                <div className="flex items-center space-x-1">
                  <kbd className="px-2 py-1 bg-muted rounded text-xs">E</kbd>
                  <span>풀이</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <Button variant="outline" disabled>
              이전 문제
            </Button>
            {isSubmitted && (
              <Button onClick={handleNextProblem}>
                다음 문제
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}