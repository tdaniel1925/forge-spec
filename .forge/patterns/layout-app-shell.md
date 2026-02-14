# PATTERN: App Shell Layout
# Use for: Main app wrapper with sidebar navigation, topbar, and content area.
# Apply in: Stage 3+ (any stage producing authenticated UI)

## Structure
```
┌──────────────────────────────────────────┐
│ TopBar: logo, search (Cmd+K), theme, user│
├────────────┬─────────────────────────────┤
│ Sidebar    │ Main Content                │
│ w-64/w-16  │ max-w-7xl mx-auto           │
│ fixed      │ px-6 py-8                   │
│ collapsible│ scrollable                  │
└────────────┴─────────────────────────────┘
```

## Implementation

### Dashboard Layout
```typescript
// src/app/(dashboard)/layout.tsx
import { SidebarNav } from "@/components/sidebar-nav"
import { TopBar } from "@/components/top-bar"
import { ThemeProvider } from "@/components/theme-provider"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="flex">
          <SidebarNav />
          <main className="flex-1 ml-64 pt-16">
            <div className="max-w-7xl mx-auto px-6 py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ThemeProvider>
  )
}
```

### TopBar
```typescript
// src/components/top-bar.tsx
"use client"

import { CommandPalette } from "@/components/command-palette"
import { ThemeToggle } from "@/components/theme-toggle"
import { UserMenu } from "@/components/user-menu"

export function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <span className="text-lg font-heading font-bold">AppName</span>
        </div>
        <div className="flex items-center gap-2">
          <CommandPalette />
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  )
}
```

### Responsive Rules
- Below `md`: sidebar hidden, hamburger menu toggle opens as sheet/drawer
- `md` to `lg`: sidebar collapsed (icons only, w-16)
- Above `lg`: sidebar expanded (w-64)
- Content area: always `flex-1`, adjust `ml-` based on sidebar state
