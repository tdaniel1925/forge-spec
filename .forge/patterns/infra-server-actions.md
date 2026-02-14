# PATTERN: Server Actions
# Use for: Every database mutation. The standard pattern for all CRUD operations.
# Apply in: Stage 3 (one file per entity)

## Standard Action Template

```typescript
// src/lib/actions/[entity].ts
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createEntitySchema, updateEntitySchema } from "@/lib/schemas/entity"
import type { Result } from "@/types/common"
import type { Entity } from "@/types/entity"

// CREATE
export async function createEntity(input: unknown): Promise<Result<Entity>> {
  // 1. Validate input
  const parsed = createEntitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  // 2. Auth check
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  // 3. Permission check (against Gate 3)
  // const role = await getUserRole(user.id)
  // if (!canCreate(role, "entity")) return { success: false, error: "Forbidden" }

  // 4. Execute
  const { data, error } = await supabase
    .from("entities")
    .insert({ ...parsed.data, created_by: user.id })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // 5. Revalidate
  revalidatePath("/entities")

  return { success: true, data }
}

// READ (single)
export async function getEntity(id: string): Promise<Result<Entity>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("entities")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .single()

  if (error) return { success: false, error: error.message }
  return { success: true, data }
}

// READ (list)
export async function listEntities(params?: {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
}): Promise<Result<{ data: Entity[]; count: number }>> {
  const { page = 1, pageSize = 20, search, sortBy = "created_at", sortOrder = "desc" } = params ?? {}
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()
  let query = supabase
    .from("entities")
    .select("*", { count: "exact" })
    .is("archived_at", null)
    .order(sortBy, { ascending: sortOrder === "asc" })
    .range(from, to)

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data, error, count } = await query

  if (error) return { success: false, error: error.message }
  return { success: true, data: { data: data ?? [], count: count ?? 0 } }
}

// UPDATE
export async function updateEntity(id: string, input: unknown): Promise<Result<Entity>> {
  const parsed = updateEntitySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { data, error } = await supabase
    .from("entities")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath(`/entities/${id}`)
  revalidatePath("/entities")

  return { success: true, data }
}

// SOFT DELETE
export async function archiveEntity(id: string): Promise<Result<null>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: "Unauthorized" }

  const { error } = await supabase
    .from("entities")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)

  if (error) return { success: false, error: error.message }

  revalidatePath("/entities")

  return { success: true, data: null }
}
```

## Result Type
```typescript
// src/types/common.ts
export type Result<T> = { success: true; data: T } | { success: false; error: string }
```

## Rules
- ALWAYS validate with Zod before database operations
- ALWAYS check auth (getUser)
- ALWAYS check permissions against Gate 3
- NEVER throw errors — return `{ success: false, error }`
- ALWAYS revalidatePath after mutations
- ALWAYS set updated_at on updates
- ALWAYS set created_by on creates
- ALWAYS filter out archived_at IS NOT NULL on reads
- NEVER use .delete() — always soft delete with archived_at
