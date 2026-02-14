/**
 * Automation System Types
 * Stage 6 — Automation (Layer 5)
 */

import { EventType } from './events';

// ============================================================
// Automation Logs
// ============================================================

export type AutomationStatus = 'pending' | 'running' | 'success' | 'failed' | 'retrying';
export type AutomationTriggerType = 'event' | 'cron' | 'scheduled';

export interface AutomationLog {
  id: string;
  rule_name: string;
  trigger_event_id: string | null;
  trigger_type: AutomationTriggerType;
  status: AutomationStatus;
  attempt_count: number;
  max_retries: number;
  payload: Record<string, unknown> | null;
  result: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateAutomationLogInput {
  rule_name: string;
  trigger_event_id?: string | null;
  trigger_type: AutomationTriggerType;
  payload?: Record<string, unknown> | null;
  max_retries?: number;
}

// ============================================================
// Scheduled Jobs
// ============================================================

export type ScheduledJobType =
  | 'nudge_email'
  | 'reminder_email'
  | 'upsell_email'
  | 'analytics_snapshot';

export interface ScheduledJob {
  id: string;
  job_name: string;
  job_type: ScheduledJobType;
  schedule: string; // cron expression
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
  run_count: number;
  failure_count: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Automation Rules
// ============================================================

export type AutomationRuleName =
  | 'welcome_email'              // Rule #1: user.created → send welcome email
  | 'start_research_pipeline'    // Rule #2: spec_project researching → start research
  | 'trigger_spec_generation'    // Rule #3: research complete → generate spec
  | 'validate_spec'              // Rule #4: spec generated → validate
  | 'update_download_counts'     // Rule #5: spec downloaded → update counts
  | 'admin_waitlist_notification' // Rule #6: waitlist entry → notify admin
  | 'daily_analytics_snapshot'   // Rule #7: cron daily → create snapshot
  | 'nudge_inactive_users'       // Rule #8: 7 days after signup → nudge email
  | 'remind_undownloaded_specs'  // Rule #9: 3 days after complete → reminder
  | 'upsell_downloaded_specs';   // Rule #10: 7 days after download → upsell

export interface AutomationRule {
  name: AutomationRuleName;
  description: string;
  triggerType: 'event' | 'cron' | 'scheduled';
  triggerEventType?: EventType; // for event-based rules
  handler: AutomationHandler;
  idempotent: boolean;
  maxRetries: number;
}

export type AutomationHandler = (payload: AutomationPayload) => Promise<AutomationResult>;

export interface AutomationPayload {
  eventId?: string;
  eventType?: EventType;
  entityType?: string;
  entityId?: string;
  actorId?: string;
  data?: Record<string, unknown>;
}

export interface AutomationResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================
// Email Types
// ============================================================

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ============================================================
// Rule-Specific Payloads
// ============================================================

export interface WelcomeEmailPayload extends AutomationPayload {
  data: {
    userId: string;
    email: string;
    name?: string;
  };
}

export interface StartResearchPayload extends AutomationPayload {
  data: {
    specProjectId: string;
  };
}

export interface TriggerSpecGenerationPayload extends AutomationPayload {
  data: {
    specProjectId: string;
    researchReportId: string;
  };
}

export interface ValidateSpecPayload extends AutomationPayload {
  data: {
    specProjectId: string;
    generatedSpecId: string;
  };
}

export interface UpdateDownloadCountsPayload extends AutomationPayload {
  data: {
    specProjectId: string;
    userId: string;
  };
}

export interface AdminWaitlistNotificationPayload extends AutomationPayload {
  data: {
    waitlistEntryId: string;
    email: string;
    specProjectId?: string;
    specName?: string;
  };
}

export interface NudgeInactiveUsersPayload extends AutomationPayload {
  data: {
    daysAgo: number;
  };
}

export interface RemindUndownloadedSpecsPayload extends AutomationPayload {
  data: {
    daysAgo: number;
  };
}

export interface UpsellDownloadedSpecsPayload extends AutomationPayload {
  data: {
    daysAgo: number;
  };
}
