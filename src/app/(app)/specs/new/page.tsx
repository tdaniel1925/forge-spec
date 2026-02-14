'use client'

// Create new spec page
// Simple form to create a new spec project

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { createSpecProject } from '@/lib/actions/spec_project'

export default function NewSpecPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error } = await createSpecProject({
        name: formData.name,
        description: formData.description || null,
      })

      if (error) {
        setError(error)
        setLoading(false)
        return
      }

      if (data) {
        router.push(`/specs/${data.id}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create spec')
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-neutral-900 dark:text-neutral-100 mb-2">
            Create New Spec
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Tell us about your app idea and we'll help you create a detailed specification
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="name" required>
                Spec Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Email Client, Task Manager, CRM System"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="description">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Briefly describe what you want to build..."
                disabled={loading}
                rows={6}
              />
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-500">
                You'll be able to provide more details in the AI-guided conversation after creating the spec.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={loading || !formData.name}>
                {loading ? 'Creating...' : 'Create Spec'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
