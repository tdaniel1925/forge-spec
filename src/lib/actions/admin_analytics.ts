'use server'

// CRUD operations for admin_analytics entity
// From PROJECT-SPEC.md Gate 1 - Entity: admin_analytics
// Owner: system | Parent: none
// Mutability: APPEND-ONLY (Gate 3) - Daily snapshots, never modified
// Permissions: System creates. Admin reads.

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { AdminAnalytics } from '@/types/admin-analytics'
import { requireAdmin } from '@/lib/auth/roles'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const analyticsFilterSchema = z.object({
  start_date: z.string().date().optional(),
  end_date: z.string().date().optional(),
  limit: z.number().min(1).max(365).default(30),
  offset: z.number().min(0).default(0),
})

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create daily analytics snapshot
 * Permission: System only (via cron)
 * State change #30: cron daily → admin_analytics row created
 */
export async function createDailyAnalyticsSnapshot(): Promise<{
  data: AdminAnalytics | null
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const today = new Date().toISOString().split('T')[0]

    // Check if snapshot already exists for today
    const { data: existing } = await supabase
      .from('admin_analytics')
      .select('id')
      .eq('snapshot_date', today)
      .single()

    if (existing) {
      return {
        data: null,
        error: 'Analytics snapshot already exists for today',
      }
    }

    // Compute metrics

    // Total users
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .is('archived_at', null)

    // New signups today
    const { count: newSignupsToday } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)
      .is('archived_at', null)

    // Specs generated today
    const { count: specsGeneratedToday } = await supabase
      .from('spec_projects')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)
      .is('archived_at', null)

    // Specs downloaded today
    const { count: specsDownloadedToday } = await supabase
      .from('spec_downloads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)

    // Most common app types (from spec_projects descriptions)
    // This would require more complex analysis - simplified for now
    const mostCommonAppTypes: Record<string, unknown> = {}

    // Average spec generation time
    // Simplified - would need to calculate time between creation and completion
    const avgSpecGenerationTimeSeconds = 0

    // Total API cost (sum of research + generation costs)
    const { data: researchCosts } = await supabase
      .from('research_reports')
      .select('total_cost_usd')
      .gte('created_at', today)

    const { data: generationCosts } = await supabase
      .from('generated_specs')
      .select('generation_cost_usd')
      .gte('created_at', today)

    const totalApiCostUsd =
      (researchCosts?.reduce((sum, r) => sum + (r.total_cost_usd || 0), 0) ||
        0) +
      (generationCosts?.reduce(
        (sum, g) => sum + (g.generation_cost_usd || 0),
        0
      ) || 0)

    // Waitlist signups today
    const { count: waitlistSignupsToday } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today)

    // Conversion rate (waitlist converted / total waitlist)
    const { count: totalWaitlist } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })

    const { count: convertedWaitlist } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'converted')

    const conversionRate =
      totalWaitlist && totalWaitlist > 0
        ? (convertedWaitlist || 0) / totalWaitlist
        : 0

    // Create analytics snapshot
    const { data, error } = await supabase
      .from('admin_analytics')
      .insert({
        snapshot_date: today,
        total_users: totalUsers || 0,
        new_signups_today: newSignupsToday || 0,
        specs_generated_today: specsGeneratedToday || 0,
        specs_downloaded_today: specsDownloadedToday || 0,
        most_common_app_types: mostCommonAppTypes,
        avg_spec_generation_time_seconds: avgSpecGenerationTimeSeconds,
        total_api_cost_usd: totalApiCostUsd,
        waitlist_signups_today: waitlistSignupsToday || 0,
        conversion_rate: conversionRate,
        created_by: null, // System-created
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as AdminAnalytics, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get analytics snapshot by date
 * Permission: Admin only
 */
export async function getAnalyticsByDate(
  date: string
): Promise<{ data: AdminAnalytics | null; error: string | null }> {
  try {
    await requireAdmin()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('admin_analytics')
      .select('*')
      .eq('snapshot_date', date)
      .single()

    if (error) {
      // If no snapshot found, return null (not an error)
      if (error.code === 'PGRST116') {
        return { data: null, error: null }
      }
      return { data: null, error: error.message }
    }

    return { data: data as AdminAnalytics, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get latest analytics snapshot
 * Permission: Admin only
 */
export async function getLatestAnalytics(): Promise<{
  data: AdminAnalytics | null
  error: string | null
}> {
  try {
    await requireAdmin()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('admin_analytics')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as AdminAnalytics, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * List analytics snapshots with filters
 * Permission: Admin only
 */
export async function listAnalytics(
  filters?: z.infer<typeof analyticsFilterSchema>
): Promise<{
  data: AdminAnalytics[]
  total: number
  error: string | null
}> {
  try {
    await requireAdmin()

    const supabase = await createClient()
    const validated = analyticsFilterSchema.parse(filters || {})

    let query = supabase
      .from('admin_analytics')
      .select('*', { count: 'exact' })

    // Apply date range filters
    if (validated.start_date) {
      query = query.gte('snapshot_date', validated.start_date)
    }
    if (validated.end_date) {
      query = query.lte('snapshot_date', validated.end_date)
    }

    // Pagination
    query = query.range(
      validated.offset,
      validated.offset + validated.limit - 1
    )

    // Sort by date descending (most recent first)
    query = query.order('snapshot_date', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      return { data: [], total: 0, error: error.message }
    }

    return {
      data: (data as AdminAnalytics[]) || [],
      total: count || 0,
      error: null,
    }
  } catch (err) {
    return {
      data: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get analytics summary (last 30 days)
 * Permission: Admin only
 */
export async function getAnalyticsSummary(): Promise<{
  data: {
    total_users: number
    signups_last_30_days: number
    specs_generated_last_30_days: number
    specs_downloaded_last_30_days: number
    total_api_cost_last_30_days: number
    avg_conversion_rate: number
  } | null
  error: string | null
}> {
  try {
    await requireAdmin()

    const supabase = await createClient()

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const startDate = thirtyDaysAgo.toISOString().split('T')[0]

    // Get snapshots for last 30 days
    const { data: snapshots } = await supabase
      .from('admin_analytics')
      .select('*')
      .gte('snapshot_date', startDate)
      .order('snapshot_date', { ascending: false })

    if (!snapshots || snapshots.length === 0) {
      return {
        data: {
          total_users: 0,
          signups_last_30_days: 0,
          specs_generated_last_30_days: 0,
          specs_downloaded_last_30_days: 0,
          total_api_cost_last_30_days: 0,
          avg_conversion_rate: 0,
        },
        error: null,
      }
    }

    const latestSnapshot = snapshots[0] as AdminAnalytics

    const signupsLast30Days = snapshots.reduce(
      (sum, s) => sum + (s.new_signups_today || 0),
      0
    )
    const specsGeneratedLast30Days = snapshots.reduce(
      (sum, s) => sum + (s.specs_generated_today || 0),
      0
    )
    const specsDownloadedLast30Days = snapshots.reduce(
      (sum, s) => sum + (s.specs_downloaded_today || 0),
      0
    )
    const totalApiCostLast30Days = snapshots.reduce(
      (sum, s) => sum + (s.total_api_cost_usd || 0),
      0
    )
    const avgConversionRate =
      snapshots.reduce((sum, s) => sum + (s.conversion_rate || 0), 0) /
      snapshots.length

    return {
      data: {
        total_users: latestSnapshot.total_users,
        signups_last_30_days: signupsLast30Days,
        specs_generated_last_30_days: specsGeneratedLast30Days,
        specs_downloaded_last_30_days: specsDownloadedLast30Days,
        total_api_cost_last_30_days: totalApiCostLast30Days,
        avg_conversion_rate: avgConversionRate,
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

// NONE - admin_analytics is append-only (Gate 3)

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

// NONE - admin_analytics is append-only (Gate 3)
// Daily snapshots are never deleted
