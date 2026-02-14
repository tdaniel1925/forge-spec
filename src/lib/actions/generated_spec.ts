'use server'

// CRUD operations for generated_spec entity
// From PROJECT-SPEC.md Gate 1 - Entity: generated_spec
// Owner: system | Parent: spec_project
// Mutability: Mutable during review (Gate 3), locked once downloaded
// Permissions: Created by system. Users can read their own spec_project's specs.

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { GeneratedSpec, GeneratedSpecStatus } from '@/types/generated-spec'
import { getCurrentUser } from './user'
import { isAdmin } from '@/lib/auth/roles'
import { logEvent } from '@/lib/system/event-logger'
import { getSpecProjectById } from './spec_project'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createGeneratedSpecSchema = z.object({
  spec_project_id: z.string().uuid(),
})

const updateGeneratedSpecSchema = z.object({
  status: z
    .enum(['generating', 'validating', 'complete', 'failed'])
    .optional(),
  gate_0: z.record(z.unknown()).optional(),
  gate_1: z.record(z.unknown()).optional(),
  gate_2: z.record(z.unknown()).optional(),
  gate_3: z.record(z.unknown()).optional(),
  gate_4: z.record(z.unknown()).optional(),
  gate_5: z.record(z.unknown()).optional(),
  full_spec_markdown: z.string().optional(),
  recommended_stack: z.record(z.unknown()).optional(),
  stack_rationale: z.string().optional(),
  entity_count: z.number().int().optional(),
  state_change_count: z.number().int().optional(),
  validation_errors: z.record(z.unknown()).nullable().optional(),
  spec_quality_score: z.number().int().min(0).max(100).optional(),
  er_diagram_mermaid: z.string().optional(),
  complexity_rating: z
    .enum(['simple', 'moderate', 'complex', 'enterprise'])
    .optional(),
  estimated_build_hours_min: z.number().int().optional(),
  estimated_build_hours_max: z.number().int().optional(),
  estimated_api_cost: z.number().optional(),
  estimated_monthly_hosting: z.number().optional(),
  compliance_requirements: z.array(z.string()).nullable().optional(),
  generation_cost_usd: z.number().optional(),
})

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create generated spec (system only)
 * Permission: System only
 * Parent dependency: spec_project must exist
 * State change #20: system generates spec → generated_spec created (status=generating)
 */
export async function createGeneratedSpec(
  input: z.infer<typeof createGeneratedSpecSchema>
): Promise<{ data: GeneratedSpec | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Validate input
    const validated = createGeneratedSpecSchema.parse(input)

    // Check parent dependency: spec_project must exist
    const { data: specProject, error: specError } = await getSpecProjectById(
      validated.spec_project_id
    )

    if (specError || !specProject) {
      return {
        data: null,
        error: 'Spec project not found or access denied',
      }
    }

    // Check if generated spec already exists for this spec project
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('generated_specs')
      .select('id')
      .eq('spec_project_id', validated.spec_project_id)
      .single()

    if (existing) {
      return {
        data: null,
        error: 'Generated spec already exists for this spec project',
      }
    }

    // Create generated spec
    const { data, error } = await supabase
      .from('generated_specs')
      .insert({
        spec_project_id: validated.spec_project_id,
        status: 'generating',
        gate_0: null,
        gate_1: null,
        gate_2: null,
        gate_3: null,
        gate_4: null,
        gate_5: null,
        full_spec_markdown: null,
        recommended_stack: null,
        stack_rationale: null,
        entity_count: 0,
        state_change_count: 0,
        validation_errors: null,
        spec_quality_score: 0,
        er_diagram_mermaid: null,
        complexity_rating: 'moderate',
        estimated_build_hours_min: 0,
        estimated_build_hours_max: 0,
        estimated_api_cost: 0,
        estimated_monthly_hosting: 0,
        compliance_requirements: null,
        generation_cost_usd: 0,
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event
    await logEvent({
      event_type: 'generated_spec_created',
      actor_id: currentUser.id,
      entity_type: 'generated_spec',
      entity_id: data.id,
      metadata: { spec_project_id: validated.spec_project_id },
    })

    return { data: data as GeneratedSpec, error: null }
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
 * Get generated spec by ID
 * Permission: Users can read specs for their own spec_projects
 */
export async function getGeneratedSpecById(
  specId: string
): Promise<{ data: GeneratedSpec | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('generated_specs')
      .select('*')
      .eq('id', specId)
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Check access: user must own the parent spec_project
    if (!admin) {
      const { data: specProject, error: specError } =
        await getSpecProjectById(data.spec_project_id)

      if (specError || !specProject) {
        return { data: null, error: 'Access denied' }
      }
    }

    return { data: data as GeneratedSpec, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get generated spec by spec project ID
 * Permission: Users can read specs for their own spec_projects
 */
export async function getGeneratedSpecBySpecProject(
  specProjectId: string
): Promise<{ data: GeneratedSpec | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Check parent dependency
    const { data: specProject, error: specError } = await getSpecProjectById(
      specProjectId
    )

    if (specError || !specProject) {
      return { data: null, error: 'Spec project not found or access denied' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('generated_specs')
      .select('*')
      .eq('spec_project_id', specProjectId)
      .single()

    if (error) {
      // If no spec found, return null (not an error)
      if (error.code === 'PGRST116') {
        return { data: null, error: null }
      }
      return { data: null, error: error.message }
    }

    return { data: data as GeneratedSpec, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ============================================================================
// UPDATE OPERATIONS (Mutable during review)
// ============================================================================

/**
 * Update generated spec
 * Permission: System only (called by spec generation pipeline)
 * Mutability: Mutable during review (Gate 3)
 * State changes #20-25: Spec generation and validation
 */
export async function updateGeneratedSpec(
  specId: string,
  updates: z.infer<typeof updateGeneratedSpecSchema>
): Promise<{ data: GeneratedSpec | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Validate input
    const validated = updateGeneratedSpecSchema.parse(updates)

    const supabase = await createClient()

    // Get existing spec
    const { data: existing } = await supabase
      .from('generated_specs')
      .select('*')
      .eq('id', specId)
      .single()

    if (!existing) {
      return { data: null, error: 'Generated spec not found' }
    }

    // Check access: user must own the parent spec_project
    const admin = await isAdmin()
    if (!admin) {
      const { data: specProject, error: specError } =
        await getSpecProjectById(existing.spec_project_id)

      if (specError || !specProject) {
        return { data: null, error: 'Access denied' }
      }
    }

    // Update spec
    const { data, error } = await supabase
      .from('generated_specs')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', specId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event
    await logEvent({
      event_type: 'generated_spec_updated',
      actor_id: currentUser.id,
      entity_type: 'generated_spec',
      entity_id: specId,
      metadata: {
        updated_fields: Object.keys(validated),
        new_status: validated.status,
      },
    })

    return { data: data as GeneratedSpec, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Mark spec as complete
 * State change #21: spec complete → generated_spec.status = complete
 */
export async function markSpecComplete(
  specId: string,
  generationCostUsd: number
): Promise<{ data: GeneratedSpec | null; error: string | null }> {
  return updateGeneratedSpec(specId, {
    status: 'complete',
    generation_cost_usd: generationCostUsd,
  })
}

/**
 * Mark spec generation as failed
 * State change #22: spec generation fails → status = failed
 */
export async function markSpecFailed(
  specId: string
): Promise<{ data: GeneratedSpec | null; error: string | null }> {
  return updateGeneratedSpec(specId, {
    status: 'failed',
  })
}

/**
 * Update validation results
 * State change #20b: validates spec completeness
 */
export async function updateValidationResults(
  specId: string,
  qualityScore: number,
  validationErrors: Record<string, unknown> | null
): Promise<{ data: GeneratedSpec | null; error: string | null }> {
  return updateGeneratedSpec(specId, {
    status: 'validating',
    spec_quality_score: qualityScore,
    validation_errors: validationErrors,
  })
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

// NONE - generated_spec is not deleted, only the parent spec_project can be archived
