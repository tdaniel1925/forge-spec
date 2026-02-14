-- =====================================================
-- MIGRATION 004: Automation System
-- Stage 6 — Automation (Layer 5)
-- =====================================================
--
-- This migration adds infrastructure for deterministic automation
-- that reacts to events from Stage 5 (Layer 4).
--
-- RULES:
-- - Automation is deterministic (no AI reasoning)
-- - Automation reads events and calls CRUD actions
-- - All automation must be idempotent
-- - Retry mechanism for failures
--
-- =====================================================

-- Utility function to update updated_at (if not already created in migration 001)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Automation execution log (tracks all automation runs)
CREATE TABLE public.automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name text NOT NULL,
  trigger_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL,
  trigger_type text NOT NULL, -- 'event', 'cron', 'scheduled'
  status text NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed', 'retrying')),
  attempt_count integer DEFAULT 1 NOT NULL,
  max_retries integer DEFAULT 2 NOT NULL,
  payload jsonb,
  result jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for automation_logs
CREATE INDEX idx_automation_logs_rule_name ON public.automation_logs(rule_name);
CREATE INDEX idx_automation_logs_status ON public.automation_logs(status);
CREATE INDEX idx_automation_logs_trigger_event ON public.automation_logs(trigger_event_id);
CREATE INDEX idx_automation_logs_created_at ON public.automation_logs(created_at DESC);
CREATE INDEX idx_automation_logs_pending ON public.automation_logs(status) WHERE status = 'pending';

-- Update trigger for automation_logs
CREATE TRIGGER update_automation_logs_updated_at
  BEFORE UPDATE ON public.automation_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for automation_logs
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- System can write all logs
CREATE POLICY "System can manage automation logs"
  ON public.automation_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can read all logs
CREATE POLICY "Admins can read automation logs"
  ON public.automation_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Users cannot see automation logs (internal only)

-- =====================================================
-- Scheduled jobs tracking (for time-based automations)
-- =====================================================

CREATE TABLE public.scheduled_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL UNIQUE,
  job_type text NOT NULL, -- 'nudge_email', 'reminder_email', 'upsell_email', 'analytics_snapshot'
  schedule text NOT NULL, -- cron expression or 'once'
  enabled boolean DEFAULT true NOT NULL,
  last_run_at timestamptz,
  next_run_at timestamptz,
  run_count integer DEFAULT 0 NOT NULL,
  failure_count integer DEFAULT 0 NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for scheduled_jobs
CREATE INDEX idx_scheduled_jobs_enabled ON public.scheduled_jobs(enabled) WHERE enabled = true;
CREATE INDEX idx_scheduled_jobs_next_run ON public.scheduled_jobs(next_run_at) WHERE enabled = true;

-- Update trigger for scheduled_jobs
CREATE TRIGGER update_scheduled_jobs_updated_at
  BEFORE UPDATE ON public.scheduled_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS for scheduled_jobs
ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

-- System can manage scheduled jobs
CREATE POLICY "System can manage scheduled jobs"
  ON public.scheduled_jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can read scheduled jobs
CREATE POLICY "Admins can read scheduled jobs"
  ON public.scheduled_jobs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- Seed scheduled jobs
-- =====================================================

INSERT INTO public.scheduled_jobs (job_name, job_type, schedule, enabled, metadata)
VALUES
  ('daily_analytics_snapshot', 'analytics_snapshot', '0 3 * * *', true, '{"description": "Create daily admin_analytics snapshot at 3am"}'),
  ('nudge_inactive_users', 'nudge_email', '0 9 * * *', true, '{"description": "Send nudge emails to users who signed up 7 days ago with no specs", "days_after_signup": 7}'),
  ('remind_undownloaded_specs', 'reminder_email', '0 10 * * *', true, '{"description": "Remind users who completed specs 3 days ago but have not downloaded", "days_after_complete": 3}'),
  ('upsell_downloaded_specs', 'upsell_email', '0 11 * * *', true, '{"description": "Send ForgeBoard upsell to users who downloaded specs 7 days ago", "days_after_download": 7}')
ON CONFLICT (job_name) DO NOTHING;

-- =====================================================
-- Helper Functions for Automation
-- =====================================================

-- Function to increment spec_project.download_count (idempotent)
CREATE OR REPLACE FUNCTION increment_download_count(project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.spec_projects
  SET download_count = download_count + 1
  WHERE id = project_id;
END;
$$;

-- =====================================================
-- End of Migration 004
-- =====================================================
