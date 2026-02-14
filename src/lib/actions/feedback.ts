'use server'

// CRUD operations for feedback entity
// From PROJECT-SPEC.md Gate 1 - Entity: feedback
// Owner: user | Parent: spec_project (nullable)
// Mutability: Mutable (Gate 3) - Admin can mark as reviewed
// Permissions: Users can create feedback. Users can read their own. Admin can read all and update.

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { Feedback, FeedbackStatus, FeedbackType } from '@/types/feedback'
import { getCurrentUser } from './user'
import { isAdmin, requireAdmin } from '@/lib/auth/roles'
import { logEvent } from '@/lib/system/event-logger'
import { emitEvent } from '@/lib/events/emitter'
import type { FeedbackCreatedPayload } from '@/types/events'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createFeedbackSchema = z.object({
  spec_project_id: z.string().uuid().nullable().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1).max(5000),
  feedback_type: z.enum([
    'spec_quality',
    'ui',
    'feature_request',
    'bug',
    'other',
  ]),
})

const updateFeedbackSchema = z.object({
  status: z.enum(['pending', 'reviewed']).optional(),
})

const feedbackFilterSchema = z.object({
  status: z.enum(['pending', 'reviewed']).optional(),
  feedback_type: z
    .enum(['spec_quality', 'ui', 'feature_request', 'bug', 'other'])
    .optional(),
  spec_project_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(), // admin only
  min_rating: z.number().int().min(1).max(5).optional(),
  max_rating: z.number().int().min(1).max(5).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
})

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create feedback
 * Permission: Authenticated users can create
 */
export async function createFeedback(
  input: z.infer<typeof createFeedbackSchema>
): Promise<{ data: Feedback | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Validate input
    const validated = createFeedbackSchema.parse(input)

    const supabase = await createClient()

    // Create feedback
    const { data, error } = await supabase
      .from('feedbacks')
      .insert({
        user_id: currentUser.id,
        spec_project_id: validated.spec_project_id || null,
        rating: validated.rating,
        comment: validated.comment,
        feedback_type: validated.feedback_type,
        status: 'pending',
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'feedback_created',
      actor_id: currentUser.id,
      entity_type: 'feedback',
      entity_id: data.id,
      metadata: {
        rating: validated.rating,
        feedback_type: validated.feedback_type,
        spec_project_id: validated.spec_project_id,
      },
    })

    // Emit event (Stage 5)
    await emitEvent({
      event_type: 'feedback.created',
      entity_type: 'feedback',
      entity_id: data.id,
      actor_id: currentUser.id,
      payload: {
        feedback_id: data.id,
        user_id: currentUser.id,
        spec_project_id: validated.spec_project_id || undefined,
        rating: validated.rating,
        comment: validated.comment,
        feedback_type: validated.feedback_type,
      } as FeedbackCreatedPayload,
    })

    return { data: data as Feedback, error: null }
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
 * Get feedback by ID
 * Permission: Users can read their own feedback. Admin can read all.
 */
export async function getFeedbackById(
  feedbackId: string
): Promise<{ data: Feedback | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    let query = supabase.from('feedbacks').select('*').eq('id', feedbackId)

    // Non-admin users can only see their own feedback
    if (!admin) {
      query = query.eq('user_id', currentUser.id)
    }

    const { data, error } = await query.single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as Feedback, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * List feedback with filters
 * Permission: Users see only their own. Admin sees all.
 */
export async function listFeedback(
  filters?: z.infer<typeof feedbackFilterSchema>
): Promise<{
  data: Feedback[]
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
    const validated = feedbackFilterSchema.parse(filters || {})

    let query = supabase.from('feedbacks').select('*', { count: 'exact' })

    // Non-admin users can only see their own feedback
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
    if (validated.feedback_type) {
      query = query.eq('feedback_type', validated.feedback_type)
    }
    if (validated.spec_project_id) {
      query = query.eq('spec_project_id', validated.spec_project_id)
    }
    if (validated.min_rating) {
      query = query.gte('rating', validated.min_rating)
    }
    if (validated.max_rating) {
      query = query.lte('rating', validated.max_rating)
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
      data: (data as Feedback[]) || [],
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
 * Get feedback stats
 * Permission: Admin only
 */
export async function getFeedbackStats(): Promise<{
  data: {
    total: number
    pending: number
    reviewed: number
    avg_rating: number
    by_type: Record<FeedbackType, number>
    by_rating: Record<number, number>
  } | null
  error: string | null
}> {
  try {
    await requireAdmin()

    const supabase = await createClient()

    // Get all feedback
    const { data: allFeedback } = await supabase
      .from('feedbacks')
      .select('*')

    if (!allFeedback || allFeedback.length === 0) {
      return {
        data: {
          total: 0,
          pending: 0,
          reviewed: 0,
          avg_rating: 0,
          by_type: {
            spec_quality: 0,
            ui: 0,
            feature_request: 0,
            bug: 0,
            other: 0,
          },
          by_rating: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
        error: null,
      }
    }

    const total = allFeedback.length
    const pending = allFeedback.filter((f) => f.status === 'pending').length
    const reviewed = allFeedback.filter((f) => f.status === 'reviewed').length

    const avgRating =
      allFeedback.reduce((sum, f) => sum + f.rating, 0) / total

    const byType: Record<FeedbackType, number> = {
      spec_quality: allFeedback.filter((f) => f.feedback_type === 'spec_quality')
        .length,
      ui: allFeedback.filter((f) => f.feedback_type === 'ui').length,
      feature_request: allFeedback.filter(
        (f) => f.feedback_type === 'feature_request'
      ).length,
      bug: allFeedback.filter((f) => f.feedback_type === 'bug').length,
      other: allFeedback.filter((f) => f.feedback_type === 'other').length,
    }

    const byRating: Record<number, number> = {
      1: allFeedback.filter((f) => f.rating === 1).length,
      2: allFeedback.filter((f) => f.rating === 2).length,
      3: allFeedback.filter((f) => f.rating === 3).length,
      4: allFeedback.filter((f) => f.rating === 4).length,
      5: allFeedback.filter((f) => f.rating === 5).length,
    }

    return {
      data: {
        total,
        pending,
        reviewed,
        avg_rating: avgRating,
        by_type: byType,
        by_rating: byRating,
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
 * Update feedback status
 * Permission: Admin only (to mark as reviewed)
 */
export async function updateFeedback(
  feedbackId: string,
  updates: z.infer<typeof updateFeedbackSchema>
): Promise<{ data: Feedback | null; error: string | null }> {
  try {
    await requireAdmin()

    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Validate input
    const validated = updateFeedbackSchema.parse(updates)

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('feedbacks')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId)
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event
    await logEvent({
      event_type: 'feedback_updated',
      actor_id: currentUser.id,
      entity_type: 'feedback',
      entity_id: feedbackId,
      metadata: { new_status: validated.status },
    })

    return { data: data as Feedback, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Mark feedback as reviewed
 * Permission: Admin only
 */
export async function markFeedbackReviewed(
  feedbackId: string
): Promise<{ data: Feedback | null; error: string | null }> {
  return updateFeedback(feedbackId, {
    status: 'reviewed',
  })
}

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

/**
 * Delete feedback (soft delete)
 * Permission: Admin only, or user can delete their own
 */
export async function deleteFeedback(
  feedbackId: string
): Promise<{ error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { error: 'Not authenticated' }
    }

    const supabase = await createClient()

    // Check ownership
    const { data: existingFeedback } = await supabase
      .from('feedbacks')
      .select('user_id')
      .eq('id', feedbackId)
      .is('archived_at', null)
      .single()

    if (!existingFeedback) {
      return { error: 'Feedback not found' }
    }

    if (existingFeedback.user_id !== currentUser.id && !admin) {
      return { error: 'Permission denied' }
    }

    // Soft delete
    const { error } = await supabase
      .from('feedbacks')
      .update({
        archived_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', feedbackId)
      .is('archived_at', null)

    if (error) {
      return { error: error.message }
    }

    // Log event
    await logEvent({
      event_type: 'feedback_deleted',
      actor_id: currentUser.id,
      entity_type: 'feedback',
      entity_id: feedbackId,
      metadata: {},
    })

    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
