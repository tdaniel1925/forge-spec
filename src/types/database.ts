// Auto-generated database types matching supabase/migrations/001_initial_schema.sql
// DO NOT EDIT MANUALLY - regenerate from schema

// ============================================================================
// ENUMS
// ============================================================================

export type UserStatus = 'active' | 'inactive';

export type AuthProviderType = 'email' | 'google';

export type UserRole = 'user' | 'admin' | 'system';

export type SpecProjectStatus =
  | 'researching'
  | 'chatting'
  | 'generating'
  | 'review'
  | 'complete'
  | 'archived';

export type ResearchStatus =
  | 'pending'
  | 'in_progress'
  | 'complete'
  | 'skipped';

export type SpecStatus = 'draft' | 'complete';

export type ResearchReportStatus =
  | 'generating'
  | 'phase_1'
  | 'phase_2'
  | 'phase_3'
  | 'phase_4'
  | 'complete'
  | 'failed';

export type GeneratedSpecStatus =
  | 'generating'
  | 'validating'
  | 'complete'
  | 'failed';

export type SpecDownloadStatus = 'created';

export type WaitlistStatus = 'pending' | 'invited' | 'converted';

export type FeedbackStatus = 'pending' | 'reviewed';

export type FeedbackType =
  | 'spec_quality'
  | 'ui'
  | 'feature_request'
  | 'bug'
  | 'other';

export type ChatRole = 'user' | 'assistant' | 'system';

export type ComplexityRating = 'simple' | 'moderate' | 'complex' | 'enterprise';

// ============================================================================
// TABLE ROW TYPES
// ============================================================================

export interface User {
  id: string; // uuid, references auth.users(id)
  auth_id: string; // uuid, references auth.users(id) - added in Stage 2
  email: string;
  name: string | null;
  password_hash: string | null; // null for OAuth users
  avatar_url: string | null;
  auth_provider: AuthProviderType;
  signup_source: string | null;
  status: UserStatus;
  role: UserRole; // added in migration 002
  specs_generated: number; // computed
  has_downloaded: boolean;
  last_login_at: string | null; // timestamptz
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  created_by: string | null; // uuid
  archived_at: string | null; // timestamptz
}

export interface SpecProject {
  id: string; // uuid
  user_id: string; // uuid, references users(id)
  parent_spec_id: string | null; // uuid, references spec_projects(id)
  name: string;
  description: string | null;
  slug: string;
  status: SpecProjectStatus;
  research_status: ResearchStatus;
  spec_status: SpecStatus;
  download_count: number;
  version: number;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  created_by: string | null; // uuid
  archived_at: string | null; // timestamptz
}

export interface ChatMessage {
  id: string; // uuid
  spec_project_id: string; // uuid, references spec_projects(id)
  user_id: string; // uuid, references users(id)
  role: ChatRole;
  content: string;
  message_order: number;
  metadata: Record<string, unknown> | null; // jsonb
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  created_by: string | null; // uuid
  archived_at: string | null; // timestamptz
}

export interface CompetitorAnalysis {
  name: string;
  url: string;
  features: string[];
  strengths: string[];
  weaknesses: string[];
}

export interface ResearchReport {
  id: string; // uuid
  spec_project_id: string; // uuid, references spec_projects(id)
  status: ResearchReportStatus;
  domain_summary: string | null;
  competitor_analysis: CompetitorAnalysis[] | null; // jsonb
  feature_decomposition: Record<string, unknown> | null; // jsonb nested tree
  technical_requirements: Record<string, unknown> | null; // jsonb
  competitive_gaps: Record<string, unknown> | null; // jsonb
  raw_search_results: Record<string, unknown> | null; // jsonb
  total_cost_usd: number | null; // numeric
  generated_at: string | null; // timestamptz
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  created_by: string | null; // uuid
  archived_at: string | null; // timestamptz
}

export interface GeneratedSpec {
  id: string; // uuid
  spec_project_id: string; // uuid, references spec_projects(id)
  status: GeneratedSpecStatus;
  gate_0: Record<string, unknown> | null; // jsonb
  gate_1: Record<string, unknown> | null; // jsonb
  gate_2: Record<string, unknown> | null; // jsonb
  gate_3: Record<string, unknown> | null; // jsonb
  gate_4: Record<string, unknown> | null; // jsonb
  gate_5: Record<string, unknown> | null; // jsonb
  full_spec_markdown: string | null;
  recommended_stack: Record<string, unknown> | null; // jsonb
  stack_rationale: string | null;
  entity_count: number | null;
  state_change_count: number | null;
  validation_errors: Record<string, unknown> | null; // jsonb
  spec_quality_score: number | null; // 0-100
  er_diagram_mermaid: string | null;
  complexity_rating: ComplexityRating | null;
  estimated_build_hours_min: number | null;
  estimated_build_hours_max: number | null;
  estimated_api_cost: number | null; // numeric
  estimated_monthly_hosting: number | null; // numeric
  compliance_requirements: string[] | null; // text[]
  generated_at: string | null; // timestamptz
  generation_cost_usd: number | null; // numeric
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  created_by: string | null; // uuid
  archived_at: string | null; // timestamptz
}

export interface SpecDownload {
  id: string; // uuid
  spec_project_id: string; // uuid, references spec_projects(id)
  user_id: string; // uuid, references users(id)
  status: SpecDownloadStatus;
  downloaded_at: string; // timestamptz
  zip_size_bytes: number | null; // bigint
  included_patterns: string[] | null; // text[]
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  created_by: string | null; // uuid
  archived_at: string | null; // timestamptz
}

export interface WaitlistEntry {
  id: string; // uuid
  spec_project_id: string | null; // uuid, references spec_projects(id)
  email: string;
  name: string | null;
  status: WaitlistStatus;
  source: string | null; // "build_cta", "pricing_page", "email_campaign"
  invited_at: string | null; // timestamptz
  converted_at: string | null; // timestamptz
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  created_by: string | null; // uuid
  archived_at: string | null; // timestamptz
}

export interface AdminAnalytics {
  id: string; // uuid
  snapshot_date: string; // date
  total_users: number;
  new_signups_today: number;
  specs_generated_today: number;
  specs_downloaded_today: number;
  most_common_app_types: Record<string, unknown> | null; // jsonb
  avg_spec_generation_time_seconds: number | null;
  total_api_cost_usd: number | null; // numeric
  waitlist_signups_today: number;
  conversion_rate: number | null; // numeric
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  created_by: string | null; // uuid
  archived_at: string | null; // timestamptz
}

export interface Feedback {
  id: string; // uuid
  user_id: string; // uuid, references users(id)
  spec_project_id: string | null; // uuid, references spec_projects(id)
  status: FeedbackStatus;
  rating: number | null; // 1-5
  comment: string | null;
  feedback_type: FeedbackType;
  created_at: string; // timestamptz
  updated_at: string; // timestamptz
  created_by: string | null; // uuid
  archived_at: string | null; // timestamptz
}

// ============================================================================
// DATABASE SCHEMA TYPE
// ============================================================================

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, 'created_at' | 'updated_at' | 'specs_generated' | 'has_downloaded'> & {
          created_at?: string;
          updated_at?: string;
          specs_generated?: number;
          has_downloaded?: boolean;
        };
        Update: Partial<Omit<User, 'id'>>;
      };
      spec_projects: {
        Row: SpecProject;
        Insert: Omit<SpecProject, 'id' | 'created_at' | 'updated_at' | 'download_count' | 'version'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          download_count?: number;
          version?: number;
        };
        Update: Partial<Omit<SpecProject, 'id'>>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ChatMessage, 'id'>>;
      };
      research_reports: {
        Row: ResearchReport;
        Insert: Omit<ResearchReport, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<ResearchReport, 'id'>>;
      };
      generated_specs: {
        Row: GeneratedSpec;
        Insert: Omit<GeneratedSpec, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<GeneratedSpec, 'id'>>;
      };
      spec_downloads: {
        Row: SpecDownload;
        Insert: Omit<SpecDownload, 'id' | 'created_at' | 'updated_at' | 'downloaded_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          downloaded_at?: string;
        };
        Update: Partial<Omit<SpecDownload, 'id'>>;
      };
      waitlist_entries: {
        Row: WaitlistEntry;
        Insert: Omit<WaitlistEntry, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<WaitlistEntry, 'id'>>;
      };
      admin_analytics: {
        Row: AdminAnalytics;
        Insert: Omit<AdminAnalytics, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<AdminAnalytics, 'id'>>;
      };
      feedbacks: {
        Row: Feedback;
        Insert: Omit<Feedback, 'id' | 'created_at' | 'updated_at'> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Feedback, 'id'>>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_status: UserStatus;
      auth_provider_type: AuthProviderType;
      spec_project_status: SpecProjectStatus;
      research_status: ResearchStatus;
      spec_status: SpecStatus;
      research_report_status: ResearchReportStatus;
      generated_spec_status: GeneratedSpecStatus;
      spec_download_status: SpecDownloadStatus;
      waitlist_status: WaitlistStatus;
      feedback_status: FeedbackStatus;
      feedback_type: FeedbackType;
      chat_role: ChatRole;
      complexity_rating: ComplexityRating;
    };
  };
}
