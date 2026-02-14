/**
 * Automation Registry
 * Stage 6 — Automation (Layer 5)
 *
 * Maps event types and cron schedules to automation rule handlers.
 * This is the single source of truth for all automation rules.
 */

import type { AutomationRule } from '@/types/automation';
import {
  handleWelcomeEmail,
  handleStartResearchPipeline,
  handleTriggerSpecGeneration,
  handleValidateSpec,
  handleUpdateDownloadCounts,
  handleAdminWaitlistNotification,
  handleDailyAnalyticsSnapshot,
  handleNudgeInactiveUsers,
  handleRemindUndownloadedSpecs,
  handleUpsellDownloadedSpecs,
} from './rules';

/**
 * All automation rules from PROJECT-SPEC.md Gate 4
 */
export const AUTOMATION_RULES: AutomationRule[] = [
  // ============================================================
  // Rule #1: Welcome Email (event-based)
  // ============================================================
  {
    name: 'welcome_email',
    description: 'Send welcome email when user signs up',
    triggerType: 'event',
    triggerEventType: 'user.created',
    handler: handleWelcomeEmail,
    idempotent: true,
    maxRetries: 2,
  },

  // ============================================================
  // Rule #2: Start Research Pipeline (event-based)
  // ============================================================
  {
    name: 'start_research_pipeline',
    description: 'Validate research pipeline start when spec_project status changes to researching',
    triggerType: 'event',
    triggerEventType: 'spec_project.updated',
    handler: handleStartResearchPipeline,
    idempotent: true,
    maxRetries: 1,
  },

  // ============================================================
  // Rule #3: Trigger Spec Generation (event-based)
  // ============================================================
  {
    name: 'trigger_spec_generation',
    description: 'Validate spec generation trigger when research is complete',
    triggerType: 'event',
    triggerEventType: 'research_report.updated',
    handler: handleTriggerSpecGeneration,
    idempotent: true,
    maxRetries: 1,
  },

  // ============================================================
  // Rule #4: Validate Spec (event-based)
  // ============================================================
  {
    name: 'validate_spec',
    description: 'Confirm spec validation when generation completes',
    triggerType: 'event',
    triggerEventType: 'generated_spec.updated',
    handler: handleValidateSpec,
    idempotent: true,
    maxRetries: 1,
  },

  // ============================================================
  // Rule #5: Update Download Counts (event-based)
  // ============================================================
  {
    name: 'update_download_counts',
    description: 'Increment download counts and set has_downloaded flag',
    triggerType: 'event',
    triggerEventType: 'spec_download.created',
    handler: handleUpdateDownloadCounts,
    idempotent: true,
    maxRetries: 2,
  },

  // ============================================================
  // Rule #6: Admin Waitlist Notification (event-based)
  // ============================================================
  {
    name: 'admin_waitlist_notification',
    description: 'Notify admin when user joins ForgeBoard waitlist',
    triggerType: 'event',
    triggerEventType: 'waitlist_entry.created',
    handler: handleAdminWaitlistNotification,
    idempotent: true,
    maxRetries: 2,
  },

  // ============================================================
  // Rule #7: Daily Analytics Snapshot (cron)
  // ============================================================
  {
    name: 'daily_analytics_snapshot',
    description: 'Create daily admin_analytics snapshot at 3am',
    triggerType: 'cron',
    handler: handleDailyAnalyticsSnapshot,
    idempotent: true,
    maxRetries: 2,
  },

  // ============================================================
  // Rule #8: Nudge Inactive Users (scheduled)
  // ============================================================
  {
    name: 'nudge_inactive_users',
    description: 'Send nudge email to users 7 days after signup with no specs',
    triggerType: 'scheduled',
    handler: handleNudgeInactiveUsers,
    idempotent: true,
    maxRetries: 1,
  },

  // ============================================================
  // Rule #9: Remind Undownloaded Specs (scheduled)
  // ============================================================
  {
    name: 'remind_undownloaded_specs',
    description: 'Remind users 3 days after spec completion if not downloaded',
    triggerType: 'scheduled',
    handler: handleRemindUndownloadedSpecs,
    idempotent: true,
    maxRetries: 1,
  },

  // ============================================================
  // Rule #10: Upsell Downloaded Specs (scheduled)
  // ============================================================
  {
    name: 'upsell_downloaded_specs',
    description: 'Send ForgeBoard upsell 7 days after spec download',
    triggerType: 'scheduled',
    handler: handleUpsellDownloadedSpecs,
    idempotent: true,
    maxRetries: 1,
  },
];

/**
 * Get automation rule by name
 */
export function getAutomationRule(name: string): AutomationRule | undefined {
  return AUTOMATION_RULES.find((rule) => rule.name === name);
}

/**
 * Get automation rules by trigger type
 */
export function getAutomationRulesByTrigger(
  triggerType: 'event' | 'cron' | 'scheduled'
): AutomationRule[] {
  return AUTOMATION_RULES.filter((rule) => rule.triggerType === triggerType);
}

/**
 * Get automation rules by event type
 */
export function getAutomationRulesByEventType(eventType: string): AutomationRule[] {
  return AUTOMATION_RULES.filter((rule) => rule.triggerEventType === eventType);
}
