"use client"

import { useCallback, useState } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { FileText, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface UploadDropzoneProps {
  onFileSelect: (file: File | null) => void
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
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setError(null)

    if (rejectedFiles.length > 0) {
      const code = rejectedFiles[0].errors?.[0]?.code
      if (code === "file-too-large") {
        setError(`파일이 너무 큽니다. 최대 ${maxSize}MB.`)
      } else if (code === "file-invalid-type") {
        setError("PDF 파일만 올릴 수 있습니다.")
      } else {
        setError("파일을 읽지 못했습니다.")
      }
      return
    }

    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0])
    }
  }, [onFileSelect, maxSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    maxSize: maxSize * 1024 * 1024,
    multiple: false
  })

  const removeFile = () => {
    setError(null)
    onFileSelect(null)
  }

  if (selectedFile) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-secondary px-4 py-3">
        <FileText className="h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{selectedFile.name}</p>
          <p className="text-xs text-muted-foreground">
            {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={removeFile}
          className="h-8 w-8 shrink-0 p-0 text-muted-foreground"
          aria-label="파일 제거"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed py-10 text-sm transition-colors",
          isDragActive ? "border-primary bg-secondary" : "border-border hover:border-primary/50 hover:bg-muted"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-5 w-5 text-primary" />
        <span className={isDragActive ? "text-primary" : "text-muted-foreground"}>
          {isDragActive ? "여기에 놓으세요" : `PDF를 끌어다 놓거나 클릭 (최대 ${maxSize}MB)`}
        </span>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
