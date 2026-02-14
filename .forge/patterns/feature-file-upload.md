# PATTERN: File Upload
# Use for: Document uploads, image uploads, drag and drop.
# Apply in: Stage 3+ (entities with file attachments)

## Implementation

```typescript
// src/components/file-upload.tsx
"use client"

import { useCallback, useState } from "react"
import { Upload, X, FileText, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface FileUploadProps {
  bucket: string
  folder?: string
  accept?: string
  maxSizeMB?: number
  onUpload: (url: string, filename: string) => void
}

export function FileUpload({ bucket, folder = "", accept, maxSizeMB = 10, onUpload }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadedFile, setUploadedFile] = useState<{ name: string; url: string } | null>(null)

  const handleUpload = useCallback(async (file: File) => {
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File must be under ${maxSizeMB}MB`)
      return
    }

    setIsUploading(true)
    const supabase = createClient()
    const path = folder ? `${folder}/${Date.now()}-${file.name}` : `${Date.now()}-${file.name}`

    const { data, error } = await supabase.storage.from(bucket).upload(path, file)

    if (error) {
      toast.error("Upload failed")
      setIsUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path)
    setUploadedFile({ name: file.name, url: publicUrl })
    onUpload(publicUrl, file.name)
    setIsUploading(false)
    toast.success("File uploaded")
  }, [bucket, folder, maxSizeMB, onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleUpload(file)
  }, [handleUpload])

  if (uploadedFile) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/50">
        <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
        <span className="text-sm truncate flex-1">{uploadedFile.name}</span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setUploadedFile(null)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer",
        isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
      )}
      onClick={() => {
        const input = document.createElement("input")
        input.type = "file"
        if (accept) input.accept = accept
        input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (file) handleUpload(file)
        }
        input.click()
      }}
    >
      {isUploading ? (
        <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
      ) : (
        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
      )}
      <p className="text-sm text-muted-foreground mt-2">
        {isUploading ? "Uploading..." : "Drag & drop or click to upload"}
      </p>
      <p className="text-xs text-muted-foreground mt-1">Max {maxSizeMB}MB</p>
    </div>
  )
}
```

## Usage
```typescript
<FileUpload
  bucket="documents"
  folder={`projects/${projectId}`}
  accept=".pdf,.doc,.docx"
  maxSizeMB={25}
  onUpload={(url, name) => setFileUrl(url)}
/>
```
