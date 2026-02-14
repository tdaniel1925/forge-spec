# PATTERN: Search & Filter
# Use for: URL-based search with debounce and filter chips.
# Apply in: Stage 3 (list pages)

## URL-Based Search (persists across navigation)

```typescript
// src/hooks/use-search-params-state.ts
"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useMemo } from "react"

export function useSearchParamsState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback((key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === "") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    params.delete("page") // Reset pagination on filter change
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname, searchParams])

  const getParam = useCallback((key: string) => {
    return searchParams.get(key)
  }, [searchParams])

  return { setParam, getParam, searchParams }
}
```

## Debounced Search Input
```typescript
"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { useSearchParamsState } from "@/hooks/use-search-params-state"

export function SearchInput() {
  const { setParam, getParam } = useSearchParamsState()
  const [value, setValue] = useState(getParam("search") ?? "")

  useEffect(() => {
    const timeout = setTimeout(() => setParam("search", value), 300)
    return () => clearTimeout(timeout)
  }, [value, setParam])

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        placeholder="Search..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="pl-9"
      />
    </div>
  )
}
```

## Filter Chips
```typescript
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

export function ActiveFilters({ filters, onRemove }: { filters: { key: string; label: string }[]; onRemove: (key: string) => void }) {
  if (filters.length === 0) return null
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {filters.map((f) => (
        <Badge key={f.key} variant="secondary" className="gap-1 cursor-pointer" onClick={() => onRemove(f.key)}>
          {f.label}
          <X className="h-3 w-3" />
        </Badge>
      ))}
    </div>
  )
}
```
