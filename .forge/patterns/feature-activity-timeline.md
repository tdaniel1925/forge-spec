# PATTERN: Activity Timeline
# Use for: Showing chronological events (who did what when).
# Apply in: Stage 5 (maps directly to the PRD-Forge event system)

## Implementation

```typescript
// src/components/activity-timeline.tsx
"use client"

import { motion } from "framer-motion"
import { formatDistanceToNow } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Plus, Pencil, Trash2, CheckCircle, AlertCircle, Upload, UserPlus,
  type LucideIcon
} from "lucide-react"

interface TimelineEvent {
  id: string
  event_type: string
  actor_name: string
  entity_type: string
  entity_name?: string
  created_at: string
  payload?: Record<string, any>
}

const eventConfig: Record<string, { icon: LucideIcon; color: string; label: string }> = {
  created: { icon: Plus, color: "text-success", label: "created" },
  updated: { icon: Pencil, color: "text-info", label: "updated" },
  archived: { icon: Trash2, color: "text-destructive", label: "archived" },
  completed: { icon: CheckCircle, color: "text-primary", label: "completed" },
  failed: { icon: AlertCircle, color: "text-destructive", label: "failed" },
  uploaded: { icon: Upload, color: "text-info", label: "uploaded" },
  assigned: { icon: UserPlus, color: "text-warning", label: "assigned" },
}

function getEventConfig(eventType: string) {
  const action = eventType.split(".").pop() ?? "created"
  return eventConfig[action] ?? eventConfig.created
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.03 } }
}
const item = {
  hidden: { opacity: 0, x: -10 },
  show: { opacity: 1, x: 0 }
}

export function ActivityTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-0">
      {events.map((event, i) => {
        const config = getEventConfig(event.event_type)
        const Icon = config.icon

        return (
          <motion.div key={event.id} variants={item} className="flex gap-4">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={cn("flex items-center justify-center w-8 h-8 rounded-full bg-muted shrink-0", config.color)}>
                <Icon className="h-4 w-4" />
              </div>
              {i < events.length - 1 && <div className="w-px flex-1 bg-border" />}
            </div>

            {/* Content */}
            <div className="pb-6 pt-1">
              <p className="text-sm">
                <span className="font-medium">{event.actor_name}</span>
                {" "}{config.label}{" "}
                <span className="font-medium">{event.entity_name ?? event.entity_type}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
              </p>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
```

## Usage
```typescript
// On detail pages or dashboard
<Card>
  <CardHeader>
    <CardTitle className="font-heading">Activity</CardTitle>
  </CardHeader>
  <CardContent>
    <ActivityTimeline events={events} />
  </CardContent>
</Card>
```

## Maps to Stage 5 Events
The `event_type` field matches the dot-separated event types from BUILD-STAGES.md Stage 5:
`project.created`, `task.status.changed`, `document.uploaded`, etc.
