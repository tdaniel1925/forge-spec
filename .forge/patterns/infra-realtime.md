# PATTERN: Supabase Realtime
# Use for: Live updates on data changes without polling.
# Apply in: Stage 5+ (after events exist)

## Hook Pattern

```typescript
// src/hooks/use-realtime.ts
"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

export function useRealtimeTable(table: string, filter?: string) {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-changes`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter,
        },
        () => {
          router.refresh() // Re-fetch server components
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter, router, supabase])
}
```

## Usage
```typescript
// In a client component on a list page
export function ProjectList({ projects }: { projects: Project[] }) {
  useRealtimeTable("projects") // Auto-refreshes when projects table changes

  return (
    <div>{projects.map(p => <ProjectCard key={p.id} project={p} />)}</div>
  )
}
```

## Enable in Supabase
Realtime must be enabled per table in Supabase dashboard:
Database → Replication → Enable for specific tables.
