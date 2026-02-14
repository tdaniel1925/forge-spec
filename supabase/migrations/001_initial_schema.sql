-- Migration 001: Initial Schema for ForgeSpec
-- All entities from PROJECT-SPEC.md Gate 1
-- Layer 0: Schema & Types

-- ============================================================================
-- ENUMS
-- ============================================================================

-- user states
CREATE TYPE user_status AS ENUM ('active', 'inactive');

-- user auth provider types
CREATE TYPE auth_provider_type AS ENUM ('email', 'google');

-- spec_project states
CREATE TYPE spec_project_status AS ENUM (
  'researching',
  'chatting',
  'generating',
  'review',
  'complete',
  'archived'
);

-- spec_project research_status enum
CREATE TYPE research_status AS ENUM (
  'pending',
  'in_progress',
  'complete',
  'skipped'
);

-- spec_project spec_status enum
CREATE TYPE spec_status AS ENUM ('draft', 'complete');

-- research_report states
CREATE TYPE research_report_status AS ENUM (
  'generating',
  'phase_1',
  'phase_2',
  'phase_3',
  'phase_4',
  'complete',
  'failed'
);

-- generated_spec states
CREATE TYPE generated_spec_status AS ENUM (
  'generating',
  'validating',
  'complete',
  'failed'
);

-- spec_download states (append-only, single state)
CREATE TYPE spec_download_status AS ENUM ('created');

-- waitlist_entry states
CREATE TYPE waitlist_status AS ENUM ('pending', 'invited', 'converted');

-- feedback states
CREATE TYPE feedback_status AS ENUM ('pending', 'reviewed');

-- feedback types
CREATE TYPE feedback_type AS ENUM (
  'spec_quality',
  'ui',
  'feature_request',
  'bug',
  'other'
);

-- chat message roles
CREATE TYPE chat_role AS ENUM ('user', 'assistant', 'system');

-- complexity ratings for generated specs
CREATE TYPE complexity_rating AS ENUM ('simple', 'moderate', 'complex', 'enterprise');

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ENTITY: user
-- Owner: self | Parent: none | States: active, inactive
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  name text,
  password_hash text, -- nullable for OAuth users
  avatar_url text,
  auth_provider auth_provider_type NOT NULL DEFAULT 'email',
  signup_source text, -- UTM tracking
  status user_status NOT NULL DEFAULT 'active',
  specs_generated integer NOT NULL DEFAULT 0, -- computed field
  has_downloaded boolean NOT NULL DEFAULT false,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  archived_at timestamptz
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);

-- ----------------------------------------------------------------------------
-- ENTITY: spec_project
-- Owner: user | Parent: none | States: researching, chatting, generating, review, complete, archived
-- ----------------------------------------------------------------------------
CREATE TABLE spec_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_spec_id uuid REFERENCES spec_projects(id) ON DELETE SET NULL, -- for versioning
  name text NOT NULL,
  description text, -- user's initial input
  slug text NOT NULL,
  status spec_project_status NOT NULL DEFAULT 'chatting',
  research_status research_status NOT NULL DEFAULT 'pending',
  spec_status spec_status NOT NULL DEFAULT 'draft',
  download_count integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  archived_at timestamptz,
  UNIQUE(user_id, slug)
);

CREATE INDEX idx_spec_projects_user_id ON spec_projects(user_id);
CREATE INDEX idx_spec_projects_parent_spec_id ON spec_projects(parent_spec_id);
CREATE INDEX idx_spec_projects_status ON spec_projects(status);
CREATE INDEX idx_spec_projects_created_at ON spec_projects(created_at);
CREATE INDEX idx_spec_projects_archived_at ON spec_projects(archived_at);

-- ----------------------------------------------------------------------------
-- ENTITY: chat_message
-- Owner: user | Parent: spec_project | States: none (append-only)
-- ----------------------------------------------------------------------------
CREATE TABLE chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_project_id uuid NOT NULL REFERENCES spec_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role chat_role NOT NULL,
  content text NOT NULL,
  message_order integer NOT NULL,
  metadata jsonb, -- research citations, phase markers
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  archived_at timestamptz,
  UNIQUE(spec_project_id, message_order)
);

CREATE INDEX idx_chat_messages_spec_project_id ON chat_messages(spec_project_id);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_message_order ON chat_messages(spec_project_id, message_order);

-- ----------------------------------------------------------------------------
-- ENTITY: research_report
-- Owner: system | Parent: spec_project | States: generating, phase_1-4, complete, failed
-- ----------------------------------------------------------------------------
CREATE TABLE research_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_project_id uuid NOT NULL REFERENCES spec_projects(id) ON DELETE CASCADE,
  status research_report_status NOT NULL DEFAULT 'generating',
  domain_summary text,
  competitor_analysis jsonb, -- {name, url, features, strengths, weaknesses}[]
  feature_decomposition jsonb, -- nested tree of features
  technical_requirements jsonb, -- per-component requirements
  competitive_gaps jsonb, -- opportunities, MVP scope
  raw_search_results jsonb,
  total_cost_usd numeric(10, 4),
  generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  archived_at timestamptz,
  UNIQUE(spec_project_id) -- one per spec_project
);

CREATE INDEX idx_research_reports_spec_project_id ON research_reports(spec_project_id);
CREATE INDEX idx_research_reports_status ON research_reports(status);

-- ----------------------------------------------------------------------------
-- ENTITY: generated_spec
-- Owner: system | Parent: spec_project | States: generating, validating, complete, failed
-- ----------------------------------------------------------------------------
CREATE TABLE generated_specs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_project_id uuid NOT NULL REFERENCES spec_projects(id) ON DELETE CASCADE,
  status generated_spec_status NOT NULL DEFAULT 'generating',
  gate_0 jsonb, -- identity
  gate_1 jsonb, -- entities
  gate_2 jsonb, -- state changes
  gate_3 jsonb, -- permissions
  gate_4 jsonb, -- dependencies
  gate_5 jsonb, -- integrations
  full_spec_markdown text, -- the actual PROJECT-SPEC.md content
  recommended_stack jsonb,
  stack_rationale text,
  entity_count integer,
  state_change_count integer,
  validation_errors jsonb,
  spec_quality_score integer, -- 0-100
  er_diagram_mermaid text, -- Mermaid ER diagram source
  complexity_rating complexity_rating,
  estimated_build_hours_min integer,
  estimated_build_hours_max integer,
  estimated_api_cost numeric(10, 4),
  estimated_monthly_hosting numeric(10, 4),
  compliance_requirements text[], -- e.g., ["HIPAA", "PCI-DSS"]
  generated_at timestamptz,
  generation_cost_usd numeric(10, 4),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  archived_at timestamptz,
  UNIQUE(spec_project_id) -- one per spec_project
);

CREATE INDEX idx_generated_specs_spec_project_id ON generated_specs(spec_project_id);
CREATE INDEX idx_generated_specs_status ON generated_specs(status);
CREATE INDEX idx_generated_specs_complexity_rating ON generated_specs(complexity_rating);

-- ----------------------------------------------------------------------------
-- ENTITY: spec_download
-- Owner: system | Parent: spec_project | States: created (append-only)
-- ----------------------------------------------------------------------------
CREATE TABLE spec_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_project_id uuid NOT NULL REFERENCES spec_projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status spec_download_status NOT NULL DEFAULT 'created',
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  zip_size_bytes bigint,
  included_patterns text[], -- which pattern files were included
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  archived_at timestamptz
);

CREATE INDEX idx_spec_downloads_spec_project_id ON spec_downloads(spec_project_id);
CREATE INDEX idx_spec_downloads_user_id ON spec_downloads(user_id);
CREATE INDEX idx_spec_downloads_downloaded_at ON spec_downloads(downloaded_at);

-- ----------------------------------------------------------------------------
-- ENTITY: waitlist_entry
-- Owner: system | Parent: none | States: pending, invited, converted
-- ----------------------------------------------------------------------------
CREATE TABLE waitlist_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_project_id uuid REFERENCES spec_projects(id) ON DELETE SET NULL, -- optional: which spec triggered interest
  email text NOT NULL,
  name text,
  status waitlist_status NOT NULL DEFAULT 'pending',
  source text, -- "build_cta", "pricing_page", "email_campaign"
  invited_at timestamptz,
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  archived_at timestamptz
);

CREATE INDEX idx_waitlist_entries_spec_project_id ON waitlist_entries(spec_project_id);
CREATE INDEX idx_waitlist_entries_email ON waitlist_entries(email);
CREATE INDEX idx_waitlist_entries_status ON waitlist_entries(status);
CREATE INDEX idx_waitlist_entries_created_at ON waitlist_entries(created_at);

-- ----------------------------------------------------------------------------
-- ENTITY: admin_analytics
-- Owner: system | Parent: none | States: none (append-only daily snapshots)
-- ----------------------------------------------------------------------------
CREATE TABLE admin_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL UNIQUE,
  total_users integer NOT NULL DEFAULT 0,
  new_signups_today integer NOT NULL DEFAULT 0,
  specs_generated_today integer NOT NULL DEFAULT 0,
  specs_downloaded_today integer NOT NULL DEFAULT 0,
  most_common_app_types jsonb, -- {type: string, count: number}[]
  avg_spec_generation_time_seconds integer,
  total_api_cost_usd numeric(10, 4),
  waitlist_signups_today integer NOT NULL DEFAULT 0,
  conversion_rate numeric(5, 4), -- percentage as decimal
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  archived_at timestamptz
);

CREATE INDEX idx_admin_analytics_snapshot_date ON admin_analytics(snapshot_date);
CREATE INDEX idx_admin_analytics_created_at ON admin_analytics(created_at);

-- ----------------------------------------------------------------------------
-- ENTITY: feedback
-- Owner: user | Parent: spec_project (optional) | States: pending, reviewed
-- ----------------------------------------------------------------------------
CREATE TABLE feedbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spec_project_id uuid REFERENCES spec_projects(id) ON DELETE SET NULL, -- optional
  status feedback_status NOT NULL DEFAULT 'pending',
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  feedback_type feedback_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  archived_at timestamptz
);

CREATE INDEX idx_feedbacks_user_id ON feedbacks(user_id);
CREATE INDEX idx_feedbacks_spec_project_id ON feedbacks(spec_project_id);
CREATE INDEX idx_feedbacks_status ON feedbacks(status);
CREATE INDEX idx_feedbacks_feedback_type ON feedbacks(feedback_type);
CREATE INDEX idx_feedbacks_created_at ON feedbacks(created_at);

-- ============================================================================
-- ROW-LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedbacks ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES (per Gate 3 permissions)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- users table
-- ----------------------------------------------------------------------------
-- Users can read their own profile
CREATE POLICY "users_select_own" ON users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own" ON users
  FOR UPDATE
  USING (auth.uid() = id);

-- Admin can read all users (service_role bypass handled at app layer)

-- ----------------------------------------------------------------------------
-- spec_projects table
-- ----------------------------------------------------------------------------
-- Users can insert their own specs
CREATE POLICY "spec_projects_insert_own" ON spec_projects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can select their own specs
CREATE POLICY "spec_projects_select_own" ON spec_projects
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own specs (only when not archived)
CREATE POLICY "spec_projects_update_own" ON spec_projects
  FOR UPDATE
  USING (auth.uid() = user_id AND archived_at IS NULL);

-- Users can soft-delete (archive) their own specs
CREATE POLICY "spec_projects_archive_own" ON spec_projects
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (archived_at IS NOT NULL);

-- ----------------------------------------------------------------------------
-- chat_messages table
-- ----------------------------------------------------------------------------
-- Users can insert messages to their own specs
CREATE POLICY "chat_messages_insert_own" ON chat_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM spec_projects
      WHERE spec_projects.id = chat_messages.spec_project_id
      AND spec_projects.user_id = auth.uid()
    )
  );

-- Users can select messages from their own specs
CREATE POLICY "chat_messages_select_own" ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spec_projects
      WHERE spec_projects.id = chat_messages.spec_project_id
      AND spec_projects.user_id = auth.uid()
    )
  );

-- chat_messages are append-only (no update or delete policies)

-- ----------------------------------------------------------------------------
-- research_reports table
-- ----------------------------------------------------------------------------
-- Users can read research reports for their own specs
CREATE POLICY "research_reports_select_own" ON research_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spec_projects
      WHERE spec_projects.id = research_reports.spec_project_id
      AND spec_projects.user_id = auth.uid()
    )
  );

-- System creates research reports (service_role, no user policy needed for insert/update)

-- ----------------------------------------------------------------------------
-- generated_specs table
-- ----------------------------------------------------------------------------
-- Users can read generated specs for their own projects
CREATE POLICY "generated_specs_select_own" ON generated_specs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM spec_projects
      WHERE spec_projects.id = generated_specs.spec_project_id
      AND spec_projects.user_id = auth.uid()
    )
  );

-- System creates/updates generated specs (service_role)

-- ----------------------------------------------------------------------------
-- spec_downloads table
-- ----------------------------------------------------------------------------
-- Users can read their own download history
CREATE POLICY "spec_downloads_select_own" ON spec_downloads
  FOR SELECT
  USING (auth.uid() = user_id);

-- System creates download records (service_role)

-- ----------------------------------------------------------------------------
-- waitlist_entries table
-- ----------------------------------------------------------------------------
-- Users can insert waitlist entries
CREATE POLICY "waitlist_entries_insert" ON waitlist_entries
  FOR INSERT
  WITH CHECK (true); -- anyone can join waitlist

-- Admin only can read waitlist (service_role)

-- ----------------------------------------------------------------------------
-- admin_analytics table
-- ----------------------------------------------------------------------------
-- Admin only (no user policies, service_role only)

-- ----------------------------------------------------------------------------
-- feedbacks table
-- ----------------------------------------------------------------------------
-- Users can insert their own feedback
CREATE POLICY "feedbacks_insert_own" ON feedbacks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can select their own feedback
CREATE POLICY "feedbacks_select_own" ON feedbacks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can read all feedback (service_role)

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER spec_projects_updated_at BEFORE UPDATE ON spec_projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER chat_messages_updated_at BEFORE UPDATE ON chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER research_reports_updated_at BEFORE UPDATE ON research_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER generated_specs_updated_at BEFORE UPDATE ON generated_specs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER spec_downloads_updated_at BEFORE UPDATE ON spec_downloads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER waitlist_entries_updated_at BEFORE UPDATE ON waitlist_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER admin_analytics_updated_at BEFORE UPDATE ON admin_analytics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER feedbacks_updated_at BEFORE UPDATE ON feedbacks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-increment user.specs_generated when spec_project status becomes 'complete'
CREATE OR REPLACE FUNCTION update_user_specs_generated()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'complete' AND (OLD IS NULL OR OLD.status != 'complete') THEN
    UPDATE users
    SET specs_generated = specs_generated + 1
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_specs_generated_trigger
  AFTER INSERT OR UPDATE ON spec_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_user_specs_generated();

-- Auto-set user.has_downloaded when first spec_download is created
CREATE OR REPLACE FUNCTION update_user_has_downloaded()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET has_downloaded = true
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_has_downloaded_trigger
  AFTER INSERT ON spec_downloads
  FOR EACH ROW
  EXECUTE FUNCTION update_user_has_downloaded();

-- Auto-increment spec_project.download_count when spec_download is created
CREATE OR REPLACE FUNCTION update_spec_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE spec_projects
  SET download_count = download_count + 1
  WHERE id = NEW.spec_project_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_spec_download_count_trigger
  AFTER INSERT ON spec_downloads
  FOR EACH ROW
  EXECUTE FUNCTION update_spec_download_count();

-- ============================================================================
-- UTILITY FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS (documentation)
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts with email or OAuth authentication';
COMMENT ON TABLE spec_projects IS 'User-created spec projects with versioning support';
COMMENT ON TABLE chat_messages IS 'Append-only conversation history for spec generation';
COMMENT ON TABLE research_reports IS 'AI-generated domain research with 4-phase analysis';
COMMENT ON TABLE generated_specs IS 'Complete PROJECT-SPEC.md with all gates';
COMMENT ON TABLE spec_downloads IS 'Download tracking for .forge zip files';
COMMENT ON TABLE waitlist_entries IS 'ForgeBoard upsell interest tracking';
COMMENT ON TABLE admin_analytics IS 'Daily rollup metrics for admin dashboard';
COMMENT ON TABLE feedbacks IS 'User feedback on specs and platform';
