// Spec project detail page
// Shows spec details with chat and generated spec

import { getSpecProjectById } from '@/lib/actions/spec_project'
import { getGeneratedSpecBySpecProject } from '@/lib/actions/generated_spec'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/utils/formatters'
import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/user'
import Link from 'next/link'

export default async function SpecDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: spec, error } = await getSpecProjectById(params.id)
  if (error || !spec) notFound()

  const { data: generatedSpec } = await getGeneratedSpecBySpecProject(params.id)

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
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-normal text-neutral-900 dark:text-neutral-100 mb-2">
                {spec.name}
              </h1>
              {spec.description && (
                <p className="text-neutral-600 dark:text-neutral-400">
                  {spec.description}
                </p>
              )}
            </div>
            <Badge variant={getStatusVariant(spec.status)}>
              {spec.status}
            </Badge>
          </div>

          <div className="flex items-center gap-6 text-sm text-neutral-500 dark:text-neutral-500">
            <span>Created {formatDateTime(spec.created_at)}</span>
            <span>•</span>
            <span>{spec.download_count} downloads</span>
            {spec.version > 1 && (
              <>
                <span>•</span>
                <span>Version {spec.version}</span>
              </>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 mb-8">
          {spec.status === 'complete' && generatedSpec && (
            <Link href={`/specs/${spec.id}/review`}>
              <Button>View Spec</Button>
            </Link>
          )}
          <Link href={`/specs/${spec.id}/chat`}>
            <Button variant="secondary">Open Chat</Button>
          </Link>
          {spec.status === 'complete' && (
            <Button variant="secondary">Download .forge Zip</Button>
          )}
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                Spec Progress
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      Research
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      Domain analysis and feature decomposition
                    </div>
                  </div>
                  <Badge variant={spec.research_status === 'complete' ? 'success' : 'neutral'}>
                    {spec.research_status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900 dark:text-neutral-100">
                      Specification
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      Gates 0-5 generation
                    </div>
                  </div>
                  <Badge variant={spec.spec_status === 'complete' ? 'success' : 'neutral'}>
                    {spec.spec_status}
                  </Badge>
                </div>
              </div>
            </Card>

            {generatedSpec && (
              <Card className="p-6">
                <h2 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                  Spec Overview
                </h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-neutral-600 dark:text-neutral-400 mb-1">
                      Entities
                    </div>
                    <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                      {generatedSpec.entity_count || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-600 dark:text-neutral-400 mb-1">
                      State Changes
                    </div>
                    <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                      {generatedSpec.state_change_count || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-600 dark:text-neutral-400 mb-1">
                      Complexity
                    </div>
                    <div className="text-lg font-medium text-neutral-900 dark:text-neutral-100 capitalize">
                      {generatedSpec.complexity_rating}
                    </div>
                  </div>
                  <div>
                    <div className="text-neutral-600 dark:text-neutral-400 mb-1">
                      Quality Score
                    </div>
                    <div className="text-lg font-medium text-neutral-900 dark:text-neutral-100">
                      {generatedSpec.spec_quality_score}/100
                    </div>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-4">
                Next Steps
              </h3>
              <div className="space-y-3 text-sm">
                {spec.status === 'chatting' && (
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#FF7F50] flex-shrink-0 flex items-center justify-center text-white text-xs">
                      1
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        Describe your app
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400">
                        Chat with AI to refine your idea
                      </div>
                    </div>
                  </div>
                )}
                {spec.status === 'researching' && (
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[#FF7F50] flex-shrink-0 flex items-center justify-center text-white text-xs">
                      2
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        Research in progress
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400">
                        Analyzing competitors and features
                      </div>
                    </div>
                  </div>
                )}
                {spec.status === 'complete' && (
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-green-600 flex-shrink-0 flex items-center justify-center text-white text-xs">
                      ✓
                    </div>
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        Spec complete!
                      </div>
                      <div className="text-neutral-600 dark:text-neutral-400">
                        Download and build with Claude Code
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
