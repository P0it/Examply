"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { motion } from "framer-motion"
import { Upload, FileText, X, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface UploadDropzoneProps {
  onFileSelect: (file: File) => void
  selectedFile: File | null
  maxSize?: number // in MB
  accept?: string[]
}

export function UploadDropzone({
  onFileSelect,
  selectedFile,
  maxSize = 50,
  accept = ["application/pdf"]
}: UploadDropzoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null)
    setDragActive(false)

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0]
      if (rejection.errors?.[0]?.code === "file-too-large") {
        setError(`파일 크기가 너무 큽니다. 최대 ${maxSize}MB까지 업로드 가능합니다.`)
      } else if (rejection.errors?.[0]?.code === "file-invalid-type") {
        setError("PDF 파일만 업로드 가능합니다.")
      } else {
        setError("파일 업로드에 실패했습니다.")
      }
      return
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect, maxSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: {
      'application/pdf': ['.pdf']
    },
    maxSize: maxSize * 1024 * 1024, // Convert MB to bytes
    multiple: false
  })

  const removeFile = () => {
    setError(null)
    onFileSelect(null as any)
  }

  return (
    <div className="space-y-4">
      <motion.div
        {...getRootProps()}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
          "hover:border-primary/50 hover:bg-primary/5",
          dragActive || isDragActive
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-border/60",
          selectedFile && "border-green-300 bg-green-50/50 dark:bg-green-950/20"
        )}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input {...getInputProps()} />

        <motion.div
          className="space-y-4"
          animate={{
            scale: dragActive || isDragActive ? 1.05 : 1,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          {selectedFile ? (
            <div className="space-y-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex justify-center"
              >
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <FileText className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
              </motion.div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">
                  {selectedFile.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  removeFile()
                }}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                제거
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <motion.div
                className="flex justify-center"
                animate={{
                  y: dragActive || isDragActive ? -5 : 0,
                }}
              >
                <div className={cn(
                  "p-4 rounded-full transition-colors",
                  dragActive || isDragActive
                    ? "bg-primary/20"
                    : "bg-primary/10"
                )}>
                  <Upload className={cn(
                    "h-8 w-8 transition-colors",
                    dragActive || isDragActive
                      ? "text-primary"
                      : "text-primary/70"
                  )} />
                </div>
              </motion.div>

              <div>
                <p className="text-lg font-medium">
                  {dragActive || isDragActive
                    ? "파일을 여기에 놓으세요"
                    : "PDF 파일을 드래그하거나 클릭하여 업로드"
                  }
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  최대 {maxSize}MB까지 지원됩니다
                </p>
              </div>

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
                  즉시 학습
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg"
        >
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </motion.div>
      )}
    </div>
  )
}