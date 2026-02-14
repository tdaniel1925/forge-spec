// Downloads history page

import { listSpecDownloads } from '@/lib/actions/spec_download'
import { getCurrentUser } from '@/lib/actions/user'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDateTime, formatBytes } from '@/lib/utils/formatters'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DownloadsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const { data: downloads } = await listSpecDownloads({ limit: 50 })

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-neutral-900 dark:text-neutral-100 mb-2">
            Downloads
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            View your download history
          </p>
        </div>

        {downloads && downloads.length > 0 ? (
          <div className="space-y-4">
            {downloads.map((download) => (
              <Card key={download.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <svg className="w-5 h-5 text-[#FF7F50]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                      </svg>
                      <Link
                        href={`/specs/${download.spec_project_id}`}
                        className="font-medium text-neutral-900 dark:text-neutral-100 hover:text-[#FF7F50]"
                      >
                        View Spec
                      </Link>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
                      <span>{formatDateTime(download.created_at)}</span>
                      <span>•</span>
                      <span>{formatBytes(download.zip_size_bytes)}</span>
                      <span>•</span>
                      <span>{download.included_patterns.length} patterns</span>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-16">
            <EmptyState
              title="No downloads yet"
              description="Download your first .forge zip to get started building with Claude Code"
              icon={
                <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              }
            />
          </Card>
        )}
      </div>
    </div>
  )
}
