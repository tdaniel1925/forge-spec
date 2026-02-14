// ============================================================================
// Event Types — Stage 5
// ============================================================================
// TypeScript types for the event system.
// Events are append-only and capture all meaningful state changes from Gate 2.
// ============================================================================

// ============================================================================
// Event Type Enum
// ============================================================================

export type EventType =
  // Auth events (Gate 2, #1-5)
  | 'user.signed_up.email'
  | 'user.signed_up.oauth'
  | 'user.logged_in'
  | 'user.logged_out'
  | 'user.password_reset'

  // Spec creation events (Gate 2, #6-8)
  | 'spec_project.created'
  | 'spec_project.described'
  | 'spec_project.research_started'

  // Research events (Gate 2, #9-19)
  | 'research_report.phase_1_started'
  | 'research_report.phase_1_completed'
  | 'research_report.phase_1_user_feedback'
  | 'research_report.phase_2_started'
  | 'research_report.phase_2_completed'
  | 'research_report.phase_2_user_feedback'
  | 'research_report.phase_3_started'
  | 'research_report.phase_3_completed'
  | 'research_report.phase_3_user_feedback'
  | 'research_report.phase_4_started'
  | 'research_report.phase_4_completed'
  | 'research_report.completed'
  | 'research_report.failed'

  // Spec generation events (Gate 2, #20-25)
  | 'generated_spec.generation_started'
  | 'generated_spec.validation_started'
  | 'generated_spec.er_diagram_generated'
  | 'generated_spec.build_estimate_generated'
  | 'generated_spec.completed'
  | 'generated_spec.failed'
  | 'spec_project.review_started'
  | 'spec_project.changes_requested'
  | 'spec_project.approved'

  // Download events (Gate 2, #26-27)
  | 'spec_download.created'
  | 'waitlist_entry.created'

  // Iteration events (Gate 2, #28-29)
  | 'spec_project.version_created'
  | 'spec_project.archived'

  // Admin events (Gate 2, #30)
  | 'admin_analytics.created'

  // Feedback events
  | 'feedback.created'
  | 'feedback.reviewed'

  // Chat events
  | 'chat_message.created'

  // Generic entity events (fallback for CRUD)
  | 'entity.created'
  | 'entity.updated'
  | 'entity.archived';

// ============================================================================
// Entity Type Enum
// ============================================================================

export type EntityType =
  | 'user'
  | 'spec_project'
  | 'chat_message'
  | 'research_report'
  | 'generated_spec'
  | 'spec_download'
  | 'waitlist_entry'
  | 'admin_analytics'
  | 'feedback';

// ============================================================================
// Event Record (Database Schema)
// ============================================================================

export interface Event {
  id: string;
  event_type: EventType;
  entity_type: EntityType;
  entity_id: string;
  actor_id: string | null;  // NULL for system-initiated events
  payload: Record<string, unknown>;
  metadata: Record<string, unknown>;
  previous_state: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================================
// Event Payload Types (Specific Events)
// ============================================================================

// Auth events
export interface UserSignedUpPayload {
  user_id: string;
  email: string;
  name: string | null;
  auth_provider: 'email' | 'google';
  signup_source?: string;
}

export interface UserLoggedInPayload {
  user_id: string;
  email: string;
  login_method: 'email' | 'google';
}

export interface UserPasswordResetPayload {
  user_id: string;
  email: string;
}

// Spec creation events
export interface SpecProjectCreatedPayload {
  spec_project_id: string;
  name: string;
  description: string;
  user_id: string;
}

export interface SpecProjectDescribedPayload {
  spec_project_id: string;
  chat_message_id: string;
  message_content: string;
}

export interface ResearchStartedPayload {
  spec_project_id: string;
  research_report_id: string;
  initial_context: string;
}

// Research events
export interface ResearchPhasePayload {
  research_report_id: string;
  spec_project_id: string;
  phase: 'phase_1' | 'phase_2' | 'phase_3' | 'phase_4';
  phase_data?: Record<string, unknown>;
}

export interface ResearchCompletedPayload {
  research_report_id: string;
  spec_project_id: string;
  domain_summary: string;
  entity_count: number;
  feature_count: number;
  total_cost_usd: number;
}

// Spec generation events
export interface SpecGenerationStartedPayload {
  generated_spec_id: string;
  spec_project_id: string;
}

export interface SpecGenerationCompletedPayload {
  generated_spec_id: string;
  spec_project_id: string;
  entity_count: number;
  state_change_count: number;
  spec_quality_score: number;
  complexity_rating: 'simple' | 'moderate' | 'complex' | 'enterprise';
  estimated_build_hours_min: number;
  estimated_build_hours_max: number;
  generation_cost_usd: number;
}

export interface SpecGenerationFailedPayload {
  generated_spec_id: string;
  spec_project_id: string;
  error: string;
  validation_errors?: Record<string, unknown>[];
}

// Download events
export interface SpecDownloadCreatedPayload {
  spec_download_id: string;
  spec_project_id: string;
  user_id: string;
  zip_size_bytes: number;
  included_patterns: string[];
}

// Waitlist events
export interface WaitlistEntryCreatedPayload {
  waitlist_entry_id: string;
  email: string;
  name?: string;
  spec_project_id?: string;
  source: string;
}

// Feedback events
export interface FeedbackCreatedPayload {
  feedback_id: string;
  user_id: string;
  spec_project_id?: string;
  rating: number;
  comment?: string;
  feedback_type: 'spec_quality' | 'ui' | 'feature_request' | 'bug' | 'other';
}

// Chat events
export interface ChatMessageCreatedPayload {
  chat_message_id: string;
  spec_project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_order: number;
}

// ============================================================================
// Event Creation Input (for emitEvent function)
// ============================================================================

export interface EmitEventInput {
  event_type: EventType;
  entity_type: EntityType;
  entity_id: string;
  actor_id?: string | null;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  previous_state?: Record<string, unknown> | null;
}

// ============================================================================
// Event Query Filters
// ============================================================================

export interface EventQueryFilters {
  entity_type?: EntityType;
  entity_id?: string;
  event_type?: EventType;
  actor_id?: string;
  from_date?: Date;
  to_date?: Date;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Activity Feed Item (UI Representation)
// ============================================================================

export interface ActivityFeedItem {
  id: string;
  event_type: EventType;
  entity_type: EntityType;
  entity_id: string;
  actor_name: string | null;
  actor_email: string | null;
  description: string;  // Human-readable description
  icon: string;  // Icon name or emoji
  timestamp: string;
  payload: Record<string, unknown>;
}

// ============================================================================
// Event Type Guards
// ============================================================================

export function isUserEvent(event: Event): boolean {
  return event.entity_type === 'user';
}

export function isSpecProjectEvent(event: Event): boolean {
  return event.entity_type === 'spec_project';
}

export function isResearchEvent(event: Event): boolean {
  return event.entity_type === 'research_report';
}

export function isSpecGenerationEvent(event: Event): boolean {
  return event.entity_type === 'generated_spec';
}

export function isChatEvent(event: Event): boolean {
  return event.entity_type === 'chat_message';
}

// ============================================================================
// End of Event Types
// ============================================================================
