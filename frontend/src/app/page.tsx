"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { UploadDropzone } from "@/components/upload-dropzone"
import { BookOpen, Brain, Upload, Play, Clock, CheckCircle, FileText, Plus } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import { motion, AnimatePresence } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { uploadPdf, startImport, getImportStatus, getSessions, type SessionResponse } from "@/lib/api"

interface Session {
  id: number
  name: string
  source_doc_id: string
  status: 'active' | 'paused' | 'completed'
  current_problem_index: number
  total_problems: number
  created_at: string
  last_accessed_at?: string
  progress: {
    completed_count: number
    skipped_count: number
    bookmarked_count: number
    progress_percentage: number
  }
}

export default function HomePage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<{
    status: 'idle' | 'uploading' | 'processing'
    progress: number
    stage: string
  }>({
    status: 'idle',
    progress: 0,
    stage: ''
  })
  const { toast } = useToast()

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
  }

  const handleQuickUpload = async () => {
    if (!selectedFile) return

    try {
      setUploadStatus({ status: 'uploading', progress: 0, stage: '파일 업로드 중...' })

      const { job_id } = await uploadPdf(selectedFile)
      await startImport(job_id)

      setUploadStatus({ status: 'processing', progress: 50, stage: '문제 분석 중...' })

      // Poll for completion
      const poll = async () => {
        try {
          const status = await getImportStatus(job_id)
          setUploadStatus({
            status: 'processing',
            progress: status.progress,
            stage: status.stage
          })

          if (status.status === 'done') {
            setUploadStatus({ status: 'idle', progress: 0, stage: '' })
            setSelectedFile(null)
            toast({
              title: "업로드 완료",
              description: `${status.extracted_count}개의 문제가 추출되어 새 학습 세션이 생성되었습니다.`
            })
            // Refresh sessions list
            loadSessions()
          } else if (status.status === 'error') {
            setUploadStatus({ status: 'idle', progress: 0, stage: '' })
            toast({
              title: "업로드 실패",
              description: status.error_message || "알 수 없는 오류가 발생했습니다.",
              variant: "destructive"
            })
          } else {
            setTimeout(poll, 2000)
          }
        } catch (error) {
          console.error('Polling error:', error)
        }
      }
      poll()

    } catch (error) {
      setUploadStatus({ status: 'idle', progress: 0, stage: '' })
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    }
  }

  const loadSessions = async () => {
    try {
      const response = await getSessions({ limit: 20 })
      setSessions(response.sessions.map(session => ({
        id: session.id,
        name: session.name,
        source_doc_id: session.source_doc_id,
        status: session.status,
        current_problem_index: session.current_problem_index,
        total_problems: session.total_problems,
        created_at: session.created_at,
        last_accessed_at: session.last_accessed_at,
        progress: session.progress
      })))
    } catch (error) {
      console.error('Failed to load sessions:', error)
      // Fallback to mock data for development
      setSessions([
        {
          id: 1,
          name: "수학 문제집.pdf 학습",
          source_doc_id: "doc-1",
          status: 'active',
          current_problem_index: 5,
          total_problems: 25,
          created_at: "2024-01-15T10:30:00Z",
          last_accessed_at: "2024-01-15T14:20:00Z",
          progress: {
            current_index: 5,
            total_problems: 25,
            completed_count: 5,
            skipped_count: 2,
            bookmarked_count: 3,
            progress_percentage: 20
          }
        },
        {
          id: 2,
          name: "영어 독해.pdf 학습",
          source_doc_id: "doc-2",
          status: 'paused',
          current_problem_index: 12,
          total_problems: 30,
          created_at: "2024-01-14T09:15:00Z",
          last_accessed_at: "2024-01-14T16:45:00Z",
          progress: {
            current_index: 12,
            total_problems: 30,
            completed_count: 10,
            skipped_count: 1,
            bookmarked_count: 5,
            progress_percentage: 33
          }
        }
      ])
    }
  }

  useEffect(() => {
    loadSessions()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'paused': return 'bg-yellow-500'
      case 'completed': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '진행중'
      case 'paused': return '일시정지'
      case 'completed': return '완료'
      default: return '알 수 없음'
    }
  }
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
                복습하기
              </Button>
              <Button variant="ghost" className="hover:bg-primary/10 transition-all duration-200" onClick={() => window.location.href = '/upload'}>
                상세 업로드
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
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card className="border border-border/60 hover:border-primary/30 bg-gradient-to-br from-card via-primary/3 to-purple-50/30 dark:from-slate-900/80 dark:via-primary/8 dark:to-purple-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-primary" />
                빠른 업로드
              </CardTitle>
              <CardDescription>
                PDF 문제집을 드래그하여 즉시 학습 세션을 만드세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <UploadDropzone onFileSelect={handleFileSelect} selectedFile={selectedFile} />

                {selectedFile && uploadStatus.status === 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="flex items-center justify-between p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <span className="font-medium">{selectedFile.name}</span>
                    </div>
                    <Button onClick={handleQuickUpload} size="sm">
                      분석 시작
                    </Button>
                  </motion.div>
                )}

                {uploadStatus.status !== 'idle' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-3"
                  >
                    <div className="flex justify-between text-sm">
                      <span>{uploadStatus.stage}</span>
                      <span>{uploadStatus.progress}%</span>
                    </div>
                    <Progress value={uploadStatus.progress} className="h-2" />
                  </motion.div>
                )}

                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pt-2">
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    자동 OCR
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    문제 추출
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    세션 생성
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border border-border/60 hover:border-primary/30 bg-gradient-to-br from-card via-orange-50/30 to-amber-50/30 dark:from-slate-900/80 dark:via-orange-950/20 dark:to-amber-950/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                빠른 시작
              </CardTitle>
              <CardDescription>
                기존 문제로 바로 학습을 시작하거나 복습하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start h-12" onClick={() => window.location.href = '/study'}>
                <BookOpen className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">랜덤 문제 풀기</div>
                  <div className="text-xs text-muted-foreground">모든 문제에서 랜덤 선택</div>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12">
                <Clock className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">복습하기</div>
                  <div className="text-xs text-muted-foreground">틀린 문제와 북마크 문제</div>
                </div>
              </Button>
              <Button variant="outline" className="w-full justify-start h-12" onClick={() => window.location.href = '/upload'}>
                <Upload className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">상세 업로드</div>
                  <div className="text-xs text-muted-foreground">업로드 옵션과 진행상황 보기</div>
                </div>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Learning Sessions */}
        <div className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">내 학습 세션</h2>
            <Badge variant="secondary" className="text-sm">
              {sessions.length}개 세션
            </Badge>
          </div>

          <AnimatePresence>
            {sessions.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-12"
              >
                <FileText className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  아직 학습 세션이 없습니다
                </h3>
                <p className="text-muted-foreground mb-4">
                  PDF를 업로드하여 첫 번째 학습 세션을 만들어보세요
                </p>
                <Button onClick={() => setSelectedFile(null)}>
                  <Upload className="mr-2 h-4 w-4" />
                  PDF 업로드하기
                </Button>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sessions.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="border border-border/60 hover:border-primary/30 bg-gradient-to-br from-card via-slate-50/30 to-gray-50/30 dark:from-slate-900/50 dark:via-slate-800/30 dark:to-gray-900/50 hover:shadow-lg transition-all duration-300 group cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <BookOpen className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-lg line-clamp-1">
                                {session.name}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1">
                                <div className={`w-2 h-2 rounded-full ${getStatusColor(session.status)}`}></div>
                                <span className="text-sm text-muted-foreground">
                                  {getStatusText(session.status)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                            {Math.round(session.progress.progress_percentage)}%
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>진행률</span>
                              <span>{session.current_problem_index + 1} / {session.total_problems}</span>
                            </div>
                            <Progress value={session.progress.progress_percentage} className="h-2" />
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-center">
                            <div>
                              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                                {session.progress.completed_count}
                              </div>
                              <div className="text-xs text-muted-foreground">완료</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                                {session.progress.skipped_count}
                              </div>
                              <div className="text-xs text-muted-foreground">스킵</div>
                            </div>
                            <div>
                              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {session.progress.bookmarked_count}
                              </div>
                              <div className="text-xs text-muted-foreground">북마크</div>
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button className="flex-1 group/btn" size="sm" onClick={() => window.location.href = `/study?session=${session.id}`}>
                              <Play className="mr-2 h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                              {session.status === 'completed' ? '다시 풀기' : '계속하기'}
                            </Button>
                            <Button variant="outline" size="sm">
                              <Clock className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {session.last_accessed_at ?
                              `마지막 접속: ${new Date(session.last_accessed_at).toLocaleDateString('ko-KR')}` :
                              `생성: ${new Date(session.created_at).toLocaleDateString('ko-KR')}`
                            }
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
