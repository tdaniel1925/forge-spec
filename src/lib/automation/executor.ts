/**
 * Automation Executor
 * Stage 6 — Automation (Layer 5)
 *
 * Executes automation rules with retry logic and logging.
 * All automation is deterministic (no AI reasoning).
 */

import type {
  AutomationRule,
  AutomationPayload,
  AutomationResult,
  CreateAutomationLogInput,
} from '@/types/automation';
import {
  createAutomationLog,
  markAutomationRunning,
  markAutomationSuccess,
  markAutomationFailed,
} from './logger';

/**
 * Execute an automation rule with logging and retry logic
 */
export async function executeAutomation(
  rule: AutomationRule,
  payload: AutomationPayload
): Promise<AutomationResult> {
  // Create automation log
  const logInput: CreateAutomationLogInput = {
    rule_name: rule.name,
    trigger_event_id: payload.eventId || null,
    trigger_type: rule.triggerType,
    payload: payload.data || null,
    max_retries: rule.maxRetries,
  };

  const log = await createAutomationLog(logInput);

  if (!log) {
    return {
      success: false,
      error: 'Failed to create automation log',
    };
  }

  // Mark as running
  await markAutomationRunning(log.id);

  try {
    // Execute the handler
    const result = await rule.handler(payload);

    if (result.success) {
      // Mark as successful
      await markAutomationSuccess(log.id, result);
      return result;
    } else {
      // Mark as failed (will retry if under max_retries)
      await markAutomationFailed(
        log.id,
        result.error || 'Handler returned success: false',
        1,
        rule.maxRetries
      );
      return result;
    }
  } catch (error) {
    // Exception during execution
    const errorMessage = error instanceof Error ? error.message : String(error);
    await markAutomationFailed(log.id, errorMessage, 1, rule.maxRetries);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Retry a failed automation
 */
export async function retryAutomation(
  rule: AutomationRule,
  logId: string,
  payload: AutomationPayload,
  attemptCount: number,
  maxRetries: number
): Promise<AutomationResult> {
  const newAttemptCount = attemptCount + 1;

  // Mark as running
  await markAutomationRunning(logId);

  try {
    // Execute the handler
    const result = await rule.handler(payload);

    if (result.success) {
      // Mark as successful
      await markAutomationSuccess(logId, result);
      return result;
    } else {
      // Mark as failed (will retry if under max_retries)
      await markAutomationFailed(
        logId,
        result.error || 'Handler returned success: false',
        newAttemptCount,
        maxRetries
      );
      return result;
    }
  } catch (error) {
    // Exception during execution
    const errorMessage = error instanceof Error ? error.message : String(error);
    await markAutomationFailed(logId, errorMessage, newAttemptCount, maxRetries);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Execute automation in background (fire-and-forget)
 * Used for non-blocking automations like email notifications
 */
export async function executeAutomationBackground(
  rule: AutomationRule,
  payload: AutomationPayload
): Promise<void> {
  // Don't await - fire and forget
  executeAutomation(rule, payload).catch((err) => {
    console.error(`[Automation Executor] Background execution failed for ${rule.name}:`, err);
  });
}

/**
 * Batch execute multiple automations (for cron jobs)
 */
export async function executeBatch(
  rule: AutomationRule,
  payloads: AutomationPayload[]
): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  const results = await Promise.allSettled(
    payloads.map((payload) => executeAutomation(rule, payload))
  );

  const stats = {
    total: results.length,
    success: 0,
    failed: 0,
  };

  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.success) {
      stats.success++;
    } else {
      stats.failed++;
    }
  });

  return stats;
}
