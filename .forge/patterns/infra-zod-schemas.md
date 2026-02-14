# PATTERN: Zod Schemas
# Use for: Input validation on every server action and form.
# Apply in: Stage 3+ (all mutations)

## Reusable Schema Fragments

```typescript
// src/lib/schemas/common.ts
import { z } from "zod"

export const emailSchema = z.string().email("Invalid email address").min(1, "Email is required")
export const phoneSchema = z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number").optional()
export const urlSchema = z.string().url("Invalid URL").optional()
export const currencySchema = z.number().min(0, "Must be positive").multipleOf(0.01, "Max 2 decimal places")
export const dateSchema = z.string().datetime("Invalid date")
export const uuidSchema = z.string().uuid("Invalid ID")
export const nameSchema = z.string().min(1, "Name is required").max(255, "Name too long")
export const descriptionSchema = z.string().max(5000, "Description too long").optional()
export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug")

// Date range validation
export const dateRangeSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
}).refine(data => new Date(data.to) > new Date(data.from), {
  message: "End date must be after start date",
  path: ["to"],
})

// Pagination params
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
})
```

## Entity Schema Pattern
```typescript
// src/lib/schemas/[entity].ts
import { z } from "zod"
import { nameSchema, descriptionSchema } from "./common"

// Create schema — only user-provided fields
export const createProjectSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
  // ... fields from PROJECT-SPEC.md Gate 1
})

// Update schema — all optional (partial update)
export const updateProjectSchema = createProjectSchema.partial()

// Share types
export type CreateProjectInput = z.infer<typeof createProjectSchema>
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>
```
