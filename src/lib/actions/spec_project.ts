'use server'

// CRUD operations for spec_project entity
// From PROJECT-SPEC.md Gate 1 - Entity: spec_project
// Owner: user | Parent: none
// Mutability: mutable (status changes throughout lifecycle)
// Permissions (Gate 3): Users can only read/update/archive their own spec_projects. Admin has full access.

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type {
  SpecProject,
  SpecProjectInsert,
  SpecProjectUpdate,
  SpecProjectListItem,
  SpecProjectStatus,
} from '@/types/spec-project'
import { getCurrentUser } from './user'
import { isAdmin } from '@/lib/auth/roles'
import { logEvent } from '@/lib/system/event-logger'
import { recomputeSpecsGenerated } from './user'
import { emitEvent } from '@/lib/events/emitter'
import type { SpecProjectCreatedPayload } from '@/types/events'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createSpecProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().nullable().optional(),
  parent_spec_id: z.string().uuid().nullable().optional(),
})

const updateSpecProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z
    .enum(['researching', 'chatting', 'generating', 'review', 'complete', 'archived'])
    .optional(),
  research_status: z
    .enum(['pending', 'in_progress', 'complete', 'skipped'])
    .optional(),
  spec_status: z.enum(['draft', 'complete']).optional(),
})

const specProjectFilterSchema = z.object({
  status: z
    .enum(['researching', 'chatting', 'generating', 'review', 'complete', 'archived'])
    .optional(),
  spec_status: z.enum(['draft', 'complete']).optional(),
  search: z.string().optional(), // search by name or description
  user_id: z.string().uuid().optional(), // admin only: filter by user
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create new spec project
 * Permission: Authenticated users only
 * Parent dependency: user must exist (automatic - current user)
 * State change #6: user clicks "New Spec" → spec_project created (status=chatting)
 */
export async function createSpecProject(
  input: z.infer<typeof createSpecProjectSchema>
): Promise<{ data: SpecProject | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Validate input
    const validated = createSpecProjectSchema.parse(input)

    const supabase = await createClient()

    // Generate slug from name
    const slug =
      validated.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Math.random().toString(36).substring(2, 8)

    // If this is a version of an existing spec, get the parent
    let version = 1
    if (validated.parent_spec_id) {
      const { data: parentSpec } = await supabase
        .from('spec_projects')
        .select('version')
        .eq('id', validated.parent_spec_id)
        .single()

      if (parentSpec) {
        version = parentSpec.version + 1
      }
    }

    // Create spec project
    const { data, error } = await supabase
      .from('spec_projects')
      .insert({
        user_id: currentUser.id,
        name: validated.name,
        description: validated.description || null,
        slug,
        status: 'chatting', // Initial state from Gate 2 #6
        research_status: 'pending',
        spec_status: 'draft',
        download_count: 0,
        version,
        parent_spec_id: validated.parent_spec_id || null,
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'spec_project_created',
      actor_id: currentUser.id,
      entity_type: 'spec_project',
      entity_id: data.id,
      metadata: { name: validated.name, version },
    })

    // Emit event (Stage 5) - State change #6
    await emitEvent({
      event_type: 'spec_project.created',
      entity_type: 'spec_project',
      entity_id: data.id,
      actor_id: currentUser.id,
      payload: {
        spec_project_id: data.id,
        name: validated.name,
        description: validated.description || null,
        user_id: currentUser.id,
        version,
        parent_spec_id: validated.parent_spec_id || null,
      } as SpecProjectCreatedPayload,
    })

    return { data: data as SpecProject, error: null }
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
 * Get spec project by ID
 * Permission: Users can only read their own spec_projects. Admin can read all.
 */
export async function getSpecProjectById(
  specProjectId: string
): Promise<{ data: SpecProject | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    let query = supabase
      .from('spec_projects')
      .select('*')
      .eq('id', specProjectId)
      .is('archived_at', null)

    // Non-admin users can only see their own specs
    if (!admin) {
      query = query.eq('user_id', currentUser.id)
    }

    const { data, error } = await query.single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as SpecProject, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get spec project by slug
 * Permission: Users can only read their own spec_projects. Admin can read all.
 */
export async function getSpecProjectBySlug(
  slug: string
): Promise<{ data: SpecProject | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    let query = supabase
      .from('spec_projects')
      .select('*')
      .eq('slug', slug)
      .is('archived_at', null)

    // Non-admin users can only see their own specs
    if (!admin) {
      query = query.eq('user_id', currentUser.id)
    }

    const { data, error } = await query.single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as SpecProject, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * List spec projects with filters
 * Permission: Users see only their own. Admin sees all.
 */
export async function listSpecProjects(
  filters?: z.infer<typeof specProjectFilterSchema>
): Promise<{
  data: SpecProject[]
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
    const validated = specProjectFilterSchema.parse(filters || {})

    let query = supabase
      .from('spec_projects')
      .select('*', { count: 'exact' })
      .is('archived_at', null)

    // Non-admin users can only see their own specs
    if (!admin) {
      query = query.eq('user_id', currentUser.id)
    } else if (validated.user_id) {
      // Admin can filter by user_id
      query = query.eq('user_id', validated.user_id)
    }

    // Apply filters
    if (validated.status) {
      query = query.eq('status', validated.status)
    }
    if (validated.spec_status) {
      query = query.eq('spec_status', validated.spec_status)
    }
    if (validated.search) {
      query = query.or(
        `name.ilike.%${validated.search}%,description.ilike.%${validated.search}%`
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

    return {
      data: (data as SpecProject[]) || [],
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
 * Get user's dashboard stats
 * Returns counts of specs by status
 */
export async function getUserSpecStats(): Promise<{
  data: {
    total: number
    in_progress: number
    completed: number
    downloaded: number
  } | null
  error: string | null
}> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Get total count
    const { count: total } = await supabase
      .from('spec_projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .is('archived_at', null)

    // Get in-progress count (researching, chatting, generating, review)
    const { count: in_progress } = await supabase
      .from('spec_projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .in('status', ['researching', 'chatting', 'generating', 'review'])
      .is('archived_at', null)

    // Get completed count
    const { count: completed } = await supabase
      .from('spec_projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .eq('status', 'complete')
      .is('archived_at', null)

    // Get downloaded count (specs with download_count > 0)
    const { count: downloaded } = await supabase
      .from('spec_projects')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', currentUser.id)
      .gt('download_count', 0)
      .is('archived_at', null)

    return {
      data: {
        total: total || 0,
        in_progress: in_progress || 0,
        completed: completed || 0,
        downloaded: downloaded || 0,
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
 * Update spec project
 * Permission: Users can update their own spec_projects (Gate 3: name field, while not archived)
 * Admin can update any field
 */
export async function updateSpecProject(
  specProjectId: string,
  updates: z.infer<typeof updateSpecProjectSchema>
): Promise<{ data: SpecProject | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Check ownership
    const { data: existingSpec } = await supabase
      .from('spec_projects')
      .select('user_id, status')
      .eq('id', specProjectId)
      .is('archived_at', null)
      .single()

    if (!existingSpec) {
      return { data: null, error: 'Spec project not found' }
    }

    if (existingSpec.user_id !== currentUser.id && !admin) {
      return { data: null, error: 'Permission denied' }
    }

    // Validate input
    const validated = updateSpecProjectSchema.parse(updates)

    // Non-admin users can only update name (Gate 3 restriction)
    if (!admin && Object.keys(validated).some((key) => key !== 'name')) {
      return {
        data: null,
        error: 'Users can only update the name field',
      }
    }

    // Update spec project
    const { data, error } = await supabase
      .from('spec_projects')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', specProjectId)
      .is('archived_at', null)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'spec_project_updated',
      actor_id: currentUser.id,
      entity_type: 'spec_project',
      entity_id: specProjectId,
      metadata: { updated_fields: Object.keys(validated) },
    })

    // Emit event (Stage 5)
    await emitEvent({
      event_type: 'entity.updated',
      entity_type: 'spec_project',
      entity_id: specProjectId,
      actor_id: currentUser.id,
      payload: {
        updated_fields: Object.keys(validated),
        ...validated,
      },
      previous_state: {
        status: existingSpec.status,
      },
    })

    // If status changed to complete, recompute user's specs_generated
    if (validated.status === 'complete') {
      await recomputeSpecsGenerated(currentUser.id)

      // Emit spec approved event (State change #25)
      await emitEvent({
        event_type: 'spec_project.approved',
        entity_type: 'spec_project',
        entity_id: specProjectId,
        actor_id: currentUser.id,
        payload: {},
      })
    }

    return { data: data as SpecProject, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Update spec project status
 * Used by system during workflows (research, generation)
 */
export async function updateSpecProjectStatus(
  specProjectId: string,
  status: SpecProjectStatus
): Promise<{ data: SpecProject | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Check ownership or admin
    const { data: existingSpec } = await supabase
      .from('spec_projects')
      .select('user_id')
      .eq('id', specProjectId)
      .is('archived_at', null)
      .single()

    if (!existingSpec) {
      return { data: null, error: 'Spec project not found' }
    }

    if (existingSpec.user_id !== currentUser.id && !admin) {
      return { data: null, error: 'Permission denied' }
    }

    const { data, error } = await supabase
      .from('spec_projects')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', specProjectId)
      .is('archived_at', null)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'spec_project_status_changed',
      actor_id: currentUser.id,
      entity_type: 'spec_project',
      entity_id: specProjectId,
      metadata: { new_status: status },
    })

    // Emit event (Stage 5) - Various state changes depending on status
    const eventTypeMap: Record<SpecProjectStatus, string> = {
      chatting: 'spec_project.created',
      researching: 'spec_project.research_started',
      generating: 'generated_spec.generation_started',
      review: 'spec_project.review_started',
      complete: 'spec_project.approved',
      archived: 'spec_project.archived',
    }

    await emitEvent({
      event_type: eventTypeMap[status] as any || 'entity.updated',
      entity_type: 'spec_project',
      entity_id: specProjectId,
      actor_id: currentUser.id,
      payload: {
        status,
        spec_project_id: specProjectId,
      },
    })

    // If status changed to complete, recompute user's specs_generated
    if (status === 'complete') {
      await recomputeSpecsGenerated(existingSpec.user_id)
    }

    return { data: data as SpecProject, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Increment download count
 * Called when a spec is downloaded
 */
export async function incrementDownloadCount(
  specProjectId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.rpc('increment_download_count', {
      spec_id: specProjectId,
    })

    if (error) {
      // If RPC doesn't exist, do it manually
      const { data: spec } = await supabase
        .from('spec_projects')
        .select('download_count')
        .eq('id', specProjectId)
        .single()

      if (spec) {
        await supabase
          .from('spec_projects')
          .update({
            download_count: spec.download_count + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', specProjectId)
      }
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
 * Archive spec project (soft delete)
 * Permission: Users can archive their own spec_projects. Admin can archive any.
 * State change #29: user archives spec → status = archived
 */
export async function archiveSpecProject(
  specProjectId: string
): Promise<{ error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Check ownership
    const { data: existingSpec } = await supabase
      .from('spec_projects')
      .select('user_id')
      .eq('id', specProjectId)
      .is('archived_at', null)
      .single()

    if (!existingSpec) {
      return { error: 'Spec project not found' }
    }

    if (existingSpec.user_id !== currentUser.id && !admin) {
      return { error: 'Permission denied' }
    }

    // Soft delete
    const { error } = await supabase
      .from('spec_projects')
      .update({
        status: 'archived',
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', specProjectId)
      .is('archived_at', null)

    if (error) {
      return { error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'spec_project_archived',
      actor_id: currentUser.id,
      entity_type: 'spec_project',
      entity_id: specProjectId,
      metadata: {},
    })

    // Emit event (Stage 5) - State change #29
    await emitEvent({
      event_type: 'spec_project.archived',
      entity_type: 'spec_project',
      entity_id: specProjectId,
      actor_id: currentUser.id,
      payload: {
        spec_project_id: specProjectId,
      },
    })

    // Recompute user's specs_generated (archived specs don't count)
    await recomputeSpecsGenerated(existingSpec.user_id)

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Restore archived spec project
 * Permission: Users can restore their own. Admin can restore any.
 */
export async function restoreSpecProject(
  specProjectId: string
): Promise<{ data: SpecProject | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Check ownership
    const { data: existingSpec } = await supabase
      .from('spec_projects')
      .select('user_id')
      .eq('id', specProjectId)
      .not('archived_at', 'is', null)
      .single()

    if (!existingSpec) {
      return { data: null, error: 'Archived spec project not found' }
    }

    if (existingSpec.user_id !== currentUser.id && !admin) {
      return { data: null, error: 'Permission denied' }
    }

    // Restore
    const { data, error } = await supabase
      .from('spec_projects')
      .update({
        status: 'review', // Set to review status
        archived_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', specProjectId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'spec_project_restored',
      actor_id: currentUser.id,
      entity_type: 'spec_project',
      entity_id: specProjectId,
      metadata: {},
    })

    // Emit event (Stage 5)
    await emitEvent({
      event_type: 'entity.updated',
      entity_type: 'spec_project',
      entity_id: specProjectId,
      actor_id: currentUser.id,
      payload: {
        change_type: 'restored',
        spec_project_id: specProjectId,
      },
    })

    // Recompute user's specs_generated
    await recomputeSpecsGenerated(existingSpec.user_id)

    return { data: data as SpecProject, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
