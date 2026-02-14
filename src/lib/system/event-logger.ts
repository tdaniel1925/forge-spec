import { createAdminClient } from '@/lib/supabase/server'

/**
 * System event types for Stage 2 auth logging.
 * Full event system will be implemented in Stage 5.
 * This is a minimal logger for auth events only.
 */
type AuthEventType =
  | 'user_signed_up'
  | 'user_signed_in'
  | 'user_signed_out'
  | 'password_reset_requested'
  | 'password_updated'

interface EventMetadata {
  [key: string]: unknown
}

/**
 * Logs an auth event to system logs.
 * Uses service role client to bypass RLS.
 * Stage 2 implementation - minimal logging for auth events only.
 * Full event system in Stage 5 will use events table.
 */
export async function logAuthEvent(
  eventType: AuthEventType,
  userId: string,
  metadata: EventMetadata
): Promise<void> {
  try {
    const supabase = createAdminClient()

    // For Stage 2, we'll log to a simple system_logs table
    // This will be replaced/augmented by the full event system in Stage 5
    await supabase.from('system_logs').insert({
      log_type: 'auth',
      event_type: eventType,
      user_id: userId,
      metadata,
      logged_at: new Date().toISOString(),
    })
  } catch (error) {
    // Log to console but don't throw - logging should never break user flow
    console.error('[Event Logger] Failed to log auth event:', error)
  }
}

/**
 * Logs a system event (non-user-specific).
 * Used for system-level operations and diagnostics.
 */
export async function logSystemEvent(
  eventType: string,
  metadata: EventMetadata
): Promise<void> {
  try {
    const supabase = createAdminClient()

    await supabase.from('system_logs').insert({
      log_type: 'system',
      event_type: eventType,
      user_id: null,
      metadata,
      logged_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Event Logger] Failed to log system event:', error)
  }
}
