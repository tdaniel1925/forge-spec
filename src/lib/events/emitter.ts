// ============================================================================
// Event Emitter — Stage 5
// ============================================================================
// Utility for emitting events to the events table.
// Uses service role to bypass RLS (events are system-controlled).
// ============================================================================

import { createClient } from '@supabase/supabase-js';
import type { EmitEventInput, Event } from '@/types/events';

// ============================================================================
// Supabase Service Role Client
// ============================================================================

function getServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for service role');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// Event Emission Function
// ============================================================================

/**
 * Emit an event to the events table.
 *
 * @param input - Event data to emit
 * @returns The created event record
 *
 * @example
 * await emitEvent({
 *   event_type: 'spec_project.created',
 *   entity_type: 'spec_project',
 *   entity_id: specProject.id,
 *   actor_id: userId,
 *   payload: {
 *     name: specProject.name,
 *     description: specProject.description,
 *   },
 * });
 */
export async function emitEvent(input: EmitEventInput): Promise<Event | null> {
  try {
    const supabase = getServiceRoleClient();

    const { data, error } = await supabase
      .from('events')
      .insert({
        event_type: input.event_type,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        actor_id: input.actor_id ?? null,
        payload: input.payload ?? {},
        metadata: input.metadata ?? {},
        previous_state: input.previous_state ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Event Emission Failed]', {
        event_type: input.event_type,
        entity_type: input.entity_type,
        entity_id: input.entity_id,
        error: error.message,
      });
      return null;
    }

    return data as Event;
  } catch (err) {
    console.error('[Event Emission Error]', {
      event_type: input.event_type,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

// ============================================================================
// Batch Event Emission (for performance)
// ============================================================================

/**
 * Emit multiple events in a single transaction.
 *
 * @param inputs - Array of event data to emit
 * @returns Array of created event records
 */
export async function emitEvents(inputs: EmitEventInput[]): Promise<Event[]> {
  if (inputs.length === 0) {
    return [];
  }

  try {
    const supabase = getServiceRoleClient();

    const records = inputs.map((input) => ({
      event_type: input.event_type,
      entity_type: input.entity_type,
      entity_id: input.entity_id,
      actor_id: input.actor_id ?? null,
      payload: input.payload ?? {},
      metadata: input.metadata ?? {},
      previous_state: input.previous_state ?? null,
    }));

    const { data, error } = await supabase
      .from('events')
      .insert(records)
      .select();

    if (error) {
      console.error('[Batch Event Emission Failed]', {
        count: inputs.length,
        error: error.message,
      });
      return [];
    }

    return (data as Event[]) ?? [];
  } catch (err) {
    console.error('[Batch Event Emission Error]', {
      count: inputs.length,
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

// ============================================================================
// Helper: Get Actor ID from Headers (for server actions)
// ============================================================================

/**
 * Extract actor_id from server context.
 * Used in server actions to automatically populate actor_id.
 *
 * @param userId - The authenticated user ID (from getUser())
 * @returns The user ID or null
 */
export function getActorId(userId: string | undefined | null): string | null {
  return userId ?? null;
}

// ============================================================================
// Helper: Add Metadata (IP, User Agent, etc.)
// ============================================================================

/**
 * Build event metadata from request headers (optional).
 * Can be used to track IP address, user agent, etc.
 *
 * @param headers - Request headers (from Next.js headers())
 * @returns Metadata object
 */
export function buildEventMetadata(headers?: Record<string, string>): Record<string, unknown> {
  if (!headers) {
    return {};
  }

  return {
    ip: headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown',
    user_agent: headers['user-agent'] || 'unknown',
    referer: headers['referer'] || null,
  };
}

// ============================================================================
// End of Event Emitter
// ============================================================================
