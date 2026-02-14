# PATTERN: Command Palette (Cmd+K)
# Use for: Global search across all entities. Makes every app feel premium.
# Apply in: Stage 3+ (after CRUD exists)

## Setup
```bash
npx shadcn@latest add command dialog
```

## Implementation

```typescript
// src/components/command-palette.tsx
"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { Search } from "lucide-react"
// Import entity-specific icons

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = useCallback((command: () => void) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-9 p-0 xl:h-9 xl:w-60 xl:justify-start xl:px-3"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4 xl:mr-2" />
        <span className="hidden xl:inline text-sm text-muted-foreground">Search...</span>
        <kbd className="pointer-events-none hidden xl:inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted px-1.5 text-[10px] font-mono font-medium text-muted-foreground ml-auto">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search everything..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Add one CommandGroup per entity */}
          <CommandGroup heading="Projects">
            {/* Map search results here */}
            <CommandItem onSelect={() => runCommand(() => router.push("/projects/123"))}>
              <span>Project Name</span>
            </CommandItem>
          </CommandGroup>

          <CommandSeparator />

          {/* Quick Actions */}
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => runCommand(() => router.push("/projects/new"))}>
              + New Project
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
```

## Search Implementation Notes
- Debounce search input (300ms)
- Search across all entity names/titles via Supabase full-text search or ILIKE
- Group results by entity type
- Show max 5 results per group
- Include quick actions (create new, navigate to sections)
