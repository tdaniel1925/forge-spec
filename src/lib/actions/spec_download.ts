'use server'

// CRUD operations for spec_download entity
// From PROJECT-SPEC.md Gate 1 - Entity: spec_download
// Owner: system | Parent: spec_project
// Mutability: APPEND-ONLY (Gate 3) - Tracking events, never modified
// Permissions: Created by system. Users can read their own download history.

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { SpecDownload } from '@/types/spec-download'
import { getCurrentUser, markUserHasDownloaded } from './user'
import { isAdmin } from '@/lib/auth/roles'
import { logEvent } from '@/lib/system/event-logger'
import { getSpecProjectById, incrementDownloadCount } from './spec_project'
import { emitEvent } from '@/lib/events/emitter'
import type { SpecDownloadCreatedPayload } from '@/types/events'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createSpecDownloadSchema = z.object({
  spec_project_id: z.string().uuid(),
  zip_size_bytes: z.number().int().min(0),
  included_patterns: z.array(z.string()),
})

const specDownloadFilterSchema = z.object({
  spec_project_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(), // admin only
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create spec download record
 * Permission: Users can create downloads for their own spec_projects
 * Parent dependency: spec_project must exist and belong to user
 * State change #26: user downloads .forge zip → spec_download created
 */
export async function createSpecDownload(
  input: z.infer<typeof createSpecDownloadSchema>
): Promise<{ data: SpecDownload | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Validate input
    const validated = createSpecDownloadSchema.parse(input)

    // Check parent dependency: spec_project must exist and belong to user
    const { data: specProject, error: specError } = await getSpecProjectById(
      validated.spec_project_id
    )

    if (specError || !specProject) {
      return {
        data: null,
        error: 'Spec project not found or access denied',
      }
    }

    const supabase = await createClient()

    // Create spec download record
    const { data, error } = await supabase
      .from('spec_downloads')
      .insert({
        spec_project_id: validated.spec_project_id,
        user_id: currentUser.id,
        zip_size_bytes: validated.zip_size_bytes,
        included_patterns: validated.included_patterns,
        status: 'created',
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'spec_downloaded',
      actor_id: currentUser.id,
      entity_type: 'spec_download',
      entity_id: data.id,
      metadata: {
        spec_project_id: validated.spec_project_id,
        zip_size_bytes: validated.zip_size_bytes,
        pattern_count: validated.included_patterns.length,
      },
    })

    // Emit event (Stage 5) - State change #26
    await emitEvent({
      event_type: 'spec_download.created',
      entity_type: 'spec_download',
      entity_id: data.id,
      actor_id: currentUser.id,
      payload: {
        spec_download_id: data.id,
        spec_project_id: validated.spec_project_id,
        user_id: currentUser.id,
        zip_size_bytes: validated.zip_size_bytes,
        included_patterns: validated.included_patterns,
      } as SpecDownloadCreatedPayload,
    })

    // Increment download count on spec_project
    await incrementDownloadCount(validated.spec_project_id)

    // Mark user as having downloaded (if first download)
    await markUserHasDownloaded(currentUser.id)

    return { data: data as SpecDownload, error: null }
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
 * Get spec download by ID
 * Permission: Users can read their own download records
 */
export async function getSpecDownloadById(
  downloadId: string
): Promise<{ data: SpecDownload | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    let query = supabase
      .from('spec_downloads')
      .select('*')
      .eq('id', downloadId)

    // Non-admin users can only see their own downloads
    if (!admin) {
      query = query.eq('user_id', currentUser.id)
    }

    const { data, error } = await query.single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as SpecDownload, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * List spec downloads with filters
 * Permission: Users see only their own. Admin sees all.
 */
export async function listSpecDownloads(
  filters?: z.infer<typeof specDownloadFilterSchema>
): Promise<{
  data: SpecDownload[]
  total: number
  error: string | null
}> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: [], total: 0, error: 'Not authenticated' }
    }

    const supabase = await createClient()
    const validated = specDownloadFilterSchema.parse(filters || {})

    let query = supabase
      .from('spec_downloads')
      .select('*', { count: 'exact' })

    // Non-admin users can only see their own downloads
    if (!admin) {
      query = query.eq('user_id', currentUser.id)
    } else if (validated.user_id) {
      // Admin can filter by user_id
      query = query.eq('user_id', validated.user_id)
    }

    // Filter by spec_project_id
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
      data: (data as SpecDownload[]) || [],
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
 * Get download count for a spec project
 */
export async function getSpecDownloadCount(
  specProjectId: string
): Promise<{ data: number; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: 0, error: 'Not authenticated' }
    }

    // Check parent dependency
    const { data: specProject, error: specError } = await getSpecProjectById(
      specProjectId
    )

    if (specError || !specProject) {
      return { data: 0, error: 'Spec project not found or access denied' }
    }

    const supabase = await createClient()

    const { count, error } = await supabase
      .from('spec_downloads')
      .select('*', { count: 'exact', head: true })
      .eq('spec_project_id', specProjectId)

    if (error) {
      return { data: 0, error: error.message }
    }

    return { data: count || 0, error: null }
  } catch (err) {
    return {
      data: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get total download count for current user
 */
export async function getUserDownloadCount(): Promise<{
  data: number
  error: string | null
}> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: 0, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    const { count, error } = await supabase
      .from('spec_downloads')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)

    if (error) {
      return { data: 0, error: error.message }
    }

    return { data: count || 0, error: null }
  } catch (err) {
    return {
      data: 0,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

// NONE - spec_download is append-only (Gate 3)

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

// NONE - spec_download is append-only (Gate 3)
// Download records are never deleted
