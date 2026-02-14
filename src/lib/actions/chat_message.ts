'use server'

// CRUD operations for chat_message entity
// From PROJECT-SPEC.md Gate 1 - Entity: chat_message
// Owner: user | Parent: spec_project
// Mutability: APPEND-ONLY (Gate 3) - No updates or deletes
// Permissions: Users can create and read messages for their own spec_projects

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type {
  ChatMessage,
  ChatMessageInsert,
  ChatMessageDisplay,
  ChatMessageMetadata,
  ChatRole,
} from '@/types/chat-message'
import { getCurrentUser } from './user'
import { isAdmin } from '@/lib/auth/roles'
import { logEvent } from '@/lib/system/event-logger'
import { getSpecProjectById } from './spec_project'
import { emitEvent } from '@/lib/events/emitter'
import type { ChatMessageCreatedPayload } from '@/types/events'

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createChatMessageSchema = z.object({
  spec_project_id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().min(1),
  metadata: z.record(z.unknown()).nullable().optional(),
})

const chatMessageFilterSchema = z.object({
  spec_project_id: z.string().uuid(),
  role: z.enum(['user', 'assistant', 'system']).optional(),
  limit: z.number().min(1).max(1000).default(100),
  offset: z.number().min(0).default(0),
})

// ============================================================================
// CREATE OPERATIONS
// ============================================================================

/**
 * Create chat message (append-only)
 * Permission: Users can create messages for their own spec_projects
 * Parent dependency: spec_project must exist and belong to user
 * State change #7: user describes their app idea → chat_message created (role=user)
 */
export async function createChatMessage(
  input: z.infer<typeof createChatMessageSchema>
): Promise<{ data: ChatMessage | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    // Validate input
    const validated = createChatMessageSchema.parse(input)

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

    // Get current message order (highest message_order + 1)
    const { data: lastMessage } = await supabase
      .from('chat_messages')
      .select('message_order')
      .eq('spec_project_id', validated.spec_project_id)
      .order('message_order', { ascending: false })
      .limit(1)
      .single()

    const messageOrder = lastMessage ? lastMessage.message_order + 1 : 1

    // Create chat message
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        spec_project_id: validated.spec_project_id,
        user_id: currentUser.id,
        role: validated.role,
        content: validated.content,
        message_order: messageOrder,
        metadata: validated.metadata || null,
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (error) {
      return { data: null, error: error.message }
    }

    // Log event (legacy)
    await logEvent({
      event_type: 'chat_message_created',
      actor_id: currentUser.id,
      entity_type: 'chat_message',
      entity_id: data.id,
      metadata: {
        spec_project_id: validated.spec_project_id,
        role: validated.role,
        message_length: validated.content.length,
      },
    })

    // Emit event (Stage 5)
    await emitEvent({
      event_type: 'chat_message.created',
      entity_type: 'chat_message',
      entity_id: data.id,
      actor_id: currentUser.id,
      payload: {
        chat_message_id: data.id,
        spec_project_id: validated.spec_project_id,
        role: validated.role,
        content: validated.content,
        message_order: messageOrder,
      } as ChatMessageCreatedPayload,
    })

    // Also emit spec_project.described event if this is a user message (State change #7)
    if (validated.role === 'user') {
      await emitEvent({
        event_type: 'spec_project.described',
        entity_type: 'spec_project',
        entity_id: validated.spec_project_id,
        actor_id: currentUser.id,
        payload: {
          spec_project_id: validated.spec_project_id,
          chat_message_id: data.id,
          message_content: validated.content,
        },
      })
    }

    return { data: data as ChatMessage, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Create system message
 * Used for automated messages (e.g., "What would you like to build?")
 */
export async function createSystemMessage(
  specProjectId: string,
  content: string,
  metadata?: ChatMessageMetadata
): Promise<{ data: ChatMessage | null; error: string | null }> {
  return createChatMessage({
    spec_project_id: specProjectId,
    role: 'system',
    content,
    metadata: metadata || null,
  })
}

/**
 * Create assistant message
 * Used for AI responses
 */
export async function createAssistantMessage(
  specProjectId: string,
  content: string,
  metadata?: ChatMessageMetadata
): Promise<{ data: ChatMessage | null; error: string | null }> {
  return createChatMessage({
    spec_project_id: specProjectId,
    role: 'assistant',
    content,
    metadata: metadata || null,
  })
}

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Get chat message by ID
 * Permission: Users can only read messages for their own spec_projects
 */
export async function getChatMessageById(
  messageId: string
): Promise<{ data: ChatMessage | null; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: null, error: 'Not authenticated' }
    }

    const supabase = await createClient()

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('id', messageId)

    // Non-admin users can only see their own messages
    if (!admin) {
      query = query.eq('user_id', currentUser.id)
    }

    const { data, error } = await query.single()

    if (error) {
      return { data: null, error: error.message }
    }

    return { data: data as ChatMessage, error: null }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * List chat messages for a spec project
 * Permission: Users can only read messages for their own spec_projects
 * Returns messages in order (oldest first)
 */
export async function listChatMessages(
  filters: z.infer<typeof chatMessageFilterSchema>
): Promise<{
  data: ChatMessage[]
  total: number
  error: string | null
}> {
  try {
    const currentUser = await getCurrentUser()
    const admin = await isAdmin()

    if (!currentUser) {
      return { data: [], total: 0, error: 'Not authenticated' }
    }

    // Validate input
    const validated = chatMessageFilterSchema.parse(filters)

    // Check parent dependency: spec_project must exist and belong to user
    const { data: specProject, error: specError } = await getSpecProjectById(
      validated.spec_project_id
    )

    if (specError || !specProject) {
      return {
        data: [],
        total: 0,
        error: 'Spec project not found or access denied',
      }
    }

    const supabase = await createClient()

    let query = supabase
      .from('chat_messages')
      .select('*', { count: 'exact' })
      .eq('spec_project_id', validated.spec_project_id)

    // Apply role filter if specified
    if (validated.role) {
      query = query.eq('role', validated.role)
    }

    // Pagination
    query = query.range(
      validated.offset,
      validated.offset + validated.limit - 1
    )

    // Sort by message order (ascending - oldest first)
    query = query.order('message_order', { ascending: true })

    const { data, error, count } = await query

    if (error) {
      return { data: [], total: 0, error: error.message }
    }

    return {
      data: (data as ChatMessage[]) || [],
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
 * Get all messages for a spec project (no pagination)
 * Used for full conversation context
 */
export async function getAllChatMessages(
  specProjectId: string
): Promise<{ data: ChatMessage[]; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: [], error: 'Not authenticated' }
    }

    // Check parent dependency
    const { data: specProject, error: specError } = await getSpecProjectById(
      specProjectId
    )

    if (specError || !specProject) {
      return { data: [], error: 'Spec project not found or access denied' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('spec_project_id', specProjectId)
      .order('message_order', { ascending: true })

    if (error) {
      return { data: [], error: error.message }
    }

    return { data: (data as ChatMessage[]) || [], error: null }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get latest N messages for a spec project
 * Used for chat UI to show recent conversation
 */
export async function getLatestChatMessages(
  specProjectId: string,
  limit: number = 50
): Promise<{ data: ChatMessage[]; error: string | null }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { data: [], error: 'Not authenticated' }
    }

    // Check parent dependency
    const { data: specProject, error: specError } = await getSpecProjectById(
      specProjectId
    )

    if (specError || !specProject) {
      return { data: [], error: 'Spec project not found or access denied' }
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('spec_project_id', specProjectId)
      .order('message_order', { ascending: false })
      .limit(limit)

    if (error) {
      return { data: [], error: error.message }
    }

    // Reverse to get chronological order
    const messages = (data as ChatMessage[]) || []
    return { data: messages.reverse(), error: null }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

/**
 * Get chat message count for a spec project
 */
export async function getChatMessageCount(
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
      .from('chat_messages')
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

// ============================================================================
// UPDATE OPERATIONS
// ============================================================================

// NONE - chat_message is append-only (Gate 3)

// ============================================================================
// DELETE OPERATIONS
// ============================================================================

// NONE - chat_message is append-only (Gate 3)
// Conversation history is immutable
