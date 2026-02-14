/**
 * Automation Scheduler
 * Stage 6 — Automation (Layer 5)
 *
 * Handles scheduled jobs (cron-based and time-delayed automations).
 * Rules #7, #8, #9, #10 are scheduled jobs.
 */

import { createClient } from '@supabase/supabase-js';
import type { AutomationPayload } from '@/types/automation';
import { getAutomationRule } from './registry';
import { executeAutomation } from './executor';

// Service role client for automation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Run a scheduled job by name
 */
export async function runScheduledJob(jobName: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    // Get job from database
    const { data: job, error: jobError } = await supabaseAdmin
      .from('scheduled_jobs')
      .select('*')
      .eq('job_name', jobName)
      .single();

    if (jobError || !job) {
      return {
        success: false,
        error: `Job ${jobName} not found`,
      };
    }

    if (!job.enabled) {
      return {
        success: false,
        error: `Job ${jobName} is disabled`,
      };
    }

    // Get automation rule
    const rule = getAutomationRule(jobName as any);

    if (!rule) {
      return {
        success: false,
        error: `Automation rule ${jobName} not found in registry`,
      };
    }

    // Prepare payload based on job type
    let payload: AutomationPayload;

    switch (job.job_type) {
      case 'analytics_snapshot':
        payload = { data: {} };
        break;

      case 'nudge_email':
        payload = {
          data: {
            daysAgo: job.metadata?.days_after_signup || 7,
          },
        };
        break;

      case 'reminder_email':
        payload = {
          data: {
            daysAgo: job.metadata?.days_after_complete || 3,
          },
        };
        break;

      case 'upsell_email':
        payload = {
          data: {
            daysAgo: job.metadata?.days_after_download || 7,
          },
        };
        break;

      default:
        return {
          success: false,
          error: `Unknown job type: ${job.job_type}`,
        };
    }

    // Execute automation
    const result = await executeAutomation(rule, payload);

    // Update job stats
    await supabaseAdmin
      .from('scheduled_jobs')
      .update({
        last_run_at: new Date().toISOString(),
        run_count: job.run_count + 1,
        failure_count: result.success ? job.failure_count : job.failure_count + 1,
      })
      .eq('id', job.id);

    if (result.success) {
      return {
        success: true,
        message: result.message || `Job ${jobName} completed successfully`,
      };
    } else {
      return {
        success: false,
        error: result.error || `Job ${jobName} failed`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run all scheduled jobs that are due (based on next_run_at)
 * This would be called by a cron worker or edge function
 */
export async function runDueJobs(): Promise<{
  total: number;
  success: number;
  failed: number;
}> {
  const { data: dueJobs } = await supabaseAdmin
    .from('scheduled_jobs')
    .select('*')
    .eq('enabled', true)
    .lte('next_run_at', new Date().toISOString());

  if (!dueJobs || dueJobs.length === 0) {
    return { total: 0, success: 0, failed: 0 };
  }

  const results = await Promise.allSettled(
    dueJobs.map((job) => runScheduledJob(job.job_name))
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

/**
 * Get all scheduled jobs with their status
 */
export async function getScheduledJobs() {
  const { data, error } = await supabaseAdmin
    .from('scheduled_jobs')
    .select('*')
    .order('job_name', { ascending: true });

  if (error) {
    console.error('[Scheduler] Failed to fetch scheduled jobs:', error);
    return [];
  }

  return data;
}

/**
 * Enable or disable a scheduled job
 */
export async function toggleScheduledJob(
  jobName: string,
  enabled: boolean
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from('scheduled_jobs')
    .update({ enabled })
    .eq('job_name', jobName);

  if (error) {
    console.error('[Scheduler] Failed to toggle job:', error);
    return false;
  }

  return true;
}
