'use client'

// User settings/profile page

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getCurrentUser, updateUser } from '@/lib/actions/user'
import { LoadingPage } from '@/components/ui/loading-spinner'
import type { User } from '@/types/user'

export default function SettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    avatar_url: '',
  })

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)
    setFormData({
      name: currentUser.name || '',
      avatar_url: currentUser.avatar_url || '',
    })
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    const { data, error } = await updateUser(user.id, {
      name: formData.name || undefined,
      avatar_url: formData.avatar_url || null,
    })

    if (error) {
      setError(error)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }

    setSaving(false)
  }

  if (loading) return <LoadingPage />

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-neutral-900 dark:text-neutral-100 mb-2">
            Settings
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Manage your account settings and preferences
          </p>
        </div>

        <Card className="p-8">
          <h2 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 mb-6">
            Profile Information
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user?.email || ''}
                disabled
              />
              <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-500">
                Email cannot be changed
              </p>
            </div>

            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Your name"
                disabled={saving}
              />
            </div>

            <div>
              <Label htmlFor="avatar_url">Avatar URL</Label>
              <Input
                id="avatar_url"
                type="url"
                value={formData.avatar_url}
                onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
                placeholder="https://..."
                disabled={saving}
              />
            </div>

            <div>
              <Label>Auth Provider</Label>
              <div className="text-sm text-neutral-600 dark:text-neutral-400 capitalize">
                {user?.auth_provider}
              </div>
            </div>

            <div>
              <Label>Account Stats</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="text-sm">
                  <div className="text-neutral-600 dark:text-neutral-400">
                    Specs Generated
                  </div>
                  <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {user?.specs_generated || 0}
                  </div>
                </div>
                <div className="text-sm">
                  <div className="text-neutral-600 dark:text-neutral-400">
                    Has Downloaded
                  </div>
                  <div className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                    {user?.has_downloaded ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm">
                Profile updated successfully!
              </div>
            )}

            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
