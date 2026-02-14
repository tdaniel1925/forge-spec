# PATTERN: Sidebar Navigation
# Use for: Main app navigation in the sidebar.
# Apply in: Stage 3+ (app shell)

## Implementation

```typescript
// src/components/sidebar-nav.tsx
"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
// Import relevant Lucide icons for nav items

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

interface NavSection {
  title?: string
  items: NavItem[]
}

export function SidebarNav({ sections }: { sections: NavSection[] }) {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 256 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      className="fixed left-0 top-16 bottom-0 z-40 border-r border-border bg-card overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {sections.map((section, i) => (
            <div key={i} className="space-y-1">
              {section.title && !collapsed && (
                <p className="px-3 py-2 text-xs font-medium tracking-wide uppercase text-muted-foreground">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <AnimatePresence>
                      {!collapsed && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="icon"
            className="w-full h-9"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </motion.aside>
  )
}
```
