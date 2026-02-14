# PATTERN: Form Page Layout
# Use for: Every create and edit page.
# Apply in: Stage 3 (CRUD forms)
# Dependencies: infra-forms.md, infra-zod-schemas.md

## Structure
```
[ ← Back ]
[ Form Title ]
[ Form Section 1 ]
  [ Field ] [ Field ]
  [ Field ]
[ Form Section 2 ]
  [ Field ] [ Field ]
[ Cancel ] [ Submit ]
```

## Implementation

```typescript
// src/app/(dashboard)/[entity]/new/page.tsx
"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EntityForm } from "@/components/[entity]/entity-form"
import Link from "next/link"

export default function CreateEntityPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-2xl space-y-6"
    >
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/projects">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
        </Link>
      </Button>

      {/* Title */}
      <div>
        <h1 className="text-3xl font-heading font-bold tracking-tight">New Project</h1>
        <p className="text-sm text-muted-foreground mt-1">Fill in the details to create a new project</p>
      </div>

      {/* Form Sections */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">General Information</CardTitle>
        </CardHeader>
        <CardContent>
          <EntityForm />
        </CardContent>
      </Card>

      {/* Additional sections as separate cards */}
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg">Settings</CardTitle>
        </CardHeader>
        <CardContent>
          {/* More fields */}
        </CardContent>
      </Card>
    </motion.div>
  )
}
```

## Form Layout Rules
- Max width: `max-w-2xl` for forms (don't stretch full width)
- Group related fields in Card sections
- Two-column grid for short fields: `grid grid-cols-1 md:grid-cols-2 gap-4`
- Single column for long fields (textarea, rich text)
- Field gap: `space-y-4` within sections
- Submit bar: sticky bottom on long forms, or at card bottom for short forms
- Always show Cancel + Submit buttons
- Submit button on the right: `flex justify-end gap-3`
