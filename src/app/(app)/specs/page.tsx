// Spec projects list page
// Shows all user's specs with filters

import Link from 'next/link'
import { listSpecProjects } from '@/lib/actions/spec_project'
import { getCurrentUser } from '@/lib/actions/user'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatRelativeTime } from '@/lib/utils/formatters'
import { redirect } from 'next/navigation'

export default async function SpecsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  const { data: specs } = await listSpecProjects({ limit: 50 })

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'complete':
        return 'success'
      case 'archived':
        return 'neutral'
      case 'generating':
      case 'researching':
        return 'warning'
      default:
        return 'info'
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-normal text-neutral-900 dark:text-neutral-100 mb-2">
              My Specs
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              View and manage all your specifications
            </p>
          </div>
          <Link href="/specs/new">
            <Button>Create New Spec</Button>
          </Link>
        </div>

        {/* Specs Grid */}
        {specs && specs.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {specs.map((spec) => (
              <Link key={spec.id} href={`/specs/${spec.id}`}>
                <Card hover className="p-6 h-full">
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                        {spec.name}
                      </h3>
                      <Badge variant={getStatusVariant(spec.status)}>
                        {spec.status}
                      </Badge>
                    </div>

                    {spec.description && (
                      <p className="text-neutral-600 dark:text-neutral-400 mb-4 line-clamp-3 flex-1">
                        {spec.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-sm text-neutral-500 dark:text-neutral-500 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                      <span>{formatRelativeTime(spec.created_at)}</span>
                      <div className="flex items-center gap-4">
                        {spec.download_count > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                            </svg>
                            {spec.download_count}
                          </span>
                        )}
                        {spec.version > 1 && (
                          <span>v{spec.version}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-16">
            <EmptyState
              title="No specs yet"
              description="Create your first specification to get started. ForgeSpec will guide you through a research-driven process to generate a complete, production-ready spec."
              icon={
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              }
              action={{
                label: 'Create Your First Spec',
                onClick: () => {},
              }}
            />
          </Card>
        )}
      </div>
    </div>
  )
}
