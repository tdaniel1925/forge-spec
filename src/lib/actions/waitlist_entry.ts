'use server'

// CRUD operations for waitlist_entry entity
// From PROJECT-SPEC.md Gate 1 - Entity: waitlist_entry
// Owner: system | Parent: none
// Mutability: Mutable (Gate 3) - Status changes: pending → invited → converted
// Permissions: Users can create. Admin can read all and update status.

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { WaitlistEntry, WaitlistStatus } from '@/types/waitlist-entry'
import { getCurrentUser } from './user'
import { isAdmin, requireAdmin } from '@/lib/auth/roles'
import { logEvent } from '@/lib/system/event-logger'
import { emitEvent } from '@/lib/events/emitter'
import type { WaitlistEntryCreatedPayload } from '@/types/events'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createWaitlistEntrySchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255),
  spec_project_id: z.string().uuid().nullable().optional(),
  source: z.string().max(255), // e.g., "build_cta", "pricing_page", "email_campaign"
})

const updateWaitlistEntrySchema = z.object({
  status: z.enum(['pending', 'invited', 'converted']).optional(),
  invited_at: z.string().datetime().nullable().optional(),
  converted_at: z.string().datetime().nullable().optional(),
})

const waitlistFilterSchema = z.object({
  status: z.enum(['pending', 'invited', 'converted']).optional(),
  source: z.string().optional(),
  spec_project_id: z.string().uuid().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create waitlist entry
 * Permission: Authenticated users can create
 * State change #27: user clicks "Build This For Me" → waitlist_entry created
 */
export async function createWaitlistEntry(
  input: z.infer<typeof createWaitlistEntrySchema>
): Promise<{ data: WaitlistEntry | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    // Allow unauthenticated users to join waitlist (collect email)
    // But track user_id if authenticated

    // Validate input
    const validated = createWaitlistEntrySchema.parse(input)

    const supabase = await createClient()

    // Check if email already exists in waitlist
    const { data: existing } = await supabase
      .from('waitlist_entries')
      .select('id, status')
      .eq('email', validated.email)
      .single()

    if (existing) {
      // If already exists, return existing record
      return {
        data: existing as WaitlistEntry,
        error: null,
      }
    }

    // Create waitlist entry
    const { data, error } = await supabase
      .from('waitlist_entries')
      .insert({
        email: validated.email,
        name: validated.name,
        spec_project_id: validated.spec_project_id || null,
        source: validated.source,
        status: 'pending',
        created_by: currentUser?.id || null,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'waitlist_entry_created',
      actor_id: currentUser?.id || null,
      entity_type: 'waitlist_entry',
      entity_id: data.id,
      metadata: {
        source: validated.source,
        spec_project_id: validated.spec_project_id,
      },
    })

    // Emit event (Stage 5) - State change #27
    await emitEvent({
      event_type: 'waitlist_entry.created',
      entity_type: 'waitlist_entry',
      entity_id: data.id,
      actor_id: currentUser?.id || null,
      payload: {
        waitlist_entry_id: data.id,
        email: validated.email,
        name: validated.name,
        spec_project_id: validated.spec_project_id || undefined,
        source: validated.source,
      } as WaitlistEntryCreatedPayload,
    })

    return { data: data as WaitlistEntry, error: null }
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
 * Get waitlist entry by ID
 * Permission: Admin only
 */
export async function getWaitlistEntryById(
  entryId: string
): Promise<{ data: WaitlistEntry | null; error: string | null }> {
  try {
    await requireAdmin()

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('waitlist_entries')
      .select('*')
      .eq('id', entryId)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as WaitlistEntry, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * List waitlist entries with filters
 * Permission: Admin only
 */
export async function listWaitlistEntries(
  filters?: z.infer<typeof waitlistFilterSchema>
): Promise<{
  data: WaitlistEntry[]
  total: number
  error: string | null
}> {
  try {
    await requireAdmin()

    const supabase = await createClient()
    const validated = waitlistFilterSchema.parse(filters || {})

    let query = supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact' })

    // Apply filters
    if (validated.status) {
      query = query.eq('status', validated.status)
    }
    if (validated.source) {
      query = query.eq('source', validated.source)
    }
    if (validated.spec_project_id) {
      query = query.eq('spec_project_id', validated.spec_project_id)
    }

    // Pagination
    query = query.range(
      validated.offset,
      validated.offset + validated.limit - 1
    )

    // Sort by most recent
    query = query.order('created_at', { ascending: false })

    const { data, error, count } = await query

    if (error) {
      return { data: [], total: 0, error: error.message }
    }

    return {
      data: (data as WaitlistEntry[]) || [],
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
 * Get waitlist stats
 * Permission: Admin only
 */
export async function getWaitlistStats(): Promise<{
  data: {
    total: number
    pending: number
    invited: number
    converted: number
    conversion_rate: number
  } | null
  error: string | null
}> {
  try {
    await requireAdmin()

    const supabase = await createClient()

    const { count: total } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })

    const { count: pending } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: invited } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'invited')

    const { count: converted } = await supabase
      .from('waitlist_entries')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'converted')

    const conversionRate =
      invited && invited > 0 ? ((converted || 0) / invited) * 100 : 0

    return {
      data: {
        total: total || 0,
        pending: pending || 0,
        invited: invited || 0,
        converted: converted || 0,
        conversion_rate: conversionRate,
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

/**
 * Update waitlist entry status
 * Permission: Admin only
 */
export async function updateWaitlistEntry(
  entryId: string,
  updates: z.infer<typeof updateWaitlistEntrySchema>
): Promise<{ data: WaitlistEntry | null; error: string | null }> {
  try {
    await requireAdmin()

    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Validate input
    const validated = updateWaitlistEntrySchema.parse(updates)

    const supabase = await createClient()

    const updateData: Record<string, unknown> = {
      ...validated,
      updated_at: new Date().toISOString(),
    }

    // Auto-set timestamps based on status
    if (validated.status === 'invited' && !validated.invited_at) {
      updateData.invited_at = new Date().toISOString()
    }
    if (validated.status === 'converted' && !validated.converted_at) {
      updateData.converted_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('waitlist_entries')
      .update(updateData)
      .eq('id', entryId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event
    await logEvent({
      event_type: 'waitlist_entry_updated',
      actor_id: currentUser.id,
      entity_type: 'waitlist_entry',
      entity_id: entryId,
      metadata: { new_status: validated.status },
    })

    return { data: data as WaitlistEntry, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Mark waitlist entry as invited
 */
export async function markWaitlistInvited(
  entryId: string
): Promise<{ data: WaitlistEntry | null; error: string | null }> {
  return updateWaitlistEntry(entryId, {
    status: 'invited',
    invited_at: new Date().toISOString(),
  })
}

/**
 * Mark waitlist entry as converted
 */
export async function markWaitlistConverted(
  entryId: string
): Promise<{ data: WaitlistEntry | null; error: string | null }> {
  return updateWaitlistEntry(entryId, {
    status: 'converted',
    converted_at: new Date().toISOString(),
  })
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete waitlist entry (hard delete - admin only)
 * Note: Waitlist entries don't have archived_at, so this is a hard delete
 */
export async function deleteWaitlistEntry(
  entryId: string
): Promise<{ error: string | null }> {
  try {
    await requireAdmin()

    const supabase = await createClient()
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { error: 'Not authenticated' }
    }

    const { error } = await supabase
      .from('waitlist_entries')
      .delete()
      .eq('id', entryId)

    if (error) {
      return { error: error.message }
    }

    // Log event
    await logEvent({
      event_type: 'waitlist_entry_deleted',
      actor_id: currentUser.id,
      entity_type: 'waitlist_entry',
      entity_id: entryId,
      metadata: {},
    })

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
