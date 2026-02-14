// ============================================================================
// Event Queries — Stage 5
// ============================================================================
// Utilities for querying events from the events table.
// Respects RLS - users can only see events for entities they own.
// ============================================================================

'use server';

import { createServerClient } from '@/lib/supabase/server';
import type { Event, EventQueryFilters, ActivityFeedItem } from '@/types/events';

// ============================================================================
// Query Events
// ============================================================================

/**
 * Query events with filters.
 * Respects RLS - users can only see events for entities they own.
 *
 * @param filters - Query filters
 * @returns Array of events matching the filters
 */
export async function queryEvents(filters: EventQueryFilters = {}): Promise<Event[]> {
  const supabase = await createServerClient();

  let query = supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.entity_type) {
    query = query.eq('entity_type', filters.entity_type);
  }

  if (filters.entity_id) {
    query = query.eq('entity_id', filters.entity_id);
  }

  if (filters.event_type) {
    query = query.eq('event_type', filters.event_type);
  }

  if (filters.actor_id) {
    query = query.eq('actor_id', filters.actor_id);
  }

  if (filters.from_date) {
    query = query.gte('created_at', filters.from_date.toISOString());
  }

  if (filters.to_date) {
    query = query.lte('created_at', filters.to_date.toISOString());
  }

  // Pagination
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    console.error('[Query Events Error]', error);
    return [];
  }

  return (data as Event[]) ?? [];
}

// ============================================================================
// Get Events for Entity
// ============================================================================

/**
 * Get all events for a specific entity.
 *
 * @param entityType - Type of entity
 * @param entityId - ID of entity
 * @param limit - Maximum number of events to return
 * @returns Array of events for the entity
 */
export async function getEventsForEntity(
  entityType: string,
  entityId: string,
  limit: number = 50
): Promise<Event[]> {
  return queryEvents({
    entity_type: entityType as any,
    entity_id: entityId,
    limit,
  });
}

// ============================================================================
// Get Events by Type
// ============================================================================

/**
 * Get all events of a specific type.
 *
 * @param eventType - Type of event
 * @param limit - Maximum number of events to return
 * @returns Array of events of the specified type
 */
export async function getEventsByType(
  eventType: string,
  limit: number = 50
): Promise<Event[]> {
  return queryEvents({
    event_type: eventType as any,
    limit,
  });
}

// ============================================================================
// Get Events by Actor
// ============================================================================

/**
 * Get all events triggered by a specific actor (user).
 *
 * @param actorId - ID of the actor
 * @param limit - Maximum number of events to return
 * @returns Array of events triggered by the actor
 */
export async function getEventsByActor(
  actorId: string,
  limit: number = 50
): Promise<Event[]> {
  return queryEvents({
    actor_id: actorId,
    limit,
  });
}

// ============================================================================
// Get Recent Events
// ============================================================================

/**
 * Get recent events (last N events).
 *
 * @param limit - Maximum number of events to return
 * @returns Array of recent events
 */
export async function getRecentEvents(limit: number = 50): Promise<Event[]> {
  return queryEvents({ limit });
}

// ============================================================================
// Get Events in Time Range
// ============================================================================

/**
 * Get events within a time range.
 *
 * @param fromDate - Start date
 * @param toDate - End date
 * @param limit - Maximum number of events to return
 * @returns Array of events in the time range
 */
export async function getEventsInTimeRange(
  fromDate: Date,
  toDate: Date,
  limit: number = 100
): Promise<Event[]> {
  return queryEvents({
    from_date: fromDate,
    to_date: toDate,
    limit,
  });
}

// ============================================================================
// Get Activity Feed for Spec Project
// ============================================================================

/**
 * Get a formatted activity feed for a spec project.
 * Converts events into human-readable activity items.
 *
 * @param specProjectId - ID of the spec project
 * @param limit - Maximum number of events to return
 * @returns Array of activity feed items
 */
export async function getSpecProjectActivityFeed(
  specProjectId: string,
  limit: number = 50
): Promise<ActivityFeedItem[]> {
  const supabase = await createServerClient();

  // Get all events related to this spec project and its children
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      actor:users!events_actor_id_fkey(name, email)
    `)
    .or(
      `entity_id.eq.${specProjectId},` +
      `payload->>spec_project_id.eq.${specProjectId}`
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Get Activity Feed Error]', error);
    return [];
  }

  // Convert events to activity feed items
  return ((data as any[]) ?? []).map((event) => {
    const actor = event.actor as { name: string | null; email: string | null } | null;

    return {
      id: event.id,
      event_type: event.event_type,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      actor_name: actor?.name ?? null,
      actor_email: actor?.email ?? null,
      description: getEventDescription(event),
      icon: getEventIcon(event.event_type),
      timestamp: event.created_at,
      payload: event.payload,
    };
  });
}

// ============================================================================
// Get Activity Feed for User
// ============================================================================

/**
 * Get a formatted activity feed for a user (all their specs).
 *
 * @param userId - ID of the user
 * @param limit - Maximum number of events to return
 * @returns Array of activity feed items
 */
export async function getUserActivityFeed(
  userId: string,
  limit: number = 50
): Promise<ActivityFeedItem[]> {
  const supabase = await createServerClient();

  // Get all events where the user is the actor
  const { data, error } = await supabase
    .from('events')
    .select(`
      *,
      actor:users!events_actor_id_fkey(name, email)
    `)
    .eq('actor_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[Get User Activity Feed Error]', error);
    return [];
  }

  // Convert events to activity feed items
  return ((data as any[]) ?? []).map((event) => {
    const actor = event.actor as { name: string | null; email: string | null } | null;

    return {
      id: event.id,
      event_type: event.event_type,
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      actor_name: actor?.name ?? null,
      actor_email: actor?.email ?? null,
      description: getEventDescription(event),
      icon: getEventIcon(event.event_type),
      timestamp: event.created_at,
      payload: event.payload,
    };
  });
}

// ============================================================================
// Event Description Formatter
// ============================================================================

function getEventDescription(event: Event): string {
  const payload = event.payload as any;

  switch (event.event_type) {
    // Auth events
    case 'user.signed_up.email':
      return `Signed up with email`;
    case 'user.signed_up.oauth':
      return `Signed up with ${payload.auth_provider}`;
    case 'user.logged_in':
      return `Logged in`;
    case 'user.logged_out':
      return `Logged out`;
    case 'user.password_reset':
      return `Reset password`;

    // Spec creation
    case 'spec_project.created':
      return `Created spec "${payload.name}"`;
    case 'spec_project.described':
      return `Described the app idea`;
    case 'spec_project.research_started':
      return `Started deep research`;

    // Research phases
    case 'research_report.phase_1_started':
      return `Research Phase 1: Domain Analysis started`;
    case 'research_report.phase_1_completed':
      return `Research Phase 1: Found ${payload.competitor_count || 0} competitors`;
    case 'research_report.phase_2_started':
      return `Research Phase 2: Feature Decomposition started`;
    case 'research_report.phase_2_completed':
      return `Research Phase 2: Decomposed into ${payload.feature_count || 0} features`;
    case 'research_report.phase_3_started':
      return `Research Phase 3: Technical Requirements started`;
    case 'research_report.phase_3_completed':
      return `Research Phase 3: Analyzed technical requirements`;
    case 'research_report.phase_4_started':
      return `Research Phase 4: Competitive Gaps started`;
    case 'research_report.phase_4_completed':
      return `Research Phase 4: Identified opportunities`;
    case 'research_report.completed':
      return `Research completed — ${payload.entity_count || 0} entities identified`;
    case 'research_report.failed':
      return `Research failed: ${payload.error || 'Unknown error'}`;

    // Spec generation
    case 'generated_spec.generation_started':
      return `Started generating spec`;
    case 'generated_spec.validation_started':
      return `Validating spec completeness`;
    case 'generated_spec.er_diagram_generated':
      return `Generated ER diagram`;
    case 'generated_spec.build_estimate_generated':
      return `Generated build estimate: ${payload.estimated_build_hours_min}-${payload.estimated_build_hours_max} hours`;
    case 'generated_spec.completed':
      return `Spec complete — ${payload.entity_count || 0} entities, ${payload.state_change_count || 0} state changes`;
    case 'generated_spec.failed':
      return `Spec generation failed: ${payload.error || 'Unknown error'}`;
    case 'spec_project.review_started':
      return `Started reviewing spec`;
    case 'spec_project.changes_requested':
      return `Requested changes to spec`;
    case 'spec_project.approved':
      return `Approved spec`;

    // Download
    case 'spec_download.created':
      return `Downloaded .forge ZIP (${formatBytes(payload.zip_size_bytes || 0)})`;
    case 'waitlist_entry.created':
      return `Joined ForgeBoard waitlist`;

    // Iteration
    case 'spec_project.version_created':
      return `Created new version of spec`;
    case 'spec_project.archived':
      return `Archived spec`;

    // Feedback
    case 'feedback.created':
      return `Submitted feedback (${payload.rating || 0}/5)`;
    case 'feedback.reviewed':
      return `Feedback reviewed`;

    // Chat
    case 'chat_message.created':
      return `Sent chat message`;

    // Generic
    case 'entity.created':
      return `Created ${event.entity_type}`;
    case 'entity.updated':
      return `Updated ${event.entity_type}`;
    case 'entity.archived':
      return `Archived ${event.entity_type}`;

    default:
      return `${event.event_type}`;
  }
}

// ============================================================================
// Event Icon Mapper
// ============================================================================

function getEventIcon(eventType: string): string {
  if (eventType.startsWith('user.')) return '👤';
  if (eventType.startsWith('spec_project.')) return '📄';
  if (eventType.startsWith('research_report.')) return '🔍';
  if (eventType.startsWith('generated_spec.')) return '⚙️';
  if (eventType.startsWith('spec_download.')) return '⬇️';
  if (eventType.startsWith('waitlist_entry.')) return '📝';
  if (eventType.startsWith('feedback.')) return '💬';
  if (eventType.startsWith('chat_message.')) return '💭';
  return '📋';
}

// ============================================================================
// Helpers
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================================================
// End of Event Queries
// ============================================================================
