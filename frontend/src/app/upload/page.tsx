"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { UploadDropzone } from "@/components/upload-dropzone"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileText, CheckCircle, AlertCircle, ArrowRight, BookOpen } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { uploadPdf, startImport, getImportStatus } from "@/lib/api"

interface UploadStatus {
  jobId?: string
  status: 'idle' | 'uploading' | 'queued' | 'running' | 'done' | 'error'
  progress: number
  stage: string
  logs: string[]
  extractedCount: number
  errorMessage?: string
}

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
    progress: 0,
    stage: '',
    logs: [],
    extractedCount: 0
  })
  const { toast } = useToast()

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file)
    setUploadStatus({
      status: 'idle',
      progress: 0,
      stage: '',
      logs: [],
      extractedCount: 0
    })
  }, [])

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploadStatus(prev => ({ ...prev, status: 'uploading', progress: 0, stage: '파일 업로드 중...' }))

      // Upload file
      const { job_id } = await uploadPdf(selectedFile)

      setUploadStatus(prev => ({
        ...prev,
        jobId: job_id,
        status: 'queued',
        progress: 5,
        stage: '업로드 완료, 처리 대기 중...'
      }))

      // Start import process
      await startImport(job_id)

      // Start polling for status
      pollJobStatus(job_id)

      toast({
        title: "업로드 성공",
        description: "PDF 분석을 시작합니다."
      })

    } catch (error) {
      console.error('Upload error:', error)
      setUploadStatus(prev => ({
        ...prev,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      }))
      toast({
        title: "업로드 실패",
        description: error instanceof Error ? error.message : "업로드 중 오류가 발생했습니다.",
        variant: "destructive"
      })
    }
  }

  const pollJobStatus = async (jobId: string) => {
    const poll = async () => {
      try {
        const status = await getImportStatus(jobId)

        setUploadStatus(prev => ({
          ...prev,
          status: status.status,
          progress: status.progress,
          stage: status.stage,
          logs: status.logs || [],
          extractedCount: status.extracted_count || 0,
          errorMessage: status.error_message
        }))

        // Continue polling if not finished
        if (status.status === 'running' || status.status === 'queued') {
          setTimeout(poll, 2000) // Poll every 2 seconds
        } else if (status.status === 'done') {
          toast({
            title: "분석 완료",
            description: `${status.extracted_count}개의 문제가 추출되었습니다.`
          })
        } else if (status.status === 'error') {
          toast({
            title: "분석 실패",
            description: status.error_message || "알 수 없는 오류가 발생했습니다.",
            variant: "destructive"
          })
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    poll()
  }

  const handleRetry = () => {
    if (uploadStatus.jobId) {
      pollJobStatus(uploadStatus.jobId)
    }
  }

  const resetUpload = () => {
    setSelectedFile(null)
    setUploadStatus({
      status: 'idle',
      progress: 0,
      stage: '',
      logs: [],
      extractedCount: 0
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/20 dark:from-background dark:via-primary/10 dark:to-purple-950/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80">
                <Upload className="h-6 w-6 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                PDF 업로드
              </h1>
            </div>
            <Button variant="ghost" onClick={() => window.history.back()}>
              뒤로 가기
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Upload Section */}
          <AnimatePresence mode="wait">
            {uploadStatus.status === 'idle' && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <Card className="border border-border/60 hover:border-primary/30 bg-gradient-to-br from-card via-primary/3 to-purple-50/30 dark:from-slate-900/80 dark:via-primary/8 dark:to-purple-950/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      PDF 파일 업로드
                    </CardTitle>
                    <CardDescription>
                      문제가 포함된 PDF 파일을 업로드하여 자동으로 플래시카드를 생성하세요
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <UploadDropzone onFileSelect={handleFileSelect} selectedFile={selectedFile} />

                    {selectedFile && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-6 p-4 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-8 w-8 text-primary" />
                            <div>
                              <p className="font-medium">{selectedFile.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" onClick={resetUpload}>
                              제거
                            </Button>
                            <Button onClick={handleUpload} className="group">
                              분석 시작
                              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {(uploadStatus.status !== 'idle') && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Progress Card */}
                <Card className="border border-border/60 bg-gradient-to-br from-card via-primary/3 to-purple-50/30 dark:from-slate-900/80 dark:via-primary/8 dark:to-purple-950/30">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {uploadStatus.status === 'done' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : uploadStatus.status === 'error' ? (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        ) : (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          >
                            <Upload className="h-5 w-5 text-primary" />
                          </motion.div>
                        )}
                        PDF 분석 진행상황
                      </CardTitle>
                      <Badge variant={
                        uploadStatus.status === 'done' ? 'default' :
                        uploadStatus.status === 'error' ? 'destructive' : 'secondary'
                      }>
                        {uploadStatus.status === 'uploading' ? '업로드 중' :
                         uploadStatus.status === 'queued' ? '대기 중' :
                         uploadStatus.status === 'running' ? '분석 중' :
                         uploadStatus.status === 'done' ? '완료' : '오류'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{uploadStatus.stage || '준비 중...'}</span>
                        <span>{uploadStatus.progress}%</span>
                      </div>
                      <Progress value={uploadStatus.progress} className="h-3" />
                    </div>

                    {uploadStatus.status === 'done' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                          <CheckCircle className="h-5 w-5" />
                          <span className="font-medium">
                            분석 완료! {uploadStatus.extractedCount}개의 문제가 추출되었습니다.
                          </span>
                        </div>
                        <Button className="mt-3 w-full" onClick={() => window.location.href = '/study'}>
                          <BookOpen className="mr-2 h-4 w-4" />
                          학습 시작하기
                        </Button>
                      </motion.div>
                    )}

                    {uploadStatus.status === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800"
                      >
                        <div className="flex items-center gap-2 text-red-700 dark:text-red-300 mb-2">
                          <AlertCircle className="h-5 w-5" />
                          <span className="font-medium">분석 실패</span>
                        </div>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-3">
                          {uploadStatus.errorMessage || '알 수 없는 오류가 발생했습니다.'}
                        </p>
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={handleRetry} className="flex-1">
                            다시 시도
                          </Button>
                          <Button onClick={resetUpload} className="flex-1">
                            새 파일 업로드
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>

                {/* Logs Card */}
                {uploadStatus.logs.length > 0 && (
                  <Card className="border border-border/60 bg-gradient-to-br from-card via-slate-50/30 to-gray-50/30 dark:from-slate-900/50 dark:via-slate-800/30 dark:to-gray-900/50">
                    <CardHeader>
                      <CardTitle className="text-lg">처리 로그</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted/50 rounded-lg p-4 max-h-60 overflow-y-auto font-mono text-sm">
                        {uploadStatus.logs.map((log, index) => (
                          <div key={index} className="py-1 border-b border-border/30 last:border-0">
                            {log}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}