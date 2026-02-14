// Admin dashboard page

import { getAnalyticsSummary } from '@/lib/actions/admin_analytics'
import { listUsers } from '@/lib/actions/user'
import { listWaitlistEntries, getWaitlistStats } from '@/lib/actions/waitlist_entry'
import { getFeedbackStats } from '@/lib/actions/feedback'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatCurrency } from '@/lib/utils/formatters'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/actions/user'
import { isAdmin } from '@/lib/auth/roles'

export default async function AdminPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const admin = await isAdmin()
  if (!admin) redirect('/dashboard')

  const { data: analytics } = await getAnalyticsSummary()
  const { data: waitlistStats } = await getWaitlistStats()
  const { data: feedbackStats } = await getFeedbackStats()
  const { data: users } = await listUsers({ limit: 10 })

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-normal text-neutral-900 dark:text-neutral-100 mb-2">
            Admin Dashboard
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400">
            Platform analytics and management
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="p-6">
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
              Total Users
            </div>
            <div className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
              {formatNumber(analytics?.total_users || 0)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 mt-1">
              +{analytics?.signups_last_30_days || 0} last 30 days
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
              Specs Generated
            </div>
            <div className="text-3xl font-semibold text-[#FF7F50]">
              {formatNumber(analytics?.specs_generated_last_30_days || 0)}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              Last 30 days
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
              Waitlist
            </div>
            <div className="text-3xl font-semibold text-blue-600 dark:text-blue-400">
              {formatNumber(waitlistStats?.total || 0)}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              {waitlistStats?.converted || 0} converted
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
              API Cost (30d)
            </div>
            <div className="text-3xl font-semibold text-neutral-900 dark:text-neutral-100">
              {formatCurrency(analytics?.total_api_cost_last_30_days || 0)}
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Users */}
          <Card className="p-6">
            <h2 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 mb-4">
              Recent Users
            </h2>
            <div className="space-y-3">
              {users && users.length > 0 ? (
                users.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between py-2 border-b border-neutral-200 dark:border-neutral-800 last:border-0"
                  >
                    <div>
                      <div className="font-medium text-neutral-900 dark:text-neutral-100">
                        {u.name || 'Unnamed User'}
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {u.email}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="neutral" className="capitalize">
                        {u.role}
                      </Badge>
                      <Badge variant={u.status === 'active' ? 'success' : 'neutral'}>
                        {u.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-neutral-500 dark:text-neutral-500">
                  No users yet
                </div>
              )}
            </div>
          </Card>

          {/* Feedback Overview */}
          <Card className="p-6">
            <h2 className="text-xl font-medium text-neutral-900 dark:text-neutral-100 mb-4">
              Feedback Overview
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
                    Average Rating
                  </span>
                  <span className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {feedbackStats?.avg_rating.toFixed(1) || 0}/5
                  </span>
                </div>
                <div className="h-2 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#FF7F50] to-[#FF6347]"
                    style={{
                      width: `${((feedbackStats?.avg_rating || 0) / 5) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Total
                  </div>
                  <div className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                    {feedbackStats?.total || 0}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-neutral-600 dark:text-neutral-400">
                    Pending
                  </div>
                  <div className="text-2xl font-semibold text-[#FF7F50]">
                    {feedbackStats?.pending || 0}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
