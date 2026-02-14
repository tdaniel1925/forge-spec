# PATTERN: Status Badge
# Use for: Consistent status indicators across all entities.
# Apply in: Stage 3+ (list views, detail views)

## Implementation

```typescript
// src/components/status-badge.tsx
import { cn } from "@/lib/utils"

type StatusVariant = "success" | "warning" | "error" | "info" | "default" | "primary"

const variants: Record<StatusVariant, string> = {
  success: "bg-success/10 text-success dark:bg-success/20",
  warning: "bg-warning/10 text-warning dark:bg-warning/20",
  error: "bg-destructive/10 text-destructive dark:bg-destructive/20",
  info: "bg-info/10 text-info dark:bg-info/20",
  primary: "bg-primary/10 text-primary dark:bg-primary/20",
  default: "bg-muted text-muted-foreground",
}

interface StatusBadgeProps {
  label: string
  variant: StatusVariant
  dot?: boolean
}

export function StatusBadge({ label, variant, dot = true }: StatusBadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
      variants[variant]
    )}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {label}
    </span>
  )
}
```

## Standard Status Mapping
Create a helper per entity that maps status strings to variants:
```typescript
export function getProjectStatusVariant(status: string): StatusVariant {
  const map: Record<string, StatusVariant> = {
    active: "success",
    drafting: "warning",
    building: "info",
    completed: "primary",
    failed: "error",
    archived: "default",
  }
  return map[status] ?? "default"
}
```
