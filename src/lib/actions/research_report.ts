'use server'

// CRUD operations for research_report entity
// From PROJECT-SPEC.md Gate 1 - Entity: research_report
// Owner: system | Parent: spec_project
// Mutability: WRITE-ONCE per phase (Gate 3) - Each phase writes once, never overwritten
// Permissions: Created by system. Users can read their own spec_project's reports.

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { ResearchReport, ResearchReportStatus } from '@/types/research-report'
import { getCurrentUser } from './user'
import { isAdmin } from '@/lib/auth/roles'
import { logEvent } from '@/lib/system/event-logger'
import { getSpecProjectById } from './spec_project'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createResearchReportSchema = z.object({
  spec_project_id: z.string().uuid(),
})

const updatePhaseSchema = z.object({
  status: z.enum([
    'generating',
    'phase_1',
    'phase_2',
    'phase_3',
    'phase_4',
    'complete',
    'failed',
  ]),
  domain_summary: z.string().optional(),
  competitor_analysis: z.record(z.unknown()).optional(),
  feature_decomposition: z.record(z.unknown()).optional(),
  technical_requirements: z.record(z.unknown()).optional(),
  competitive_gaps: z.record(z.unknown()).optional(),
  raw_search_results: z.record(z.unknown()).optional(),
  total_cost_usd: z.number().optional(),
})

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create research report (system only)
 * Permission: System only
 * Parent dependency: spec_project must exist
 * State change #8: system determines enough initial context → research_report created (status=generating)
 */
export async function createResearchReport(
  input: z.infer<typeof createResearchReportSchema>
): Promise<{ data: ResearchReport | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Validate input
    const validated = createResearchReportSchema.parse(input)

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

    // Check if research report already exists for this spec project
    const supabase = await createClient()

    const { data: existing } = await supabase
      .from('research_reports')
      .select('id')
      .eq('spec_project_id', validated.spec_project_id)
      .single()

    if (existing) {
      return {
        data: null,
        error: 'Research report already exists for this spec project',
      }
    }

    // Create research report
    const { data, error } = await supabase
      .from('research_reports')
      .insert({
        spec_project_id: validated.spec_project_id,
        status: 'generating',
        domain_summary: null,
        competitor_analysis: null,
        feature_decomposition: null,
        technical_requirements: null,
        competitive_gaps: null,
        raw_search_results: null,
        total_cost_usd: 0,
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event
    await logEvent({
      event_type: 'research_report_created',
      actor_id: currentUser.id,
      entity_type: 'research_report',
      entity_id: data.id,
      metadata: { spec_project_id: validated.spec_project_id },
    })

    return { data: data as ResearchReport, error: null }
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
 * Get research report by ID
 * Permission: Users can read reports for their own spec_projects
 */
export async function getResearchReportById(
  reportId: string
): Promise<{ data: ResearchReport | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('research_reports')
      .select('*')
      .eq('id', reportId)
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

    return { data: data as ResearchReport, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get research report by spec project ID
 * Permission: Users can read reports for their own spec_projects
 */
export async function getResearchReportBySpecProject(
  specProjectId: string
): Promise<{ data: ResearchReport | null; error: string | null }> {
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
      .from('research_reports')
      .select('*')
      .eq('spec_project_id', specProjectId)
      .single()

    if (error) {
      // If no report found, return null (not an error)
      if (error.code === 'PGRST116') {
        return { data: null, error: null }
      }
      return { data: null, error: error.message }
    }

    return { data: data as ResearchReport, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// ============================================================================
// UPDATE OPERATIONS (Write-once per phase)
// ============================================================================

/**
 * Update research report phase data
 * Permission: System only (called by research pipeline)
 * Mutability: Write-once per phase - Each phase updates its own fields
 * State changes #9-19: Research phase transitions
 */
export async function updateResearchPhase(
  reportId: string,
  updates: z.infer<typeof updatePhaseSchema>
): Promise<{ data: ResearchReport | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Validate input
    const validated = updatePhaseSchema.parse(updates)

    const supabase = await createClient()

    // Get existing report
    const { data: existing } = await supabase
      .from('research_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (!existing) {
      return { data: null, error: 'Research report not found' }
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

    // Update report (write-once per phase - don't overwrite existing phase data)
    const updateData: Record<string, unknown> = {
      status: validated.status,
      updated_at: new Date().toISOString(),
    }

    // Only update fields if they're provided and not already set
    if (validated.domain_summary && !existing.domain_summary) {
      updateData.domain_summary = validated.domain_summary
    }
    if (validated.competitor_analysis && !existing.competitor_analysis) {
      updateData.competitor_analysis = validated.competitor_analysis
    }
    if (validated.feature_decomposition && !existing.feature_decomposition) {
      updateData.feature_decomposition = validated.feature_decomposition
    }
    if (
      validated.technical_requirements &&
      !existing.technical_requirements
    ) {
      updateData.technical_requirements = validated.technical_requirements
    }
    if (validated.competitive_gaps && !existing.competitive_gaps) {
      updateData.competitive_gaps = validated.competitive_gaps
    }
    if (validated.raw_search_results) {
      // Raw search results can be appended
      updateData.raw_search_results = validated.raw_search_results
    }
    if (validated.total_cost_usd !== undefined) {
      updateData.total_cost_usd = validated.total_cost_usd
    }

    const { data, error } = await supabase
      .from('research_reports')
      .update(updateData)
      .eq('id', reportId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event
    await logEvent({
      event_type: 'research_phase_updated',
      actor_id: currentUser.id,
      entity_type: 'research_report',
      entity_id: reportId,
      metadata: {
        new_status: validated.status,
        phase_fields_updated: Object.keys(validated),
      },
    })

    return { data: data as ResearchReport, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Mark research as complete
 * State change #19: system → research complete → research_report.status = complete
 */
export async function markResearchComplete(
  reportId: string,
  totalCostUsd: number
): Promise<{ data: ResearchReport | null; error: string | null }> {
  return updateResearchPhase(reportId, {
    status: 'complete',
    total_cost_usd: totalCostUsd,
  })
}

/**
 * Mark research as failed
 * State change #22 variation: research fails
 */
export async function markResearchFailed(
  reportId: string
): Promise<{ data: ResearchReport | null; error: string | null }> {
  return updateResearchPhase(reportId, {
    status: 'failed',
  })
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

// NONE - research_report is write-once per phase (Gate 3)
// Reports are not deleted, only the parent spec_project can be archived
