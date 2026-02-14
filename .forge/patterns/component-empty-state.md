# PATTERN: Empty State
# Use for: Every list/table when there's no data yet.
# Apply in: Stage 3 (all list views)

## Implementation

```typescript
// src/components/empty-state.tsx
import { Button } from "@/components/ui/button"
import { FolderOpen, Plus, FileText, Users, BarChart3, type LucideIcon } from "lucide-react"
import Link from "next/link"

const icons: Record<string, LucideIcon> = {
  folder: FolderOpen,
  file: FileText,
  users: Users,
  chart: BarChart3,
}

interface EmptyStateProps {
  icon?: keyof typeof icons
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
}

export function EmptyState({ icon = "folder", title, description, actionLabel, actionHref }: EmptyStateProps) {
  const Icon = icons[icon] ?? FolderOpen

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-heading font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">{description}</p>
      {actionLabel && actionHref && (
        <Button asChild className="mt-6">
          <Link href={actionHref}>
            <Plus className="mr-2 h-4 w-4" /> {actionLabel}
          </Link>
        </Button>
      )}
    </div>
  )
}
```

## Usage
```typescript
<EmptyState
  icon="folder"
  title="No projects yet"
  description="Create your first project to get started building."
  actionLabel="New Project"
  actionHref="/projects/new"
/>
```
