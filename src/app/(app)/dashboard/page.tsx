// Dashboard page - User's main landing page
// Shows stats and recent spec projects

import Link from 'next/link'
import { getUserSpecStats, listSpecProjects } from '@/lib/actions/spec_project'
import { getCurrentUser } from '@/lib/actions/user'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatRelativeTime } from '@/lib/utils/formatters'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const { data: stats } = await getUserSpecStats()
  const { data: recentSpecs } = await listSpecProjects({ limit: 5 })

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-neutral-900 dark:text-neutral-100 mb-2">
            Welcome back, {user.name || 'there'}
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Create and manage your app specifications
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
              Total Specs
            </div>
            <div className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
              {stats?.total || 0}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
              In Progress
            </div>
            <div className="text-3xl font-semibold text-[#FF7F50]">
              {stats?.in_progress || 0}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
              Completed
            </div>
            <div className="text-3xl font-semibold text-green-600 dark:text-green-400">
              {stats?.completed || 0}
            </div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
              Downloaded
            </div>
            <div className="text-3xl font-semibold text-blue-600 dark:text-blue-400">
              {stats?.downloaded || 0}
            </div>
          </Card>
        </div>

        {/* Recent Specs */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-normal text-neutral-900 dark:text-neutral-100">
              Recent Specs
            </h2>
            <Link href="/specs/new">
              <Button>Create New Spec</Button>
            </Link>
          </div>

          {recentSpecs && recentSpecs.length > 0 ? (
            <div className="space-y-4">
              {recentSpecs.map((spec) => (
                <Link key={spec.id} href={`/specs/${spec.id}`}>
                  <Card hover className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 mb-2">
                          {spec.name}
                        </h3>
                        {spec.description && (
                          <p className="text-neutral-600 dark:text-neutral-400 mb-3 line-clamp-2">
                            {spec.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-500">
                          <span>{formatRelativeTime(spec.created_at)}</span>
                          {spec.download_count > 0 && (
                            <span>• {spec.download_count} downloads</span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant={
                          spec.status === 'complete'
                            ? 'success'
                            : spec.status === 'archived'
                            ? 'neutral'
                            : 'info'
                        }
                      >
                        {spec.status}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="p-8">
              <EmptyState
                title="No specs yet"
                description="Create your first spec to get started with AI-powered specification generation"
                action={{
                  label: 'Create New Spec',
                  onClick: () => {},
                }}
              />
            </Card>
          )}
        </div>

        {recentSpecs && recentSpecs.length >= 5 && (
          <div className="mt-6 text-center">
            <Link href="/specs">
              <Button variant="ghost">View All Specs</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
