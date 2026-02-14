-- ============================================================================
-- Migration 003: Event System (Layer 4)
-- ============================================================================
-- This migration creates the event tracking infrastructure.
-- Events are append-only and capture all meaningful state changes.
--
-- Related: Stage 5 — Event System
-- Dependencies: 001_initial_schema.sql, 002_auth_and_roles.sql
-- ============================================================================

-- ============================================================================
-- Event Type Enum
-- ============================================================================
-- Covers all state changes from PROJECT-SPEC.md Gate 2

CREATE TYPE event_type AS ENUM (
  -- Auth events (Gate 2, #1-5)
  'user.signed_up.email',
  'user.signed_up.oauth',
  'user.logged_in',
  'user.logged_out',
  'user.password_reset',

  -- Spec creation events (Gate 2, #6-8)
  'spec_project.created',
  'spec_project.described',
  'spec_project.research_started',

  -- Research events (Gate 2, #9-19)
  'research_report.phase_1_started',
  'research_report.phase_1_completed',
  'research_report.phase_1_user_feedback',
  'research_report.phase_2_started',
  'research_report.phase_2_completed',
  'research_report.phase_2_user_feedback',
  'research_report.phase_3_started',
  'research_report.phase_3_completed',
  'research_report.phase_3_user_feedback',
  'research_report.phase_4_started',
  'research_report.phase_4_completed',
  'research_report.completed',
  'research_report.failed',

  -- Spec generation events (Gate 2, #20-25)
  'generated_spec.generation_started',
  'generated_spec.validation_started',
  'generated_spec.er_diagram_generated',
  'generated_spec.build_estimate_generated',
  'generated_spec.completed',
  'generated_spec.failed',
  'spec_project.review_started',
  'spec_project.changes_requested',
  'spec_project.approved',

  -- Download events (Gate 2, #26-27)
  'spec_download.created',
  'waitlist_entry.created',

  -- Iteration events (Gate 2, #28-29)
  'spec_project.version_created',
  'spec_project.archived',

  -- Admin events (Gate 2, #30)
  'admin_analytics.created',

  -- Feedback events
  'feedback.created',
  'feedback.reviewed',

  -- Chat events
  'chat_message.created',

  -- Generic entity events (fallback for CRUD)
  'entity.created',
  'entity.updated',
  'entity.archived'
);

-- ============================================================================
-- Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Event metadata
  event_type event_type NOT NULL,
  entity_type text NOT NULL,  -- 'user', 'spec_project', 'chat_message', etc.
  entity_id uuid NOT NULL,    -- ID of the affected entity

  -- Actor who triggered the event
  actor_id uuid REFERENCES auth.users(id),  -- NULL for system-initiated events

  -- Event payload
  payload jsonb NOT NULL DEFAULT '{}',  -- Current state, changes, etc.
  metadata jsonb NOT NULL DEFAULT '{}', -- Additional context (IP, user agent, etc.)

  -- Previous state (for update events)
  previous_state jsonb,

  -- Timestamp
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- Query by entity (most common: "show me all events for this spec_project")
CREATE INDEX idx_events_entity ON events(entity_type, entity_id, created_at DESC);

-- Query by event type
CREATE INDEX idx_events_type ON events(event_type, created_at DESC);

-- Query by actor (audit trail: "what did this user do?")
CREATE INDEX idx_events_actor ON events(actor_id, created_at DESC) WHERE actor_id IS NOT NULL;

-- Query by time range
CREATE INDEX idx_events_created_at ON events(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_events_entity_type ON events(entity_type, event_type, created_at DESC);

-- ============================================================================
-- Row-Level Security
-- ============================================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Users can read events for entities they own
CREATE POLICY "Users can read own entity events"
  ON events
  FOR SELECT
  USING (
    -- User can see events for their own user record
    (entity_type = 'user' AND entity_id::uuid = auth.uid())
    OR
    -- User can see events for spec_projects they own
    (entity_type = 'spec_project' AND entity_id IN (
      SELECT id FROM spec_projects WHERE created_by = auth.uid()
    ))
    OR
    -- User can see events for chat_messages in their specs
    (entity_type = 'chat_message' AND entity_id IN (
      SELECT cm.id FROM chat_messages cm
      JOIN spec_projects sp ON cm.spec_project_id = sp.id
      WHERE sp.created_by = auth.uid()
    ))
    OR
    -- User can see events for research_reports in their specs
    (entity_type = 'research_report' AND entity_id IN (
      SELECT rr.id FROM research_reports rr
      JOIN spec_projects sp ON rr.spec_project_id = sp.id
      WHERE sp.created_by = auth.uid()
    ))
    OR
    -- User can see events for generated_specs in their specs
    (entity_type = 'generated_spec' AND entity_id IN (
      SELECT gs.id FROM generated_specs gs
      JOIN spec_projects sp ON gs.spec_project_id = sp.id
      WHERE sp.created_by = auth.uid()
    ))
    OR
    -- User can see events for spec_downloads of their specs
    (entity_type = 'spec_download' AND entity_id IN (
      SELECT sd.id FROM spec_downloads sd
      JOIN spec_projects sp ON sd.spec_project_id = sp.id
      WHERE sp.created_by = auth.uid()
    ))
    OR
    -- User can see their own feedback events
    (entity_type = 'feedback' AND entity_id IN (
      SELECT id FROM feedbacks WHERE user_id = auth.uid()
    ))
    OR
    -- User can see their own waitlist entries
    (entity_type = 'waitlist_entry' AND entity_id IN (
      SELECT id FROM waitlist_entries WHERE email IN (
        SELECT email FROM users WHERE id = auth.uid()
      )
    ))
  );

-- Admin can read all events
CREATE POLICY "Admin can read all events"
  ON events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only system can write events (via service role)
CREATE POLICY "Only system can insert events"
  ON events
  FOR INSERT
  WITH CHECK (
    -- This policy will be bypassed by service_role key used in emitEvent()
    false
  );

-- No updates allowed (append-only)
CREATE POLICY "No updates allowed"
  ON events
  FOR UPDATE
  USING (false);

-- No deletes allowed (append-only)
CREATE POLICY "No deletes allowed"
  ON events
  FOR DELETE
  USING (false);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE events IS 'Append-only event log capturing all state changes. Created in Stage 5.';
COMMENT ON COLUMN events.event_type IS 'Type of event from event_type enum';
COMMENT ON COLUMN events.entity_type IS 'Type of entity affected (user, spec_project, etc.)';
COMMENT ON COLUMN events.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN events.actor_id IS 'User who triggered the event (NULL for system events)';
COMMENT ON COLUMN events.payload IS 'Event data: current state, changes, additional context';
COMMENT ON COLUMN events.metadata IS 'Additional metadata: IP address, user agent, etc.';
COMMENT ON COLUMN events.previous_state IS 'Previous state before the change (for update events)';

-- ============================================================================
-- End of Migration 003
-- ============================================================================
