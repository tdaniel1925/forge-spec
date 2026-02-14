# PATTERN: React Hook Form + Zod
# Use for: Every form in the app.
# Apply in: Stage 3 (create/edit forms)

## Setup
```bash
npm install react-hook-form @hookform/resolvers zod
npx shadcn@latest add form input label select textarea checkbox switch
```

## Standard Form Component

```typescript
// src/components/[entity]/entity-form.tsx
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { createProjectSchema, type CreateProjectInput } from "@/lib/schemas/project"
import { createProject } from "@/lib/actions/project"

interface EntityFormProps {
  defaultValues?: Partial<CreateProjectInput>
  entityId?: string // If present, this is an edit form
}

export function EntityForm({ defaultValues, entityId }: EntityFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      description: "",
      ...defaultValues,
    },
  })

  async function onSubmit(data: CreateProjectInput) {
    setIsSubmitting(true)
    try {
      const result = entityId
        ? await updateProject(entityId, data)
        : await createProject(data)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success(entityId ? "Updated successfully" : "Created successfully")
      router.push(`/projects/${result.data.id}`)
      router.refresh()
    } catch (error) {
      toast.error("Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Text field */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter name..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Textarea */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe..." rows={4} {...field} />
              </FormControl>
              <FormDescription>Optional description.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Select */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {entityId ? "Save Changes" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
```

## Rules
- Every form uses `react-hook-form` + `zodResolver`
- Every form shows field-level errors via `<FormMessage />`
- Every form has loading state on submit button
- Every form shows success/error toast on completion
- Cancel always goes `router.back()`
- Two-column layout for short fields: wrap in `<div className="grid grid-cols-1 md:grid-cols-2 gap-4">`
