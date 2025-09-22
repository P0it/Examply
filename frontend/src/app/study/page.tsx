import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Bookmark, SkipForward, Eye, ArrowRight } from "lucide-react"

export default function StudyPage() {
  // Mock data for demonstration
  const currentProblem = {
    id: 1,
    question_text: "다음 중 2 + 3의 값은?",
    choices: [
      { choice_index: 0, text: "4" },
      { choice_index: 1, text: "5" },
      { choice_index: 2, text: "6" },
      { choice_index: 3, text: "7" }
    ]
  }

  const sessionProgress = {
    current_index: 5,
    total_problems: 20,
    progress_percentage: 25
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">수학 연습</h1>
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
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">문제 {currentProblem.id}</CardTitle>
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
                {currentProblem.choices.map((choice) => (
                  <Button
                    key={choice.choice_index}
                    variant="outline"
                    className="h-auto p-4 text-left justify-start hover:bg-primary/5 hover:border-primary"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-current flex items-center justify-center text-sm font-medium">
                        {choice.choice_index + 1}
                      </div>
                      <div className="flex-grow text-sm leading-relaxed">
                        {choice.text}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-center space-x-4 pt-4">
                <Button size="lg" className="px-8">
                  답안 제출
                </Button>
                <Button variant="outline" size="lg">
                  <Eye className="h-4 w-4 mr-2" />
                  풀이 보기
                </Button>
              </div>
            </CardContent>
          </Card>

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
            <Button>
              다음 문제
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}