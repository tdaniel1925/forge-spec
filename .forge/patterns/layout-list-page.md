# PATTERN: List Page Layout
# Use for: Every entity list view with table, filters, search, and pagination.
# Apply in: Stage 3 (CRUD list views)

## Structure
```
[ Page Title ]                              [ + Create Button ]
[ Search Input ] [ Filter Chips ] [ View Toggle: Table/Cards ]
[ Data Table or Card Grid ]
[ Pagination: Showing 1-10 of 50 ]
```

## Implementation

```typescript
// src/app/(dashboard)/[entity]/page.tsx
"use client"

import { motion } from "framer-motion"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTable } from "@/components/[entity]/data-table"
import { EmptyState } from "@/components/empty-state"
import Link from "next/link"

export default function EntityListPage() {
  const { data, isLoading } = useEntityList()

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your projects</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" /> New Project
          </Link>
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9" />
        </div>
        {/* Filter chips/dropdowns here */}
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={5} columns={4} />
      ) : data.length === 0 ? (
        <EmptyState
          icon="folder"
          title="No projects yet"
          description="Create your first project to get started"
          actionLabel="New Project"
          actionHref="/projects/new"
        />
      ) : (
        <DataTable data={data} columns={columns} />
      )}
    </motion.div>
  )
}
```

## Page Header Pattern
Always include:
- Title (text-3xl font-heading font-bold tracking-tight)
- Optional subtitle (text-sm text-muted-foreground mt-1)
- Primary action button (top right)
