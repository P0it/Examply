import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BookOpen, Brain, BarChart3, Settings, Sparkles, Users, Trophy, ArrowRight } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/20 dark:from-background dark:via-primary/10 dark:to-purple-950/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80">
                <Brain className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Examply
              </h1>
            </div>
            <nav className="flex items-center space-x-6">
              <Button variant="ghost" className="hover:bg-primary/10 transition-all duration-200">
                문제 풀기
              </Button>
              <Button variant="ghost" className="hover:bg-primary/10 transition-all duration-200">
                복습하기
              </Button>
              <Button variant="ghost" className="hover:bg-primary/10 transition-all duration-200">
                통계
              </Button>
              <ThemeToggle />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/5 rounded-full blur-3xl"></div>
            <div className="absolute top-1/3 left-1/3 w-48 h-48 bg-secondary/10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-1/3 right-1/3 w-56 h-56 bg-accent/10 rounded-full blur-2xl"></div>
          </div>

          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            AI 기반 맞춤형 학습 시스템
          </div>

          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            스마트한 문제 풀이
            <br />
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              학습 플랫폼
            </span>
          </h2>

          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            PDF 문제집을 AI로 분석하여 개인 맞춤형 플래시카드 학습을 제공합니다.
            <br />
            효율적인 반복 학습으로 성적 향상을 경험해보세요.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-8">
            <Button size="lg" className="px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300 group">
              <BookOpen className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
              새 세션 시작하기
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="outline" size="lg" className="px-8 py-6 text-lg hover:bg-primary/5 transition-all duration-200">
              <Users className="mr-2 h-5 w-5" />
              데모 체험하기
            </Button>
          </div>

          <div className="flex justify-center items-center gap-8 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              무료로 시작
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              AI 자동 분석
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              실시간 진도 추적
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <Card className="group hover:shadow-lg transition-all duration-300 border border-border/60 hover:border-primary/30 bg-gradient-to-br from-card via-primary/5 to-purple-50/50 dark:from-slate-900/50 dark:via-primary/10 dark:to-purple-950/30 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">총 문제 수</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <BookOpen className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                1,234
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                다양한 과목의 문제
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border border-border/60 hover:border-primary/30 bg-gradient-to-br from-card via-primary/3 to-purple-50/50 dark:from-slate-900/50 dark:via-primary/8 dark:to-purple-950/30 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">정답률</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg">
                <BarChart3 className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                85.2%
              </div>
              <div className="text-xs text-green-600 flex items-center gap-1">
                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                지난 주 대비 +5.2%
              </div>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 border border-border/60 hover:border-primary/30 bg-gradient-to-br from-card via-primary/3 to-purple-50/50 dark:from-slate-900/50 dark:via-primary/8 dark:to-purple-950/30 hover:scale-105">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">학습 시간</CardTitle>
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Brain className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                24시간
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                이번 월 누적
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* Start Session */}
          <Card className="group hover:shadow-xl transition-all duration-500 border border-border/60 hover:border-primary/40 bg-gradient-to-br from-card via-primary/5 to-blue-50/30 dark:from-slate-900/80 dark:via-primary/10 dark:to-blue-950/40 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/5 to-blue-500/10 dark:from-primary/20 dark:via-purple-500/10 dark:to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">새 학습 세션</CardTitle>
              </div>
              <CardDescription className="text-base">
                과목과 난이도를 선택하여 맞춤형 문제 풀이를 시작하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="group/subject hover:scale-105 transition-all duration-200 cursor-pointer">
                  <div className="h-20 p-4 rounded-xl border border-blue-200 hover:border-blue-400 bg-blue-50/50 hover:bg-blue-100/80 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 dark:border-blue-800 dark:hover:border-blue-600 flex flex-col items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md">
                    <span className="font-semibold text-blue-600 dark:text-blue-400">수학</span>
                    <span className="text-sm text-muted-foreground">120 문제</span>
                  </div>
                </div>
                <div className="group/subject hover:scale-105 transition-all duration-200 cursor-pointer">
                  <div className="h-20 p-4 rounded-xl border border-green-200 hover:border-green-400 bg-green-50/50 hover:bg-green-100/80 dark:bg-green-950/20 dark:hover:bg-green-950/40 dark:border-green-800 dark:hover:border-green-600 flex flex-col items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md">
                    <span className="font-semibold text-green-600 dark:text-green-400">과학</span>
                    <span className="text-sm text-muted-foreground">89 문제</span>
                  </div>
                </div>
                <div className="group/subject hover:scale-105 transition-all duration-200 cursor-pointer">
                  <div className="h-20 p-4 rounded-xl border border-purple-200 hover:border-purple-400 bg-purple-50/50 hover:bg-purple-100/80 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 dark:border-purple-800 dark:hover:border-purple-600 flex flex-col items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md">
                    <span className="font-semibold text-purple-600 dark:text-purple-400">영어</span>
                    <span className="text-sm text-muted-foreground">156 문제</span>
                  </div>
                </div>
                <div className="group/subject hover:scale-105 transition-all duration-200 cursor-pointer">
                  <div className="h-20 p-4 rounded-xl border border-orange-200 hover:border-orange-400 bg-orange-50/50 hover:bg-orange-100/80 dark:bg-orange-950/20 dark:hover:bg-orange-950/40 dark:border-orange-800 dark:hover:border-orange-600 flex flex-col items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md">
                    <span className="font-semibold text-orange-600 dark:text-orange-400">사회</span>
                    <span className="text-sm text-muted-foreground">78 문제</span>
                  </div>
                </div>
              </div>
              <Button className="w-full group/btn" size="lg">
                <Trophy className="mr-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                세션 설정하기
                <ArrowRight className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>

          {/* Review Section */}
          <Card className="group hover:shadow-xl transition-all duration-500 border border-border/60 hover:border-primary/40 bg-gradient-to-br from-card via-primary/3 to-purple-50/30 dark:from-slate-900/80 dark:via-primary/8 dark:to-purple-950/30 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-purple-500/5 to-violet-500/10 dark:from-primary/20 dark:via-purple-500/10 dark:to-violet-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-xl">복습하기</CardTitle>
              </div>
              <CardDescription className="text-base">
                틀린 문제나 북마크한 문제를 다시 풀어보세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 relative">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="font-medium">오답 문제</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-2 py-1 rounded-full font-medium">12개</span>
                    <Button size="sm" variant="outline" className="hover:bg-red-50 hover:border-red-300 transition-colors">
                      복습
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="font-medium">북마크 문제</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded-full font-medium">8개</span>
                    <Button size="sm" variant="outline" className="hover:bg-yellow-50 hover:border-yellow-300 transition-colors">
                      복습
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-950/20 border border-gray-100 dark:border-gray-900/30 hover:shadow-md transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                    <span className="font-medium">스킵한 문제</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-medium">5개</span>
                    <Button size="sm" variant="outline" className="hover:bg-gray-50 hover:border-gray-300 transition-colors">
                      복습
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">주간 진도</span>
                  <span className="text-sm font-bold text-primary">68%</span>
                </div>
                <div className="relative">
                  <Progress value={68} className="h-3 bg-muted" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-full opacity-50"></div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">목표까지 32% 남음</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="mt-12">
          <Card className="border border-border/60 hover:border-primary/30 hover:shadow-lg transition-all duration-300 bg-gradient-to-br from-card via-slate-50/50 to-gray-50/50 dark:from-slate-900/50 dark:via-slate-800/30 dark:to-gray-900/50">
            <CardHeader>
              <CardTitle>최근 활동</CardTitle>
              <CardDescription>지난 학습 세션들의 결과를 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { subject: "수학", problems: 15, correct: 12, time: "25분" },
                  { subject: "과학", problems: 20, correct: 18, time: "32분" },
                  { subject: "영어", problems: 10, correct: 8, time: "18분" },
                ].map((session, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <div>
                        <span className="font-medium">{session.subject}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          {session.correct}/{session.problems} 정답
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {session.time}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
