# PATTERN: Pagination
# Use for: List pages with many records.
# Apply in: Stage 3 (list views)

## Offset Pagination

```typescript
// In server action
const { page = 1, pageSize = 20 } = params
const from = (page - 1) * pageSize
const to = from + pageSize - 1

const { data, count } = await supabase
  .from("entities")
  .select("*", { count: "exact" })
  .range(from, to)
```

## Pagination Component

```typescript
// src/components/pagination-controls.tsx
"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useSearchParamsState } from "@/hooks/use-search-params-state"

interface PaginationProps {
  totalCount: number
  pageSize?: number
}

export function PaginationControls({ totalCount, pageSize = 20 }: PaginationProps) {
  const { getParam, setParam } = useSearchParamsState()
  const currentPage = Number(getParam("page") ?? "1")
  const totalPages = Math.ceil(totalCount / pageSize)
  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalCount)

  return (
    <div className="flex items-center justify-between pt-4">
      <p className="text-sm text-muted-foreground">
        Showing {from}–{to} of {totalCount}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline" size="sm"
          disabled={currentPage <= 1}
          onClick={() => setParam("page", String(currentPage - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline" size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => setParam("page", String(currentPage + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
```
