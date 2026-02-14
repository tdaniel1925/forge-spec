'use server'

// CRUD operations for user entity
// From PROJECT-SPEC.md Gate 1 - Entity: user
// Mutability: mutable (profile updates, login tracking)
// Permissions (Gate 3): Users can only read/update their own data. Admin has full access.

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { User, UserUpdate, UserProfile } from '@/types/user'
import { getCurrentUserRole, isAdmin } from '@/lib/auth/roles'
import { logEvent } from '@/lib/system/event-logger'
import { emitEvent } from '@/lib/events/emitter'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const userUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  avatar_url: z.string().url().optional().nullable(),
  signup_source: z.string().max(500).optional().nullable(),
})

const userFilterSchema = z.object({
  status: z.enum(['active', 'inactive']).optional(),
  auth_provider: z.enum(['email', 'google']).optional(),
  role: z.enum(['user', 'admin', 'system']).optional(),
  has_downloaded: z.boolean().optional(),
  search: z.string().optional(), // search by email or name
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get current logged-in user's profile
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return null
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_id', authUser.id)
    .eq('archived_at', null)
    .single()

  if (error || !data) {
    return null
  }

  return data as User
}

/**
 * Get user by ID
 * Permission: Users can only read their own profile. Admin can read any user.
 */
export async function getUserById(
  userId: string
): Promise<{ data: User | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Users can only read their own profile, unless admin
    if (currentUser.id !== userId && !admin) {
      return { data: null, error: 'Permission denied' }
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('archived_at', null)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as User, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get public user profile (safe to expose)
 */
export async function getUserProfile(
  userId: string
): Promise<{ data: UserProfile | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('users')
      .select('id, name, avatar_url')
      .eq('id', userId)
      .eq('archived_at', null)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as UserProfile, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * List users with filters
 * Permission: Admin only
 */
export async function listUsers(
  filters?: z.infer<typeof userFilterSchema>
): Promise<{ data: User[]; total: number; error: string | null }> {
  try {
    const admin = await isAdmin()

    if (!admin) {
      return { data: [], total: 0, error: 'Admin access required' }
    }

    const supabase = await createClient()
    const validated = userFilterSchema.parse(filters || {})

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .is('archived_at', null)

    // Apply filters
    if (validated.status) {
      query = query.eq('status', validated.status)
    }
    if (validated.auth_provider) {
      query = query.eq('auth_provider', validated.auth_provider)
    }
    if (validated.role) {
      query = query.eq('role', validated.role)
    }
    if (validated.has_downloaded !== undefined) {
      query = query.eq('has_downloaded', validated.has_downloaded)
    }
    if (validated.search) {
      query = query.or(
        `email.ilike.%${validated.search}%,name.ilike.%${validated.search}%`
      )
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

    return { data: (data as User[]) || [], total: count || 0, error: null }
  } catch (err) {
    return {
      data: [],
      total: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

/**
 * Update user profile
 * Permission: Users can update their own profile. Admin can update any user.
 * Mutability: name, avatar_url, signup_source are mutable
 * FORBIDDEN: Cannot change email, password_hash (use auth methods), role (admin only via separate method)
 */
export async function updateUser(
  userId: string,
  updates: z.infer<typeof userUpdateSchema>
): Promise<{ data: User | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Users can only update their own profile, unless admin
    if (currentUser.id !== userId && !admin) {
      return { data: null, error: 'Permission denied' }
    }

    // Validate input
    const validated = userUpdateSchema.parse(updates)

    // Update user
    const { data, error } = await supabase
      .from('users')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .is('archived_at', null)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'user_updated',
      actor_id: currentUser.id,
      entity_type: 'user',
      entity_id: userId,
      metadata: { updated_fields: Object.keys(validated) },
    })

    // Emit event (Stage 5)
    await emitEvent({
      event_type: 'entity.updated',
      entity_type: 'user',
      entity_id: userId,
      actor_id: currentUser.id,
      payload: {
        updated_fields: Object.keys(validated),
        ...validated,
      },
    })

    return { data: data as User, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Update user role
 * Permission: Admin only
 */
export async function updateUserRole(
  userId: string,
  role: 'user' | 'admin' | 'system'
): Promise<{ data: User | null; error: string | null }> {
  try {
    const admin = await isAdmin()

    if (!admin) {
      return { data: null, error: 'Admin access required' }
    }

    const supabase = await createClient()
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        role,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .is('archived_at', null)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'user_role_changed',
      actor_id: currentUser.id,
      entity_type: 'user',
      entity_id: userId,
      metadata: { new_role: role },
    })

    // Emit event (Stage 5)
    await emitEvent({
      event_type: 'entity.updated',
      entity_type: 'user',
      entity_id: userId,
      actor_id: currentUser.id,
      payload: {
        role,
        change_type: 'role_changed',
      },
    })

    return { data: data as User, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Update user status (activate/deactivate)
 * Permission: Admin only
 */
export async function updateUserStatus(
  userId: string,
  status: 'active' | 'inactive'
): Promise<{ data: User | null; error: string | null }> {
  try {
    const admin = await isAdmin()

    if (!admin) {
      return { data: null, error: 'Admin access required' }
    }

    const supabase = await createClient()
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const { data, error } = await supabase
      .from('users')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .is('archived_at', null)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'user_status_changed',
      actor_id: currentUser.id,
      entity_type: 'user',
      entity_id: userId,
      metadata: { new_status: status },
    })

    // Emit event (Stage 5)
    await emitEvent({
      event_type: 'entity.updated',
      entity_type: 'user',
      entity_id: userId,
      actor_id: currentUser.id,
      payload: {
        status,
        change_type: 'status_changed',
      },
    })

    return { data: data as User, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Update last login timestamp
 * Called by auth system
 */
export async function updateLastLogin(
  userId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('users')
      .update({
        last_login_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================================
// DELETE OPERATIONS (Soft Delete)
// ============================================================================

/**
 * Archive user (soft delete)
 * Permission: Admin only
 * Note: User accounts should rarely be archived. Consider deactivating instead.
 */
export async function archiveUser(
  userId: string
): Promise<{ error: string | null }> {
  try {
    const admin = await isAdmin()

    if (!admin) {
      return { error: 'Admin access required' }
    }

    const supabase = await createClient()
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { error: 'Not authenticated' }
    }

    // Soft delete by setting archived_at
    const { error } = await supabase
      .from('users')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .is('archived_at', null)

    if (error) {
      return { error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'user_archived',
      actor_id: currentUser.id,
      entity_type: 'user',
      entity_id: userId,
      metadata: {},
    })

    // Emit event (Stage 5)
    await emitEvent({
      event_type: 'entity.archived',
      entity_type: 'user',
      entity_id: userId,
      actor_id: currentUser.id,
      payload: {},
    })

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================================
// COMPUTED FIELDS
// ============================================================================

/**
 * Recompute specs_generated count for a user
 * Called when spec_projects are created/archived
 */
export async function recomputeSpecsGenerated(
  userId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    // Count spec_projects with status = complete that are not archived
    const { count, error: countError } = await supabase
      .from('spec_projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'complete')
      .is('archived_at', null)

    if (countError) {
      return { error: countError.message }
    }

    // Update user
    const { error: updateError } = await supabase
      .from('users')
      .update({
        specs_generated: count || 0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      return { error: updateError.message }
    }

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Set has_downloaded flag when user downloads their first spec
 * Called when spec_download is created
 */
export async function markUserHasDownloaded(
  userId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('users')
      .update({
        has_downloaded: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('has_downloaded', false) // Only update if not already set

    if (error) {
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
