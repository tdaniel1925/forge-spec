# PATTERN: Error Handling
# Use for: Consistent error handling across the entire app.
# Apply in: Stage 2+ (all stages)

## Setup
```bash
npx shadcn@latest add sonner
```

## Toast Notifications (Sonner)

```typescript
// src/app/layout.tsx — add Toaster
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
```

```typescript
// Usage in components
import { toast } from "sonner"

// Success
toast.success("Project created successfully")

// Error
toast.error("Failed to create project")

// With description
toast.error("Upload failed", { description: "File size exceeds 10MB limit" })

// Promise-based (loading → success/error)
toast.promise(createProject(data), {
  loading: "Creating project...",
  success: "Project created!",
  error: "Failed to create project",
})
```

## Error Boundary

```typescript
// src/app/(dashboard)/error.tsx
"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-destructive/10 p-4 mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>
      <h2 className="text-lg font-heading font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mt-1">An unexpected error occurred.</p>
      <Button onClick={reset} className="mt-6">Try again</Button>
    </div>
  )
}
```

## Server Action Error Handling
Always use the Result pattern from infra-server-actions.md. In components:
```typescript
const result = await createProject(data)
if (!result.success) {
  toast.error(result.error)
  return
}
toast.success("Created!")
```
