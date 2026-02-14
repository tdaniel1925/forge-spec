/**
 * Automation Logger
 * Stage 6 — Automation (Layer 5)
 *
 * Logs automation execution to automation_logs table.
 * Uses service role for write access.
 */

import { createClient } from '@supabase/supabase-js';
import type {
  AutomationLog,
  CreateAutomationLogInput,
  AutomationStatus,
  AutomationResult,
} from '@/types/automation';

// Service role client for automation logging (bypasses RLS)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Create a new automation log entry
 */
export async function createAutomationLog(
  input: CreateAutomationLogInput
): Promise<AutomationLog | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('automation_logs')
      .insert({
        rule_name: input.rule_name,
        trigger_event_id: input.trigger_event_id || null,
        trigger_type: input.trigger_type,
        status: 'pending' as AutomationStatus,
        payload: input.payload || null,
        max_retries: input.max_retries || 2,
        attempt_count: 1,
      })
      .select()
      .single();

    if (error) {
      console.error('[Automation Logger] Failed to create log:', error);
      return null;
    }

    return data as AutomationLog;
  } catch (err) {
    console.error('[Automation Logger] Exception creating log:', err);
    return null;
  }
}

/**
 * Update automation log status to running
 */
export async function markAutomationRunning(logId: string): Promise<void> {
  await supabaseAdmin
    .from('automation_logs')
    .update({
      status: 'running' as AutomationStatus,
      started_at: new Date().toISOString(),
    })
    .eq('id', logId);
}

/**
 * Mark automation as successful
 */
export async function markAutomationSuccess(
  logId: string,
  result: AutomationResult
): Promise<void> {
  await supabaseAdmin
    .from('automation_logs')
    .update({
      status: 'success' as AutomationStatus,
      result: result.data || null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', logId);
}

/**
 * Mark automation as failed
 */
export async function markAutomationFailed(
  logId: string,
  error: string,
  attemptCount: number,
  maxRetries: number
): Promise<void> {
  const status: AutomationStatus = attemptCount < maxRetries ? 'retrying' : 'failed';

  await supabaseAdmin
    .from('automation_logs')
    .update({
      status,
      error_message: error,
      attempt_count: attemptCount,
      completed_at: status === 'failed' ? new Date().toISOString() : null,
    })
    .eq('id', logId);
}

/**
 * Get pending or retrying automations (for retry mechanism)
 */
export async function getPendingAutomations(limit = 50): Promise<AutomationLog[]> {
  const { data, error } = await supabaseAdmin
    .from('automation_logs')
    .select('*')
    .in('status', ['pending', 'retrying'])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Automation Logger] Failed to fetch pending automations:', error);
    return [];
  }

  return data as AutomationLog[];
}

/**
 * Get recent automation logs for a specific rule
 */
export async function getAutomationLogsByRule(
  ruleName: string,
  limit = 20
): Promise<AutomationLog[]> {
  const { data, error } = await supabaseAdmin
    .from('automation_logs')
    .select('*')
    .eq('rule_name', ruleName)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Automation Logger] Failed to fetch logs by rule:', error);
    return [];
  }

  return data as AutomationLog[];
}

/**
 * Get automation statistics
 */
export async function getAutomationStats(): Promise<{
  total: number;
  success: number;
  failed: number;
  pending: number;
  retrying: number;
}> {
  const { data, error } = await supabaseAdmin
    .from('automation_logs')
    .select('status');

  if (error || !data) {
    return { total: 0, success: 0, failed: 0, pending: 0, retrying: 0 };
  }

  const stats = data.reduce(
    (acc, log) => {
      acc.total++;
      if (log.status === 'success') acc.success++;
      if (log.status === 'failed') acc.failed++;
      if (log.status === 'pending') acc.pending++;
      if (log.status === 'retrying') acc.retrying++;
      return acc;
    },
    { total: 0, success: 0, failed: 0, pending: 0, retrying: 0 }
  );

  return stats;
}
