# PATTERN: Notification System
# Use for: Toast notifications + dropdown notification center.
# Apply in: Stage 5+ (after events exist)

## Toast (already covered in infra-error-handling.md)
Use Sonner for transient notifications (success, error, info).

## Notification Center (Persistent)

```typescript
// src/components/notification-center.tsx
"use client"

import { useState } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { formatDistanceToNow } from "date-fns"

interface Notification {
  id: string
  title: string
  description: string
  read: boolean
  created_at: string
}

export function NotificationCenter({ notifications }: { notifications: Notification[] }) {
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="border-b border-border px-4 py-3">
          <h4 className="font-heading font-semibold text-sm">Notifications</h4>
        </div>
        <ScrollArea className="h-80">
          {notifications.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
                <p className="text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                <p className="text-xs text-muted-foreground mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</p>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
```

Place in the TopBar next to ThemeToggle.
